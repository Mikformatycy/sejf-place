/**
 * Collects a sequence of discrete steps (taps, mode changes, favourites...)
 * and reports it once the user pauses. Used by the "sequence" and "rhythm" keys.
 */
export const LONG_PRESS_MS = 450;
export const SEQUENCE_IDLE_MS = 1500;
export const SEQUENCE_RESET_MS = 4000;

/** Every sequence key has exactly this many steps and every rhythm exactly this many taps. */
export const SEQUENCE_STEPS = 5;
export const RHYTHM_TAPS = 6;

/** K = krótko (short press), D = długo (long press). */
export function classifyPress(durationMs: number): 'K' | 'D' {
  return durationMs > LONG_PRESS_MS ? 'D' : 'K';
}

export class StepRecorder {
  private steps: string[] = [];
  private lastAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    /**
     * Called after every step with `final = false` (so a matching key can unlock at once)
     * and once more with `final = true` after the user stops for `idleMs`.
     */
    private readonly onComplete: (steps: string[], final: boolean, stop: () => void) => void,
    private readonly idleMs = SEQUENCE_IDLE_MS,
    private readonly now: () => number = Date.now,
    /** Fixed key length: the sequence is reported as final the moment it has this many steps. */
    private readonly length?: number,
  ) {}

  push(step: string): void {
    const t = this.now();
    if (t - this.lastAt > SEQUENCE_RESET_MS) this.steps = [];
    this.lastAt = t;
    this.steps.push(step);
    if (this.timer) clearTimeout(this.timer);
    if (this.length) {
      // Fixed length: no waiting for a pause, and only exactly `length` steps are ever checked.
      if (this.steps.length < this.length) {
        this.timer = setTimeout(() => this.cancel(), SEQUENCE_RESET_MS);
        return;
      }
      const done = this.steps;
      this.steps = [];
      this.timer = null;
      this.onComplete(done, true, () => this.cancel());
      return;
    }
    this.timer = setTimeout(() => {
      const done = this.steps;
      this.steps = [];
      this.timer = null;
      this.onComplete(done, true, () => this.cancel());
    }, this.idleMs);
    this.onComplete([...this.steps], false, () => this.cancel());
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.steps = [];
  }
}

export const joinSequence = (steps: string[]) => steps.join('>');
export const joinRhythm = (steps: string[]) => steps.join('');
