import type { APIRoute } from "astro";
import { getGuestById, getGuestByInviteCode } from "../../lib/guest-search";
import { findInvitedGuest, saveRsvp } from "../../lib/rsvp-store";
import { syncRsvpToSupabase } from "../../lib/rsvp-supabase";
import { getPostHogServer } from "../../lib/posthog-server";

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = String(body.name ?? "").trim();
  const firstName = String(body.first_name ?? body.firstName ?? "").trim();
  const lastName = String(body.last_name ?? body.lastName ?? "").trim();
  const attending =
    body.attending === true ||
    body.attending === "yes" ||
    body.attending === "true";
  const message = String(body.message ?? "").trim();
  const guestId = String(body.guestId ?? body.guest_id ?? "").trim() || null;
  let inviteCode =
    String(body.inviteCode ?? body.invite_code ?? "").trim() || null;

  let guestNames: string[] = [];
  const rawGuestNames = body.guest_names ?? body.guestNames;
  if (Array.isArray(rawGuestNames)) {
    guestNames = rawGuestNames.map((n) => String(n).trim()).filter(Boolean);
  } else if (typeof rawGuestNames === "string" && rawGuestNames.trim()) {
    try {
      const parsed = JSON.parse(rawGuestNames) as unknown;
      if (Array.isArray(parsed)) {
        guestNames = parsed.map((n) => String(n).trim()).filter(Boolean);
      }
    } catch {
      guestNames = rawGuestNames
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
    }
  }

  if (!name) {
    return new Response(
      JSON.stringify({ ok: false, error: "Guest name is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (attending && guestNames.length === 0) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Please provide at least one attending guest name.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const guestCount = attending ? guestNames.length : 0;
  const totalAttending = attending ? guestNames.length : 0;

  let listGuest: Awaited<ReturnType<typeof getGuestById>> = null;

  if (guestId) {
    try {
      listGuest = await getGuestById(guestId);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      console.error("[api/rsvp] getGuestById failed:", detail);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Could not verify guest. Please try again.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!listGuest) {
      return new Response(
        JSON.stringify({ ok: false, error: "Guest not found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } else if (inviteCode) {
    try {
      listGuest = await getGuestByInviteCode(inviteCode);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      console.error("[api/rsvp] getGuestByInviteCode failed:", detail);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Could not verify guest. Please try again.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const invitedGuest = listGuest
    ? { name: listGuest.full_name, maxGuests: listGuest.maxGuests }
    : findInvitedGuest(name);

  if (!invitedGuest) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Guest not found on the invitation list.",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!inviteCode && listGuest?.invite_code) {
    inviteCode = listGuest.invite_code;
  }

  // Always enforce seat limit from guest-list.json — never trust client-submitted counts.
  const maxGuests = invitedGuest.maxGuests;

  console.log(
    "[api/rsvp] selected guest:",
    invitedGuest.name,
    "reserved seats:",
    maxGuests,
    "total_attending:",
    totalAttending,
  );

  if (!attending) {
    guestNames = [];
  }

  if (attending && totalAttending > maxGuests) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Your invitation reserves up to ${maxGuests} seat(s). Please remove extra names.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await saveRsvp(
    {
      name: invitedGuest.name,
      firstName: firstName || listGuest?.first_name || undefined,
      lastName: lastName || listGuest?.last_name || undefined,
      attending,
      guestCount: attending ? guestCount : 0,
      guestNames,
      message,
    },
    { guest: { name: invitedGuest.name, maxGuests } },
  );

  if (!result.ok) {
    const status =
      result.error === "Guest not found on the invitation list."
        ? 404
        : result.error.startsWith("Your invite allows") ||
            result.error.includes("guest name")
          ? 400
          : 500;
    return new Response(JSON.stringify({ ok: false, error: result.error }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mirror the RSVP to Supabase rsvp_responses (guest-list slug as invite_code).
  try {
    console.log("[api/rsvp] Supabase sync:", {
      invite_code: inviteCode,
      name: invitedGuest.name,
      attending,
      guest_names: guestNames,
      total_attending: totalAttending,
      message,
    });

    const sync = await syncRsvpToSupabase(result.rsvp, inviteCode);
    if (!sync.ok) {
      console.error("[api/rsvp] Supabase sync failed:", sync.error);
      return new Response(JSON.stringify({ ok: false, error: sync.error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log(
      "[api/rsvp] Supabase sync success for invite_code:",
      inviteCode,
    );
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Unknown Supabase error";
    console.error("[api/rsvp] Supabase sync threw:", detail);
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Could not save RSVP to Supabase: ${detail}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const posthog = getPostHogServer();
  const sessionId = request.headers.get("X-PostHog-Session-Id");
  const distinctId = inviteCode ?? result.rsvp.name ?? "anonymous";

  posthog.capture({
    distinctId,
    event: "rsvp_submitted",
    properties: {
      $session_id: sessionId || undefined,
      attending,
      guest_count: attending ? guestCount : 0,
    },
  });

  return new Response(
    JSON.stringify({
      ok: true,
      rsvp: result.rsvp,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
