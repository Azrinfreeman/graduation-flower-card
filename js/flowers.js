/**
 * flowers.js — manages the bouquet gallery on the last page of the card.
 *
 * Supports three rendering styles in `cardConfig.bouquetGallery`:
 *   '3d'    — interactive, rotating 3D text-character bouquet (6 floral presets in bouquet3dScene.js)
 *   'ascii' — detailed 2D text-character bouquet (asciiBouquet.js + flowerShapes.js)
 *   'svg'   — illustrated vector bouquet animated with CSS (animations.css)
 *
 * Each bouquet is built lazily on first view and cached so switching back and forth is instant.
 * If canvas rendering fails, it falls back gracefully to the inline SVG bouquet.
 */
import { createAsciiBouquet } from './asciiBouquet.js';
import { makeBouquetScene } from './bouquet3dScene.js';
import { makeBouquetRenderer } from './bouquet3dRenderer.js';
import { createBouquetMotion } from './bouquet3dMotion.js';

const RENDER_WIDTH = 540;
const ASCII_DURATION = 4200;
const SWITCH_ASCII_DURATION = 1800;
const INITIAL_3D_DURATION = 3600;
const SWITCH_3D_DURATION = 1500;

function normalizeGallery(config) {
  if (Array.isArray(config.bouquetGallery) && config.bouquetGallery.length > 0) {
    return config.bouquetGallery;
  }
  const style = config.bouquetStyle || '3d';
  return [{
    id: style,
    name: style === 'svg' ? 'Minimal Vector' : style === 'ascii' ? 'Text-Art Garden' : 'Wildflower Meadow',
    style,
    preset: 'wildflower',
    seed: config.bouquet?.seed ?? 7,
    mix: style === '3d' ? config.bouquet3d?.mix : config.bouquet?.mix,
    colors: style === '3d' ? config.bouquet3d?.colors : config.bouquet?.colors,
    spinSpeed: config.bouquet3d?.spinSpeed,
  }];
}

export function setupBouquet(config) {
  const stage = document.getElementById('flowerStage');
  const svg = stage.querySelector('.bouquet-svg');
  const flatCanvas = document.getElementById('asciiBouquet');
  const rotatingCanvas = document.getElementById('rotatingBouquet');
  const gallery = normalizeGallery(config);

  const renderer3dCache = new Map(); // id -> { resize, draw }
  const asciiCache = new Map(); // id -> { prepare, play, showAt, stop, ready }
  let motion = null;
  let activeIndex = 0;
  let activeAscii = null;
  let activeStyle = null;
  let bloomRun = 0;
  let rotatingCompletion = null;

  const currentItem = () => gallery[activeIndex];

  function showArtwork(style, name) {
    activeStyle = style;
    stage.classList.toggle('is-ascii', style !== 'svg');
    flatCanvas.hidden = style !== 'ascii';
    rotatingCanvas.hidden = style !== '3d';
    svg.toggleAttribute('hidden', style !== 'svg');
    if (style === '3d') {
      stage.removeAttribute('role');
      stage.removeAttribute('aria-label');
      rotatingCanvas.setAttribute('aria-label', `${name} — rotating 3D bouquet in text characters`);
    } else {
      stage.setAttribute('role', 'img');
      stage.setAttribute('aria-label', `${name} — animated bouquet of flowers`);
    }
  }

  function get3dRenderer(item) {
    if (renderer3dCache.has(item.id)) return renderer3dCache.get(item.id);
    const scene = makeBouquetScene(item.seed ?? 7, {
      preset: item.preset ?? 'wildflower',
      mix: item.mix,
      colors: item.colors,
    });
    const renderer = makeBouquetRenderer(rotatingCanvas, scene);
    if (renderer) renderer3dCache.set(item.id, renderer);
    return renderer;
  }

  function getAsciiBouquet(item) {
    let entry = asciiCache.get(item.id);
    if (!entry) {
      const instance = createAsciiBouquet(flatCanvas, {
        seed: item.seed ?? 7,
        mix: item.mix,
        colors: item.colors,
        columns: item.columns,
      });
      if (!instance) return null;
      entry = { instance, ready: false };
      asciiCache.set(item.id, entry);
    }
    if (!entry.ready) {
      entry.instance.prepare(RENDER_WIDTH);
      entry.ready = true;
    }
    return entry.instance;
  }

  function prepareItem(item) {
    if (item.style === '3d') {
      try {
        const renderer = get3dRenderer(item);
        if (!renderer) {
          showArtwork('svg', item.name);
          return 'svg';
        }
        if (!motion) {
          motion = createBouquetMotion(rotatingCanvas, renderer, { spinSpeed: item.spinSpeed });
        } else {
          motion.setArtwork(renderer, { spinSpeed: item.spinSpeed });
        }
        showArtwork('3d', item.name);
        return '3d';
      } catch (error) {
        console.warn(`3D bouquet "${item.name}" unavailable, using SVG fallback:`, error);
        fallbackFrom3d(item.name);
        return 'svg';
      }
    }
    if (item.style === 'ascii') {
      try {
        activeAscii = getAsciiBouquet(item);
        if (!activeAscii) {
          showArtwork('svg', item.name);
          return 'svg';
        }
        showArtwork('ascii', item.name);
        return 'ascii';
      } catch (error) {
        console.warn(`Text bouquet "${item.name}" unavailable, using SVG fallback:`, error);
        activeAscii = null;
        showArtwork('svg', item.name);
        return 'svg';
      }
    }
    showArtwork('svg', item.name);
    return 'svg';
  }

  function finishSvg() {
    stage.classList.remove('is-blooming');
    stage.classList.add('is-bloomed');
  }

  function bloomSvg(onComplete) {
    stage.classList.remove('is-bloomed', 'is-blooming');
    void stage.offsetWidth; // force layout so CSS keyframes restart cleanly
    stage.classList.add('is-blooming');
    const animations = svg.getAnimations({ subtree: true });
    Promise.allSettled(animations.map(animation => animation.finished)).then(onComplete);
  }

  function fallbackFrom3d(name = currentItem().name) {
    const onComplete = rotatingCompletion;
    rotatingCompletion = null;
    motion?.stop();
    showArtwork('svg', name);
    if (onComplete) bloomSvg(onComplete);
    else finishSvg();
  }

  rotatingCanvas.addEventListener('contextlost', () => {
    if (activeStyle === '3d' && motion) {
      const restoreFocus = document.activeElement === rotatingCanvas;
      fallbackFrom3d();
      if (restoreFocus) stage.focus({ preventScroll: true });
    }
  });

  function stop() {
    bloomRun += 1;
    rotatingCompletion = null;
    activeAscii?.stop();
    motion?.stop();
    stage.classList.remove('is-blooming');
  }

  function finish() {
    bloomRun += 1;
    rotatingCompletion = null;
    if (activeStyle === '3d' && motion) {
      try {
        motion.finish();
      } catch (error) {
        console.warn('3D bouquet failed, using SVG fallback:', error);
        fallbackFrom3d();
      }
      return;
    }
    if (activeStyle === 'ascii' && activeAscii) {
      activeAscii.showAt(1);
      return;
    }
    finishSvg();
  }

  function bloom({ instant = false, quick = false, onComplete = () => {} } = {}) {
    stop();
    const item = currentItem();
    const resolved = prepareItem(item);
    bloomRun += 1;
    const currentRun = bloomRun;
    const complete = () => {
      if (currentRun === bloomRun) onComplete();
    };

    if (resolved === '3d' && motion) {
      rotatingCompletion = complete;
      try {
        motion.play({
          instant,
          bloomMs: quick ? SWITCH_3D_DURATION : INITIAL_3D_DURATION,
          onComplete() {
            rotatingCompletion = null;
            complete();
          },
        });
      } catch (error) {
        console.warn('3D bouquet failed, using SVG fallback:', error);
        fallbackFrom3d(item.name);
      }
      return;
    }

    if (instant) {
      finish();
      complete();
      return;
    }

    if (resolved === 'ascii' && activeAscii) {
      activeAscii.play({
        duration: quick ? SWITCH_ASCII_DURATION : ASCII_DURATION,
        onProgress(progress) {
          if (progress === 1) complete();
        },
      });
      return;
    }

    bloomSvg(complete);
  }

  function select(index, { instant = false, quick = true, onComplete = () => {} } = {}) {
    const wrapped = ((index % gallery.length) + gallery.length) % gallery.length;
    activeIndex = wrapped;
    bloom({ instant, quick, onComplete });
    return current();
  }

  function current() {
    const item = currentItem();
    return { index: activeIndex, total: gallery.length, id: item.id, name: item.name, style: item.style };
  }

  // Show the first artwork container immediately (without blooming yet).
  showArtwork(currentItem().style, currentItem().name);

  return {
    /** Pre-builds the starting bouquet during idle time so the reveal feels instant. */
    prepare() {
      prepareItem(currentItem());
    },
    bloom,
    finish,
    stop,
    select,
    next(options) { return select(activeIndex + 1, options); },
    prev(options) { return select(activeIndex - 1, options); },
    current,
    list() { return gallery.map(({ id, name, style }) => ({ id, name, style })); },
    get turnTarget() { return activeStyle === '3d' && motion ? rotatingCanvas : null; },
  };
}
