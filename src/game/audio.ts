import { BLUE, RED, YELLOW } from '../core/colors';

/** Tiny synthesized sound effects (Web Audio): no third-party audio files. */
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  /** Browsers only allow audio after a user gesture; call from a pointer handler. */
  unlock(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, duration: number, type: OscillatorType, gain = 0.08, delay = 0): void {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + duration);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  splat(color: number, completed: boolean): void {
    const base = color === RED ? 330 : color === YELLOW ? 440 : color === BLUE ? 262 : 300;
    this.tone(base * (0.95 + Math.random() * 0.1), 0.09, 'sine', 0.05);
    if (completed) this.tone(base * 2, 0.08, 'triangle', 0.03, 0.03);
  }

  launch(): void {
    this.tone(520, 0.06, 'square', 0.025);
  }

  /** Soft low blip: the tap was heard, but the belt is full. */
  refuse(): void {
    this.tone(180, 0.08, 'triangle', 0.04);
  }

  /** Rising two-note chime: a covered bucket turns over and shows its colour. */
  reveal(): void {
    this.tone(660, 0.07, 'triangle', 0.04);
    this.tone(880, 0.09, 'triangle', 0.04, 0.06);
  }

  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.07, i * 0.11));
  }

  jam(): void {
    this.tone(140, 0.35, 'sawtooth', 0.06);
  }
}

export const sfx = new Sfx();
