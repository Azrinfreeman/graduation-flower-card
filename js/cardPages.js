/**
 * cardPages.js — the reveal is a small card with pages, so nothing ever has to scroll.
 *
 *   page 1   the congratulations (no flowers yet)
 *   page 2+  the graduation wish. The text is split into as many pages as it takes to show it at a
 *            comfortable size (one page on most phones, two on very small ones).
 *   last     the bouquet blooms, with the note and flower style switcher
 *
 * Pages turn with the Next/Back buttons, the dots, a swipe (touch) or the arrow keys.
 */
import { cardConfig } from './config.js';
import { sfx } from './sfx.js';

const SWIPE_MIN = 48; // px of sideways movement that counts as a swipe
/** A swipe that starts on one of these is not a page turn (sliders, the bouquet drag, buttons...). */
const NOT_SWIPE = 'input, button, a, canvas, iframe, select, textarea, label';

export function createCardPages({ onChange = () => {} } = {}) {
  const $ = id => document.getElementById(id);
  const screen = $('revealScreen');
  const pagesBox = $('cardPages');
  const pageEls = { front: $('pageFront'), wish: $('pageWish'), end: $('pageEnd') };
  const order = { front: 0, wish: 1, end: 2 };
  const wishArea = $('wishArea');
  const wish = $('wish');
  const ghost = $('wishGhost'); // invisible full text: it reserves the space so nothing jumps while typing
  const live = $('typewriterText');
  const cursor = $('typeCursor');
  const skip = $('skipTypingButton');
  const nav = $('pageNav');
  const backButton = $('pageBack');
  const nextButton = $('pageNext');
  const nextLabel = $('pageNextLabel');
  const dots = $('pageDots');

  let wishPages = []; // [{ text, typed }]
  let index = 0;
  let enabled = false; // page turning starts once the greeting has appeared
  let typingTimer = null;
  let typingDelay = null;

  const total = () => wishPages.length + 2;
  const typeAt = i => (i === 0 ? 'front' : i === total() - 1 ? 'end' : 'wish');
  const currentWish = () => (typeAt(index) === 'wish' ? wishPages[index - 1] : null);

  /* ---------- typing ---------- */

  function stopTyping() {
    window.clearInterval(typingTimer);
    window.clearTimeout(typingDelay);
    typingTimer = null;
    typingDelay = null;
  }

  function finishTyping() {
    stopTyping();
    const page = currentWish();
    if (page) {
      live.textContent = page.text;
      page.typed = true;
    }
    cursor.hidden = true;
    skip.hidden = true;
    wish.removeAttribute('aria-busy');
  }

  function startTyping(page) {
    stopTyping();
    // Segment by grapheme where supported so emojis are not split in half.
    const chars = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(page.text)].map(part => part.segment)
      : Array.from(page.text);
    const perTick = Math.max(2, Math.ceil(chars.length / 110)); // a page takes about 4-5 seconds
    let shown = 0;
    live.textContent = '';
    cursor.hidden = false;
    skip.hidden = false;
    wish.setAttribute('aria-busy', 'true');
    // A short pause lets the page finish turning before the first letters appear.
    typingDelay = window.setTimeout(() => {
      typingTimer = window.setInterval(() => {
        shown = Math.min(chars.length, shown + perTick);
        live.textContent = chars.slice(0, shown).join('');
        if (shown >= chars.length) finishTyping();
      }, 42);
    }, 380);
  }

  function showWishPage() {
    const page = currentWish();
    if (!page) return;
    ghost.textContent = page.text;
    wish.classList.remove('is-fresh');
    void wish.offsetWidth; // restart the fade-in
    wish.classList.add('is-fresh');
    if (page.typed) {
      live.textContent = page.text;
      cursor.hidden = true;
      skip.hidden = true;
    } else {
      startTyping(page);
    }
  }

  /* ---------- splitting the wish into pages ---------- */

  /** Text size for the wish: comfortable on big screens, never below 15px. */
  function wishFontSize() {
    return Math.round(Math.max(15, Math.min(22, window.innerWidth * 0.047, window.innerHeight * 0.03)));
  }

  /**
   * Adds paragraphs to a page until the next one would overflow the space, then starts a new page.
   * `allTyped` is used after a resize: the text is shown at once instead of being typed again.
   */
  function build({ allTyped = false } = {}) {
    wish.style.fontSize = `${wishFontSize()}px`;
    // The text is centred in the page, and Show-full-message is pinned to the bottom: keep the same room
    // free at the top so the text stays centred and never touches the button.
    const room = pageEls.wish.clientHeight - 2 * skip.offsetHeight;
    if (!(room > 0)) return; // the reveal screen is not on screen yet
    const paragraphs = String(cardConfig.graduationMessage).split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
    const pages = [];
    let current = [];
    for (const paragraph of paragraphs) {
      ghost.textContent = [...current, paragraph].join('\n\n');
      if (current.length && ghost.offsetHeight > room) {
        pages.push(current.join('\n\n'));
        current = [paragraph];
      } else {
        current.push(paragraph);
      }
    }
    if (current.length) pages.push(current.join('\n\n'));
    const before = wishPages;
    wishPages = pages.map((text, i) => ({ text, typed: allTyped || (before[i]?.text === text && before[i].typed) }));
    index = Math.min(index, total() - 1);
    render();
    // Leave the invisible measuring text matching a real page, not the last thing we measured.
    ghost.textContent = (currentWish() ?? wishPages[0]).text;
    if (currentWish()?.typed) {
      stopTyping();
      live.textContent = currentWish().text;
      cursor.hidden = true;
      skip.hidden = true;
    }
  }

  /* ---------- showing the right page ---------- */

  function renderDots() {
    dots.replaceChildren();
    for (let i = 0; i < total(); i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'page-dot';
      dot.setAttribute('aria-label', `Page ${i + 1} of ${total()}`);
      if (i === index) dot.setAttribute('aria-current', 'page');
      dot.addEventListener('click', () => goTo(i));
      dots.append(dot);
    }
  }

  function render() {
    const current = order[typeAt(index)];
    for (const [name, element] of Object.entries(pageEls)) {
      const position = order[name];
      element.classList.toggle('is-current', position === current);
      element.classList.toggle('is-before', position < current);
      element.inert = position !== current;
    }
    renderDots();
    backButton.style.visibility = index === 0 ? 'hidden' : 'visible';
    nextButton.style.visibility = index === total() - 1 ? 'hidden' : 'visible';
    nextLabel.textContent = index === total() - 2 ? 'End' : 'Next'; // the step before the last page is the End button
    nav.classList.toggle('is-end', index === total() - 1); // on the end page only a quiet back arrow remains
  }

  function goTo(target) {
    const next = Math.max(0, Math.min(total() - 1, target));
    if (!enabled || next === index) return;
    finishTyping();
    index = next;
    render();
    if (typeAt(index) === 'wish') showWishPage();
    // Focus that was inside the page we just left is lost (it is inert now): put it on the new page.
    const active = document.activeElement;
    if (!active || active === document.body || active.closest('[inert]')) {
      pageEls[typeAt(index)].focus({ preventScroll: true });
    }
    onChange({ index, type: typeAt(index), total: total() });
  }

  /* ---------- input: buttons, swipe, arrow keys ---------- */

  backButton.addEventListener('click', () => goTo(index - 1));
  nextButton.addEventListener('click', () => goTo(index + 1));
  skip.addEventListener('click', () => {
    finishTyping();
    sfx.play('tap');
  });

  let swipe = null;
  pagesBox.addEventListener('pointerdown', event => {
    if (!enabled || !event.isPrimary || event.pointerType === 'mouse' || event.target.closest(NOT_SWIPE)) return;
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  pagesBox.addEventListener('pointerup', event => {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > 1.5 * Math.abs(dy)) goTo(index + (dx < 0 ? 1 : -1));
  });
  pagesBox.addEventListener('pointercancel', () => { swipe = null; });

  document.addEventListener('keydown', event => {
    if (screen.hidden || !enabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    // Sliders and the bouquet use the arrow keys themselves.
    if (event.target.closest?.('input, textarea, select, canvas')) return;
    event.preventDefault();
    goTo(index + (event.key === 'ArrowRight' ? 1 : -1));
  });

  return {
    build,
    /** Re-split the wish after the window changed size (text already read is not typed again). */
    rebuild() {
      finishTyping();
      build({ allTyped: true });
    },
    /** Back to the first page with page turning switched off (used at the start of every reveal). */
    reset() {
      stopTyping();
      enabled = false;
      index = 0;
      nav.hidden = true;
      cursor.hidden = true;
      skip.hidden = true;
      live.textContent = '';
      for (const page of wishPages) page.typed = false;
      render();
    },
    /** Called once the greeting has appeared: the Next button fades in and pages can be turned. */
    enable() {
      enabled = true;
      nav.hidden = false;
      render();
    },
    get type() { return typeAt(index); },
    get index() { return index; },
    get total() { return total(); },
  };
}
