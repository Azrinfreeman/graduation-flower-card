/**
 * flowerShapes.js — original vector flower painters (no images, no libraries).
 *
 * This file only answers "WHAT does the bouquet look like?". It draws smooth
 * shapes onto a normal 2D canvas. asciiBouquet.js then turns that picture into
 * text characters.
 *
 * The bouquet is drawn in a fixed 1000 × 1200 "scene unit" space, so the same
 * code works at any resolution. Each painter draws one flower centred on the
 * canvas origin (0, 0); the caller moves/rotates the canvas first.
 */

const TAU = Math.PI * 2;
export const SCENE_WIDTH = 1000;
export const SCENE_HEIGHT = 1100;

/** Default petal colours (inspired by a mixed lily bouquet). Override in config later. */
export const DEFAULT_COLORS = [
  '#e0283c', // red
  '#d63fa6', // magenta
  '#f3e6d6', // cream
  '#f2c230', // yellow
  '#f4a37a', // peach
  '#9c1f38', // crimson
  '#b57edc', // lavender
];

/** Small seeded random generator so the same seed always gives the same bouquet. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- colour helpers ---------- */

function parseHex(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toCss(c) {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}
function blend(a, b, t) {
  return a.map((v, i) => v + (b[i] - v) * t);
}

/**
 * Keeps only valid '#rrggbb' or '#rgb' colours (expanding '#rgb'). A mistyped colour in
 * config.js is skipped with a console warning; an empty result falls back to the defaults.
 */
function validColors(list) {
  const valid = [];
  for (const value of Array.isArray(list) ? list : []) {
    const text = String(value).trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) valid.push(text);
    else if (/^#[0-9a-f]{3}$/i.test(text)) valid.push('#' + [...text.slice(1)].map(c => c + c).join(''));
    else console.warn(`Ignoring bouquet colour "${value}" (use a hex colour like #e0283c).`);
  }
  return valid.length ? valid : DEFAULT_COLORS;
}

/** Builds shade variants (dark → light) from ONE base colour such as '#d63fa6'. */
export function makePalette(hex) {
  const base = parseHex(hex);
  return {
    deep: toCss(blend(base, [30, 0, 20], 0.5)),
    main: toCss(base),
    light: toCss(blend(base, [255, 255, 255], 0.38)),
    tip: toCss(blend(base, [255, 255, 255], 0.7)),
    line: 'rgba(35, 0, 22, 0.5)', // thin outline that separates overlapping petals
  };
}

const GREENS = ['#2f8a47', '#4aa35a', '#6dbb5c', '#3a8a3f'].map(makePalette);

/* ---------- shape helpers ---------- */

/** Pointed leaf/petal shape: base at (0,0), tip at (bend, -len), pointing "up". */
function lanceolate(ctx, len, width, bend = 0) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-width, -len * 0.25, -width * 0.8 + bend, -len * 0.75, bend, -len);
  ctx.bezierCurveTo(width * 0.8 + bend, -len * 0.75, width, -len * 0.25, 0, 0);
  ctx.closePath();
}

/** Darkens one half of the current petal path so petals look folded along the mid-rib. */
function shadeFold(ctx, len) {
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(0, -len * 1.1, len, len * 1.2);
  ctx.restore();
}

function dot(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

/* ---------- flowers ---------- */

/** Lily: 6 pointed, slightly curled petals with a dark mid-rib, throat glow and stamens. */
function paintLily(ctx, s, pal, rnd) {
  const len = 185 * s;
  ctx.scale(1, 0.8 + rnd() * 0.2); // seen slightly from the side
  const spots = rnd() < 0.6;
  for (let pass = 0; pass < 2; pass++) { // pass 0 = three outer petals, pass 1 = three inner
    for (let k = 0; k < 3; k++) {
      const angle = (pass * 60 + k * 120 + (rnd() - 0.5) * 12) * (Math.PI / 180);
      const l = len * (pass ? 0.92 : 1);
      const w = l * (pass ? 0.24 : 0.27);
      const bend = (k % 2 ? 1 : -1) * l * 0.07;
      ctx.save();
      ctx.rotate(angle);
      lanceolate(ctx, l, w, bend);
      const g = ctx.createLinearGradient(0, 0, 0, -l);
      g.addColorStop(0, pal.deep);
      g.addColorStop(0.3, pal.main);
      g.addColorStop(0.8, pal.light);
      g.addColorStop(1, pal.tip);
      ctx.fillStyle = g;
      ctx.fill();
      shadeFold(ctx, l);
      ctx.lineWidth = 8;
      ctx.strokeStyle = pal.line;
      ctx.stroke();
      // mid-rib
      ctx.beginPath();
      ctx.moveTo(0, -l * 0.06);
      ctx.quadraticCurveTo(bend * 0.3, -l * 0.5, bend * 0.9, -l * 0.88);
      ctx.lineWidth = 8;
      ctx.strokeStyle = pal.deep;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (spots) {
        for (let j = 0; j < 8; j++) {
          dot(ctx, (rnd() - 0.5) * w * 0.8, -l * (0.2 + rnd() * 0.4), 4, 'rgba(60,0,30,.55)');
        }
      }
      ctx.restore();
    }
  }
  // warm glow where the petals meet
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, len * 0.22);
  glow.addColorStop(0, 'rgba(238,226,120,.95)');
  glow.addColorStop(1, 'rgba(238,226,120,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, len * 0.22, 0, TAU);
  ctx.fill();
  // six stamens with dark anthers, plus one longer pistil
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 + 30) * (Math.PI / 180) + (rnd() - 0.5) * 0.2;
    const r = len * (0.34 + rnd() * 0.1);
    const ex = Math.sin(a) * r;
    const ey = -Math.cos(a) * r;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f6e7b0';
    ctx.stroke();
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 14, 0, 0, TAU);
    ctx.fillStyle = '#7a3412';
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.06, -len * 0.5);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#e9d27a';
  ctx.stroke();
  dot(ctx, len * 0.06, -len * 0.5, 7, '#e9d27a');
}

/** Rose / peony: rings of rounded petals, outer rings lighter, centre darker. */
function paintRose(ctx, s, pal, rnd) {
  const R = 120 * s;
  const rings = [
    { n: 7, d: 0.55, r: 0.52, col: pal.light },
    { n: 6, d: 0.4, r: 0.45, col: pal.main },
    { n: 5, d: 0.26, r: 0.36, col: pal.main },
    { n: 4, d: 0.13, r: 0.28, col: pal.deep },
  ];
  for (const ring of rings) {
    const phase = rnd() * TAU;
    for (let i = 0; i < ring.n; i++) {
      const a = phase + (i / ring.n) * TAU;
      const pr = R * ring.r;
      ctx.save();
      ctx.translate(Math.cos(a) * R * ring.d, Math.sin(a) * R * ring.d);
      ctx.rotate(a + Math.PI / 2); // local "up" now points away from the flower centre
      ctx.beginPath();
      ctx.ellipse(0, 0, pr, pr * 0.82, 0, 0, TAU);
      const g = ctx.createLinearGradient(0, -pr, 0, pr);
      g.addColorStop(0, ring.col);
      g.addColorStop(1, pal.deep); // inner side is in the shadow of the next ring
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 7;
      ctx.strokeStyle = pal.line;
      ctx.stroke();
      ctx.restore();
    }
  }
  // little spiral in the heart of the rose
  ctx.strokeStyle = pal.deep;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.12, 0.2, TAU - 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(R * 0.02, 0, R * 0.2, 3.4, TAU + 1.2);
  ctx.stroke();
}

/** Daisy: two rings of thin petals around a yellow dotted centre. */
function paintDaisy(ctx, s, pal, rnd) {
  const R = 135 * s;
  const n = 15;
  for (let layer = 0; layer < 2; layer++) {
    const scale = layer ? 0.9 : 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + layer * (TAU / n / 2) + (rnd() - 0.5) * 0.08;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.64 * scale, R * 0.12, R * 0.36 * scale, 0, 0, TAU);
      const g = ctx.createLinearGradient(0, -R * 0.2, 0, -R);
      g.addColorStop(0, pal.main);
      g.addColorStop(1, pal.tip);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = pal.line;
      ctx.stroke();
      ctx.restore();
    }
  }
  const disc = ctx.createRadialGradient(0, -R * 0.04, 0, 0, 0, R * 0.22);
  disc.addColorStop(0, '#f8d54a');
  disc.addColorStop(1, '#c4791c');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.22, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    dot(ctx, Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12, 3.5, '#7a4a10');
  }
}

/** Tulip: a cup of three petals. Drawn pointing "up", centred on the origin. */
function paintTulip(ctx, s, pal) {
  const len = 200 * s;
  ctx.translate(0, len * 0.5); // cup base sits at the stem, cup tip points up
  const petals = [
    { angle: -13, width: 0.4, from: pal.deep, to: pal.main },
    { angle: 13, width: 0.4, from: pal.deep, to: pal.main },
    { angle: 0, width: 0.46, from: pal.main, to: pal.tip },
  ];
  for (const petal of petals) {
    ctx.save();
    ctx.rotate(petal.angle * (Math.PI / 180));
    lanceolate(ctx, len, len * petal.width);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, petal.from);
    g.addColorStop(0.75, petal.to);
    g.addColorStop(1, pal.tip);
    ctx.fillStyle = g;
    ctx.fill();
    shadeFold(ctx, len);
    ctx.lineWidth = 8;
    ctx.strokeStyle = pal.line;
    ctx.stroke();
    ctx.restore();
  }
}

/** A closed bud with two small green sepals. */
function paintBud(ctx, s, pal) {
  const len = 110 * s;
  ctx.translate(0, len * 0.5);
  for (const angle of [-38, 38]) {
    ctx.save();
    ctx.rotate(angle * (Math.PI / 180));
    paintLeafShape(ctx, len * 0.6, len * 0.14, GREENS[1]);
    ctx.restore();
  }
  lanceolate(ctx, len, len * 0.5);
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  g.addColorStop(0, pal.deep);
  g.addColorStop(0.6, pal.main);
  g.addColorStop(1, pal.light);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = pal.line;
  ctx.stroke();
}

export const FLOWER_PAINTERS = { lily: paintLily, rose: paintRose, daisy: paintDaisy, tulip: paintTulip, bud: paintBud };
/**
 * Roughly how far each flower reaches from its centre at size 1 (scene units).
 * The text renderer uses this to time how each flower opens outwards.
 */
const FLOWER_EXTENT = { lily: 185, rose: 130, daisy: 138, tulip: 105, bud: 65 };
/** These flower types sit on top of the stem and should follow its direction. */
const FOLLOWS_STEM = new Set(['tulip', 'bud']);

/* ---------- foliage ---------- */

export function paintLeafShape(ctx, len, width, green) {
  lanceolate(ctx, len, width);
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  g.addColorStop(0, green.deep);
  g.addColorStop(1, green.light);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(8,40,16,.7)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.05);
  ctx.lineTo(0, -len * 0.85);
  ctx.lineWidth = 3;
  ctx.strokeStyle = green.tip;
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A tapering grass blade from (x0,y0) curving to a tip (x1,y1). */
function paintBlade(ctx, x0, y0, x1, y1, cx, cy, width, green) {
  ctx.beginPath();
  ctx.moveTo(x0 - width / 2, y0);
  ctx.quadraticCurveTo(cx - width * 0.3, cy, x1, y1);
  ctx.quadraticCurveTo(cx + width * 0.3, cy, x0 + width / 2, y0);
  ctx.closePath();
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, green.deep);
  g.addColorStop(1, green.light);
  ctx.fillStyle = g;
  ctx.fill();
}

/** Baby's-breath: a thin branching spray ending in a cloud of tiny white blooms. */
function paintSpray(ctx, base, tip, rnd) {
  const mid = { x: (base.x + tip.x) / 2 + (rnd() - 0.5) * 60, y: (base.y + tip.y) / 2 };
  ctx.strokeStyle = '#6fae6c';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rnd();
    const r = 55 + rnd() * 50;
    const ex = tip.x + Math.cos(a) * r;
    const ey = tip.y + Math.sin(a) * r * 0.8;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      dot(ctx, ex + (rnd() - 0.5) * 36, ey + (rnd() - 0.5) * 36, 9 + rnd() * 4, 'rgba(250,240,245,.92)');
    }
  }
}

/* ---------- the bouquet ---------- */

/**
 * Flower positions, drawn back-to-front. `pref` lists the flower types that suit each
 * spot, best first; the first one present in the chosen mix is used. Lilies get the
 * prominent spots, as in the reference.
 */
const SLOTS = [
  { x: 300, y: 215, s: 0.62, pref: ['tulip', 'daisy', 'lily'] },
  { x: 705, y: 200, s: 0.62, pref: ['daisy', 'tulip', 'lily'] },
  { x: 185, y: 405, s: 0.78, pref: ['lily', 'rose', 'daisy'] },
  { x: 820, y: 395, s: 0.78, pref: ['rose', 'daisy', 'lily'] },
  { x: 505, y: 280, s: 0.9, pref: ['lily'] },
  { x: 285, y: 575, s: 0.82, pref: ['daisy', 'lily', 'rose'] },
  { x: 725, y: 570, s: 0.82, pref: ['lily', 'rose', 'daisy'] },
  { x: 505, y: 510, s: 1.0, pref: ['lily', 'rose'] },
];
const BUD_SLOTS = [{ x: 190, y: 235, s: 0.7 }, { x: 815, y: 215, s: 0.7 }];

const BASE = { x: 500, y: 1000 };

/** Point on a quadratic curve at t (0 = base, 1 = flower). */
function curvePoint(p0, c, p2, t) {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y };
}
/** Angle of the curve at t, measured clockwise from straight up. */
function curveAngle(p0, c, p2, t) {
  const dx = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p2.x - c.x);
  const dy = 2 * (1 - t) * (c.y - p0.y) + 2 * t * (p2.y - c.y);
  return Math.atan2(dx, -dy);
}

function paintStemWithLeaves(ctx, head, rnd) {
  const start = { x: BASE.x + (head.x - BASE.x) * 0.08 + (rnd() - 0.5) * 24, y: BASE.y };
  const dist = Math.hypot(head.x - start.x, head.y - start.y);
  const side = rnd() < 0.5 ? -1 : 1;
  const mid = { x: (start.x + head.x) / 2, y: (start.y + head.y) / 2 };
  const control = { x: mid.x + side * dist * 0.06, y: mid.y }; // slight natural bend
  // leaves first, so the stem sits on top of their base
  [0.5, 0.72].forEach((t, i) => {
    const p = curvePoint(start, control, head, t);
    const angle = curveAngle(start, control, head, t) + (i % 2 ? 1 : -1) * 0.95;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    paintLeafShape(ctx, 105 + rnd() * 40, 30 + rnd() * 8, GREENS[Math.floor(rnd() * GREENS.length)]);
    ctx.restore();
  });
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.quadraticCurveTo(control.x, control.y, head.x, head.y);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#3f9a45';
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(190,245,150,.7)'; // light edge so the stem reads as round
  ctx.stroke();
  return curveAngle(start, control, head, 1);
}

/**
 * Draws the whole bouquet onto `ctx`, which must already be scaled so that the
 * scene fits 1000 × 1200 units.
 * @param {{seed?:number, mix?:string[], colors?:string[]}} options
 * @returns {{flowers: {x:number, y:number, radius:number}[], baseY:number}}
 *   where each flower head is, so an animation can grow stems up to them and open them.
 */
export function drawBouquet(ctx, options = {}) {
  const seed = options.seed ?? 7;
  const wanted = (options.mix ?? []).filter(t => t in FLOWER_PAINTERS && t !== 'bud');
  const mix = wanted.length ? wanted : ['lily', 'rose', 'daisy', 'tulip']; // unknown/empty list -> default
  const colorList = validColors(options.colors);
  const rnd = mulberry32(seed);

  // Shuffle the colours once so neighbours differ, then cycle through them.
  const colors = [...colorList];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  const palettes = colors.map(makePalette);

  // 1. grass blades behind everything
  for (let i = 0; i < 14; i++) {
    const x0 = 430 + rnd() * 140;
    const x1 = 500 + (rnd() - 0.5) * 600;
    const y1 = 760 + rnd() * 260;
    paintBlade(ctx, x0, BASE.y + 10, x1, y1, (x0 + x1) / 2 + (rnd() - 0.5) * 60, (BASE.y + y1) / 2, 10, GREENS[i % GREENS.length]);
  }

  // 2. baby's-breath sprays
  for (const tip of [{ x: 100, y: 290 }, { x: 905, y: 300 }, { x: 560, y: 70 }]) {
    paintSpray(ctx, { x: BASE.x, y: BASE.y }, tip, rnd);
  }

  // 3. buds on long stems, then flowers back to front
  const items = [
    ...BUD_SLOTS.map(slot => ({ ...slot, type: 'bud' })),
    ...SLOTS.map((slot, i) => ({ ...slot, type: slot.pref.find(t => mix.includes(t)) ?? mix[i % mix.length] })),
  ];
  // Each flower head is painted on its own layer first, then stamped onto the scene with
  // ONE dark glow around its silhouette. Where flowers overlap, that glow becomes empty
  // space in the text version, so every flower stays readable. (shadowBlur ignores the
  // canvas transform, so scene units are converted to pixels with the x-scale.)
  const layer = document.createElement('canvas');
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const layerCtx = layer.getContext('2d');
  const sceneTransform = ctx.getTransform();

  const flowers = [];
  items.forEach((item, i) => {
    const head = { x: item.x + (rnd() - 0.5) * 30, y: item.y + (rnd() - 0.5) * 24 };
    const size = item.s * (0.92 + rnd() * 0.16);
    const stemAngle = paintStemWithLeaves(ctx, head, rnd);
    flowers.push({ x: head.x, y: head.y, radius: FLOWER_EXTENT[item.type] * size });

    layerCtx.setTransform(1, 0, 0, 1, 0, 0);
    layerCtx.clearRect(0, 0, layer.width, layer.height);
    layerCtx.setTransform(sceneTransform);
    layerCtx.translate(head.x, head.y);
    layerCtx.rotate(FOLLOWS_STEM.has(item.type) ? stemAngle : rnd() * TAU);
    FLOWER_PAINTERS[item.type](layerCtx, size, palettes[i % palettes.length], rnd);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = 'rgba(0,0,0,.85)';
    ctx.shadowBlur = 12 * sceneTransform.a;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  });

  // 4. broad leaves at the bottom hide where the stems meet
  [-64, -38, 38, 64].forEach(deg => {
    ctx.save();
    ctx.translate(BASE.x + deg * 0.4, BASE.y - 10);
    ctx.rotate(deg * (Math.PI / 180));
    paintLeafShape(ctx, 140, 45, GREENS[Math.abs(deg) % GREENS.length]);
    ctx.restore();
  });

  return { flowers, baseY: BASE.y };
}
