import type { Composition } from './model';
import type { InstrumentSample } from '../foundation/src/audio/samples';

export const SCORE_VOICE_LIMIT = 64;
export const SCORE_EVENT_LIMIT = 32_768;
export const SCORE_QUANTUM_ATTACK_LIMIT = 256;
export const NATIVE_MIDI = [59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79] as const;
const DRUMS = new Set(['bongo-high', 'bongo-low', 'kick', 'snare', 'hi-hat']);
const RELEASE = .02;
const EPSILON = 1e-10;

export type ScoreSamples = Record<string, InstrumentSample>;
export interface PreparedEvent {
  id: string; performerId: string; beat: number; sampleKey: string;
  rate: number; gateSeconds: number | null; velocity: number;
}
export interface PreparedScore {
  events: PreparedEvent[]; tempo: number; lengthBeats: number;
  loopRange: [number, number]; volume: number;
}
export interface ScoreAttack { performerId: string; beat: number; audioTime: number; eventId: string; voiceId: string }
export interface ScoreBudget { peakVoices: number; peakAttacksPerQuantum: number; checkedAttacks: number; alternatePeriod: number }
export interface ScoreSnapshot { playing: boolean; position: number }

export function nativeSource(pitch: number): { pitch: number; position: number; rate: number } {
  let index = 0;
  for (let i = 1; i < NATIVE_MIDI.length; i++) if (Math.abs(NATIVE_MIDI[i] - pitch) < Math.abs(NATIVE_MIDI[index] - pitch)) index = i;
  return { pitch: NATIVE_MIDI[index], position: index + 1, rate: 2 ** ((pitch - NATIVE_MIDI[index]) / 12) };
}

/** Equal onsets retain the source file's acceptance order, including unisons. */
export function prepareScore(composition: Composition, samples: ScoreSamples): PreparedScore {
  if (composition.events.length > SCORE_EVENT_LIMIT) throw Error(`This score exceeds the ${SCORE_EVENT_LIMIT.toLocaleString('en-US')}-event file limit. Your written score is unchanged.`);
  const performers = new Map(composition.performers.map(performer => [performer.id, performer]));
  const events = composition.events.map((event, order) => {
    const performer = performers.get(event.performerId);
    if (!performer) throw Error('A note refers to an instrument that is not placed.');
    let sampleKey = performer.instrumentTypeId, rate = 2 ** ((event.pitch - 60) / 12);
    let gateSeconds: number | null = event.durationBeats * 60 / composition.tempo;
    if (composition.assetSetId === 'mario') {
      const source = nativeSource(event.pitch);
      sampleKey = `${performer.instrumentTypeId}:${source.pitch}`;
      rate = source.rate;
      gateSeconds = null;
    } else if (DRUMS.has(performer.instrumentTypeId)) { rate = 1; gateSeconds = null; }
    if (!samples[sampleKey]) throw Error(`The ${performer.instrumentTypeId} sound has not finished loading. Press Play to retry.`);
    if (![event.startBeat, event.pitch, event.velocity, rate, ...(gateSeconds === null ? [] : [gateSeconds])].every(Number.isFinite)
      || event.startBeat < 0 || event.startBeat >= composition.lengthBeats || rate <= 0 || event.velocity < 0 || event.velocity > 1 || (gateSeconds !== null && gateSeconds <= 0)) throw Error('A score note has invalid timing, pitch or level.');
    return { id: event.id, performerId: event.performerId, beat: event.startBeat, sampleKey, rate, gateSeconds, velocity: event.velocity, order };
  }).sort((a, b) => a.beat - b.beat || a.order - b.order).map(({ order: _order, ...event }) => event);
  const [a, b] = composition.loopRange;
  if (!Number.isFinite(composition.tempo) || composition.tempo <= 0 || !Number.isFinite(composition.lengthBeats) || composition.lengthBeats <= 0
    || !Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b <= a || b > composition.lengthBeats) throw Error('The score tempo, length or loop is invalid.');
  return { events, tempo: composition.tempo, lengthBeats: composition.lengthBeats, loopRange: [a, b], volume: composition.masterVolume };
}

function takes(sample: InstrumentSample): InstrumentSample[] { return [sample, ...(sample.alternates ?? [])]; }
function lifetime(event: PreparedEvent, sample: InstrumentSample): number {
  const natural = sample.channels[0].length / sample.sampleRate / event.rate;
  return event.gateSeconds === null ? natural : Math.min(natural, event.gateSeconds);
}
function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
function peakIntervals(intervals: [number, number][]): number {
  const changes: [number, number][] = [];
  for (const [start, end] of intervals) if (end > start) changes.push([start, 1], [end, -1]);
  changes.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let active = 0, peak = 0;
  for (const [, delta] of changes) { active += delta; peak = Math.max(peak, active); }
  return peak;
}
function quantumPeak(times: number[], quantum: number): number {
  times.sort((a, b) => a - b);
  let first = 0, peak = 0;
  for (let i = 0; i < times.length; i++) {
    while (times[first] <= times[i] - quantum + EPSILON) first++;
    peak = Math.max(peak, i - first + 1);
  }
  return peak;
}
function budgetFailure(peak: number, attacks: number): void {
  if (peak > SCORE_VOICE_LIMIT) throw Error(`Playback needs ${peak} ringing notes at once; the limit is ${SCORE_VOICE_LIMIT}. Shorten or space the notes and press Play. Your written score is unchanged.`);
  if (attacks > SCORE_QUANTUM_ATTACK_LIMIT) throw Error(`Too many note attacks in one audio block (${attacks}; limit ${SCORE_QUANTUM_ATTACK_LIMIT}). Space the notes and press Play. Your written score is unchanged.`);
}

/** Exact sample-tail occupancy on a circular A/B superperiod, rather than note-box overlap. */
export function preflightScore(score: PreparedScore, samples: ScoreSamples, sampleRate = 48_000, looping = true): ScoreBudget {
  const secondsPerBeat = 60 / score.tempo, quantum = 128 / sampleRate;
  const counters = new Map<string, number>(), linear: [number, number][] = [], linearTimes: number[] = [];
  for (const event of score.events) {
    const bank = takes(samples[event.sampleKey]);
    const index = counters.get(event.sampleKey) ?? 0;
    counters.set(event.sampleKey, index + 1);
    const time = event.beat * secondsPerBeat;
    linear.push([time, time + lifetime(event, bank[index % bank.length])]); linearTimes.push(time);
  }
  let peak = peakIntervals(linear), attackPeak = quantumPeak(linearTimes, quantum), checkedAttacks = linear.length;
  budgetFailure(peak, attackPeak);
  if (!looping) return { peakVoices: peak, peakAttacksPerQuantum: attackPeak, checkedAttacks, alternatePeriod: 1 };
  const [a, b] = score.loopRange, loop = score.events.filter(event => event.beat >= a && event.beat < b), period = (b - a) * secondsPerBeat;
  if (!loop.length) return { peakVoices: peak, peakAttacksPerQuantum: attackPeak, checkedAttacks, alternatePeriod: 1 };
  const counts = new Map<string, number>();
  for (const event of loop) counts.set(event.sampleKey, (counts.get(event.sampleKey) ?? 0) + 1);
  let cycleCount = 1;
  for (const [key, count] of counts) {
    const size = takes(samples[key]).length, n = size / gcd(size, count);
    cycleCount = cycleCount * n / gcd(cycleCount, n);
  }
  if (cycleCount > 16) throw Error('This sample-alternation pattern exceeds the checked loop budget. Use a shorter sound bank. Your score is unchanged.');
  const superperiod = period * cycleCount, changes: [number, number][] = [], times: number[] = [];
  let constantVoices = 0, maxLoopTail = 0;
  counters.clear();
  // Include the actual first-pass take offset before the looping passage.
  for (const event of score.events) if (event.beat < a) counters.set(event.sampleKey, (counters.get(event.sampleKey) ?? 0) + 1);
  for (let cycle = 0; cycle < cycleCount; cycle++) for (const event of loop) {
    const bank = takes(samples[event.sampleKey]), index = counters.get(event.sampleKey) ?? 0;
    counters.set(event.sampleKey, index + 1);
    const start = (event.beat - a) * secondsPerBeat + cycle * period;
    const duration = lifetime(event, bank[index % bank.length]);
    maxLoopTail = Math.max(maxLoopTail, duration);
    const full = Math.floor(duration / superperiod + EPSILON);
    constantVoices += full;
    const remainder = Math.max(0, duration - full * superperiod);
    if (remainder > EPSILON) {
      const end = start + remainder;
      if (end <= superperiod + EPSILON) changes.push([start, 1], [Math.min(end, superperiod), -1]);
      else { constantVoices++; changes.push([end - superperiod, -1], [start, 1]); }
    }
    times.push(start); checkedAttacks++;
  }
  changes.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let active = constantVoices, circularPeak = active;
  for (const [, delta] of changes) { active += delta; circularPeak = Math.max(circularPeak, active); }
  peak = Math.max(peak, circularPeak);
  // A quantum can cross the superperiod boundary or encompass multiple tiny loops.
  const whole = Math.floor(quantum / superperiod), residual = quantum - whole * superperiod;
  const circularTimes = [...times, ...times.map(time => time + superperiod)];
  attackPeak = Math.max(attackPeak, whole * times.length + (residual > EPSILON ? quantumPeak(circularTimes, residual) : 0));
  budgetFailure(peak, attackPeak);
  // An intro may have long tails that cross the first wrap. After the looping
  // tail horizon, its contribution only decreases, so one full superperiod suffices.
  const intro = score.events.filter(event => event.beat < a);
  if (intro.length) {
    const horizon = b * secondsPerBeat + maxLoopTail + superperiod;
    const intervals: [number, number][] = [], attacks: number[] = [];
    counters.clear();
    const add = (event: PreparedEvent, time: number) => {
      const bank = takes(samples[event.sampleKey]), index = counters.get(event.sampleKey) ?? 0;
      counters.set(event.sampleKey, index + 1);
      intervals.push([time, time + lifetime(event, bank[index % bank.length])]); attacks.push(time);
    };
    for (const event of score.events) if (event.beat < b) add(event, event.beat * secondsPerBeat);
    for (let cycle = 0; ; cycle++) {
      const start = b * secondsPerBeat + cycle * period;
      if (start >= horizon) break;
      for (const event of loop) add(event, start + (event.beat - a) * secondsPerBeat);
      if (intervals.length > 262_144) throw Error('This introduction exceeds the checked audio-work budget. Shorten the introduction or loop before playback. Your score is unchanged.');
    }
    checkedAttacks += intervals.length;
    peak = Math.max(peak, peakIntervals(intervals)); attackPeak = Math.max(attackPeak, quantumPeak(attacks, quantum));
    budgetFailure(peak, attackPeak);
  }
  return { peakVoices: peak, peakAttacksPerQuantum: attackPeak, checkedAttacks, alternatePeriod: cycleCount };
}

interface Voice { id: string; event: PreparedEvent; sample: InstrumentSample; onset: number; duration: number; release?: number }

/** The same driver is exercised by unit/offline tests and by every real audio quantum. */
export class ScoreDriver {
  playing = false;
  loop = true;
  volume = 1;
  epoch = 0;
  peakVoices = 0;
  peakAttacksPerQuantum = 0;
  totalAttacks = 0;
  private voices: Voice[] = [];
  private counters = new Map<string, number>();
  private anchorTime = 0;
  private anchorBeat = 0;
  private pausedBeat = 0;
  private firstEvent = 0;
  private nextIndex = 0;
  private cycle = -1;
  private loopEvents: PreparedEvent[] = [];
  private activeEvents: PreparedEvent[] = [];
  private sequence = 0;
  private previousEnd: number | null = null;
  constructor(readonly sampleRate: number, readonly samples: ScoreSamples, readonly score: PreparedScore) {
    this.volume = score.volume;
    this.loopEvents = score.events.filter(event => event.beat >= score.loopRange[0] && event.beat < score.loopRange[1]);
  }
  get activeVoices(): number { return this.voices.length; }
  linearPosition(time: number): number {
    return this.playing ? this.anchorBeat + Math.max(0, time - this.anchorTime) * this.score.tempo / 60 : this.pausedBeat;
  }
  position(time: number): number {
    if (!this.playing) return this.pausedBeat;
    const beat = this.linearPosition(time);
    if (!this.loop) return Math.min(this.score.lengthBeats, beat);
    const [a, b] = this.score.loopRange;
    return beat < b ? beat : a + ((beat - b) % (b - a));
  }
  snapshot(time: number): ScoreSnapshot { return { playing: this.playing, position: this.position(time) }; }
  private takesBefore(beat: number): void {
    this.counters.clear();
    for (const event of this.score.events) if (event.beat < beat - EPSILON) this.counters.set(event.sampleKey, (this.counters.get(event.sampleKey) ?? 0) + 1);
  }
  play(time: number, includeBoundary = false): void {
    if (this.playing) return;
    if (!this.loop && this.pausedBeat >= this.score.lengthBeats) { this.pausedBeat = 0; this.counters.clear(); includeBoundary = true; }
    if (this.loop && this.pausedBeat >= this.score.loopRange[1]) { this.pausedBeat = this.score.loopRange[0]; this.takesBefore(this.pausedBeat); includeBoundary = true; }
    this.anchorBeat = this.pausedBeat; this.anchorTime = time; this.playing = true;
    this.activeEvents = this.loop ? this.score.events.filter(event => event.beat < this.score.loopRange[1]) : this.score.events;
    this.firstEvent = this.activeEvents.findIndex(event => includeBoundary ? event.beat >= this.anchorBeat - EPSILON : event.beat > this.anchorBeat + EPSILON);
    this.nextIndex = this.firstEvent < 0 ? this.activeEvents.length : this.firstEvent;
    this.cycle = -1; this.previousEnd = null;
  }
  pause(time: number): void {
    this.pausedBeat = this.position(time); this.playing = false; this.epoch++;
    for (const voice of this.voices) voice.release ??= time;
  }
  interrupt(time: number): void { this.pause(time); this.voices = []; }
  seek(beat: number, time: number): void {
    this.pause(time); this.pausedBeat = Math.max(0, Math.min(this.score.lengthBeats, beat));
    // A seek/edit opens a canonical pass at that beat. Reconstruct the take
    // phase so skipping earlier hits cannot invent an unchecked A/B ordering.
    this.takesBefore(this.pausedBeat);
  }
  stop(time: number): void { this.seek(0, time); this.counters.clear(); }
  setLoop(loop: boolean, time: number): void { if (this.loop !== loop) { this.pause(time); this.loop = loop; } }
  private next(): { event: PreparedEvent; time: number } | undefined {
    const events = this.cycle < 0 ? this.activeEvents : this.loopEvents;
    const event = events[this.nextIndex];
    if (event) {
      const delta = this.cycle < 0 ? event.beat - this.anchorBeat
        : this.score.loopRange[1] - this.anchorBeat + this.cycle * (this.score.loopRange[1] - this.score.loopRange[0]) + event.beat - this.score.loopRange[0];
      return { event, time: this.anchorTime + delta * 60 / this.score.tempo };
    }
    if (!this.loop || !this.loopEvents.length) return;
    this.cycle++; this.nextIndex = 0;
    return this.next();
  }
  private prune(time: number): void {
    this.voices = this.voices.filter(voice => time < voice.onset + voice.duration - EPSILON && (voice.release === undefined || time < voice.release + RELEASE));
  }
  process(channels: Float32Array[], start: number): ScoreAttack[] {
    const frames = channels[0]?.length ?? 0, end = start + frames / this.sampleRate;
    if (this.playing && this.previousEnd !== null) {
      if (start - this.previousEnd > .1 || this.previousEnd - start > .02 + EPSILON) {
        this.interrupt(this.previousEnd);
        throw Error('Audio clock interrupted. Playback paused; press Play to resume.');
      }
    }
    this.previousEnd = end;
    const scheduled: { event: PreparedEvent; time: number }[] = [];
    if (this.playing) while (true) {
      const next = this.next();
      // An attack between the last sample of this block and its end is
      // represented by the first sample of the next block.
      if (!next || next.time > start + (frames - 1) / this.sampleRate + EPSILON) break;
      if (next.time < start - .02) { this.pause(start); throw Error('Audio fell behind. Playback paused; press Play to resume.'); }
      if (scheduled.length >= SCORE_QUANTUM_ATTACK_LIMIT) { this.pause(start); throw Error('Audio block attack limit reached. Space the notes and press Play.'); }
      scheduled.push(next); this.nextIndex++;
    }
    this.peakAttacksPerQuantum = Math.max(this.peakAttacksPerQuantum, scheduled.length);
    const attacks: ScoreAttack[] = [];
    let pending = 0;
    for (let frame = 0; frame < frames; frame++) {
      const now = start + frame / this.sampleRate;
      while (pending < scheduled.length && scheduled[pending].time <= now + EPSILON) {
        const { event, time } = scheduled[pending++];
        this.prune(time);
        if (this.voices.length >= SCORE_VOICE_LIMIT) { this.pause(now); throw Error('Ringing-note limit reached. Shorten or space the notes and press Play.'); }
        const bank = takes(this.samples[event.sampleKey]), count = this.counters.get(event.sampleKey) ?? 0, sample = bank[count % bank.length];
        this.counters.set(event.sampleKey, count + 1);
        const id = `${this.epoch}:${event.id}:${++this.sequence}`;
        this.voices.push({ id, event, sample, onset: time, duration: lifetime(event, sample) });
        this.peakVoices = Math.max(this.peakVoices, this.voices.length); this.totalAttacks++;
        attacks.push({ performerId: event.performerId, beat: event.beat, audioTime: time, eventId: event.id, voiceId: id });
      }
      for (let channel = 0; channel < channels.length; channel++) {
        let mix = 0;
        for (const voice of this.voices) {
          const age = now - voice.onset;
          if (age < 0 || age >= voice.duration) continue;
          const release = voice.release === undefined ? 1 : Math.max(0, 1 - (now - voice.release) / RELEASE);
          if (release <= 0) continue;
          const pcm = voice.sample.channels[Math.min(channel, voice.sample.channels.length - 1)];
          const offset = age * voice.sample.sampleRate * voice.event.rate, index = Math.floor(offset), fraction = offset - index;
          if (index >= pcm.length) continue;
          const waveform = pcm[index] * (1 - fraction) + (pcm[index + 1] ?? 0) * fraction;
          const gate = voice.event.gateSeconds;
          const envelope = gate === null ? 1 : Math.min(1, age / .002) * Math.min(1, (gate - age) / Math.min(RELEASE, gate / 4));
          mix += waveform * envelope * release * voice.event.velocity * .65;
        }
        channels[channel][frame] = .98 * Math.tanh(mix * Math.max(0, Math.min(1, this.volume)));
      }
    }
    this.prune(end);
    if (this.playing && !this.loop && this.anchorBeat + (end - this.anchorTime) * this.score.tempo / 60 >= this.score.lengthBeats) {
      this.pausedBeat = this.score.lengthBeats; this.playing = false;
    }
    return attacks;
  }
}
