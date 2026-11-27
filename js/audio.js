import { showToast } from './toast.js';

const STORAGE_KEY = 'graduationCardVolume';

/**
 * Background song. There is no player on the page: the song starts quietly when the flowers bloom
 * and keeps going to the end. A small corner control lets the visitor change the volume (down to 0 = muted).
 *
 * Browsers only allow sound after a tap, so `prime()` is called from the "Open your surprise" tap
 * (it unlocks the audio element) and `start()` plays it later, when the bloom begins.
 *
 * Volume goes through a Web Audio gain node when possible, because iPhones ignore `audio.volume`.
 * If Web Audio is unavailable it falls back to `audio.volume`.
 */
export function setupMusic(config) {
  const player = document.getElementById('backgroundMusic');
  const listeners = [];
  const defaultLevel = clamp(config.volume ?? 0.15);
  let level = readSaved() ?? defaultLevel; // what the visitor chose (0 to 1)
  let started = false;
  let priming = false;
  let fadeTimer = null;
  let context = null;
  let gain = null;

  const state = () => ({ enabled: Boolean(config.enabled), started, playing: !player.paused, volume: level });
  const notify = () => listeners.forEach(listener => listener(state()));

  function onChange(listener) {
    listeners.push(listener);
  }

  // The same volume setting is used when the card only has sound effects.
  if (!config.enabled) {
    return { prime() {}, start() {}, toggle() {}, setVolume, state, onChange };
  }

  function clamp(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
  function readSaved() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved === null ? null : clamp(saved);
    } catch { return null; }
  }
  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, String(level)); } catch { /* private mode: fine */ }
  }

  /** Sets the loudness actually heard (0 to 1), without changing the visitor's chosen level. */
  function output(value) {
    if (gain) gain.gain.value = value;
    else player.volume = clamp(value);
  }

  /** Creates the gain node once (must happen after a tap). */
  function connect() {
    if (context || !(window.AudioContext || window.webkitAudioContext)) return;
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      gain = context.createGain();
      context.createMediaElementSource(player).connect(gain);
      gain.connect(context.destination);
      player.volume = 1;
    } catch {
      context = null; gain = null; // fall back to player.volume
    }
  }
  const wake = () => { if (context?.state === 'suspended') context.resume().catch(() => {}); };

  player.src = config.src;
  player.addEventListener('play', () => { if (!priming) { started = true; notify(); } });
  player.addEventListener('pause', () => { if (!priming) notify(); });
  player.addEventListener('error', () => {
    player.pause();
    notify();
    showToast('The song could not be loaded.');
  });

  async function play() {
    wake();
    try {
      await player.play();
    } catch (error) {
      if (error.name !== 'AbortError') console.warn('The song could not start (the volume icon can start it):', error);
    }
  }

  function setVolume(value, { startPlayback = true } = {}) {
    window.clearInterval(fadeTimer);
    level = clamp(value);
    save();
    if (config.enabled) {
      output(level);
      if (startPlayback && level > 0 && player.paused) {
        play();
      }
    }
    notify();
  }

  return {
    /** Call from a tap. Plays and pauses the file silently so a later start() is allowed (needed on iPhones). */
    prime() {
      connect();
      wake();
      output(0);
      priming = true;
      player.muted = true;
      player.play().then(() => {
        player.pause();
        player.currentTime = 0;
      }).catch(() => {}).finally(() => {
        player.muted = false;
        priming = false;
      });
    },
    /** Starts the song, fading in from silence up to the chosen level. */
    start({ fadeMs = 3000 } = {}) {
      window.clearInterval(fadeTimer);
      output(0);
      play().then(() => {
        const begun = performance.now();
        fadeTimer = window.setInterval(() => {
          const progress = Math.min(1, (performance.now() - begun) / fadeMs);
          output(level * progress); // reads the live level, so moving the slider during the fade works
          if (progress >= 1) window.clearInterval(fadeTimer);
        }, 60);
      });
    },
    setVolume,
    /** The icon when the song is not playing (autoplay blocked): start it at the chosen level (or the default). */
    toggle() {
      window.clearInterval(fadeTimer);
      if (level === 0) level = defaultLevel;
      connect();
      output(level);
      if (player.paused) play(); else player.pause();
      notify();
    },
    state,
    /** Calls `listener({ enabled, started, playing, volume })` whenever the song or volume changes. */
    onChange,
  };
}
