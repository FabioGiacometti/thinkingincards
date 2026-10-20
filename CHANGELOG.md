# Changelog

## Unreleased

### Added

- `privacy.html`: Privacy Policy, using the Terms of Service layout. It covers browser-local project storage, how signing in currently stores projects with Supabase (and the planned change to explicit consent), MCP relay processing, temporary project copies, Vercel Web Analytics, PostHog product events and feedback, waitlist email through Resend, service providers, how long information is kept, and user choices.
- A "Privacy Policy" link in the footers of `index.html` and `terms.html`.
- Publication switch in `vite.config.mjs`. Production builds include the policy and its links only with `PUBLISH_PRIVACY=true`. Otherwise `privacy.html` is not built, footer links marked `data-privacy-link` are removed, and links marked `data-privacy-ref` become plain text. The dev server always shows everything, for review at `/privacy`.

### Changed

- `terms.html` section 3 now refers to the "Privacy Policy" (it said "Privacy Notice") and links to it once the policy is published.

### Before publishing the Privacy Policy

- **Who is responsible for the data.** The policy names Fabio Giacometti as creator and contact. It does not state who legally operates the service, because that is still a placeholder in `terms.html`. Confirm the operator's legal name and address (or that Fabio Giacometti operates it as an individual), then update section 2.
- **Publish.** Set `PUBLISH_PRIVACY=true` in the Vercel production environment and redeploy.
- **Keep it accurate.** When the app's sign-in behaviour changes (explicit consent for remote project storage), update section 3 and the summary in section 1, and change the "Last updated" date.
