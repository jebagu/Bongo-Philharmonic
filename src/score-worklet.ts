import { ScoreDriver, type PreparedScore, type ScoreAttack, type ScoreSamples, type ScoreSnapshot } from './audio-score';

declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor { readonly port: MessagePort; constructor(); }
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;

export type ScoreCommand =
  | { type: 'load'; score: PreparedScore; samples: ScoreSamples; epoch: number; position: number; loop: boolean }
  | { type: 'play'; epoch: number; includeBoundary: boolean }
  | { type: 'pause' | 'stop'; epoch: number }
  | { type: 'seek'; epoch: number; beat: number }
  | { type: 'volume'; volume: number }
  | { type: 'loop'; loop: boolean; epoch: number }
  | { type: 'ack' };
export interface ScoreMessage {
  type: 'status' | 'error'; epoch: number; audioTime: number;
  snapshot: ScoreSnapshot; linearPosition: number; pending: boolean; attacks?: ScoreAttack[]; error?: string;
  counters?: { peakVoices: number; peakAttacksPerQuantum: number; totalAttacks: number; quanta: number; totalRenderMs: number; maxRenderMs: number; wallClockResolutionMs: 1 };
}

class ComposerProcessor extends AudioWorkletProcessor {
  private driver?: ScoreDriver;
  private epoch = 0;
  private pending = false;
  private includeBoundary = true;
  private stableSince = 0;
  private previousEnd?: number;
  private lastReport = -Infinity;
  private inFlight = false;
  private attacks: ScoreAttack[] = [];
  private quanta = 0;
  private totalRenderMs = 0;
  private maxRenderMs = 0;
  constructor() {
    super();
    this.port.onmessage = ({ data }: MessageEvent<ScoreCommand>) => {
      try {
        if (data.type === 'ack') { this.inFlight = false; return; }
        if (data.type === 'volume') { if (this.driver) this.driver.volume = data.volume; return; }
        this.epoch = data.epoch;
        if (data.type === 'load') {
          this.pending = false; this.attacks = [];
          this.driver?.pause(currentTime);
          this.driver = new ScoreDriver(sampleRate, data.samples, data.score);
          this.quanta = 0; this.totalRenderMs = 0; this.maxRenderMs = 0;
          this.driver.loop = data.loop;
          this.driver.seek(data.position, currentTime);
        } else if (data.type === 'play') {
          if (this.driver && !this.driver.playing) {
            // A completed non-looping score can still have natural tails.
            // Release them during warm-up before a deliberate restart.
            this.driver.pause(currentTime);
            this.pending = true; this.includeBoundary = data.includeBoundary; this.stableSince = currentTime;
          }
        } else {
          this.pending = false; this.attacks = [];
          if (data.type === 'pause') this.driver?.pause(currentTime);
          else if (data.type === 'stop') this.driver?.stop(currentTime);
          else if (data.type === 'seek') this.driver?.seek(data.beat, currentTime);
          else if (data.type === 'loop') this.driver?.setLoop(data.loop, currentTime);
        }
        this.report(currentTime, true);
      } catch (error) { this.fail(error); }
    };
  }
  private report(time: number, force = false, error?: string): void {
    if (!force && (this.inFlight || time - this.lastReport < .04)) return;
    this.inFlight = true; this.lastReport = time;
    const driver = this.driver;
    const message: ScoreMessage = {
      type: error ? 'error' : 'status', epoch: this.epoch, audioTime: time,
      snapshot: driver?.snapshot(time) ?? { playing: false, position: 0 }, pending: this.pending,
      linearPosition: driver?.linearPosition(time) ?? 0,
      attacks: this.attacks, ...(error ? { error } : {}),
      ...(driver ? { counters: { peakVoices: driver.peakVoices, peakAttacksPerQuantum: driver.peakAttacksPerQuantum, totalAttacks: driver.totalAttacks, quanta: this.quanta, totalRenderMs: this.totalRenderMs, maxRenderMs: this.maxRenderMs, wallClockResolutionMs: 1 as const } } : {}),
    };
    this.attacks = []; this.port.postMessage(message);
  }
  private fail(error: unknown): void {
    this.pending = false;
    this.driver?.interrupt(this.previousEnd ?? currentTime);
    this.attacks = [];
    this.report(currentTime, true, error instanceof Error ? error.message : String(error));
  }
  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const channels = outputs[0];
    if (!channels?.[0]) return true;
    const frames = channels[0].length;
    try {
      if (this.previousEnd !== undefined && currentTime < this.previousEnd - .02 - .01 / sampleRate) {
        this.fail(Error('Audio clock moved backward. Playback paused; press Play to resume.'));
        channels.forEach(channel => channel.fill(0)); this.previousEnd = currentTime + frames / sampleRate; return true;
      }
      const start = Math.max(currentTime, this.previousEnd ?? 0), end = start + frames / sampleRate;
      if (this.previousEnd === undefined) this.stableSince = start;
      else if (start - this.previousEnd > .1) {
        this.stableSince = start;
        // Startup is still silent: restart its stability window rather than
        // cancelling the user's Play before the score has begun.
        if (this.driver?.playing) {
          this.fail(Error('Audio clock interrupted. Playback paused; press Play to resume.'));
          channels.forEach(channel => channel.fill(0)); this.previousEnd = end; return true;
        }
      }
      if (this.pending && start - this.stableSince >= .25) {
        this.pending = false; this.driver?.play(start, this.includeBoundary);
      }
      const wallStart = Date.now();
      if (this.driver) this.attacks.push(...this.driver.process(channels, start));
      else channels.forEach(channel => channel.fill(0));
      const elapsed = Date.now() - wallStart;
      this.quanta++; this.totalRenderMs += elapsed; this.maxRenderMs = Math.max(this.maxRenderMs, elapsed);
      this.previousEnd = end;
      if (this.attacks.length > 2048) throw Error('Score feedback fell behind. Playback paused; press Play to resume.');
      this.report(end);
    } catch (error) { this.fail(error); channels.forEach(channel => channel.fill(0)); }
    return true;
  }
}

registerProcessor('bongo-planet-philharmonic-score', ComposerProcessor);
