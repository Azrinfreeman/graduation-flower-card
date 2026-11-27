# Graduation Flower Card

A lightweight, customizable digital graduation card built with **vanilla HTML, CSS, and JavaScript (ES modules)** — zero frameworks, zero build step, and zero external dependencies.

**[Live Demo →](https://azrinfreeman.github.io/graduation-flower-card/)**

## Features

- **Playful 2-question quiz** with a **runaway wrong answer** (dodges mouse pointers, hops away on mobile taps, and gives up after 5 tries so no one gets stuck)
- **Paged card reveal** that fits every screen from 320px phones to wide desktops without scrolling:
  1. Congratulations headline with falling text-character confetti
  2. Auto-paginated typewriter message (with a skip button)
  3. Blooming interactive bouquet gallery with **Previous / Next** style switching
- **8 built-in flower bouquet varieties & styles** (all drawn in original code — no images):
  1. **Wildflower Meadow** — 3D rotating poppies, daisies, cornflowers, lupines & lilies
  2. **Velvet Roses** — 3D layered spiral crimson, blush & cream roses with baby's breath
  3. **Sunflowers & Daisies** — 3D golden ray-petal sunflowers & chamomile daisies
  4. **Spring Tulips** — 3D upright cupped tulips with sweeping sword leaves
  5. **Sakura Branch** — 3D arching cherry-blossom branch with drifting pink petals
  6. **Lilies & Lavender** — 3D stargazer lilies, tall lavender spikes & baby's breath
  7. **Text-Art Garden** — detailed 2D ASCII-style bouquet bloom
  8. **Minimal Vector** — clean CSS-animated inline SVG bouquet
- **Optional background song** with a quiet fade-in (off by default)
- **Eight short sound effects**, including a paper page turn, with one corner volume control for effects and music

---

## Customize in 2 Minutes

Download or fork this repository, then edit **[`js/config.js`](js/config.js)**:

| Setting | What it changes |
|---|---|
| `graduateName` | The graduate's name on the congratulations page |
| `senderSignature` | Your signature line under the heading |
| `graduationMessage` | Your wish (use `\n\n` for new paragraphs; long messages paginate automatically) |
| `questions` | Your own fun questions, options, and `correctAnswer` |
| `runawayWrongAnswer` | Toggle `enabled`, dodge count (`giveUpAfter`), hint glow (`hintAfter`), and tease messages |
| `bouquetPicker.enabled` | `true` lets visitors click **← / →** to browse all bouquets; `false` locks to the first bouquet |
| `bouquetGallery` | Reorder, remove, or recolor any of the 8 bouquet styles (the first entry blooms first) |
| `sfx` | Set `enabled: false` to turn off effects, or change a path in `files` to use your own licensed clip |
| `music` | Set `enabled: true`, place your MP3 in `assets/audio/`, and set `src` and `note` |

To change colors or typography, edit the CSS variables at the top of [`css/main.css`](css/main.css).

### Adding your own background song

Background music is **off by default**. Supply a track you have rights to use.

1. Put your MP3 file in `assets/audio/` (for example `assets/audio/your-song.mp3`).
2. In `js/config.js`, set:
   ```js
   music: {
     enabled: true,
     src: 'assets/audio/your-song.mp3',
     volume: 0.15,
     note: 'Why I picked this song for you.',
   }
   ```

---

## Run Locally

Because the site uses ES modules, serve it over HTTP rather than opening `index.html` directly via `file://`:

```bash
python tools/serve.py
```

Then open [the card](http://localhost:8000/) in your browser.

Open the [sound board](http://localhost:8000/tools/sound_board.html) to try each cue at the card’s default volume. To swap a sound, put your clip in `assets/audio/sfx/` and update its path under `sfx.files` in `js/config.js`.

---

## Deploy for Free

### GitHub Pages
1. Fork this repository and customize `js/config.js`.
2. In your GitHub repository go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, pick `main` and `/ (root)`, then save.

### Cloudflare Pages
Run the bundle script to copy only runtime files into `site/`:

```bash
python tools/build_site.py
```

Upload the generated `site/` folder in the Cloudflare Pages dashboard or run `npx wrangler pages deploy site`. See [`docs/DEPLOYMENT_AND_QR.md`](docs/DEPLOYMENT_AND_QR.md) for QR code generation too.

---

## Verify Before Deploying

```bash
python tools/verify_project.py
```

---

## Licenses & Credits

- Code & procedural flower artwork: **MIT License** ([`LICENSE`](LICENSE))
- Self-hosted heading font: **JetBrains Mono** under the SIL Open Font License 1.1 ([`assets/fonts/OFL-JetBrains-Mono.txt`](assets/fonts/OFL-JetBrains-Mono.txt))
- Sound effects: **CC0 1.0** from Kenney and UI SFX
- See [`docs/ASSETS_AND_LICENSES.md`](docs/ASSETS_AND_LICENSES.md) for details.
