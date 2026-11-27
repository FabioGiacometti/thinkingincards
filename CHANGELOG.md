# Changelog

## Unreleased

### Added

- `privacy.html`: Privacy Policy, using the Terms of Service layout. It covers browser-local project storage, how signing in currently stores projects with Supabase (and the planned change to explicit consent), MCP relay processing, temporary project copies, Vercel Web Analytics, PostHog product events and feedback, waitlist email through Resend, service providers, how long information is kept, and user choices.
- A "Privacy Policy" link in the footers of `index.html` and `terms.html`.
- Publication switch in `vite.config.mjs`. Production builds include the policy and its links only with `PUBLISH_PRIVACY=true`. Otherwise `privacy.html` is not built, footer links marked `data-privacy-link` are removed, and links marked `data-privacy-ref` become plain text. The dev server always shows everything, for review at `/privacy`.

### Changed

- **Open the app (27 November 2026).** The header's "Join Waitlist" button is replaced by "Log in" and "Sign up", which open https://app.thinkingin.cards/login (Sign up with `?mode=signup`). A visitor whose browser has the app's `tic_signed_in` cookie is sent from the home page straight to the app (`?home` keeps the landing page). The FAQ says where the app is, and sharing previews read "Thinking in CARDS" instead of "OOUX.cards". The waitlist dialog code stays but nothing opens it.
- **Sign-in and local-first (26 November 2026).** `privacy.html`: projects stay in the browser and signing in never uploads them; an account is required to use the app; "Sign in with Google" shares name, email and profile picture; the `tic_signed_in` session cookie for thinkingin.cards; projects saved under an earlier version of the app remain in Supabase and can be requested or deleted. Sections 1, 3, 5, 6, 9, 10, 11 and 13 updated.
- **Terms (26 November 2026).** `terms.html`: accounts are required in the application; new section 3 "Prices and paid features" (free today; features, plans, usage above limits, cloud storage or AI-agent/MCP connections may become paid; never charged without explicit agreement; usage limits may apply to free use); section 4 states projects stay local when signed in. Sections renumbered.
- Operator identified as Fabio Giacometti, Edison 101, Córdoba, Argentina, in `terms.html` and in section 2 of `privacy.html`.
- `terms.html` section 3 now refers to the "Privacy Policy" (it said "Privacy Notice") and links to it once the policy is published.

### Before publishing the Privacy Policy

- **Publish.** Set `PUBLISH_PRIVACY=true` in the Vercel production environment and redeploy.
- **Keep it accurate.** Before offering any cloud storage of projects, update sections 1, 3 and 9 and change the "Last updated" date.
- Governing law set to the Argentine Republic, courts of the city of Córdoba (`terms.html` section 13).
