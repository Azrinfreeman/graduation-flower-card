// One character cell is 6 x 8 pixels, drawn at 2x on high-density screens so it stays sharp.
const CELL_WIDTH = 6;
const CELL_HEIGHT = 8;
const GLYPHS = '.:;-+*oxO#@';
const CAMERA_DISTANCE = 5.6;
const CAMERA_TILT = .10;

/** Prepaint each letter and colour. Rendering can then copy the glyph's pixels in one pass. */
function makeGlyphs(colors, cellWidth, cellHeight, scale) {
  const atlas = document.createElement('canvas');
  atlas.width = cellWidth;
  atlas.height = cellHeight;
  const brush = atlas.getContext('2d', { willReadFrequently: true });
  brush.font = `bold ${8 * scale}px monospace`; // bold glyphs have more ink, so they glow
  brush.textAlign = 'center';
  brush.textBaseline = 'middle';

  const masks = [];
  for (const glyph of GLYPHS) {
    brush.clearRect(0, 0, cellWidth, cellHeight);
    brush.fillText(glyph, cellWidth / 2, cellHeight / 2);
    masks.push(brush.getImageData(0, 0, cellWidth, cellHeight).data);
  }

  const stamps = {};
  for (const [color, rgb] of Object.entries(colors)) {
    stamps[color] = masks.map((mask, level) => {
      const light = .92 + level / (GLYPHS.length - 1) * .5; // brighter than before; clamped below
      const pixels = new Uint8ClampedArray(mask.length);
      for (let offset = 0; offset < pixels.length; offset += 4) {
        pixels[offset] = rgb[0] * light;
        pixels[offset + 1] = rgb[1] * light;
        pixels[offset + 2] = rgb[2] * light;
        pixels[offset + 3] = Math.min(255, mask[offset + 3] * 1.7); // firm up antialiased edges
      }
      return new Uint32Array(pixels.buffer);
    });
  }
  return stamps;
}

export function makeBouquetRenderer(canvas, scene) {
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const { points, growth, colors } = scene;
  let stamps = null;
  let cellWidth = CELL_WIDTH;
  let cellHeight = CELL_HEIGHT;
  let scale = 0;
  const growthScales = new Float32Array(growth.length);
  const tiltSine = Math.sin(CAMERA_TILT);
  const tiltCosine = Math.cos(CAMERA_TILT);
  let columns = 0;
  let rows = 0;
  let width;
  let height;
  let frame;
  let pixels;
  let depths;
  let winners;
  let levels;

  function resize(cssWidth) {
    const nextColumns = cssWidth < 420 ? 68 : 100;
    const nextScale = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1;
    if (nextColumns === columns && nextScale === scale) {
      return;
    }
    if (nextScale !== scale) {
      scale = nextScale;
      cellWidth = CELL_WIDTH * scale;
      cellHeight = CELL_HEIGHT * scale;
      stamps = makeGlyphs(colors, cellWidth, cellHeight, scale);
    }
    columns = nextColumns;
    rows = Math.round(columns * .86);
    width = canvas.width = columns * cellWidth;
    height = canvas.height = rows * cellHeight;
    frame = context.createImageData(width, height);
    pixels = new Uint32Array(frame.data.buffer);
    depths = new Float32Array(columns * rows);
    winners = new Int32Array(columns * rows);
    levels = new Uint8Array(columns * rows);
  }

  function draw(angle, bloomProgress = 1) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const zoom = Math.min(width / 2.83, height / 3.16);
    depths.fill(-Infinity);
    winners.fill(-1);
    pixels.fill(0);
    const blooming = bloomProgress < 1;
    if (blooming) {
      for (const group of growth) {
        const progress = (bloomProgress - group.start) / group.duration;
        const clamped = Math.max(0, Math.min(1, progress));
        growthScales[group.index] = 1 - (1 - clamped) ** 3;
      }
    }

    // Rotate and project every sample. Only the nearest point in each character cell survives.
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      let { x, y, z } = point;
      if (blooming) {
        if (bloomProgress < (point.visibleAt ?? 0)) {
          continue;
        }
        if (point.growth) {
          const amount = growthScales[point.growth.index];
          if (amount === 0) {
            continue;
          }
          const origin = point.growth.origin;
          x = origin.x + (x - origin.x) * amount;
          y = origin.y + (y - origin.y) * amount;
          z = origin.z + (z - origin.z) * amount;
        }
      }
      const spunX = x * cosine - z * sine;
      const spunZ = x * sine + z * cosine;
      const viewY = y * tiltCosine - spunZ * tiltSine;
      const depth = spunZ * tiltCosine + y * tiltSine;
      const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE - depth);
      const column = Math.floor((width * .5 + spunX * zoom * perspective) / cellWidth);
      const row = Math.floor((height * .53 - viewY * zoom * perspective) / cellHeight);
      if (column < 0 || column >= columns || row < 0 || row >= rows) {
        continue;
      }
      const cell = row * columns + column;
      if (depth <= depths[cell]) {
        continue;
      }

      const normal = point.normal;
      const lightX = normal.x * cosine - normal.z * sine;
      const lightZ = normal.x * sine + normal.z * cosine;
      const lighting = Math.abs(-.37 * lightX + .44 * normal.y + .63 * lightZ);
      const strength = (point.shade + lighting * .34) * 1.2; // lift the whole range: fewer faint dots
      const level = Math.round(strength * (GLYPHS.length - 1));
      levels[cell] = Math.max(0, Math.min(GLYPHS.length - 1, level));
      depths[cell] = depth;
      winners[cell] = index;
    }

    for (let cell = 0; cell < winners.length; cell += 1) {
      if (winners[cell] === -1) {
        continue;
      }
      const point = points[winners[cell]];
      const glyph = stamps[point.color][levels[cell]];
      const x = cell % columns * cellWidth;
      const y = Math.floor(cell / columns) * cellHeight;
      for (let line = 0; line < cellHeight; line += 1) {
        const source = line * cellWidth;
        const destination = (y + line) * width + x;
        for (let column = 0; column < cellWidth; column += 1) {
          pixels[destination + column] = glyph[source + column];
        }
      }
    }

    context.putImageData(frame, 0, 0);
  }

  return { resize, draw };
}
