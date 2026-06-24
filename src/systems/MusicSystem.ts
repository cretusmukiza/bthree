type NoteEntry = [number, number, number]; // [freq Hz, start beat, duration beats]

const BPM = 140;
const BEAT = 60 / BPM;

// Pentatonic-ish melody — upbeat Afro-game feel
const MELODY: NoteEntry[] = [
  [523, 0, 0.5],   [587, 0.5, 0.5], [659, 1, 1],     [784, 2, 0.5],
  [659, 2.5, 0.5], [587, 3, 0.5],   [523, 3.5, 0.5],
  [440, 4, 1],     [523, 5, 0.5],   [587, 5.5, 0.5], [659, 6, 1],
  [523, 7, 0.5],   [440, 7.5, 0.5],

  [392, 8, 1],     [440, 9, 0.5],   [523, 9.5, 0.5], [587, 10, 1],
  [523, 11, 0.5],  [440, 11.5, 0.5],[392, 12, 1],    [440, 13, 0.5],
  [523, 13.5, 0.5],[587, 14, 0.5],  [659, 14.5, 0.5],[523, 15, 1],
];

const BASS: NoteEntry[] = [
  [131, 0, 2],  [147, 2, 2],  [165, 4, 2],  [131, 6, 2],
  [110, 8, 2],  [131, 10, 2], [98, 12, 2],   [110, 14, 2],
];

const LOOP_BEATS = 16;
const LOOP_DURATION = LOOP_BEATS * BEAT;

export class MusicSystem {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextLoopTime = 0;
  private timerId: number | null = null;
  private _playing = false;

  get playing(): boolean { return this._playing; }

  start(): void {
    if (this._playing) return;
    this.ensureContext();

    this._playing = true;
    this.nextLoopTime = this.ctx.currentTime + 0.05;
    this.scheduleLoop();
    this.tick();
  }

  stop(): void {
    this._playing = false;
    if (this.timerId != null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /** Bright ascending chime when chicken clears a lane */
  playLaneClear(): void {
    this.ensureContext();
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const notes = [659, 784, 988, 1319];
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      const start = t + i * 0.07;
      env.gain.setValueAtTime(0.18, start);
      env.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(env).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.28);
    }
  }

  /** Victorious fanfare when player cashes out */
  playCashOutFanfare(): void {
    this.ensureContext();
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    // Triumphant ascending chord progression
    const chords: [number, number][] = [
      [523, 0], [659, 0], [784, 0],
      [587, 0.15], [740, 0.15], [880, 0.15],
      [659, 0.3], [784, 0.3], [988, 0.3],
      [784, 0.5], [988, 0.5], [1319, 0.5],
    ];
    for (const [freq, offset] of chords) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const start = t + offset;
      env.gain.setValueAtTime(0.1, start);
      env.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(env).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    }

    // Coin shimmer — fast high-pitched arpeggio
    const shimmer = [1568, 1760, 2093, 2349, 2637];
    for (let i = 0; i < shimmer.length; i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = shimmer[i];
      const start = t + 0.6 + i * 0.05;
      env.gain.setValueAtTime(0.12, start);
      env.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(env).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    }
  }

  private ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.18;
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** Dramatic crash sting: descending dissonant chord + boom */
  playCrashSting(): void {
    this.ensureContext();

    const ctx = this.ctx!;
    const t = ctx.currentTime;

    // Womp 1 — gentle descending slide
    const w1 = ctx.createOscillator();
    const w1Env = ctx.createGain();
    w1.type = 'triangle';
    w1.frequency.setValueAtTime(400, t);
    w1.frequency.exponentialRampToValueAtTime(200, t + 0.25);
    w1Env.gain.setValueAtTime(0.18, t);
    w1Env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    w1.connect(w1Env).connect(ctx.destination);
    w1.start(t);
    w1.stop(t + 0.35);

    // Womp 2 — lower slide, slightly delayed
    const w2 = ctx.createOscillator();
    const w2Env = ctx.createGain();
    w2.type = 'triangle';
    w2.frequency.setValueAtTime(300, t + 0.28);
    w2.frequency.exponentialRampToValueAtTime(120, t + 0.58);
    w2Env.gain.setValueAtTime(0.18, t + 0.28);
    w2Env.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    w2.connect(w2Env).connect(ctx.destination);
    w2.start(t + 0.28);
    w2.stop(t + 0.7);

    // Soft thud — gentle low pop, not scary
    const thud = ctx.createOscillator();
    const thudEnv = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(100, t);
    thud.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    thudEnv.gain.setValueAtTime(0.12, t);
    thudEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    thud.connect(thudEnv).connect(ctx.destination);
    thud.start(t);
    thud.stop(t + 0.22);
  }

  toggle(): void {
    if (this._playing) this.stop(); else this.start();
  }

  private tick(): void {
    if (!this._playing || !this.ctx) return;

    while (this.nextLoopTime - this.ctx.currentTime < 0.3) {
      this.scheduleLoop();
    }

    this.timerId = window.setTimeout(() => this.tick(), 200);
  }

  private scheduleLoop(): void {
    const ctx = this.ctx!;
    const gain = this.gainNode!;
    const t0 = this.nextLoopTime;

    for (const [freq, beat, dur] of MELODY) {
      this.playTone(ctx, gain, freq, t0 + beat * BEAT, dur * BEAT, 'square', 0.12);
    }

    for (const [freq, beat, dur] of BASS) {
      this.playTone(ctx, gain, freq, t0 + beat * BEAT, dur * BEAT, 'triangle', 0.2);
    }

    this.schedulePercussion(ctx, gain, t0);

    this.nextLoopTime = t0 + LOOP_DURATION;
  }

  private playTone(
    ctx: AudioContext, dest: AudioNode,
    freq: number, start: number, dur: number,
    type: OscillatorType, vol: number,
  ): void {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(vol, start);
    env.gain.exponentialRampToValueAtTime(0.001, start + dur - 0.02);
    osc.connect(env).connect(dest);
    osc.start(start);
    osc.stop(start + dur);
  }

  private schedulePercussion(ctx: AudioContext, dest: AudioNode, t0: number): void {
    for (let b = 0; b < LOOP_BEATS; b++) {
      const t = t0 + b * BEAT;

      if (b % 2 === 0) {
        // Kick
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        env.gain.setValueAtTime(0.25, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(env).connect(dest);
        osc.start(t);
        osc.stop(t + 0.15);
      }

      if (b % 2 === 1) {
        // Hi-hat (noise burst)
        const bufSize = ctx.sampleRate * 0.04;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.08, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 8000;
        src.connect(hp).connect(env).connect(dest);
        src.start(t);
        src.stop(t + 0.05);
      }
    }
  }
}
