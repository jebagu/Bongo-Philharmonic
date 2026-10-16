import workletUrl from './score-worklet.ts?worker&url';
import { loadSamples } from '../foundation/src/audio/samples';
import { loadMarioPaintInstrument, loadMarioPaintManifest } from '../foundation/src/asset-packs/mario-paint/audio';
import type { MarioPaintId, MarioPaintManifest } from '../foundation/src/asset-packs/mario-paint/types';
import { NATIVE_MIDI, preflightScore, prepareScore, type PreparedScore, type ScoreAttack, type ScoreBudget, type ScoreSamples, type ScoreSnapshot } from './audio-score';
import type { ScoreCommand, ScoreMessage } from './score-worklet';
import type { Composition } from './model';

export type { ScoreSnapshot, ScoreAttack, ScoreBudget } from './audio-score';

/** One shared transport for all three views. Only a deliberate Play resumes sound. */
export class ScoreTransport {
  onError?: (message: string) => void;
  onAttack?: (attacks: ScoreAttack[]) => void;
  budget?: ScoreBudget;
  counters = { peakVoices: 0, peakAttacksPerQuantum: 0, totalAttacks: 0, quanta: 0, totalRenderMs: 0, maxRenderMs: 0, wallClockResolutionMs: 1 };
  private context?: AudioContext;
  private node?: AudioWorkletNode;
  private setup?: Promise<void>;
  private bank: ScoreSamples = {};
  private bongoLoad?: Promise<void>;
  private marioLoads = new Map<string, Promise<void>>();
  private marioManifest?: Promise<MarioPaintManifest>;
  private score?: PreparedScore;
  private compositionId?: string;
  private signature?: string;
  private epoch = 0;
  private request = 0;
  private playingIntent = false;
  private pending = false;
  private includeBoundary = true;
  private loop = true;
  private disposed = false;
  private state: ScoreSnapshot = { playing: false, position: 0 };
  private anchorAudioTime = 0;
  private anchorLinearPosition = 0;
  private requestedVolume = .7;
  constructor(private onUpdate?: (snapshot: ScoreSnapshot, attacks?: { performerId: string; beat: number }[]) => void) {}

  get playing(): boolean { return this.snapshot().playing; }
  get position(): number { return this.snapshot().position; }
  /** Map an audio attack to the DOM presentation clock, including output latency. */
  toPerformanceTime(audioTime: number): number {
    const context = this.context;
    if (!context || !Number.isFinite(audioTime)) return performance.now() / 1000;
    const stamp = context.getOutputTimestamp?.();
    if (stamp && stamp.performanceTime !== undefined && stamp.contextTime !== undefined && stamp.performanceTime > 0) {
      return stamp.performanceTime / 1000 + audioTime - stamp.contextTime;
    }
    return performance.now() / 1000 + audioTime - context.currentTime + (context.outputLatency ?? context.baseLatency ?? 0);
  }
  private send(command: ScoreCommand): void { this.node?.port.postMessage(command); }
  private update(attacks?: ScoreAttack[]): void { this.onUpdate?.(this.snapshot(), attacks); if (attacks?.length) this.onAttack?.(attacks); }
  private getContext(): AudioContext {
    if (this.disposed) throw Error('This audio transport is closed. Reload the page to play.');
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.context.onstatechange = () => {
        if (this.context?.state !== 'running' && (this.playingIntent || this.state.playing)) {
          this.pause(); this.onError?.('Audio interrupted. Press Play to resume.');
        }
      };
    }
    return this.context;
  }
  private ensureWorklet(context: AudioContext): Promise<void> {
    if (!this.setup) this.setup = context.audioWorklet.addModule(workletUrl).then(() => {
      if (this.disposed) return;
      this.node = new AudioWorkletNode(context, 'bongo-planet-philharmonic-score', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
      this.node.port.onmessage = ({ data }: MessageEvent<ScoreMessage>) => {
        this.send({ type: 'ack' });
        if (data.epoch !== this.epoch || this.disposed) return;
        this.state = data.snapshot; this.anchorAudioTime = data.audioTime; this.anchorLinearPosition = data.linearPosition;
        if (data.snapshot.playing) this.includeBoundary = false;
        this.pending = data.pending || (this.pending && this.playingIntent && !data.snapshot.playing);
        if (data.counters) this.counters = data.counters;
        if (data.type === 'error') { this.playingIntent = false; this.pending = false; this.request++; this.onError?.(data.error ?? 'Playback paused. Press Play to retry.'); }
        else if (!data.snapshot.playing && !this.pending) this.playingIntent = false;
        this.update(data.attacks);
      };
      this.node.onprocessorerror = () => {
        const position = this.snapshot().position;
        this.playingIntent = false; this.pending = false; this.request++;
        this.state = { playing: false, position };
        this.node?.disconnect(); this.node = undefined; this.setup = undefined;
        this.signature = undefined;
        this.onError?.('The audio processor stopped. Press Play to rebuild it and resume.'); this.update();
      };
      this.node.connect(context.destination);
    }).catch(error => { this.setup = undefined; throw error; });
    return this.setup;
  }
  private async loadBank(context: AudioContext, composition: Composition): Promise<void> {
    if (composition.assetSetId === 'bongo') {
      this.bongoLoad ??= loadSamples(context).then(bank => { Object.assign(this.bank, bank); }).catch(error => { this.bongoLoad = undefined; throw error; });
      await this.bongoLoad;
      return;
    }
    const base = new URL(`${import.meta.env.BASE_URL}asset-packs/mario-paint/`, location.origin);
    this.marioManifest ??= loadMarioPaintManifest(base).catch(error => { this.marioManifest = undefined; throw error; });
    const manifest = await this.marioManifest;
    await Promise.all([...new Set(composition.performers.map(performer => performer.instrumentTypeId))].map(id => {
      if (!this.marioLoads.has(id)) this.marioLoads.set(id, loadMarioPaintInstrument(context, manifest, id as MarioPaintId, base).then(notes => {
        notes.forEach((note, index) => { this.bank[`${id}:${NATIVE_MIDI[index]}`] = note.sample; });
      }).catch(error => { this.marioLoads.delete(id); throw error; }));
      return this.marioLoads.get(id)!;
    }));
  }
  async prepare(composition: Composition): Promise<void> {
    const signature = JSON.stringify([composition.id, composition.assetSetId, composition.performers.map(p => [p.id, p.instrumentTypeId]), composition.events, composition.tempo, composition.lengthBeats, composition.loopRange]);
    if (this.signature === signature && this.node) { this.setVolume(composition.masterVolume); return; }
    const position = this.compositionId === composition.id ? this.snapshot().position : 0;
    this.pause();
    this.requestedVolume = composition.masterVolume;
    const revision = this.request, context = this.getContext();
    try {
      await Promise.all([this.ensureWorklet(context), this.loadBank(context, composition)]);
      if (revision !== this.request || this.disposed) return;
      const score = prepareScore(composition, this.bank), budget = preflightScore(score, this.bank, context.sampleRate, this.loop);
      score.volume = this.requestedVolume;
      if (revision !== this.request || this.disposed) return;
      this.score = score; this.budget = budget; this.signature = signature; this.compositionId = composition.id;
      this.state = { playing: false, position: Math.min(position, score.lengthBeats) };
      this.anchorAudioTime = context.currentTime; this.includeBoundary = position === 0;
      const samples: ScoreSamples = {};
      for (const event of score.events) samples[event.sampleKey] = this.bank[event.sampleKey];
      this.send({ type: 'load', score, samples, epoch: ++this.epoch, position: this.state.position, loop: this.loop });
      this.update();
    } catch (error) {
      if (revision !== this.request || this.disposed) return;
      this.signature = undefined;
      const message = error instanceof Error ? error.message : String(error);
      this.onError?.(message); throw Error(message);
    }
  }
  async play(composition?: Composition): Promise<void> {
    const context = this.getContext();
    // Preserve user activation before any module/sample await.
    const activation = context.resume();
    const preparation = composition ? this.prepare(composition) : Promise.resolve();
    const revision = this.request;
    this.playingIntent = true; this.pending = true;
    try {
      await Promise.all([activation, preparation]);
      if (revision !== this.request || !this.playingIntent || this.disposed) return;
      if (!this.score || !this.node) throw Error('Open a score before pressing Play.');
      if (context.state !== 'running') throw Error('Sound could not start. Press Play to enable audio.');
      this.budget = preflightScore(this.score, this.bank, context.sampleRate, this.loop);
      this.send({ type: 'play', epoch: this.epoch, includeBoundary: this.includeBoundary });
      this.update();
    } catch (error) {
      if (revision !== this.request || this.disposed) return;
      this.pause(); const message = error instanceof Error ? error.message : String(error);
      this.onError?.(message); throw Error(message);
    }
  }
  pause(): void {
    const position = this.snapshot().position;
    this.request++; this.playingIntent = false; this.pending = false;
    this.state = { playing: false, position };
    this.send({ type: 'pause', epoch: ++this.epoch }); this.update();
  }
  stop(): void {
    this.request++; this.playingIntent = false; this.pending = false; this.includeBoundary = true;
    this.state = { playing: false, position: 0 };
    this.send({ type: 'stop', epoch: ++this.epoch }); this.update();
  }
  seek(beat: number): void {
    if (!Number.isFinite(beat)) return;
    this.pause(); this.includeBoundary = true;
    this.state = { playing: false, position: Math.max(0, Math.min(this.score?.lengthBeats ?? beat, beat)) };
    this.send({ type: 'seek', epoch: ++this.epoch, beat: this.state.position }); this.update();
  }
  snapshot(): ScoreSnapshot {
    let position = this.state.position;
    if (this.state.playing && this.score && this.context) {
      const stamp = this.context.getOutputTimestamp?.();
      const audibleTime = stamp && stamp.performanceTime !== undefined && stamp.contextTime !== undefined && stamp.performanceTime > 0
        ? Math.min(this.context.currentTime, stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000)
        : Math.max(0, this.context.currentTime - (this.context.outputLatency ?? this.context.baseLatency ?? 0));
      position = this.anchorLinearPosition + (audibleTime - this.anchorAudioTime) * this.score.tempo / 60;
      const [a, b] = this.score.loopRange;
      if (this.loop && position >= b) position = a + (position - b) % (b - a);
      position = Math.max(0, Math.min(this.score.lengthBeats, position));
    }
    return { playing: this.state.playing || this.pending, position };
  }
  setVolume(value: number): void {
    if (Number.isFinite(value)) {
      this.requestedVolume = Math.max(0, Math.min(1, value));
      this.send({ type: 'volume', volume: this.requestedVolume });
    }
  }
  setLoop(loop: boolean): void {
    if (this.loop === loop) return;
    this.pause(); this.loop = loop;
    this.send({ type: 'loop', epoch: ++this.epoch, loop });
  }
  dispose(): void {
    this.pause(); this.disposed = true;
    this.node?.disconnect(); this.node?.port.close();
    if (this.context) { this.context.onstatechange = null; void this.context.close(); }
  }
}
