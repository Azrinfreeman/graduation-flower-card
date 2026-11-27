/**
 * asciiBouquet.js — turns the vector bouquet (flowerShapes.js) into animated text characters.
 *
 * Two steps, so the animation stays smooth on phones:
 *
 *   prepare()  Heavy, done ONCE (about 0.2 s on a laptop; do it while the visitor answers
 *              the quiz). Draws the bouquet on a hidden canvas, divides it into a grid of
 *              cells, picks a character + colour for each cell and gives each cell a
 *              "reveal time" between 0 and 1.
 *
 *   play()     Cheap, per frame. Cells never change once revealed, so each frame only
 *              stamps the few cells whose reveal time has just passed. Stems grow upwards,
 *              then every flower opens outwards from its centre.
 *
 * Character choice: solid + bright → dense character (@), faint → light character (.).
 * Characters come from a cache of pre-drawn tiles (much faster than fillText).
 */
import { drawBouquet, SCENE_WIDTH, SCENE_HEIGHT } from './flowerShapes.js';

/** Characters from faint to dense. */
const RAMP = '.:+o%O8#@'; // more "ink" towards the end, so bright areas glow
/** How many hidden-canvas pixels are averaged into one cell (per axis). */
const SUPERSAMPLE = 3;
/** Cell height ÷ cell width. Text cells are taller than wide. */
const CELL_RATIO = 1.7;
const STAGE_ASPECT = SCENE_HEIGHT / SCENE_WIDTH;
/** The stars twinkle for this long after the bloom, then rest (saves battery). */
const TWINKLE_MS = 20000;

/** Stable pseudo-random number 0..1 for a cell, used for texture, stars and timing. */
function cellNoise(col, row) {
  const v = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return v - Math.floor(v);
}
const clamp01 = v => Math.max(0, Math.min(1, v));

/**
 * When (0..1 through the animation) should a cell appear?
 *   1. Leaves/stems grow upwards from the base.
 *   2. A flower's heart appears when its stem reaches it.
 *   3. The petals then open outwards from the heart.
 * @param {number} x  cell centre in scene units
 * @param {number} y
 * @param {number} noise  0..1, adds a little organic unevenness
 * @param {boolean} isGreen  green cells are stems/leaves: they grow by height even when
 *        they sit inside a flower's area (a stem passing behind a flower, for example)
 * @param {{flowers:{x:number,y:number,radius:number}[], baseY:number}|null} meta
 *        where the flowers are; null (e.g. for a photo) falls back to a bottom-up wipe.
 */
function revealTime(x, y, noise, isGreen, meta) {
  if (!meta) return 0.03 + 0.85 * (1 - y / SCENE_HEIGHT) + noise * 0.02;
  const topY = Math.min(...meta.flowers.map(f => f.y)) - 60;
  const grow = yy => 0.03 + 0.4 * clamp01((meta.baseY - yy) / (meta.baseY - topY));
  if (isGreen) return grow(y) + noise * 0.02;
  // Top-most flower wins where flowers overlap (later in the list = drawn on top).
  for (let i = meta.flowers.length - 1; i >= 0; i--) {
    const f = meta.flowers[i];
    const d = Math.hypot(x - f.x, y - f.y) / f.radius;
    if (d > 0.95) continue;
    const stemReaches = grow(f.y);
    if (d < 0.2) return stemReaches + 0.03 + noise * 0.01; // the bud / heart
    const openStart = Math.max(stemReaches + 0.05, 0.34 + cellNoise(i, 3) * 0.2);
    return openStart + 0.26 * clamp01((d - 0.2) / 0.75) + noise * 0.02;
  }
  return grow(y) + noise * 0.02; // stems, leaves, grass
}

/**
 * @param {HTMLCanvasElement} canvas  visible canvas to draw the characters on
 * @param {{seed?:number, mix?:string[], colors?:string[], columns?:number}} options
 *        seed/mix/colors go to drawBouquet; `columns` = characters across (detail level).
 * @returns {{prepare, play, showAt, stop}|null}  null when 2D canvas is unavailable
 */
export function createAsciiBouquet(canvas, options = {}) {
  // Same detail on every screen so phones and desktops show the same picture;
  // more columns = finer detail but more drawing work.
  const { columns = 180 } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const scene = document.createElement('canvas');
  const sceneCtx = scene.getContext('2d', { willReadFrequently: true });
  if (!sceneCtx) return null;
  const tileCache = new Map();

  let cells = [];       // sorted by reveal time: { x, y, tile, t, star }
  let stars = [];       // cells that can twinkle: { cell, dim, bright }
  let next = 0;         // how many cells are already on the canvas
  let frameId = null;
  let twinkleTimer = null;
  let cellW = 0, cellH = 0;
  let prepared = false;

  /** One pre-drawn character in one (quantised) colour. */
  function getTile(glyph, r, g, b) {
    const key = (glyph << 12) | (r << 8) | (g << 4) | b;
    let tile = tileCache.get(key);
    if (!tile) {
      tile = document.createElement('canvas');
      tile.width = cellW;
      tile.height = cellH;
      const t = tile.getContext('2d');
      t.font = `700 ${Math.round(cellH * 0.9)}px ui-monospace, Menlo, Consolas, "Courier New", monospace`;
      t.textAlign = 'center';
      t.textBaseline = 'middle';
      t.fillStyle = `rgb(${r * 17},${g * 17},${b * 17})`; // 4-bit channel → 0..255
      t.fillText(RAMP[glyph], cellW / 2, cellH / 2 + cellH * 0.04);
      tileCache.set(key, tile);
    }
    return tile;
  }

  /** Stops any running animation and twinkle (safe to call at any time). */
  function stop() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    if (twinkleTimer !== null) clearInterval(twinkleTimer);
    frameId = null;
    twinkleTimer = null;
    restStars();
  }

  /** Puts every twinkling star back to its dim look. */
  function restStars() {
    for (const star of stars) {
      if (star.cell.tile === star.dim) continue;
      star.cell.tile = star.dim;
      ctx.clearRect(star.cell.x, star.cell.y, cellW, cellH);
      ctx.drawImage(star.dim, star.cell.x, star.cell.y);
    }
  }

  /**
   * The heavy step. Renders at `widthCss` CSS pixels and builds every cell. The page's CSS
   * decides how large the canvas is shown (it keeps its aspect ratio).
   */
  function prepare(widthCss) {
    stop();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(3, Math.round((widthCss * dpr) / columns)); // device px per character
    const ch = Math.round(cw * CELL_RATIO);
    const cols = Math.floor((widthCss * dpr) / cw);
    const rows = Math.round((cols * cw * STAGE_ASPECT) / ch);
    cellW = cw;
    cellH = ch;
    canvas.width = cols * cw;
    canvas.height = rows * ch;
    tileCache.clear();

    // 1. Draw the vector bouquet on the hidden canvas (SUPERSAMPLE pixels per cell).
    scene.width = cols * SUPERSAMPLE;
    scene.height = rows * SUPERSAMPLE;
    sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    sceneCtx.clearRect(0, 0, scene.width, scene.height);
    // Scene units → hidden-canvas pixels. Cells are not square, so x and y scale differently.
    const sx = (cols * SUPERSAMPLE) / SCENE_WIDTH;
    const sy = (cols * cw * SUPERSAMPLE) / (SCENE_WIDTH * ch);
    sceneCtx.setTransform(sx, 0, 0, sy, 0, 0);
    const meta = drawBouquet(sceneCtx, options);
    const pixels = sceneCtx.getImageData(0, 0, scene.width, scene.height).data;

    // 2. Average each cell, choose its character and colour, and give it a reveal time.
    cells = [];
    const samples = SUPERSAMPLE * SUPERSAMPLE;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let weight = 0, red = 0, green = 0, blue = 0;
        for (let y = 0; y < SUPERSAMPLE; y++) {
          for (let x = 0; x < SUPERSAMPLE; x++) {
            const i = ((row * SUPERSAMPLE + y) * scene.width + col * SUPERSAMPLE + x) * 4;
            const a = pixels[i + 3] / 255;
            weight += a;
            red += pixels[i] * a;
            green += pixels[i + 1] * a;
            blue += pixels[i + 2] * a;
          }
        }
        const coverage = weight / samples;
        const noise = cellNoise(col, row);
        const px = col * cw, py = row * ch;
        if (coverage < 0.12) {
          // empty space: sprinkle a few dim "stars" that fade in during the animation
          if (noise < 0.018) {
            cells.push({ x: px, y: py, tile: getTile(0, 10, 10, 13), t: 0.05 + cellNoise(row, col) * 0.9, star: true });
          }
          continue;
        }
        red /= weight; green /= weight; blue /= weight;
        const peak = Math.max(red, green, blue, 1);
        if (peak < 14) continue; // pure-black halo cells: invisible, so don't draw them
        const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
        // Dark pixels (petal outlines, shadows) become sparse characters, so shapes stay readable.
        const density = Math.pow(coverage, 0.6) * Math.pow(luminance, 0.65);
        let glyph = Math.round(density * (RAMP.length - 1) + (noise - 0.5) * 0.8);
        glyph = Math.max(0, Math.min(RAMP.length - 1, glyph));
        // Full-brightness colour (density carries the shading); capped so near-black stays dark.
        const lift = Math.min(3, 255 / peak);
        const tile = getTile(glyph, Math.min(255, red * lift) >> 4, Math.min(255, green * lift) >> 4, Math.min(255, blue * lift) >> 4);
        const ux = ((col + 0.5) / cols) * SCENE_WIDTH;
        const uy = ((row + 0.5) * ch * SCENE_WIDTH) / (cols * cw);
        cells.push({ x: px, y: py, tile, t: revealTime(ux, uy, noise, green > red * 1.08 && green > blue * 1.08, meta), star: false });
      }
    }
    cells.sort((a, b) => a.t - b.t);
    const brightStar = getTile(1, 12, 12, 15);
    stars = cells.filter(c => c.star).map(cell => ({ cell, dim: cell.tile, bright: brightStar }));
    next = 0;
    prepared = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /** Stamps every cell whose reveal time has passed that isn't on the canvas yet. */
  function drawUpTo(progress) {
    while (next < cells.length && cells[next].t <= progress) {
      const c = cells[next++];
      ctx.drawImage(c.tile, c.x, c.y);
    }
  }

  /** Draws the bouquet as it looks at `progress` (0 = nothing, 1 = finished) with no animation. */
  function showAt(progress = 1) {
    if (!prepared) return;
    stop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    next = 0;
    drawUpTo(progress);
  }

  /** Makes a few already-visible stars flash brighter, then dim again. */
  function twinkleStep() {
    for (let n = 0; n < 4; n++) {
      const star = stars[Math.floor(Math.random() * stars.length)];
      if (!star || star.cell.t > cells[Math.max(0, next - 1)].t) continue; // not revealed yet
      const brighten = star.cell.tile === star.dim;
      star.cell.tile = brighten ? star.bright : star.dim;
      ctx.clearRect(star.cell.x, star.cell.y, cellW, cellH);
      ctx.drawImage(star.cell.tile, star.cell.x, star.cell.y);
    }
  }

  /**
   * Grows the bouquet over `duration` ms. Time-based, so a slow phone draws more cells per
   * frame instead of running late. Afterwards the stars twinkle gently for TWINKLE_MS.
   * @param {{duration?:number, onProgress?:(p:number)=>void, twinkle?:boolean}} opts
   */
  function play({ duration = 4600, onProgress, twinkle = true } = {}) {
    if (!prepared) return;
    stop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    next = 0;
    const started = performance.now();
    function frame(now) {
      const progress = clamp01((now - started) / duration);
      drawUpTo(progress);
      onProgress?.(progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(frame);
      } else {
        frameId = null;
        if (twinkle) {
          const twinkleEnds = performance.now() + TWINKLE_MS;
          twinkleTimer = setInterval(() => {
            if (performance.now() > twinkleEnds) stop(); // rest after a while
            else if (!document.hidden) twinkleStep();
          }, 180);
        }
      }
    }
    frameId = requestAnimationFrame(frame);
  }

  return { prepare, play, showAt, stop };
}
