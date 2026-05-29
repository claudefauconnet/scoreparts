# ScoreParts — CLAUDE.md

## Stack

- **Backend**: Node.js + Express, ESM modules (`type: "module"`), Jade templates (`views/`)
- **Frontend v1**: `public/` — jQuery, vanilla JS
- **Frontend v2**: `public-v2/` — jQuery, feature-grouped modules (`modules/scoreSelector/`), shared code in `common/`
- **API routes**: `api/pdf/` and `api/score/`, mounted in `app.js`

## Rules

### Network calls → proxy.js

All frontend API calls go through [`public/js/proxy.js`](public/js/proxy.js). Add new API calls there, not inline in other files.

### jQuery first

Use jQuery for DOM manipulation, AJAX, event handling, and HTML generation. No need to reach for native APIs or abstractions when jQuery covers it.

### Variable names

Always explicit. Never single-letter or cryptic shorthands.

- Loop vars: name after what they index (`pageIndex` not `i`)
- Booleans: `isLoaded`, `hasZones`, `canGenerate`
- Callbacks: `callback` not `cb`
- use same nomenclature everywhere : exemple for route scoreInfos the infos from it should always been named infos across all the frontend

### Architecture — no new folders without asking

Match existing structure:

- New API route → file in `api/pdf/` or `api/score/`
- New frontend module → `public-v2/modules/<feature>/` (shared code → `public-v2/common/`) or `public/js/`
- Ask before creating any new directory

### Function organisation

- Group functions by responsibility within each file. Keep the same ordering/grouping style already present in the file being edited.

- Avoid functions defined on function for lisibility define functions outside in the same file and call them.

### No unreadable or non maintenable functions, html or css

- Factorise, improve readability ...
