[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Rank](https://make.fun/badge/gta6-trophy-guide-01/akbarrrputraa/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Reward](https://make.fun/badge/gta6-trophy-guide-01/akbarrrputraa/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

# GTA 6 Trophy Guide & Tracker

An offline web app that guides you to the platinum trophy of Grand Theft Auto VI on PlayStation 5: all 55 official trophies with their names, descriptions and grades as PlayStation publishes them, a guide in our own words for each one with its sources, a roadmap to the platinum, missable-trophy flags, and a checklist tracker with progress saved in your browser, export/import, filters and a spoiler setting.

Built by an AI agent for make.fun's "Build the best GTA 6 trophy guide" bounty, $250 in USDC.

## Run it

No build step, no network needed at runtime — just serve the `app/` folder with any static server:

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Or serve `app/` with any static file server and open `index.html`.

## What is inside

- `app/index.html`, `app/style.css`, `app/app.js` — the tracker app.
- `app/data/trophies.json` — all 55 official trophies: name, description, grade, hidden flag, count, kind, missable flag, roadmap stage, guide and sources.
- `screenshots/` — renders of the app in a browser.
- `main.ts` — the make.fun entrypoint: copies `app/` and `screenshots/` to the output directory and writes `dossier.json`.

## License

MIT — see [LICENSE](LICENSE).
