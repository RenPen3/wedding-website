<wizard-report>
# PostHog post-wizard report

The wizard has completed a full PostHog integration for your Jocelyn & René wedding website. Both client-side and server-side tracking are in place, capturing the key moments in a guest's journey — from opening their personalized invite, through RSVPing, to engaging with the honeymoon fund and photo gallery.

**New files created:**
- `src/components/posthog.astro` — client-side PostHog snippet, included in every page via the main layout
- `src/lib/posthog-server.ts` — server-side PostHog singleton using `posthog-node`
- `.env` — populated with `PUBLIC_POSTHOG_PROJECT_TOKEN`, `PUBLIC_POSTHOG_HOST`, `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`

**Files modified:**
- `src/layouts/MainLayout.astro` — imports and renders the PostHog component in `<head>`
- `src/pages/api/rsvp.ts` — server-side `rsvp_submitted` capture with session ID and attending/guest_count properties
- `src/pages/api/invite-open.ts` — server-side `invite_opened` capture with session ID and invite_code
- `src/pages/api/admin/login.ts` — server-side `admin_login` capture on successful authentication
- `src/pages/api/photos.ts` — server-side `photo_uploaded` capture on successful upload
- `src/components/RSVPForm.astro` — client-side `rsvp_form_submitted` capture with session ID forwarded to the server API via `X-PostHog-Session-Id` header
- `src/components/HoneymoonFund.astro` — client-side `honeymoon_fund_option_clicked` and `gift_idea_clicked` captures on link clicks
- `src/components/InviteOpenTracker.astro` — client-side `invite_opened` capture + session ID forwarded to the Netlify function

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `rsvp_submitted` | A guest submits their RSVP response (accepting or declining). | `src/pages/api/rsvp.ts` |
| `invite_opened` | A guest opens their personalized invite link for the first time. | `src/pages/api/invite-open.ts`, `src/components/InviteOpenTracker.astro` |
| `photo_uploaded` | A guest uploads a photo to the wedding gallery. | `src/pages/api/photos.ts` |
| `admin_login` | The admin successfully authenticates into the admin panel. | `src/pages/api/admin/login.ts` |
| `rsvp_form_submitted` | A guest submits the RSVP form on the client side. | `src/components/RSVPForm.astro` |
| `honeymoon_fund_option_clicked` | A guest clicks one of the payment options on the honeymoon fund page. | `src/components/HoneymoonFund.astro` |
| `gift_idea_clicked` | A guest clicks a specific gift idea card on the honeymoon fund page. | `src/components/HoneymoonFund.astro` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on guest behavior:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/498160/dashboard/1800214)
- [RSVPs Over Time](https://us.posthog.com/project/498160/insights/rNznGlz5)
- [Invite → RSVP Conversion Funnel](https://us.posthog.com/project/498160/insights/EHo8DVV4)
- [Total RSVPs](https://us.posthog.com/project/498160/insights/LH3LTGQV)
- [Honeymoon Fund Engagement](https://us.posthog.com/project/498160/insights/C7nhd0Kc)
- [Photo Uploads](https://us.posthog.com/project/498160/insights/clC2Y4vb)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add the PostHog env var names (`PUBLIC_POSTHOG_PROJECT_TOKEN`, `PUBLIC_POSTHOG_HOST`, `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`) to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-astro-ssr/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
</wizard-report>
