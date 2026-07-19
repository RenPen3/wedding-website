import type { APIRoute } from "astro";
import {
  ADMIN_COOKIE,
  signAdminSession,
  verifyAdminPassword,
} from "../../../lib/admin-auth";
import { getPostHogServer } from "../../../lib/posthog-server";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  let password = "";
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { password?: string };
      password = String(body.password ?? "");
    } else {
      const form = await request.formData();
      password = String(form.get("password") ?? "");
    }
  } catch {
    return redirect("/admin/rsvps?error=invalid");
  }

  if (!verifyAdminPassword(password)) {
    return redirect("/admin/rsvps?error=invalid");
  }

  cookies.set(ADMIN_COOKIE, signAdminSession(), {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 8,
  });

  const posthog = getPostHogServer();
  posthog.capture({
    distinctId: "admin",
    event: "admin_login",
  });

  return redirect("/admin/rsvps");
};
