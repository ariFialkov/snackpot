# Snackpot

A one-tap 3D vending machine prize game for mobile and desktop, installable as a PWA.
Everything is procedural: three.js models, canvas textures and WebAudio sound — no asset downloads.
Played with free play credits only.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/ (includes sw.js for offline play)
npm run preview  # serve the production build
npm run sim      # Monte-Carlo check of the RTP
```

## How a round is decided

`src/game/math.js` holds all the game math, in integer units of 1/100 of the stake.

1. Every paytable row (a win size from about 0.1× to 1000×, and how often it comes up) owns a fixed
   book of 64 pre-built recipes: sets of oddly-priced items, sometimes with a combo, worth roughly
   that win size. The book is generated from a fixed seed, so it never changes between runs.
2. Because the recipes are fixed, each row's average payout is known exactly. The weight of the low
   rows is solved so the whole table returns exactly the target RTP (`DEFAULT_RTP`, 96%).
3. A round picks a row by weight and one of its recipes at random. The machine's stock is then
   arranged so those items are sitting in their slots when their turn comes.

Items, tiers, combos and paytable weights are all plain tables at the top of that file.

## Layout

| Path | What |
| --- | --- |
| `src/main.js` | Renderer, camera, round flow, input |
| `src/game/math.js` | Paytable, RTP, item/combo tables, round composer |
| `src/gfx/models.js` | The 16 item models |
| `src/gfx/machine.js` | Vending machine |
| `src/gfx/environment.js` | Themes, floor, props and skyline, regenerated each round |
| `src/gfx/vfx.js` | Particles, confetti, coins, rings, sunburst |
| `src/audio.js` | Synthesised sound effects |
| `src/ui.js`, `src/style.css` | HUD and collection sheet |
| `vite.config.js` | Build config and service worker generation |
