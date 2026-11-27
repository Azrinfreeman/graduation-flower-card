import { cardConfig } from './config.js';

const { enabled, files } = cardConfig.sfx;
const AudioCtor = window.AudioContext || window.webkitAudioContext;
const names = Object.keys(files);
const downloads = new Map();
const samples = new Map();
const decodes = new Map();
const fallbackClips = new Map();
const activePlayers = new Set();
let context = null;
let master = null;
let unlocked = false;
let level = 0.15;
let mutedAt = 0;

/** Slider 0 is silent. Otherwise effects sit above the song level, so short cues stay audible on phones. */
function effectGain() {
  return level === 0 ? 0 : 0.35 + 0.65 * level;
}

function clipUrl(path) {
  return new URL(path, new URL('../', import.meta.url));
}

// Fetch quietly on page load. The browser only opens the audio output after a gesture.
if (enabled && AudioCtor) {
  for (const [name, path] of Object.entries(files)) {
    const download = Promise.resolve()
      .then(() => fetch(clipUrl(path)))
      .then(response => response.ok ? response.arrayBuffer() : null)
      .catch(() => null);
    downloads.set(name, download);
  }
}

function prepareFallback() {
  for (const [name, path] of Object.entries(files)) {
    try {
      const player = new Audio();
      player.preload = 'auto';
      player.src = clipUrl(path).href;
      fallbackClips.set(name, player);
    } catch {
      // Invalid or unsupported audio has no effect on the card.
    }
  }
}

if (enabled && !AudioCtor) {
  prepareFallback();
}

function resume() {
  if (context && context.state !== 'running' && context.state !== 'closed') {
    return context.resume().catch(() => {});
  }
  return Promise.resolve();
}

function preparePlayers() {
  if (!enabled || unlocked) {
    return;
  }
  unlocked = true;
  if (!AudioCtor) {
    return;
  }

  try {
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = effectGain();
    master.connect(context.destination);
  } catch {
    context = null;
    master = null;
    prepareFallback();
    return;
  }

  for (const [name, download] of downloads) {
    const decode = download.then(async bytes => {
      if (!bytes) {
        return;
      }
      const sample = await context.decodeAudioData(bytes);
      samples.set(name, sample);
    }).catch(() => {
      // The other cues still work if this file is missing or corrupt.
    });
    decodes.set(name, decode);
  }
  downloads.clear();
}

function playSample(sample) {
  if (!sample || level === 0 || context.state !== 'running') {
    return;
  }
  const source = context.createBufferSource();
  source.buffer = sample;
  source.connect(master);
  source.addEventListener('ended', () => source.disconnect(), { once: true });
  source.start();
}

function playFallback(name) {
  const clip = fallbackClips.get(name);
  if (!clip) {
    return;
  }

  // Reuse the preloaded element. A clone lets quick taps overlap when it is still playing.
  const player = activePlayers.has(clip) ? clip.cloneNode() : clip;
  function cleanUp() {
    activePlayers.delete(player);
    player.removeEventListener('ended', cleanUp);
    player.removeEventListener('error', cleanUp);
  }
  player.currentTime = 0;
  player.volume = effectGain();
  player.muted = false;
  activePlayers.add(player);
  player.addEventListener('ended', cleanUp);
  player.addEventListener('error', cleanUp);
  player.play().catch(cleanUp);
}

export const sfx = {
  setLevel(value) {
    level = Math.max(0, Math.min(1, Number(value) || 0));
    if (level === 0) {
      mutedAt = performance.now();
    }
    if (master) {
      master.gain.value = effectGain();
    }
    for (const player of activePlayers) {
      player.volume = effectGain();
      player.muted = level === 0;
    }
  },
  /** Call from a click or tap before any cues play. */
  unlock() {
    preparePlayers();
    resume();
  },
  play(name) {
    if (!unlocked || level === 0 || !Object.hasOwn(files, name)) {
      return;
    }
    if (!context) {
      playFallback(name);
      return;
    }

    const sample = samples.get(name);
    if (sample && context.state === 'running') {
      playSample(sample);
      return;
    }

    // A quick first tap can beat decoding. Don't play a stale cue if loading or resuming takes too long.
    const requestedAt = performance.now();
    Promise.all([resume(), decodes.get(name)]).then(() => {
      if (requestedAt > mutedAt && performance.now() - requestedAt < 450) {
        playSample(samples.get(name));
      }
    }).catch(() => {});
  },
  names,
};
