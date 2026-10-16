# Thinking in CARDS — Landing

Standalone product landing with the supplied CARDS logo and product film.

## Local development

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production

```sh
npm run build
npm run preview
```

The production output is `dist/`. For Vercel use the Vite preset, build command `npm run build`, and output directory `dist`.

## Files

- `index.html`: layout, styles, and interactive example.
- `terms.html`: Terms of Service and User Agreement (linked from the footer).
- `vite.config.mjs`: builds both pages.
- `assets/cards.svg`: supplied CARDS wordmark.
- `assets/cards-wave.svg`: the same wordmark with a small letter wave every 7 seconds (used in the header; respects reduced motion).
- `assets/product-film.mp4`: supplied product film.
- `assets/product-film-poster.jpg`: poster extracted from the film.

Static site; no API keys, backend, or environment variables required. This project contains the landing only. It does not contain the modeling application.
