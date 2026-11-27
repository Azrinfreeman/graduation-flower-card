/** A short burst of falling text characters, the ones the bouquet is made of. No dependencies. */
const GLYPHS = ['.', ':', '+', '*', 'o', 'x', '#', '@']; // the same characters the bouquet is drawn with
let frameId = null;
export function stopConfetti() {
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
  const canvas = document.getElementById('confetti');
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
}
export function burstConfetti(colors = ['#ff4d5e', '#ececec', '#ff9aa4', '#9d9da3']) {
  stopConfetti();
  const canvas = document.getElementById('confetti');
  const context = canvas.getContext('2d');
  if (!context) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.ceil(width * ratio);
  canvas.height = Math.ceil(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const total = width < 500 ? 55 : 95;
  const pieces = Array.from({ length: total }, (_, i) => ({
    x: width * (.12 + Math.random() * .76),
    y: -Math.random() * height * .45,
    vx: (Math.random() - .5) * 2.2,
    vy: 1.5 + Math.random() * 2.6,
    size: 12 + Math.random() * 14,
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    color: colors[i % colors.length],
  }));
  const started = performance.now();
  let lastTime = started; // per burst, so each burst starts smoothly
  function tick(now) {
    if (document.hidden || now - started > 4600) { stopConfetti(); return; }
    context.clearRect(0, 0, canvas.width, canvas.height);
    const step = Math.min((now - lastTime) / 16.7, 2.2);
    lastTime = now;
    for (const piece of pieces) {
      piece.x += piece.vx * step;
      piece.y += piece.vy * step;
      context.fillStyle = piece.color;
      context.font = `${Math.round(piece.size)}px ui-monospace, Consolas, monospace`;
      context.fillText(piece.glyph, piece.x, piece.y);
    }
    frameId = requestAnimationFrame(tick);
  }
  frameId = requestAnimationFrame(tick);
}
