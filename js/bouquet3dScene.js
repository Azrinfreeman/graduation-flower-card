import { mulberry32 } from './flowerShapes.js';

const TURN = 2 * Math.PI;
const BASE = { x: 0, y: -1.29, z: 0 };
const STEM_SPAN = .38;

// Default world coordinates for the classic wildflower meadow (y up, +z forward).
const WILDFLOWERS = [
  { kind: 'lupine', x: -.28, y: .89, z: -.46, size: .34, tilt: .36 },
  { kind: 'lupine', x: .60, y: .82, z: -.45, size: .43, tilt: -.25 },
  { kind: 'lupine', x: .27, y: .97, z: .28, size: .33, tilt: -.08 },
  { kind: 'daisy', x: -.38, y: .77, z: .38, size: .27, tilt: -.28 },
  { kind: 'daisy', x: .65, y: .20, z: .50, size: .26, tilt: .33 },
  { kind: 'daisy', x: -.46, y: .28, z: -.70, size: .21, tilt: -2.16 },
  { kind: 'poppy', x: -.77, y: .40, z: .29, size: .31, tilt: -.42 },
  { kind: 'poppy', x: .74, y: .56, z: -.08, size: .28, tilt: 1.32 },
  { kind: 'poppy', x: .24, y: .56, z: -.66, size: .27, tilt: 2.87 },
  { kind: 'cornflower', x: -.36, y: .22, z: .63, size: .22, tilt: -.38 },
  { kind: 'cornflower', x: -.78, y: .79, z: -.25, size: .15, tilt: -1.41 },
  { kind: 'cornflower', x: .49, y: .05, z: -.64, size: .19, tilt: 2.17 },
  { kind: 'lily', x: .14, y: .49, z: .79, size: .33, tilt: .18 },
  { kind: 'lily', x: -.05, y: .83, z: -.36, size: .26, tilt: 2.74 },
  { kind: 'blush', x: -.64, y: -.09, z: .40, size: .14, tilt: -.69 },
  { kind: 'blush', x: .68, y: .44, z: -.46, size: .13, tilt: 2.14 },
  { kind: 'gold', x: -.83, y: .15, z: -.30, size: .13, tilt: -1.22 },
  { kind: 'gold', x: .40, y: .75, z: .35, size: .11, tilt: .47 },
  { kind: 'gold', x: .08, y: .17, z: -.82, size: .15, tilt: 3.18 },
];

const BLOOMS = {
  poppy:      { petals: 5, width: .46, cup: .32, color: 'poppy', center: 'seed', core: .25 },
  daisy:      { petals: 12, width: .135, cup: .08, color: 'daisy', center: 'pollen', core: .25 },
  cornflower: { petals: 10, width: .17, cup: .18, color: 'cornflower', center: 'indigo', core: .20 },
  lily:       { petals: 6, width: .18, cup: -.16, color: 'lily', center: 'pollen', core: .15 },
  blush:      { petals: 5, width: .28, cup: .10, color: 'blush', center: 'pollen', core: .21 },
  gold:       { petals: 7, width: .19, cup: .12, color: 'gold', center: 'amber', core: .23 },
};

const DEFAULT_COLORS = {
  // Wildflower meadow
  poppy: [246, 71, 82], seed: [116, 57, 76], daisy: [254, 240, 209], pollen: [251, 180, 59],
  cornflower: [122, 186, 250], indigo: [141, 112, 224], lily: [249, 156, 210], blush: [235, 111, 168],
  gold: [245, 206, 108], amber: [215, 127, 55], lupine: [176, 138, 234], lupineTip: [213, 164, 236],
  // Velvet roses
  roseCrimson: [232, 36, 68], roseDeep: [148, 18, 48], roseCore: [88, 10, 28], roseBlush: [248, 104, 144], roseCream: [246, 198, 188],
  ribbon: [236, 76, 100], roseLeaf: [58, 142, 84],
  // Sunflowers & daisies
  sunflowerGold: [248, 174, 18], sunflowerBright: [255, 210, 56], sunflowerCore: [92, 46, 24], sunflowerRing: [216, 128, 32],
  // Spring tulips
  tulipRed: [244, 66, 86], tulipCoral: [255, 128, 96], tulipYellow: [254, 212, 74],
  tulipPink: [248, 126, 178], tulipViolet: [186, 134, 244], tulipCream: [254, 240, 224],
  // Sakura branch (richer pinks so the renderer's brightness lift keeps them glowing pink, not white)
  bark: [134, 92, 70], sakuraPink: [255, 108, 154], sakuraPale: [255, 158, 192],
  sakuraCore: [224, 52, 108], sakuraPetal: [255, 132, 172],
  // Stargazer lilies & lavender
  stargazer: [246, 104, 162], stargazerEdge: [255, 218, 234], anther: [208, 94, 48],
  lavender: [168, 126, 242], lavenderTip: [212, 182, 255], babysBreath: [246, 242, 252],
  // Shared foliage & accents
  stem: [78, 140, 98], leaf: [92, 163, 107], tie: [211, 157, 101], spark: [190, 150, 136],
};

function makeColors(overrides = {}) {
  const colors = { ...DEFAULT_COLORS };
  for (const [name, hex] of Object.entries(overrides)) {
    if (!Object.hasOwn(colors, name) || !/^#[\da-f]{6}$/i.test(hex)) {
      continue;
    }
    colors[name] = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
  }
  if (colors.lupine !== DEFAULT_COLORS.lupine && colors.lupineTip === DEFAULT_COLORS.lupineTip) {
    colors.lupineTip = colors.lupine.map(channel => channel + (255 - channel) * .28);
  }
  return colors;
}

// Points from one leaf, petal or cluster share a growth origin and an easing calculation.
function addGrowth(scene, origin, start, duration) {
  const growth = { index: scene.growth.length, origin, start, duration };
  scene.growth.push(growth);
  return growth;
}

function unit(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

function flowerFace(flower, upBias = .5) {
  const right = { x: Math.cos(flower.tilt), y: 0, z: -Math.sin(flower.tilt) };
  const normal = unit(Math.sin(flower.tilt), upBias, Math.cos(flower.tilt));
  const up = { x: normal.y * right.z, y: Math.hypot(normal.x, normal.z), z: -normal.y * right.x };
  return { origin: flower, right, up, normal };
}

function addOnFace(points, face, x, y, lift, color, shade, growth) {
  const { origin, right, up, normal } = face;
  points.push({
    x: origin.x + right.x * x + up.x * y + normal.x * lift,
    y: origin.y + up.y * y + normal.y * lift,
    z: origin.z + right.z * x + up.z * y + normal.z * lift,
    normal, color, shade, growth,
  });
}

function stemAt(flower, progress) {
  const spread = progress * (.62 + .38 * progress);
  return {
    x: flower.x * spread,
    y: BASE.y + (flower.y - BASE.y) * progress,
    z: flower.z * spread,
  };
}

function addStem(scene, flower, index, start, random, { leafColor = 'leaf', leafCount = null, leafStyle = 'normal' } = {}) {
  const { points } = scene;
  const samples = Math.ceil((flower.y - BASE.y) / .015);
  for (let step = 0; step <= samples; step += 1) {
    const progress = step / samples;
    const point = stemAt(flower, progress);
    const radius = .012 - .006 * progress;
    for (let side = 0; side < 4; side += 1) {
      const angle = side * Math.PI / 2;
      const normal = { x: Math.cos(angle), y: 0, z: Math.sin(angle) };
      points.push({
        x: point.x + radius * normal.x, y: point.y, z: point.z + radius * normal.z,
        normal, color: 'stem', shade: .40 + .26 * progress, visibleAt: start + STEM_SPAN * progress,
      });
    }
  }

  const leaves = leafCount ?? (index % 3 === 0 ? 2 : 1);
  for (let leaf = 0; leaf < leaves; leaf += 1) {
    const progress = leafStyle === 'sword' ? (.26 + .16 * leaf + random() * .10) : (.47 + .21 * leaf + random() * .14);
    const origin = stemAt(flower, progress);
    const angle = flower.tilt + (leaf % 2 === 0 ? 1.05 : -1.05) + random() * .3;
    const growth = addGrowth(scene, origin, start + STEM_SPAN * progress, .19);
    if (leafStyle === 'sword') {
      addSwordLeaf(points, origin, angle, .62 + random() * .26, growth, leafColor);
    } else {
      addLeaf(points, origin, angle, .22 + random() * .19, growth, leafColor);
    }
  }
}

function addLeaf(points, origin, angle, length, growth, color = 'leaf') {
  const outward = { x: Math.sin(angle), z: Math.cos(angle) };
  const normal = unit(-outward.x, 1.2, -outward.z);
  for (let row = 0; row <= 22; row += 1) {
    const progress = row / 22;
    const width = .17 * length * Math.sin(Math.PI * progress) ** .85;
    for (let column = -4; column <= 4; column += 1) {
      const rib = column / 4;
      const across = rib * width;
      points.push({
        x: origin.x + outward.x * length * progress + outward.z * across,
        y: origin.y + length * (.52 * progress + .23 * Math.sin(progress * Math.PI)) - Math.abs(across) * .6,
        z: origin.z + outward.z * length * progress - outward.x * across,
        normal, color, shade: .48 + .22 * progress + .15 * (1 - Math.abs(rib)), growth,
      });
    }
  }
}

/** Long upright arching strap leaf (used for tulips and lilies). */
function addSwordLeaf(points, origin, angle, length, growth, color = 'leaf') {
  const outward = { x: Math.sin(angle), z: Math.cos(angle) };
  const normal = unit(-outward.x, .55, -outward.z);
  for (let row = 0; row <= 26; row += 1) {
    const progress = row / 26;
    const reach = length * (.38 * progress + .22 * progress ** 2);
    const rise = length * (1.02 * progress - .18 * progress ** 2);
    const width = .11 * length * Math.sin(Math.PI * progress) ** .72;
    for (let column = -3; column <= 3; column += 1) {
      const rib = column / 3;
      const across = rib * width;
      points.push({
        x: origin.x + outward.x * reach + outward.z * across,
        y: origin.y + rise - Math.abs(across) * .45,
        z: origin.z + outward.z * reach - outward.x * across,
        normal, color, shade: .42 + .30 * progress + .14 * (1 - Math.abs(rib)), growth,
      });
    }
  }
}

function addTie(points, color = 'tie', bands = 3, radius = .127) {
  for (let wrap = 0; wrap < bands; wrap += 1) {
    for (let sample = 0; sample < 72; sample += 1) {
      const angle = sample * TURN / 72;
      const normal = { x: Math.cos(angle), y: 0, z: Math.sin(angle) };
      points.push({
        x: normal.x * radius, y: -1.00 + wrap * .024 + sample * .0002, z: normal.z * radius,
        normal, color, shade: .74, visibleAt: .27 + wrap * .04 + sample * .001,
      });
    }
  }
}

function addSparks(points, random, color = 'spark', count = 32) {
  for (let star = 0; star < count; star += 1) {
    const angle = random() * TURN;
    const radius = .72 + .64 * random();
    points.push({
      x: Math.cos(angle) * radius, y: -.78 + random() * 2.1, z: Math.sin(angle) * radius,
      normal: { x: 0, y: 1, z: 0 }, color, shade: .28, visibleAt: .78 + star * .006,
    });
  }
}

/* ---------- 1. Wildflower blooms (classic preset) ---------- */

function addPetals(scene, flower, start, random) {
  const { points } = scene;
  const face = flowerFace(flower);
  const spec = BLOOMS[flower.kind];
  const phase = random() * TURN;
  for (let petal = 0; petal < spec.petals; petal += 1) {
    const angle = phase + petal * TURN / spec.petals;
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    const length = flower.size * (.90 + random() * .15);
    const growth = addGrowth(scene, flower, start + .17 * petal / spec.petals, .29);
    for (let row = 0; row <= 20; row += 1) {
      const progress = row / 20;
      let profile = Math.sin(Math.PI * progress) ** .67;
      if (flower.kind === 'poppy') {
        profile = Math.sin(2.2 * progress) ** .92;
      }
      for (let column = -8; column <= 8; column += 1) {
        const rib = column / 8;
        const across = rib * spec.width * length * profile;
        const radial = length * (.14 + .86 * progress);
        const ripple = Math.sin(5 * rib + petal) * progress ** 3 * .06;
        const lift = length * (spec.cup * progress ** 2 + .16 * Math.sin(Math.PI * progress) + ripple);
        const shade = .40 + progress * .29 + .10 * (1 - Math.abs(rib)) + .12 * ripple;
        addOnFace(points, face, radial * cosine - across * sine, radial * sine + across * cosine,
          lift, spec.color, shade, growth);
      }
    }
  }

  const centerGrowth = addGrowth(scene, flower, start, .17);
  for (let sample = 0; sample < 128; sample += 1) {
    const angle = sample * 2.399963;
    const radial = Math.sqrt(sample / 128);
    const radius = flower.size * spec.core * radial;
    const lift = flower.size * (.04 + .12 * (1 - radial ** 2));
    addOnFace(points, face, radius * Math.cos(angle), radius * Math.sin(angle), lift,
      spec.center, .43 + random() * .4, centerGrowth);
  }

  if (flower.kind === 'lily') {
    const stamenGrowth = addGrowth(scene, flower, start + .16, .23);
    for (let stamen = 0; stamen < 6; stamen += 1) {
      const angle = stamen * TURN / 6 + phase;
      for (let sample = 0; sample <= 9; sample += 1) {
        const fraction = sample / 9;
        const radial = flower.size * fraction * .31;
        addOnFace(points, face, radial * Math.cos(angle), radial * Math.sin(angle),
          flower.size * (.13 + .54 * fraction), 'pollen', fraction * .4 + .42, stamenGrowth);
      }
    }
  }
}

function addLupine(scene, flower, start, random, { color = 'lupine', tip = 'lupineTip', tiers = 8, slim = 1 } = {}) {
  const { points } = scene;
  for (let tier = 0; tier <= tiers; tier += 1) {
    const height = tier / tiers;
    const radius = flower.size * (.26 - .19 * height) * slim;
    const pods = tier > tiers * .62 ? 4 : 6;
    const origin = { x: flower.x, y: flower.y + flower.size * height * .96, z: flower.z };
    const growth = addGrowth(scene, origin, start + height * .22, .22);
    for (let pod = 0; pod < pods; pod += 1) {
      const tilt = pod * TURN / pods + tier * .47;
      const point = {
        x: flower.x + Math.sin(tilt) * radius,
        y: flower.y + flower.size * height * .96,
        z: flower.z + Math.cos(tilt) * radius,
        tilt,
      };
      const face = flowerFace(point);
      const podColor = tier > tiers * .62 ? tip : color;
      const sampleCount = slim < .8 ? 22 : 38;
      for (let sample = 0; sample < sampleCount; sample += 1) {
        const angle = sample * 2.399963;
        const spread = Math.sqrt(sample / sampleCount);
        const size = flower.size * (.15 - .055 * height) * (slim < .8 ? .82 : 1);
        addOnFace(points, face, size * spread * Math.cos(angle), size * 1.2 * spread * Math.sin(angle),
          size * (1 - spread ** 2), podColor, .47 + random() * .35, growth);
      }
    }
  }
}

/* ---------- 2. Velvet Roses (concentric spiral-layered 3D petals) ---------- */

function addRose(scene, flower, start, random) {
  const { points } = scene;
  const face = flowerFace(flower, .65);
  const phase = random() * TURN;
  const baseColor = flower.color || 'roseCrimson';
  const innerColor = flower.inner || baseColor;
  // Four concentric rings: dark tight bud core opening into sculpted layered petals.
  const rings = [
    { petals: 4, r0: .04, len: .32, width: .48, rise: .76, curl: -.08, shadeOff: -.18, color: 'roseCore', rows: 9, cols: 5 },
    { petals: 5, r0: .13, len: .54, width: .52, rise: .54, curl: .04, shadeOff: -.08, color: innerColor, rows: 11, cols: 5 },
    { petals: 6, r0: .22, len: .78, width: .52, rise: .30, curl: .16, shadeOff: .04, color: baseColor, rows: 12, cols: 6 },
    { petals: 7, r0: .28, len: 1.00, width: .48, rise: .08, curl: .26, shadeOff: .14, color: baseColor, rows: 12, cols: 6 },
  ];

  rings.forEach((ring, ringIdx) => {
    const ringPhase = phase + ringIdx * .72;
    for (let petal = 0; petal < ring.petals; petal += 1) {
      const angle = ringPhase + petal * TURN / ring.petals;
      const sine = Math.sin(angle);
      const cosine = Math.cos(angle);
      const length = flower.size * ring.len * (.94 + random() * .12);
      const growth = addGrowth(scene, flower, start + ringIdx * .055 + .04 * petal / ring.petals, .27);
      for (let row = 0; row <= ring.rows; row += 1) {
        const progress = row / ring.rows;
        const profile = Math.sin(Math.PI * Math.min(1, progress * .95)) ** .62;
        const radial = flower.size * ring.r0 + length * (.15 + .85 * progress);
        // Inner petals stand steeply up; outer petals arch up then roll back gently at the lip.
        const lift = length * (ring.rise * Math.sin(progress * Math.PI * .65) - ring.curl * Math.max(0, progress - .55) ** 2 * 2.2) + flower.size * .08 * (3 - ringIdx);
        for (let column = -ring.cols; column <= ring.cols; column += 1) {
          const rib = column / ring.cols;
          const across = rib * ring.width * length * profile;
          const cupCurve = -(rib * rib) * length * .10;
          const shade = .34 + progress * .36 + ring.shadeOff + .10 * (1 - Math.abs(rib));
          addOnFace(points, face, radial * cosine - across * sine, radial * sine + across * cosine,
            lift + cupCurve, ring.color, Math.max(.18, shade), growth);
        }
      }
    }
  });
}

function addBabysBreath(scene, flower, start, random) {
  const { points } = scene;
  const origin = { x: flower.x, y: flower.y, z: flower.z };
  const growth = addGrowth(scene, origin, start, .24);
  const sprays = 14;
  for (let i = 0; i < sprays; i += 1) {
    const theta = random() * TURN;
    const phi = (random() - .35) * Math.PI * .8;
    const dist = flower.size * (.35 + .65 * random());
    const cx = origin.x + Math.cos(theta) * Math.cos(phi) * dist;
    const cy = origin.y + Math.sin(phi) * dist;
    const cz = origin.z + Math.sin(theta) * Math.cos(phi) * dist;
    for (let dot = 0; dot < 12; dot += 1) {
      const a = dot * 2.399963;
      const r = .026 * Math.sqrt(dot / 12);
      points.push({
        x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, z: cz + (random() - .5) * .025,
        normal: { x: 0, y: 1, z: 0 }, color: 'babysBreath', shade: .62 + random() * .32, growth,
      });
    }
  }
}

/* ---------- 3. Sunflowers (double ray ring + textured spiral seed disk) ---------- */

function addSunflower(scene, flower, start, random) {
  const { points } = scene;
  const face = flowerFace(flower, .38);
  const phase = random() * TURN;
  // Two staggered rings of golden pointed ray petals.
  for (let layer = 0; layer < 2; layer += 1) {
    const petals = 15;
    const color = layer === 0 ? 'sunflowerGold' : 'sunflowerBright';
    for (let petal = 0; petal < petals; petal += 1) {
      const angle = phase + (petal + layer * .5) * TURN / petals;
      const sine = Math.sin(angle);
      const cosine = Math.cos(angle);
      const length = flower.size * (layer === 0 ? 1.02 : .90) * (.94 + random() * .10);
      const growth = addGrowth(scene, flower, start + layer * .05 + .14 * petal / petals, .26);
      for (let row = 0; row <= 15; row += 1) {
        const progress = row / 15;
        const profile = Math.sin(Math.PI * progress) ** .58 * (1 - .22 * progress);
        const radial = flower.size * .38 + length * .62 * progress;
        const lift = length * ((layer === 0 ? -.08 : .06) * progress + .09 * Math.sin(Math.PI * progress));
        for (let column = -4; column <= 4; column += 1) {
          const rib = column / 4;
          const across = rib * .155 * length * profile;
          const shade = .42 + progress * .34 + .12 * (1 - Math.abs(rib));
          addOnFace(points, face, radial * cosine - across * sine, radial * sine + across * cosine,
            lift, color, shade, growth);
        }
      }
    }
  }

  // Broad domed Fibonacci-spiral seed head with golden pollen halo.
  const centerGrowth = addGrowth(scene, flower, start, .20);
  for (let sample = 0; sample < 260; sample += 1) {
    const angle = sample * 2.399963;
    const radial = Math.sqrt(sample / 260);
    const radius = flower.size * .43 * radial;
    const lift = flower.size * (.06 + .16 * (1 - radial ** 2));
    const isHalo = radial > .78;
    addOnFace(points, face, radius * Math.cos(angle), radius * Math.sin(angle), lift,
      isHalo ? 'sunflowerRing' : 'sunflowerCore',
      (isHalo ? .52 : .32) + random() * .34, centerGrowth);
  }
}

/* ---------- 4. Spring Tulips (upright goblet cup silhouette) ---------- */

function addTulip(scene, flower, start, random) {
  const { points } = scene;
  // Build each tulip around a tilted vertical axis so its goblet points skyward.
  const leanX = flower.x * .22;
  const leanZ = flower.z * .22;
  const axis = unit(leanX, 1, leanZ);
  const sideA = unit(axis.z, 0, -axis.x || 1);
  const sideB = unit(
    axis.y * sideA.z - axis.z * sideA.y,
    axis.z * sideA.x - axis.x * sideA.z,
    axis.x * sideA.y - axis.y * sideA.x,
  );
  const phase = random() * TURN;
  const height = flower.size * 1.48;
  const maxRadius = flower.size * .56;

  // 3 inner + 3 outer overlapping cupped petals curving upward and gently inward at the rim.
  for (let pass = 0; pass < 2; pass += 1) {
    for (let k = 0; k < 3; k += 1) {
      const centerAngle = phase + pass * (Math.PI / 3) + k * (TURN / 3);
      const radialBoost = pass === 0 ? .88 : 1.03;
      const growth = addGrowth(scene, flower, start + pass * .07 + k * .04, .28);
      for (let row = 0; row <= 20; row += 1) {
        const progress = row / 20;
        // Classic tulip profile: narrow base -> full rounded belly -> softly tucked rim.
        const r = maxRadius * radialBoost * (.22 + .78 * Math.sin(progress * Math.PI * .74));
        const h = height * progress;
        const arcSpan = .92 * Math.sin(Math.PI * Math.min(1, .12 + progress * .88)) ** .65;
        for (let column = -7; column <= 7; column += 1) {
          const rib = column / 7;
          const a = centerAngle + rib * arcSpan;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const ox = sideA.x * ca + sideB.x * sa;
          const oy = sideA.y * ca + sideB.y * sa;
          const oz = sideA.z * ca + sideB.z * sa;
          const shade = .34 + progress * .42 + (pass ? .06 : -.04) + .08 * (1 - Math.abs(rib));
          points.push({
            x: flower.x + axis.x * h + ox * r,
            y: flower.y + axis.y * h + oy * r,
            z: flower.z + axis.z * h + oz * r,
            normal: unit(ox, .28, oz),
            color: flower.color,
            shade,
            growth,
          });
        }
      }
    }
  }
}

/* ---------- 5. Sakura Branch (arching woody branch + notched 5-petal cherry blossoms) ---------- */

function addWoodSegment(points, from, to, rStart, rEnd, bend, startAt, span) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  const steps = Math.max(16, Math.ceil(dist / .018));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const arch = Math.sin(t * Math.PI);
    const cx = from.x + (to.x - from.x) * t + bend.x * arch;
    const cy = from.y + (to.y - from.y) * t + bend.y * arch;
    const cz = from.z + (to.z - from.z) * t + bend.z * arch;
    const r = rStart + (rEnd - rStart) * t;
    const sides = r > .025 ? 6 : 4;
    for (let s = 0; s < sides; s += 1) {
      const a = s * TURN / sides;
      const nx = Math.cos(a);
      const nz = Math.sin(a);
      points.push({
        x: cx + nx * r, y: cy + (s % 2 ? r * .3 : -r * .3), z: cz + nz * r,
        normal: { x: nx, y: .25, z: nz },
        color: 'bark',
        shade: .34 + .28 * t + .12 * (s / sides),
        visibleAt: startAt + span * t,
      });
    }
  }
}

function addSakuraBlossom(scene, blossom, start, random) {
  const { points } = scene;
  const face = flowerFace(blossom, .45);
  const phase = random() * TURN;
  const color = blossom.color || 'sakuraPink';
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = phase + petal * TURN / 5;
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    const length = blossom.size * (.92 + random() * .14);
    const growth = addGrowth(scene, blossom, start + .03 * petal, .25);
    for (let row = 0; row <= 14; row += 1) {
      const progress = row / 14;
      const profile = Math.sin(Math.PI * progress) ** .55;
      for (let column = -5; column <= 5; column += 1) {
        const rib = column / 5;
        // Signature cherry-blossom notch at the outer tip center.
        if (progress > .82 && Math.abs(rib) < .24) continue;
        const across = rib * .35 * length * profile;
        const radial = length * (.14 + .86 * progress);
        const lift = length * (.18 * progress ** 2 + .12 * Math.sin(Math.PI * progress));
        const shade = .48 + progress * .34 + .08 * (1 - Math.abs(rib));
        addOnFace(points, face, radial * cosine - across * sine, radial * sine + across * cosine,
          lift, color, shade, growth);
      }
    }
  }
  const coreGrowth = addGrowth(scene, blossom, start, .16);
  for (let sample = 0; sample < 42; sample += 1) {
    const a = sample * 2.399963;
    const rad = Math.sqrt(sample / 42);
    const r = blossom.size * .22 * rad;
    addOnFace(points, face, r * Math.cos(a), r * Math.sin(a), blossom.size * (.06 + .08 * (1 - rad)),
      sample % 5 === 0 ? 'pollen' : 'sakuraCore', .50 + random() * .35, coreGrowth);
  }
}

/* ---------- 6. Stargazer Lilies & Lavender ---------- */

function addStargazer(scene, flower, start, random) {
  const { points } = scene;
  const face = flowerFace(flower, .42);
  const phase = random() * TURN;
  for (let petal = 0; petal < 6; petal += 1) {
    const angle = phase + petal * TURN / 6;
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    const length = flower.size * (petal % 2 === 0 ? 1.05 : .95);
    const growth = addGrowth(scene, flower, start + .035 * petal, .28);
    for (let row = 0; row <= 20; row += 1) {
      const progress = row / 20;
      // Dramatic pointed star petal with wavy edges that curls gracefully backward.
      const profile = Math.sin(Math.PI * progress) ** .72 * (1 - .14 * progress);
      for (let column = -7; column <= 7; column += 1) {
        const rib = column / 7;
        const across = rib * .27 * length * profile;
        const radial = length * (.10 + .90 * progress);
        const wave = Math.sin(progress * 9 + petal) * Math.abs(rib) * .045;
        const lift = length * (.18 * Math.sin(Math.PI * progress) - .34 * progress ** 2.1 + wave);
        const edge = Math.abs(rib) > .62 || progress > .78;
        const shade = .38 + progress * .34 + .12 * (1 - Math.abs(rib));
        addOnFace(points, face, radial * cosine - across * sine, radial * sine + across * cosine,
          lift, edge ? 'stargazerEdge' : 'stargazer', shade, growth);
      }
    }
  }
  // Six sweeping stamens with bold rust-orange anthers.
  const stamenGrowth = addGrowth(scene, flower, start + .16, .24);
  for (let s = 0; s < 6; s += 1) {
    const angle = phase + s * TURN / 6 + .3;
    for (let step = 0; step <= 11; step += 1) {
      const f = step / 11;
      const radial = flower.size * f * .40;
      const isAnther = step >= 9;
      addOnFace(points, face, radial * Math.cos(angle), radial * Math.sin(angle),
        flower.size * (.10 + .56 * f - .12 * f ** 2),
        isAnther ? 'anther' : 'stargazerEdge', isAnther ? .78 : .52 + f * .25, stamenGrowth);
    }
  }
}

/* ---------- Preset scene builders ---------- */

function buildWildflower(scene, random, options) {
  let flowers = WILDFLOWERS;
  if (Array.isArray(options.mix)) {
    const selection = WILDFLOWERS.filter(flower => options.mix.includes(flower.kind));
    if (selection.length > 0) flowers = selection;
  }
  for (const [index, flower] of flowers.entries()) {
    const start = .015 + (index % 7) * .021;
    addStem(scene, flower, index, start, random);
    const bloomStart = start + STEM_SPAN;
    if (flower.kind === 'lupine') addLupine(scene, flower, bloomStart, random);
    else addPetals(scene, flower, bloomStart, random);
  }
  addTie(scene.points, 'tie');
  addSparks(scene.points, random, 'spark', 32);
}

function buildRoses(scene, random) {
  const roses = [
    { x: .00, y: .98, z: .04, size: .26, tilt: .15, color: 'roseCrimson', inner: 'roseDeep' },
    { x: -.50, y: .74, z: .42, size: .24, tilt: -.65, color: 'roseBlush', inner: 'roseCrimson' },
    { x: .52, y: .76, z: .36, size: .24, tilt: .72, color: 'roseCrimson', inner: 'roseDeep' },
    { x: .02, y: .48, z: .72, size: .25, tilt: .05, color: 'roseDeep', inner: 'roseCore' },
    { x: -.64, y: .58, z: -.26, size: .23, tilt: -1.75, color: 'roseCrimson', inner: 'roseDeep' },
    { x: .66, y: .58, z: -.28, size: .23, tilt: 1.85, color: 'roseBlush', inner: 'roseCrimson' },
    { x: -.06, y: .76, z: -.62, size: .24, tilt: 3.05, color: 'roseCream', inner: 'roseBlush' },
    { x: -.78, y: .18, z: .36, size: .22, tilt: -1.02, color: 'roseDeep', inner: 'roseCore' },
    { x: .76, y: .18, z: .38, size: .22, tilt: 1.08, color: 'roseCream', inner: 'roseBlush' },
    { x: -.42, y: .22, z: -.68, size: .22, tilt: -2.45, color: 'roseBlush', inner: 'roseCrimson' },
    { x: .44, y: .20, z: -.66, size: .22, tilt: 2.42, color: 'roseCrimson', inner: 'roseDeep' },
  ];
  const fillers = [
    { x: -.28, y: .90, z: .42, size: .24, tilt: -.3 },
    { x: .34, y: .88, z: -.30, size: .24, tilt: 2.2 },
    { x: -.56, y: .34, z: .58, size: .22, tilt: -.8 },
    { x: .56, y: .36, z: -.54, size: .22, tilt: 2.3 },
  ];
  roses.forEach((rose, index) => {
    const start = .02 + (index % 6) * .022;
    addStem(scene, rose, index, start, random, { leafColor: 'roseLeaf', leafCount: 2 });
    addRose(scene, rose, start + STEM_SPAN, random);
  });
  fillers.forEach((spray, index) => {
    addBabysBreath(scene, spray, .48 + index * .05, random);
  });
  addTie(scene.points, 'ribbon', 4, .135);
  addSparks(scene.points, random, 'roseCream', 28);
}

function buildSunflowers(scene, random) {
  const suns = [
    { x: .04, y: .96, z: .12, size: .38, tilt: .12 },
    { x: -.66, y: .54, z: .44, size: .34, tilt: -.76 },
    { x: .68, y: .52, z: .38, size: .34, tilt: .84 },
    { x: -.50, y: .64, z: -.58, size: .33, tilt: -2.35 },
    { x: .50, y: .60, z: -.58, size: .33, tilt: 2.40 },
  ];
  const daisies = [
    { kind: 'daisy', x: -.08, y: .30, z: .68, size: .25, tilt: -.12 },
    { kind: 'daisy', x: -.76, y: .20, z: .12, size: .23, tilt: -1.35 },
    { kind: 'daisy', x: .76, y: .22, z: .04, size: .23, tilt: 1.48 },
    { kind: 'daisy', x: -.12, y: .26, z: -.72, size: .24, tilt: 3.02 },
    { kind: 'daisy', x: -.32, y: .84, z: -.08, size: .22, tilt: -.90 },
    { kind: 'daisy', x: .36, y: .86, z: .02, size: .22, tilt: .85 },
  ];
  suns.forEach((sun, index) => {
    const start = .02 + index * .025;
    addStem(scene, sun, index, start, random, { leafCount: 2 });
    addSunflower(scene, sun, start + STEM_SPAN, random);
  });
  daisies.forEach((daisy, index) => {
    const start = .05 + index * .02;
    addStem(scene, daisy, index + 5, start, random, { leafCount: 1 });
    addPetals(scene, daisy, start + STEM_SPAN, random);
  });
  addTie(scene.points, 'tie', 3, .135);
  addSparks(scene.points, random, 'sunflowerBright', 30);
}

function buildTulips(scene, random) {
  const tulips = [
    { x: .00, y: .82, z: .02, size: .30, tilt: .0, color: 'tulipRed' },
    { x: -.32, y: .72, z: .28, size: .28, tilt: -.6, color: 'tulipYellow' },
    { x: .34, y: .70, z: .26, size: .28, tilt: .7, color: 'tulipCoral' },
    { x: -.30, y: .74, z: -.30, size: .28, tilt: -2.3, color: 'tulipPink' },
    { x: .32, y: .68, z: -.30, size: .28, tilt: 2.3, color: 'tulipViolet' },
    { x: .02, y: .46, z: .54, size: .27, tilt: .0, color: 'tulipPink' },
    { x: -.56, y: .42, z: .30, size: .27, tilt: -1.0, color: 'tulipRed' },
    { x: .58, y: .42, z: .26, size: .27, tilt: 1.1, color: 'tulipYellow' },
    { x: -.58, y: .44, z: -.24, size: .26, tilt: -1.9, color: 'tulipCream' },
    { x: .56, y: .44, z: -.26, size: .26, tilt: 1.9, color: 'tulipRed' },
    { x: -.02, y: .48, z: -.56, size: .27, tilt: 3.1, color: 'tulipCoral' },
    { x: -.26, y: .22, z: .48, size: .25, tilt: -.5, color: 'tulipViolet' },
    { x: .30, y: .22, z: -.48, size: .25, tilt: 2.5, color: 'tulipCream' },
  ];
  tulips.forEach((tulip, index) => {
    const start = .015 + (index % 7) * .02;
    addStem(scene, tulip, index, start, random, { leafStyle: 'sword', leafCount: index % 2 === 0 ? 2 : 1 });
    addTulip(scene, tulip, start + STEM_SPAN, random);
  });
  addTie(scene.points, 'tulipCream', 3, .13);
  addSparks(scene.points, random, 'tulipYellow', 26);
}

function buildSakura(scene, random) {
  const { points } = scene;
  // Main sweeping branch + sculptural 3D twigs reaching forward and back.
  const segments = [
    { from: { x: -.78, y: -1.14, z: -.22 }, to: { x: -.05, y: -.14, z: .04 }, r0: .046, r1: .034, bend: { x: -.12, y: .12, z: .08 }, start: .00, span: .22 },
    { from: { x: -.05, y: -.14, z: .04 }, to: { x: .82, y: .84, z: .24 }, r0: .034, r1: .015, bend: { x: -.10, y: .24, z: .14 }, start: .18, span: .24 },
    { from: { x: -.14, y: -.26, z: .00 }, to: { x: -.76, y: .66, z: .42 }, r0: .028, r1: .012, bend: { x: -.08, y: .16, z: .10 }, start: .16, span: .24 },
    { from: { x: .14, y: .12, z: .08 }, to: { x: -.28, y: .98, z: -.52 }, r0: .025, r1: .011, bend: { x: .06, y: .16, z: -.10 }, start: .22, span: .22 },
    { from: { x: .36, y: .36, z: .16 }, to: { x: .74, y: .12, z: -.56 }, r0: .022, r1: .010, bend: { x: .10, y: .14, z: -.08 }, start: .25, span: .20 },
    { from: { x: -.42, y: .24, z: .24 }, to: { x: -.18, y: .62, z: .76 }, r0: .019, r1: .009, bend: { x: -.04, y: .10, z: .08 }, start: .26, span: .18 },
  ];
  for (const seg of segments) {
    addWoodSegment(points, seg.from, seg.to, seg.r0, seg.r1, seg.bend, seg.start, seg.span);
  }

  const blossoms = [
    { x: -.76, y: .68, z: .44, size: .20, tilt: -.72, color: 'sakuraPink' },
    { x: -.56, y: .42, z: .34, size: .21, tilt: -.45, color: 'sakuraPale' },
    { x: -.42, y: .12, z: .20, size: .18, tilt: -1.10, color: 'sakuraPink' },
    { x: -.18, y: .64, z: .76, size: .20, tilt: -.18, color: 'sakuraPale' },
    { x: -.32, y: .44, z: .54, size: .18, tilt: -.62, color: 'sakuraPink' },
    { x: -.04, y: -.10, z: .12, size: .19, tilt: .22, color: 'sakuraPink' },
    { x: .16, y: .26, z: .24, size: .22, tilt: .35, color: 'sakuraPale' },
    { x: .44, y: .58, z: .34, size: .21, tilt: .64, color: 'sakuraPink' },
    { x: .68, y: .76, z: .32, size: .20, tilt: .92, color: 'sakuraPale' },
    { x: .86, y: .88, z: .22, size: .18, tilt: 1.15, color: 'sakuraPink' },
    { x: .54, y: .86, z: .04, size: .19, tilt: 1.55, color: 'sakuraPale' },
    { x: -.02, y: .60, z: -.20, size: .20, tilt: 2.65, color: 'sakuraPink' },
    { x: -.20, y: .86, z: -.40, size: .21, tilt: -2.60, color: 'sakuraPale' },
    { x: -.32, y: 1.02, z: -.54, size: .19, tilt: -2.25, color: 'sakuraPink' },
    { x: .26, y: .44, z: -.28, size: .19, tilt: 2.40, color: 'sakuraPale' },
    { x: .58, y: .34, z: -.34, size: .20, tilt: 2.05, color: 'sakuraPink' },
    { x: .76, y: .12, z: -.58, size: .19, tilt: 2.55, color: 'sakuraPale' },
    { x: .46, y: .16, z: -.54, size: .17, tilt: 2.95, color: 'sakuraPink' },
    { x: -.58, y: -.56, z: -.08, size: .17, tilt: -1.40, color: 'sakuraPale' },
  ];
  blossoms.forEach((blossom, index) => {
    addSakuraBlossom(scene, blossom, .32 + (index % 8) * .036, random);
  });

  // Drifting pink petals floating gently around the branch.
  for (let i = 0; i < 48; i += 1) {
    const angle = random() * TURN;
    const radius = .45 + .85 * random();
    const cx = Math.cos(angle) * radius;
    const cy = -1.0 + random() * 2.2;
    const cz = Math.sin(angle) * radius;
    const visibleAt = .68 + i * .006;
    for (let d = 0; d < 3; d += 1) {
      points.push({
        x: cx + d * .014, y: cy - d * .009, z: cz + (d - 1) * .010,
        normal: { x: 0, y: 1, z: 0 }, color: 'sakuraPetal', shade: .58 + random() * .30, visibleAt,
      });
    }
  }
}

function buildLilies(scene, random) {
  const lilies = [
    { x: .06, y: .68, z: .54, size: .44, tilt: .14 },
    { x: -.62, y: .46, z: .34, size: .40, tilt: -.86 },
    { x: .66, y: .48, z: .26, size: .40, tilt: .98 },
    { x: -.42, y: .52, z: -.56, size: .41, tilt: -2.42 },
    { x: .44, y: .56, z: -.54, size: .41, tilt: 2.48 },
  ];
  const lavenders = [
    { x: -.18, y: .94, z: -.18, size: .46, tilt: -.4 },
    { x: .24, y: .98, z: -.10, size: .48, tilt: .4 },
    { x: -.56, y: .84, z: -.14, size: .42, tilt: -1.3 },
    { x: .58, y: .84, z: -.16, size: .42, tilt: 1.4 },
    { x: -.02, y: .88, z: .24, size: .40, tilt: .1 },
    { x: -.32, y: .74, z: .54, size: .38, tilt: -.6 },
    { x: .34, y: .74, z: -.56, size: .38, tilt: 2.5 },
  ];
  const breath = [
    { x: -.36, y: .22, z: .58, size: .26, tilt: -.5 },
    { x: .42, y: .20, z: .54, size: .26, tilt: .6 },
    { x: .00, y: .24, z: -.68, size: .28, tilt: 3.1 },
    { x: -.68, y: .26, z: -.24, size: .24, tilt: -1.8 },
    { x: .68, y: .26, z: -.24, size: .24, tilt: 1.8 },
  ];

  lilies.forEach((lily, index) => {
    const start = .02 + index * .025;
    addStem(scene, lily, index, start, random, { leafStyle: 'sword', leafCount: 2 });
    addStargazer(scene, lily, start + STEM_SPAN, random);
  });
  lavenders.forEach((spike, index) => {
    const start = .03 + index * .02;
    addStem(scene, spike, index + 5, start, random, { leafCount: 1 });
    addLupine(scene, spike, start + STEM_SPAN, random, { color: 'lavender', tip: 'lavenderTip', tiers: 10, slim: .62 });
  });
  breath.forEach((spray, index) => {
    addBabysBreath(scene, spray, .46 + index * .05, random);
  });
  addTie(scene.points, 'lavenderTip', 3, .13);
  addSparks(scene.points, random, 'babysBreath', 30);
}

const PRESETS = {
  wildflower: buildWildflower,
  roses: buildRoses,
  sunflowers: buildSunflowers,
  tulips: buildTulips,
  sakura: buildSakura,
  lilies: buildLilies,
};

export const BOUQUET_3D_PRESETS = Object.keys(PRESETS);

export function makeBouquetScene(seed = 7, options = {}) {
  const scene = { points: [], growth: [], colors: makeColors(options.colors) };
  const random = mulberry32(seed);
  const builder = PRESETS[options.preset] ?? PRESETS.wildflower;
  builder(scene, random, options);
  return scene;
}
