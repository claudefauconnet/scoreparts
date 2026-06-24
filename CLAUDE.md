# Central Agent Rules

Shared cross-agent rules live in:

`C:\Users\kounnoughi\OneDrive - Jems\Documents\Obsidian Vault\AI\second-brain\Agent Rules\GLOBAL_AGENT_RULES.md`

Read that file for global behavior. Project-specific ScoreParts rules below still apply. If Karim asks to change a global agent rule, update the central file first.

---
# ScoreParts â€” CLAUDE.md

## Stack

- **Backend**: Node.js + Express, ESM modules (`type: "module"`), Jade templates (`views/`)
- **Frontend v1**: `public/` â€” jQuery, vanilla JS
- **Frontend v2**: `public-v2/` â€” jQuery, feature-grouped modules (`modules/scoreSelector/`), shared code in `common/`
- **API routes**: `api/pdf/` and `api/score/`, mounted in `app.js`

## Rules

### Network calls â†’ proxy.js

All frontend API calls go through [`public/js/proxy.js`](public/js/proxy.js). Add new API calls there, not inline in other files.

### jQuery first

Use jQuery for DOM manipulation, AJAX, event handling, and HTML generation. No need to reach for native APIs or abstractions when jQuery covers it.

### Variable names

Always explicit. Never single-letter or cryptic shorthands. Applies everywhere: loop indices, callback params, forEach/map/find/filter/findIndex lambdas.

- Loop vars: name after what they index (`pageIndex` not `i`, `movementIndex` not `idx`)
- Callback params: full descriptive name (`(voice)` not `(v)`, `(event)` not `(e)`, `(movement)` not `(m)`, `(zone)` not `(z)`)
- When outer and inner scopes would both use the same name, qualify the inner one (`(storedVoice)`, `(candidateMovement)`)
- Booleans: `isLoaded`, `hasZones`, `canGenerate`
- Callbacks: `callback` not `cb`
- Element params: `element` not `el`, `pageElement` not `pageEl`
- Use same nomenclature everywhere: e.g. for route scoreInfos the infos from it should always be named `infos` across all the frontend

### Architecture â€” no new folders without asking

Match existing structure:

- New API route â†’ file in `api/pdf/` or `api/score/`
- New frontend module â†’ `public-v2/modules/<feature>/` (shared code â†’ `public-v2/common/`) or `public/js/`
- Ask before creating any new directory

### Function organisation

- Group functions by responsibility within each file. Keep the same ordering/grouping style already present in the file being edited.

- Avoid functions defined on function for lisibility define functions outside in the same file and call them.

### No unreadable or non maintenable functions, html or css

- Factorise, improve readability ...

