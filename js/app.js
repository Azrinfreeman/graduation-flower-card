import { cardConfig } from './config.js';
import { createQuiz } from './quiz.js';
import { setupBouquet } from './flowers.js';
import { burstConfetti, stopConfetti } from './confetti.js';
import { setupMusic } from './audio.js';
import { createCardPages } from './cardPages.js';
import { sfx } from './sfx.js';

const $ = id => document.getElementById(id);
const screenIds = ['welcomeScreen', 'quizScreen', 'revealScreen'];
const announce = $('announcement');
const welcomeScreen = $('welcomeScreen');
const revealScreen = $('revealScreen');
const revealHeading = $('revealHeading');
const graduateName = $('graduateName');
const signature = $('senderSignature');
const greetingPanel = $('greetingPanel');
const songNote = $('songNote');
const floatMusic = $('floatMusic');
const musicControl = $('musicControl');
const volumePanel = $('volumePanel');
const volumeSlider = $('songVolume');
const volumeReadout = $('volumeReadout');
const VOLUME_HIDE_MS = 4000; // the slider tucks itself away after this long without use
const stageFit = $('stageFit');
const flowerStage = $('flowerStage');
const bouquetPicker = $('bouquetPicker');
const bouquetPrev = $('bouquetPrev');
const bouquetNext = $('bouquetNext');
const bouquetLabel = $('bouquetLabel');

/** How long the greeting takes to fade in before the Next button appears (matches the CSS). */
const GREETING_MS = 1900;
let greetingTimer = null;

/** Long names would overflow the big heading, so shrink the name until it fits. */
function fitName() {
  const box = graduateName.parentElement;
  graduateName.style.fontSize = '';
  graduateName.style.whiteSpace = '';
  const room = box.clientWidth * 0.94; // leave space for the "!" after the name
  if (room > 0 && graduateName.scrollWidth > room) graduateName.style.fontSize = `${Math.max(0.45, room / graduateName.scrollWidth)}em`;
  if (room > 0 && graduateName.scrollWidth > room) {
    // Still too wide even when small (a very long name): let it wrap onto two lines instead.
    graduateName.style.whiteSpace = 'normal';
    graduateName.style.fontSize = '0.62em';
  }
}

/**
 * Makes the bouquet panel as large as it can be while still fitting the space left on the
 * end page, so that page never needs to scroll.
 */
function fitStage() {
  if (!stageFit.clientHeight || !stageFit.clientWidth) return;
  let width = Math.min(stageFit.clientWidth, 540);
  flowerStage.style.width = `${width}px`;
  for (let pass = 0; pass < 3 && flowerStage.offsetHeight > stageFit.clientHeight + 1; pass += 1) {
    width = Math.max(60, Math.floor(width * stageFit.clientHeight / flowerStage.offsetHeight));
    flowerStage.style.width = `${width}px`;
  }
}

function showScreen(id) {
  for (const screenId of screenIds) {
    $(screenId).hidden = screenId !== id;
  }
  updateFloatMusic();
}

/* ---------- the bouquet style switcher (Previous / Next) ---------- */

function updateBouquetPicker(info = bouquet.current()) {
  const showPicker = Boolean(cardConfig.bouquetPicker?.enabled) && info.total > 1;
  bouquetPicker.hidden = !showPicker;
  if (!showPicker) return;
  bouquetLabel.textContent = `${info.index + 1} / ${info.total} · ${info.name}`;
}

function switchBouquet(direction) {
  const info = direction > 0 ? bouquet.next({ quick: true }) : bouquet.prev({ quick: true });
  sfx.play('switch');
  updateBouquetPicker(info);
  fitStage();
  announce.textContent = `${info.name}, bouquet ${info.index + 1} of ${info.total}`;
}

/* ---------- the shared sound volume ---------- */

function updateFloatMusic() {
  const { enabled, playing, volume } = music.state();
  const effectsAvailable = cardConfig.sfx.enabled && welcomeScreen.hidden;
  const musicAvailable = enabled && !revealScreen.hidden;
  musicControl.hidden = !(effectsAvailable || musicAvailable);
  const percent = Math.round(volume * 100);
  const sound = (effectsAvailable || playing) && percent > 0;
  floatMusic.dataset.sound = sound ? 'on' : 'off';
  floatMusic.setAttribute('aria-label', `Sound volume, ${sound ? `${percent} percent` : 'off'}`);
  if (Number(volumeSlider.value) !== percent) volumeSlider.value = String(percent);
  volumeSlider.style.setProperty('--fill', `${percent}%`);
  volumeSlider.setAttribute('aria-valuetext', `${percent} percent`);
  volumeReadout.textContent = `${percent}%`;
}

let volumeTimer = null;
/** Fades the volume slider in or out; it also hides itself after a few idle seconds. */
function setVolumePanel(open) {
  window.clearTimeout(volumeTimer);
  volumePanel.classList.toggle('is-open', open);
  volumePanel.inert = !open;
  floatMusic.setAttribute('aria-expanded', String(open));
  if (open) volumeTimer = window.setTimeout(() => setVolumePanel(false), VOLUME_HIDE_MS);
}
const volumeOpen = () => volumePanel.classList.contains('is-open');

/* ---------- the reveal ---------- */

const pages = createCardPages({
  onChange({ index, total, type }) {
    sfx.play('page');
    announce.textContent = `Page ${index + 1} of ${total}`;
    updateFloatMusic();
    if (type === 'end') showBouquet();
  },
});

/** The congratulations: the name and signature fade in slowly, then the Next button appears. */
function showGreeting() {
  graduateName.textContent = cardConfig.graduateName;
  greetingPanel.removeAttribute('inert');
  greetingPanel.setAttribute('aria-hidden', 'false');
  fitName();
  document.fonts?.ready.then(fitName); // measure again once the font has loaded
  greetingPanel.classList.add('is-shown');
  announce.textContent = `Congratulations, ${cardConfig.graduateName}! ${cardConfig.senderSignature}`;
  revealHeading.focus({ preventScroll: true });
  burstConfetti();
  sfx.play('bloom');
  greetingTimer = window.setTimeout(() => pages.enable(), GREETING_MS);
}

function reveal() {
  window.clearTimeout(greetingTimer);
  stopConfetti();
  bouquet.stop();
  endBloomed = false;
  pages.reset();
  announce.textContent = '';
  graduateName.textContent = '';
  greetingPanel.classList.remove('is-shown');
  greetingPanel.setAttribute('aria-hidden', 'true');
  greetingPanel.inert = true;
  showScreen('revealScreen');
  revealScreen.focus({ preventScroll: true });
  layoutReveal();
  document.fonts?.ready.then(layoutReveal);
  showGreeting();
  music.start({ fadeMs: 3200 }); // quietly fades in with the congratulations (when music is enabled)
}

/** The flowers appear only on the last page, the first time it is opened; after that they just keep turning. */
let endBloomed = false;
function showBouquet() {
  fitStage();
  if (endBloomed) return;
  endBloomed = true;
  updateBouquetPicker();
  bouquet.bloom({ instant: false, quick: false, onComplete() {} });
}

/** Sizes the bouquet panel and splits the wish into pages that fit the current screen. */
function layoutReveal() {
  if (revealScreen.hidden) return;
  fitStage();
  pages.build();
  fitName();
}

/* ---------- the quiz ---------- */

function enterQuiz() {
  showScreen('quizScreen');
  quiz.start();
  announce.textContent = `Question 1 of ${cardConfig.questions.length}.`;
}

let opening = false;
/** "Open your surprise": the cover fades out, then the first question. */
function startQuiz() {
  if (opening) return; // ignore a second tap during the animation
  opening = true;
  sfx.unlock();
  sfx.play('open');
  music.prime(); // this tap is what lets the browser play the song later
  document.body.classList.add('is-opening');
  window.setTimeout(() => {
    enterQuiz();
    document.body.classList.remove('is-opening');
    opening = false;
  }, 250);
}

/* ---------- the cover heading types itself in (minimal look) ---------- */

/** Types the cover heading one character at a time, like code. Screen readers get the full text at once. */
function typeCoverHeading() {
  const heading = $('welcomeHeading');
  const line1 = heading.firstChild?.textContent.trim();
  const line2 = heading.querySelector('.line-two')?.textContent.trim();
  if (!line1 || !line2) return;
  heading.setAttribute('aria-label', `${line1} ${line2}`);
  const build = (cls) => {
    const box = document.createElement('span');
    box.className = cls;
    box.setAttribute('aria-hidden', 'true');
    const first = document.createElement('span');
    const second = document.createElement('span');
    box.append(first, document.createElement('br'), second);
    return { box, first, second };
  };
  const ghost = build('type-ghost'); // invisible full text: reserves the space so nothing jumps
  ghost.first.textContent = line1;
  ghost.second.textContent = line2;
  const live = build('type-live');
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  const stack = document.createElement('span');
  stack.className = 'type-stack';
  stack.append(ghost.box, live.box);
  heading.replaceChildren(stack);
  const total = line1.length + line2.length;
  let typed = 0;
  live.first.after(cursor);
  window.setTimeout(() => {
    const timer = window.setInterval(() => {
      typed += 1;
      live.first.textContent = line1.slice(0, Math.min(typed, line1.length));
      live.second.textContent = line2.slice(0, Math.max(0, typed - line1.length));
      (typed <= line1.length ? live.first : live.second).after(cursor);
      if (typed >= total) {
        window.clearInterval(timer);
        window.setTimeout(() => cursor.remove(), 4000); // the cursor blinks a little longer, then goes
      }
    }, 42);
  }, 600);
}

/* ---------- start up ---------- */

const music = setupMusic(cardConfig.music);
signature.textContent = cardConfig.senderSignature;
const noteText = (cardConfig.music?.note ?? '').trim();
songNote.textContent = noteText;
songNote.hidden = !noteText;
const bouquet = setupBouquet(cardConfig);
updateBouquetPicker();
// Prepare the starting bouquet while the browser is idle so the reveal can start immediately.
(window.requestIdleCallback ?? (callback => window.setTimeout(callback, 400)))(() => bouquet.prepare(), { timeout: 2000 });
const quiz = createQuiz(cardConfig.questions, reveal, cardConfig.runawayWrongAnswer);
typeCoverHeading();

$('startButton').addEventListener('click', startQuiz);
bouquetPrev.addEventListener('click', () => switchBouquet(-1));
bouquetNext.addEventListener('click', () => switchBouquet(1));

floatMusic.addEventListener('click', () => {
  const { enabled, playing, volume } = music.state();
  if (enabled && !revealScreen.hidden && !playing && volume > 0) {
    music.toggle(); // retry the song if autoplay was blocked
  }
  setVolumePanel(!volumeOpen());
});
volumeSlider.addEventListener('input', () => {
  music.setVolume(Number(volumeSlider.value) / 100, { startPlayback: !revealScreen.hidden });
  setVolumePanel(true); // restarts the idle timer
});
volumeSlider.addEventListener('pointerdown', () => window.clearTimeout(volumeTimer)); // no hiding mid-drag
volumeSlider.addEventListener('pointerup', () => setVolumePanel(true));
volumeSlider.addEventListener('keydown', () => setVolumePanel(true));
document.addEventListener('pointerdown', event => {
  if (volumeOpen() && !musicControl.contains(event.target)) setVolumePanel(false);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !volumeOpen()) return;
  const hadFocus = volumePanel.contains(document.activeElement);
  setVolumePanel(false);
  if (hadFocus) floatMusic.focus();
});
sfx.setLevel(music.state().volume);
music.onChange(state => {
  sfx.setLevel(state.volume);
  updateFloatMusic();
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  fitStage(); // cheap, so do it straight away
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (revealScreen.hidden) return;
    pages.rebuild();
    fitName();
  }, 200);
});
if (window.ResizeObserver) new ResizeObserver(fitStage).observe(stageFit);
