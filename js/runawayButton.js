/**
 * Makes a (wrong) answer button playfully run away inside an "arena" element.
 *
 * - Mouse: the button glides away when the pointer comes close.
 * - Touch: tapping the button cancels the tap and the button hops away.
 * - Keyboard: Enter/Space makes it hop; focus stays on the button.
 * After `giveUpAfter` dodges the button gets "tired" and behaves like a normal button again,
 * so wrong answers can still be chosen (and retried) as the quiz requires.
 *
 * Only the button moves. The user's real cursor is never touched (browsers do not allow that).
 */

const PROXIMITY_PX = 56; // how close the mouse may get before the button dodges
const EDGE_GAP_PX = 8; // keep this far from the arena edges
const AVOID_GAP_PX = 8; // keep this far from elements listed in `avoid`
const DODGE_COOLDOWN_MS = 320; // stops one quick swipe from using up every dodge at once
const SAMPLES = 60; // random spots tried per dodge

/**
 * @param {HTMLButtonElement} button  The button that should run away.
 * @param {HTMLElement} arena         The element it must stay inside (made `position: relative`).
 * @param {object} options
 * @param {() => Element[]} options.avoid  Returns elements the button must never cover.
 * @param {number} [options.giveUpAfter=5]  Dodges before the button becomes clickable.
 * @param {(count: number, info: {tired: boolean, pointerType: string}) => void} [options.onDodge]
 * @returns {{ destroy(): void }}
 */
export function attachRunaway(button, arena, { avoid, giveUpAfter = 5, onDodge = () => {} }) {
  let count = 0;
  let lastDodge = -Infinity;
  let placeholder = null;
  let position = null; // {x, y} of the button's top-left corner, in arena coordinates
  let wiggleTimer = null;
  let swallowClickUntil = 0; // clicks this soon after a dodge belong to the chase, not to an answer

  const isTired = () => count >= giveUpAfter;

  /** A rectangle in arena coordinates (relative to the arena's padding box). */
  function toArena(rect) {
    const a = arena.getBoundingClientRect();
    const left = a.left + arena.clientLeft;
    const top = a.top + arena.clientTop;
    return { x: rect.left - left, y: rect.top - top, w: rect.width, h: rect.height };
  }

  function overlaps(r1, r2, gap) {
    return r1.x < r2.x + r2.w + gap && r1.x + r1.w + gap > r2.x && r1.y < r2.y + r2.h + gap && r1.y + r1.h + gap > r2.y;
  }

  /** On the first dodge, lift the button out of the list and leave a same-size gap behind. */
  function liftOut() {
    if (placeholder) return;
    const start = toArena(button.getBoundingClientRect());
    placeholder = document.createElement('div');
    placeholder.className = 'answer-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.height = `${start.h}px`;
    button.before(placeholder);
    button.classList.add('is-runaway');
    // Start exactly where it was (no transition), then let later moves glide.
    button.style.transition = 'none';
    setPosition(start.x, start.y);
    void button.offsetWidth; // apply the start position before re-enabling the transition
    button.style.transition = '';
  }

  function setPosition(x, y) {
    position = { x, y };
    button.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
  }

  /** Picks a free spot far from the pointer (or from the button itself when using the keyboard). */
  function findSpot(fromX, fromY) {
    const w = button.offsetWidth;
    const h = button.offsetHeight;
    const maxX = arena.clientWidth - w - EDGE_GAP_PX;
    const maxY = arena.clientHeight - h - EDGE_GAP_PX;
    const blocked = avoid().filter(el => el && !el.hidden && el.offsetParent !== null).map(el => toArena(el.getBoundingClientRect()));
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < SAMPLES; i++) {
      const spot = {
        x: EDGE_GAP_PX + Math.random() * Math.max(0, maxX - EDGE_GAP_PX),
        y: EDGE_GAP_PX + Math.random() * Math.max(0, maxY - EDGE_GAP_PX),
        w,
        h,
      };
      if (blocked.some(r => overlaps(spot, r, AVOID_GAP_PX))) continue;
      const fromPointer = Math.hypot(spot.x + w / 2 - fromX, spot.y + h / 2 - fromY);
      const moved = position ? Math.hypot(spot.x - position.x, spot.y - position.y) : Infinity;
      // Prefer spots far from the pointer, but always move a visible distance.
      const score = fromPointer + (moved < 60 ? -1000 : 0) + Math.random() * 30;
      if (score > bestScore) { bestScore = score; best = spot; }
    }
    if (best) return best;
    // No free spot (tiny arena): go back to the original slot.
    const slot = toArena(placeholder.getBoundingClientRect());
    return { x: slot.x, y: slot.y };
  }

  function dodge(clientX, clientY, pointerType) {
    if (isTired()) return;
    const now = performance.now();
    if (now - lastDodge < DODGE_COOLDOWN_MS) return;
    lastDodge = now;
    swallowClickUntil = now + 450;
    liftOut();
    const a = toArena({ left: clientX, top: clientY, width: 0, height: 0 });
    const spot = findSpot(a.x, a.y);
    setPosition(spot.x, spot.y);
    count++;
    button.classList.remove('is-dodging');
    void button.offsetWidth; // restart the wiggle animation
    button.classList.add('is-dodging');
    window.clearTimeout(wiggleTimer);
    wiggleTimer = window.setTimeout(() => button.classList.remove('is-dodging'), 450);
    if (isTired()) button.classList.add('is-tired');
    onDodge(count, { tired: isTired(), pointerType });
  }

  function buttonCenter() {
    const r = button.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  // Mouse only: dodge when the pointer gets close (touch screens have no hover).
  function onPointerMove(event) {
    if (event.pointerType !== 'mouse' || isTired() || button.disabled) return;
    const r = button.getBoundingClientRect();
    const dx = Math.max(r.left - event.clientX, 0, event.clientX - r.right);
    const dy = Math.max(r.top - event.clientY, 0, event.clientY - r.bottom);
    if (Math.hypot(dx, dy) < PROXIMITY_PX) dodge(event.clientX, event.clientY, 'mouse');
  }

  // Any pointer pressing the button (mainly touch) makes it hop before a click can happen.
  function onPointerDown(event) {
    if (isTired() || button.disabled) return;
    event.preventDefault();
    lastDodge = -Infinity; // a direct press always dodges
    dodge(event.clientX, event.clientY, event.pointerType || 'mouse');
  }

  // Runs in the capture phase on the arena, before the quiz's own click handler on the button.
  function onClickCapture(event) {
    if (!button.contains(event.target)) return;
    // Even once tired, swallow a click that lands right after a dodge (e.g. the tap that caused
    // the 5th dodge), so that dodge doesn't also count as picking the wrong answer.
    const fromDodgingPress = performance.now() < swallowClickUntil;
    swallowClickUntil = 0;
    if (isTired() && !fromDodgingPress) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.detail === 0 && !isTired()) {
      // Keyboard activation (Enter/Space): move away from where the button is now.
      lastDodge = -Infinity;
      const [x, y] = buttonCenter();
      dodge(x, y, 'keyboard');
    }
    // Mouse/touch clicks were already handled by pointerdown; just swallow them.
  }

  // Keep the button inside the card if the window is resized or rotated.
  function onResize() {
    if (!placeholder) return;
    const maxX = Math.max(EDGE_GAP_PX, arena.clientWidth - button.offsetWidth - EDGE_GAP_PX);
    const maxY = Math.max(EDGE_GAP_PX, arena.clientHeight - button.offsetHeight - EDGE_GAP_PX);
    if (position.x > maxX || position.y > maxY) {
      const [x, y] = buttonCenter();
      const spot = findSpot(x, y);
      setPosition(spot.x, spot.y);
    }
  }

  arena.classList.add('runaway-arena');
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  button.addEventListener('pointerdown', onPointerDown);
  arena.addEventListener('click', onClickCapture, true);
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      window.clearTimeout(wiggleTimer);
      document.removeEventListener('pointermove', onPointerMove);
      button.removeEventListener('pointerdown', onPointerDown);
      arena.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('resize', onResize);
    },
  };
}
