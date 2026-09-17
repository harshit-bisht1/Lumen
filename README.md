# Lumen

A sleek, always-on-top audio visualizer that turns your Mac's system sound into a glowing, real-time spectrum wave at the bottom of your screen.

It sits as a thin, frameless bar pinned to the bottom of your display and renders whatever's playing — Spotify, YouTube, anything — as a smooth, glowing frequency spectrum that pulses and dances with the music. Bass on the left, treble on the right. 15 color themes, a lightweight Canvas renderer that's easy on the battery, and a click-through mode so it stays out of your way while you work.

## Features

- **Real-time spectrum** — a smooth, glowing wave built from the audio's frequency bands, reacting in place to the music (not a decorative animation).
- **15 color themes** — cycle through them with a keyboard shortcut; your choice is remembered across restarts.
- **Always-on-top overlay** — frameless, transparent, pinned to the bottom of the screen.
- **Click-through mode** — lock it so clicks pass through to whatever's underneath.
- **Lightweight** — pure Canvas 2D, DPR-capped, no heavy dependencies. Good for all-day use.

## Requirements

- macOS
- [Node.js](https://nodejs.org/) (to run or build from source)
- [BlackHole](https://existential.audio/blackhole/) — a free virtual audio device used to capture system audio

## Setup

Lumen visualizes **system audio**, which macOS can't tap directly. You route it through BlackHole.

### 1. Install BlackHole

```bash
brew install blackhole-2ch
```

Or download the installer from [existential.audio/blackhole](https://existential.audio/blackhole/).

### 2. Create a Multi-Output Device

So you can still *hear* audio while it's routed to Lumen:

1. Open **Audio MIDI Setup** (`/Applications/Utilities`).
2. Click the **+** in the bottom-left → **Create Multi-Output Device**.
3. Check both **your speakers/headphones** and **BlackHole 2ch**.
4. Put your real output first and enable **Drift Correction** on BlackHole.

### 3. Set it as your output

**System Settings → Sound → Output** → select the **Multi-Output Device**.

### 4. Run

```bash
npm install
npm start
```

On first launch, macOS asks for **Microphone** permission — click **Allow** (that's how Lumen reads the BlackHole input).

## Shortcuts

| Shortcut          | Action                        |
| ----------------- | ----------------------------- |
| `Cmd+Shift+C`     | Cycle color theme             |
| `Cmd+Shift+V`     | Lock/unlock click-through     |
| `Cmd+Shift+Q`     | Quit                          |

## Build a standalone app

```bash
npm run build   # output lands in dist/
```

This produces a `.dmg` in `dist/`. The build is **unsigned**, so the first time you open the installed app, right-click it → **Open** to get past Gatekeeper.

## How it works

- `main.js` — Electron main process: creates the frameless, always-on-top window and registers the global shortcuts.
- `preload.js` — secure bridge exposing the theme-cycle event to the renderer.
- `renderer.js` — captures BlackHole audio via the Web Audio API and draws the spectrum on a `<canvas>` with `requestAnimationFrame`.
- `index.html` / `index.css` — the canvas and minimal styling.

## License

**All rights reserved.** © 2026 Harshit Bisht.

This source is published for viewing only. You may not use, copy, modify, or
distribute it without explicit written permission. See [LICENSE](LICENSE).
