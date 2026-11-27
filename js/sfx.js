/**
 * Soft button sounds, made with the Web Audio API (no sound files to load or license).
 * They follow the song's volume slider: slider at 0 means silence here too.
 * Browsers only allow sound after a tap, so the audio context is created on the first tap.
 */
let context = null;
let master = null;
let level = 0.15; // the song's volume (0 to 1)

const AudioCtor = window.AudioContext || window.webkitAudioContext;

/** Slider 0 = silent; otherwise effects are a little louder than the song so they stay audible. */
function effectGain() { return level === 0 ? 0 : 0.35 + 0.65 * level; }

function ensure() {
  if (!AudioCtor) return false;
  if (!context) {
    try {
      context = new AudioCtor();
      master = context.createGain();
      master.connect(context.destination);
    } catch { context = null; return false; }
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  master.gain.value = effectGain();
  return true;
}

/** One soft note: a sine/triangle with a quick attack and a smooth fade. */
function tone({ freq, to = freq, at = 0, dur = 0.12, peak = 0.12, type = 'sine' }) {
  const t = context.currentTime + at;
  const osc = context.createOscillator();
  const env = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A short breath of filtered noise (the page turn). */
function swish({ at = 0, dur = 0.14, peak = 0.09, from = 900, to = 2200 }) {
  const t = context.currentTime + at;
  const size = Math.ceil(context.sampleRate * dur);
  const buffer = context.createBuffer(1, size, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const env = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + dur * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  source.connect(filter).connect(env).connect(master);
  source.start(t);
}

const SOUNDS = {
  /** Any ordinary button. */
  tap: () => tone({ freq: 640, to: 480, dur: 0.07, peak: 0.1 }),
  /** "Open your surprise". */
  open: () => {
    tone({ freq: 523.25, dur: 0.22, peak: 0.1, type: 'triangle' });
    tone({ freq: 783.99, at: 0.09, dur: 0.32, peak: 0.1, type: 'triangle' });
  },
  /** A right answer. */
  correct: () => {
    tone({ freq: 880, dur: 0.18, peak: 0.1 });
    tone({ freq: 1318.5, at: 0.08, dur: 0.3, peak: 0.09 });
  },
  /** A wrong answer: a low, soft knock rather than a buzzer. */
  wrong: () => tone({ freq: 220, to: 140, dur: 0.16, peak: 0.16 }),
  /** Back, Next and the page dots. */
  page: () => swish({}),
  /** The bouquet has bloomed: a small rising chime. */
  bloom: () => [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    tone({ freq, at: i * 0.11, dur: 0.6, peak: 0.08, type: 'triangle' })),
};

export const sfx = {
  /** The song's volume (0 to 1); effects follow it. */
  setLevel(value) {
    level = Math.max(0, Math.min(1, Number(value) || 0));
    if (master) master.gain.value = effectGain();
  },
  /** Creates the audio context; call from a tap. */
  unlock() { ensure(); },
  play(name) {
    if (level === 0 || !SOUNDS[name] || !ensure()) return;
    try { SOUNDS[name](); } catch { /* a sound must never break the card */ }
  },
  names: Object.keys(SOUNDS),
};
