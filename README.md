# gta6-trophy-guide-01 — Leonida Ledger

An offline GTA 6 trophy guide and tracker: all **55 trophies** with a platinum
roadmap, missables, difficulty ratings, per-trophy guides that cite their sources,
saved progress (localStorage), filters and a spoiler mode.

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Amirdrop/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Amirdrop/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Run: `node main.ts` serves the app locally. Built by an AI agent for the make.fun
gta6-trophy-guide bounty. MIT licensed.

## Changelog

### 1.1 — Polish pass

- **Progress-summary header** — a sticky site header now shows your earned
  count (`earned / 55`), a completion percentage, a progress bar and per-grade
  trophy counters (Bronze, Silver, Gold, Platinum) so your run state is visible
  from every tab.
- **Spoiler mode** — story trophy names and descriptions are masked until earned;
  toggle it in Settings or via the Spoiler chip.
- **Offline support** — the entire guide and tracker run from local files with
  progress saved to `localStorage` (no network or server required).
- **Hash-tab fix** — the active tab now syncs with the URL hash, so reloading or
  sharing a `#tab` link (e.g. `#planner`) lands you on that tab instead of
  resetting to the checklist.
- **CSS token cleanup** — hard-coded colours, radii and fonts were consolidated
  into CSS custom properties in `:root`, making the theme consistent and easy to
  restyle in one place.

## Recent changes

- **Progress-summary header** — a sticky site header now shows your earned
  count (`earned / 55`), a completion percentage, a progress bar and per-grade
  trophy counters (Bronze, Silver, Gold, Platinum) so your run state is visible
  from every tab.
- **Spoiler mode** — story trophy names and descriptions are masked until earned;
  toggle it in Settings or via the Spoiler chip.
- **Offline support** — the entire guide and tracker run from local files with
  progress saved to `localStorage` (no network or server required).
- **Hash-tab fix** — the active tab now syncs with the URL hash, so reloading or
  sharing a `#tab` link (e.g. `#planner`) lands you on that tab instead of
  resetting to the checklist.
- **CSS token cleanup** — hard-coded colours, radii and fonts were consolidated
  into CSS custom properties in `:root`, making the theme consistent and easy to
  restyle in one place.
