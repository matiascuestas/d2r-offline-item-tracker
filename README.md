# d2r-offline-item-tracker

A local, offline item catalog and **Holy Grail tracker** for **Diablo II: Resurrected** single player.

It reads your local save files and shows, across all your characters and shared stash, which uniques, sets, runewords, bases, charms and jewels you already own and which ones you're still missing.

> Single player / offline only. Nothing is uploaded anywhere — everything runs on your own machine and reads your own saves.

## About this project

Full disclosure: this was "vibecoded" in a few hours, for myself, to keep track of the items on my own single-player characters. It's not a polished product and it probably has rough edges.

That said — if it's useful to you, great, use it freely! And if you'd like to improve it, fix something, or add features, **you're very welcome to contribute**. See [Contributing](#contributing) below.

## Features

- Browsable catalog of **uniques, sets, bases, runewords, charms and jewels**.
- Search and filters by family, subtype, tier and property.
- **Holy Grail tracking**: filter by "owned", "missing", or "all" — computed by reading your `.d2s` characters and `.d2i` shared stash files.
- For each owned item, see *where* it is (which character, equipped slot, inventory, cube, personal/shared stash, mercenary, etc.).
- Fully local and offline. The catalog opens straight from `index.html`; save reading runs through a tiny local Node server.

## Requirements

- [Node.js](https://nodejs.org/) (LTS recommended).
- Diablo II: Resurrected save files (single player).

## Setup

```bash
npm install
npm run generate   # builds the item datasets into data/
```

## Usage

To get the full experience (catalog **+** Holy Grail tracking from your saves), run the local server:

```bash
npm run start
```

Then open http://localhost:5173 in your browser. On Windows you can also double-click `start-web.cmd`, which launches the server and opens the browser for you.

### Desktop shortcut (Windows)

To create a Desktop shortcut that launches the app (it reuses the Diablo II: Resurrected icon if `D2R.exe` is found):

```bash
npm run shortcut
```

This creates a **"D2R Item Tracker"** shortcut on your Desktop pointing at `start-web.cmd`.

> Opening `index.html` directly (without the server) works for **browsing the catalog**, but the "owned / missing" tracking needs the server, since reading your save files happens in `scripts/server.js` via the `/api/owned-items` endpoint.

### Save folder

By default the app looks for your saves at:

```
%USERPROFILE%\Saved Games\Diablo II Resurrected
```

If yours is elsewhere, set the `D2R_SAVE_DIR` environment variable before starting, e.g. on Windows PowerShell:

```powershell
$env:D2R_SAVE_DIR = "D:\path\to\your\saves"; npm run start
```

You can also change the port with the `PORT` environment variable (default `5173`).

## Item images

Each item looks for a local sprite first:

- `assets/items/<invfile>.png` (also `.gif`, `.webp`, `.jpg`)

If no local sprite exists, the card falls back to an external image and, as a last resort, shows a placeholder with the item's initials and `invfile`.

> **Note:** local sprites are **not** included in this repo. They are Blizzard assets and are git-ignored. To use your own, extract them from the game and import a folder of sprites whose names start with `inv` (e.g. `invuapu.png`, `invlea.gif`):
>
> ```bash
> npm run import-images -- "C:\path\to\sprites"
> ```

## Regenerating data

The item datasets in `data/` are generated from [`@blizzhackers/d2data`](https://www.npmjs.com/package/@blizzhackers/d2data):

```bash
npm run generate
```

This writes both a readable `*.json` and a `*.js` payload (so the page can be opened directly from disk) for uniques, sets, bases and runewords.

## Credits

- Item data: [`@blizzhackers/d2data`](https://www.npmjs.com/package/@blizzhackers/d2data) (MIT).
- Save file parsing: [`@d2runewizard/d2s`](https://www.npmjs.com/package/@d2runewizard/d2s) (ISC).
- External image fallback: [diablo2.io](https://diablo2.io/).

## Contributing

Contributions are welcome and appreciated. Since this started as a quick personal tool, there's plenty of room to improve it. Feel free to:

- Open an **issue** to report a bug or suggest a feature.
- Open a **pull request** with a fix or improvement.
- Fork it and adapt it to your own needs.

No strict process — keep it simple, describe what you changed, and that's it. Thanks for taking a look!

## License

[MIT](./LICENSE)

## Disclaimer

This is an unofficial, fan-made tool. It is **not affiliated with, endorsed by, or sponsored by Blizzard Entertainment**. Diablo® II: Resurrected and all related assets, names and trademarks are property of Blizzard Entertainment, Inc. This project is provided for personal, non-commercial use only. Item data and images are property of their respective owners.
