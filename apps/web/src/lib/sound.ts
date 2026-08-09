/** Tiny procedural sound feedback — no audio assets, just oscillator blips. */

type CueName = "click" | "door" | "hit" | "heal" | "victory" | "defeat" | "drop";

let ctx: AudioContext | null = null;
let enabled = true;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  { duration = 0.16, type = "sine" as OscillatorType, gain = 0.08, delay = 0, glideTo }: {
    duration?: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    glideTo?: number;
  } = {},
) {
  const audio = getContext();
  if (!audio || !enabled) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

const CUES: Record<CueName, () => void> = {
  click: () => tone(520, { duration: 0.08, gain: 0.05 }),
  door: () => {
    tone(180, { duration: 0.22, type: "triangle", gain: 0.1, glideTo: 90 });
    tone(90, { duration: 0.3, type: "sine", gain: 0.06, delay: 0.05 });
  },
  hit: () => {
    tone(140, { duration: 0.18, type: "sawtooth", gain: 0.09, glideTo: 60 });
  },
  heal: () => {
    tone(440, { duration: 0.14, gain: 0.07 });
    tone(660, { duration: 0.18, gain: 0.07, delay: 0.09 });
  },
  drop: () => {
    tone(330, { duration: 0.1, gain: 0.06 });
  },
  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, { duration: 0.28, gain: 0.08, delay: i * 0.11 }));
  },
  defeat: () => {
    tone(220, { duration: 0.5, type: "sawtooth", gain: 0.09, glideTo: 55 });
  },
};

export function playCue(name: CueName) {
  try {
    CUES[name]?.();
  } catch {
    // Audio is best-effort; never let it break gameplay.
  }
}

export function setSoundEnabled(next: boolean) {
  enabled = next;
}

export function isSoundEnabled() {
  return enabled;
}
