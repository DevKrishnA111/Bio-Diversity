# BIOVERSE — Explore. Protect. Preserve.

A Netlify-ready biodiversity exploration web app focused on India. It combines an interactive 3D Earth, a 3D forest scene with an animated GLB fox, real biodiversity provider APIs, regional exploration, AI-assisted image identification, and optional Supabase accounts and contributions.

## What is implemented

- Responsive single-page application with anchored sections, mobile navigation, Framer Motion UI transitions and GSAP scroll reveals.
- Interactive Three.js globe with Earth texture loading and biodiversity hotspot markers. If the texture host is unavailable, the globe remains visible with a procedural surface.
- Interactive 3D forest scene with procedural vegetation and an animated fox GLB model (loaded from the Khronos glTF Sample Assets repository).
- Interactive OpenStreetMap view with biodiversity landscape markers and region selectors. Region selection fetches observations in an approximate bounding box around that region's centre; it does not represent an administrative state boundary.
- Live iNaturalist research-grade observation retrieval for India and GBIF species autocomplete / occurrence count retrieval. Results link to the original providers.
- Taxonomic group filters, species details, and browser-based saved-species library.
- Gemini vision API Netlify Function for image-based candidate identification. The function returns a clear configuration error until `GEMINI_API_KEY` is set.
- Optional Supabase email magic-link authentication, saved-species sync, and persistent observation submission.
- Guest mode that stores saved species and contributed notes in the current browser only.
- Conservation learning links, data attribution, source notes, loading states and error states.

## Important data and product limitations

- iNaturalist observations are community records, not population estimates or a complete species inventory. The app queries India geographic bounds and a limited page of results.
- GBIF's country occurrence count is the number of records indexed by GBIF for country code `IN`, not the number of living individuals or species.
- Regional centres are approximate search anchors. The map does not include official state boundary polygons or sensitive species coordinates.
- The conservation cards are educational resources and links, not a verified list of open volunteer opportunities or active grant calls.
- AI identification gives candidate matches only. It is not taxonomic confirmation and must be checked against expert sources.
- The fox model and Earth texture are fetched from public hosts at runtime. The experience requires an internet connection for these assets and for the biodiversity APIs / map tiles.
- Netlify Functions are deployed when you deploy this project from a Git repository or with the Netlify CLI. A static drag-and-drop of only `dist/` will not deploy the AI function.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at the Vite URL shown in your terminal. The included `@netlify/vite-plugin` emulates Netlify Functions during local Vite development, so `/.netlify/functions/identify` is available from the same dev server. Set `GEMINI_API_KEY` in `.env` to test AI identification.

Build the production frontend:

```bash
npm run build
npm run preview
```

## Deploy to Netlify

1. Extract this ZIP and push the project folder to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project** and connect that repository.
3. Netlify reads `netlify.toml`. Build command: `npm run build`; publish directory: `dist`; functions directory: `netlify/functions`.
4. Add the environment variables below in **Site configuration → Environment variables**.
5. Trigger a new deploy after adding variables.

You can also deploy from the project folder using the Netlify CLI:

```bash
npx netlify-cli login
npx netlify-cli link
npx netlify-cli deploy --build --prod
```

## Environment variables

Frontend variables (public Supabase project URL and anon key only):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_ANON_KEY
```

Netlify Function secrets (server-side only; never prefix these with `VITE_`):

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash
```

The app works in guest mode without Supabase. AI identification is not available until a Gemini API key is configured on the Netlify site. Keep all private API keys in Netlify environment variables; do not commit `.env`.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Netlify environment variables.
4. Enable the Email provider in Supabase Authentication and configure the Site URL / redirect URLs for your Netlify domain.
5. Redeploy the site.

The schema enables Row Level Security. User observations can be publicly read, while inserts, updates and deletes are restricted to the authenticated owner. Saved species and profile data are private to the user.

## Main project structure

```text
bioverse-netlify/
├── netlify/
│   └── functions/identify.mjs
├── public/
├── src/
│   ├── components/
│   │   ├── IndiaMap.jsx
│   │   └── WorldScenes.jsx
│   ├── lib/
│   │   ├── api.js
│   │   ├── regions.js
│   │   └── supabase.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── supabase/schema.sql
├── .env.example
├── netlify.toml
├── package.json
└── vite.config.js
```

## External services and sources

- GBIF API: https://techdocs.gbif.org/en/openapi/v1/species and https://techdocs.gbif.org/en/openapi/v1/occurrence
- iNaturalist API: https://www.inaturalist.org/pages/api
- OpenStreetMap tiles: https://www.openstreetmap.org/copyright
- Supabase: https://supabase.com/docs
- Netlify Functions: https://docs.netlify.com/build/functions/get-started/
- Google Gemini API: https://ai.google.dev/gemini-api/docs
- Khronos glTF Sample Assets: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox

## Accessibility and performance notes

The interface includes keyboard focus styles, semantic labels, responsive layouts, and a reduced-motion CSS preference. Heavy 3D scenes are isolated in their own canvases. For a public launch, consider hosting optimized, licensed GLB and texture assets in your own static asset storage, monitoring provider API rate limits, adding server-side caching, and running Lighthouse / accessibility tests on the deployed domain.
