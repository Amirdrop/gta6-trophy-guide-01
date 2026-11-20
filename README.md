# Leonida Ledger — GTA 6 Trophy Guide

An offline, browser-based guide and tracker for every trophy in *Grand Theft Auto VI*.
It covers all **55 trophies** (1 platinum, 6 silver, 2 gold, 46 bronze) with a
platinum roadmap, missable flags, difficulty ratings, per-trophy guides that cite
their sources, and saved progress that lives entirely in your browser's
`localStorage` — no account, no network, no server.

Built by Amirdrop. MIT licensed.

## Features

- **Trophy checklist with filters & search** — browse the full list and narrow it
  by category (Story, Missions, Strangers, Activities, Collectibles, World, Crime,
  Completion), status (Earned / Remaining), grade (Platinum / Gold / Silver /
  Bronze), and a Missable-only toggle. Sort by in-game order, name, rarity, or
  estimated time, and search free-text with the box (or press `/` to jump into it).
- **Platinum roadmap with stages** — a six-stage recommended order of play
  (Story Completion → Collectibles & World → Strangers & Side Content → Activities,
  Online & Shared Economy → Crime, Combat Cleanup & Missables → Platinum Run). Each
  stage shows its trophies, earned count, missable count, and a progress bar; click
  any trophy chip to open its guide.
- **Missables view** — a dedicated list of the 9 missable trophies grouped by stage,
  each with the in-quest warning you need to grab it before it slips away.
- **Planner** — an auto-generated "next up" list of your remaining trophies in stage
  order, with estimated time remaining, per-stage session grouping, and missable
  alerts. It refills automatically as you earn trophies.
- **Spoiler mode** — masks the names and descriptions of unearned story trophies so
  you can reference the guide without ruining the plot. Toggle it in Settings, via
  the Spoiler chip on the checklist, or with the **S** key.
- **Keyboard shortcuts** — **1–5** switch tabs (Checklist, Roadmap, Missables,
  Planner, Settings), **S** toggles spoiler mode, `/` focuses search, and `Esc`
  closes the detail panel.
- **Progress tracking with localStorage** — check a box on any trophy card and your
  progress is saved instantly and remembered across visits. The site header shows a
  running `earned / 55` count, completion percentage, progress bar, and per-grade
  counters. Export / import a JSON backup or reset progress any time from Settings.
- **Offline first** — the entire app runs from local files. Nothing is uploaded,
  tracked, or phoning home.

## How to run

The app is a set of static files under `app/`; serve that directory over HTTP so
the ES modules and JSON data load cleanly.

**Option A — `node` launcher (standard library, no install):**

```sh
node main.ts              # serves app/ on http://localhost:8080
node main.ts --port 9000  # or a different port
PORT=9000 node main.ts    # env var also works (yields to --port)
```

**Option B — `serve.ts` convenience script (also standard library only):**

```sh
node serve.ts             # serves app/ on http://localhost:8080
```

**Option C — any static server** (e.g. `npx serve` from inside the project root,
pointing at the `app/` directory), then open the printed URL.

Once it's running, open `http://localhost:8080` in a browser.

## Project structure

```
.
├── app/
│   ├── index.html            # entry page; loads the module bundle
│   ├── css/
│   │   └── base.css          # all styling (tokens, layout, components)
│   ├── data/
│   │   ├── trophies.json     # the 55-trophy list with guides, sources, rarity
│   │   └── roadmap.json      # six-stage platinum roadmap
│   └── js/
│       ├── main.js           # app entrypoint: boot, routing, keyboard, render loop
│       ├── store.js          # localStorage-backed earned/settings store + export/import
│       ├── filters.js        # filter/sort chips and matching logic
│       ├── util.js           # shared DOM & string helpers
│       └── views/            # one render module per tab
│           ├── shell.js      # site header + progress summary + nav tabs
│           ├── checklist.js  # trophy cards with filters & search
│           ├── roadmap.js    # stage-by-stage roadmap
│           ├── missables.js  # missable-only list
│           ├── planner.js    # next-up planner
│           ├── settings.js   # spoiler toggle + progress backup/reset
│           └── detail.js     # per-trophy guide panel
├── screenshots/              # captured preview images (see below)
├── scripts/
│   └── shoot.mjs             # puppeteer screenshot capture script
├── main.ts                   # local static server (see How to run)
├── serve.ts                  # alternate minimal static server
├── shots.json                # screenshot metadata
├── LICENSE
└── README.md
```

## Screenshots

The four preview images under `screenshots/` were captured with
`scripts/shoot.mjs` (1280×800, seeded demo progress of 13/55 trophies):

| File | Description |
|------|-------------|
| `1-checklist-guide.jpg` | The **Checklist** tab (`#checklist`): trophy cards with grade badges, difficulty dots, missable chips, and the filter/search toolbar at top; a trophy guide panel is open on the right showing the guide steps and sources. |
| `2-roadmap.jpg` | The **Roadmap** tab (`#roadmap`): the six-stage platinum roadmap with stage titles, per-stage trophy chips (missables bulleted), earned counts, and progress bars. |
| `3-missables.jpg` | The **Missables** tab (`#missables`): the nine missable trophies grouped by stage with their in-quest warning notes. |
| `4-spoiler.jpg` | The **Checklist** tab with **spoiler mode ON** (`#checklist`, spoiler enabled): unearned story trophies are masked as "Hidden — story spoiler" while earned trophies and non-story entries remain visible; a guide panel sits open beside the list. |

## License

MIT. See [LICENSE](LICENSE).