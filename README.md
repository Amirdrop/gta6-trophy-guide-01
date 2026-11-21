# Leonida Ledger - GTA 6 Trophy Guide

An offline, browser-based guide and tracker for every trophy in *Grand Theft Auto VI*.
It covers all **55 trophies** (1 platinum, 2 gold, 6 silver, 46 bronze) with a
structured platinum roadmap, missable warnings, difficulty and time estimates,
per-trophy guides that cite their sources, and saved progress that lives entirely
in your browser's `localStorage` - no account, no network, no server.

Built by Amirdrop. MIT licensed.

## Features

- **Progress summary header** - a platinum ring, earned/total count, a weighted
  completion bar, per-grade counters, missables remaining, and estimated time
  left update live as you tick trophies off.
- **Platinum roadmap with named stages** - a six-stage recommended order of play
  rendered as a connected track (Story Completion -> Collectibles & World ->
  Strangers & Side Content -> Activities & Shared Economy -> Crime & Combat
  Cleanup -> Platinum Run). Each stage shows its hours, earned count, missable
  count, progress bar, focus tips, warnings, and a tickable trophy checklist.
- **Missables highlighting** - a banner on the checklist counts trophies you can
  permanently lose and jumps straight to them; the Missables tab groups every
  one by stage with its in-game window and a one-click "Mark earned" action.
- **Spoiler mode** - masks the names, descriptions, guides and category of
  unearned story trophies. An extra guide panel shows "Hidden story trophy" and
  offers a single-trophy reveal. Toggle from the header pill, Settings, or the
  **S** key.
- **Checklist with filters & search** - filter by category, status, grade and
  difficulty, missable-only, or starred favorites, sort by roadmap order, name,
  rarity, time or difficulty (asc/desc). Press **/** to focus search. A reset
  chip appears whenever filters are active.
- **Starred favorites** - every trophy card and guide panel carries a star.
  Star the trophies you want to keep an eye on, then use the
  "Starred" filter to show just them. Toggle a star with the **F** key on an
  open guide.
- **Planner** - your remaining trophies in roadmap order, grouped into sessions,
  with counts of trophies, stages, missables and time left.
- **Keyboard shortcuts** - **1-5** switch tabs, **S** toggles spoilers, **F**
  stars the selected trophy, **/** focuses search, **?** opens a shortcuts help
  overlay, **Esc** closes the guide panel or help.
- **Backup & restore** - export a JSON backup of earned trophies, favorites and
  settings, or import one (merges with existing progress). Reset is available
  in Settings.
- **Accessibility** - checkboxes and guide buttons carry aria labels, focus rings
  are visible everywhere, and reduced-motion preferences are honoured.

## How to run

The app is a set of static files under `app/`; serve that directory over HTTP so
the ES modules and JSON data load cleanly.

**Option A - `node` launcher (standard library, no install):**

```sh
node main.ts              # serves app/ on http://localhost:8080
node main.ts --port 9000  # or a different port
PORT=9000 node main.ts    # env var also works (yields to --port)
```

**Option B - `serve.ts` convenience script (also standard library only):**

```sh
node serve.ts             # serves app/ on http://localhost:8080
```

**Option C - any static server** (e.g. `npx serve` from inside the project root),
then open the printed URL.

Once it's running, open `http://localhost:8080` in a browser.

## Project structure

```
.
|-- app/
|   |-- index.html            entry page; boot splash + noscript fallback
|   |-- css/
|   |   |-- base.css          design tokens, layout, components, responsive rules
|   |-- data/
|   |   |-- trophies.json     55 trophies with guides, sources, rarity, difficulty, time, tags, sessions
|   |   |-- roadmap.json      six named platinum stages with focus, tips, warnings
|   |-- js/
|       |-- main.js           Controller: state, render pipeline, actions, router, keyboard, help overlay
|       |-- store.js          localStorage store (earned + favorites + settings + stats; migrates legacy saves)
|       |-- data.js           load/validate trophies + roadmap, build the shared model (incl. difficulty bands, sessions)
|       |-- filters.js        search, chip filters (category/status/grade/difficulty/favorites) and sorting
|       |-- progress.js       progress summary shared by header, checklist and roadmap
|       |-- util.js           small DOM/string helpers
|       |-- views/            one render module per tab
|           |-- shell.js      site header, progress summary, nav tabs, help/shortcuts button
|           |-- checklist.js  trophy cards with filters & search, difficulty chips, favorites stars
|           |-- roadmap.js    stage-by-stage platinum roadmap
|           |-- missables.js  missable-only list with windows
|           |-- planner.js    next-up sessions with tag chips
|           |-- settings.js   spoiler toggle + backup/restore/reset
|           |-- detail.js     per-trophy guide panel with favorites star
|-- screenshots/              captured preview images (see below)
|-- scripts/
|   |-- shoot.mjs             puppeteer screenshot capture (starts serve.ts)
|   |-- enrich-trophies.mjs   fill any missing time estimates
|   |-- check-roadmap.mjs     verify roadmap ids against trophies
|-- main.ts                   local static server (see How to run)
|-- serve.ts                  alternate minimal static server
|-- shots.json                screenshot metadata
|-- LICENSE
|-- README.md
```

## Screenshots

The preview images under `screenshots/` were captured with `scripts/shoot.mjs`
(1280x800, seeded demo progress). The script starts `serve.ts` itself:

```sh
node scripts/shoot.mjs
```

| File | Description |
|------|-------------|
| `1-checklist-guide.jpg` | **Checklist** (`#checklist`): trophy cards with grade badges, difficulty dots, category, stage and tag chips, a favorites star per card, the difficulty filter chips, the missables banner, the filter/search toolbar, and a guide panel open on the right. |
| `2-roadmap.jpg` | **Roadmap** (`#roadmap`): the six named platinum stages with hours, difficulty, earned and missable counts, progress bars, focus tips, warnings and tickable trophy checklists. |
| `3-missables.jpg` | **Missables** (`#missables`): the nine missable trophies grouped by stage with their in-game windows and one-click Mark earned. |
| `4-spoiler.jpg` | **Checklist with spoiler mode ON** (`#checklist`): unearned story trophies masked as "Hidden story trophy", the header pill reading Spoilers hidden, and a masked guide panel with a Reveal action. |
| `5-planner.jpg` | **Planner** (`#planner`): remaining trophies, stages, missables and time left in the header, then remaining trophies in roadmap-order sessions with tag chips, and a `?` help button in the site header. |

## License

MIT. See [LICENSE](LICENSE).
