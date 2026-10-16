import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreparedScore, ScoreSamples } from '../src/audio-score';
import type { ScoreCommand, ScoreMessage } from '../src/score-worklet';

const RATE = 48_000, BLOCK = 128 / RATE;
interface Processor {
  port: { onmessage: (event: { data: ScoreCommand }) => void };
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}
const score: PreparedScore = {
  events: [{ id: 'first', performerId: 'piano', beat: 0, sampleKey: 'piano', rate: 1, gateSeconds: .1, velocity: 1 }],
  tempo: 120, lengthBeats: 4, loopRange: [0, 4], volume: .7,
};
const samples: ScoreSamples = { piano: { sampleRate: RATE, channels: [new Float32Array(RATE).fill(.2)] } };

describe('Score worklet startup and interruptions', () => {
  let processor: Processor, messages: ScoreMessage[], time: number;
  beforeEach(async () => {
    messages = []; time = 0;
    vi.resetModules();
    vi.stubGlobal('sampleRate', RATE);
    vi.stubGlobal('currentTime', time);
    vi.stubGlobal('AudioWorkletProcessor', class {
      port = { onmessage: null, postMessage: (message: ScoreMessage) => { messages.push(message); } };
    });
    vi.stubGlobal('registerProcessor', (_name: string, constructor: new () => Processor) => { processor = new constructor(); });
    await import('../src/score-worklet');
    command({ type: 'load', score, samples, epoch: 1, position: 0, loop: true });
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  function command(data: ScoreCommand) { processor.port.onmessage({ data }); }
  function block(start = time) {
    vi.stubGlobal('currentTime', start);
    command({ type: 'ack' });
    const channels = [new Float32Array(128), new Float32Array(128)];
    expect(processor.process([], [channels])).toBe(true);
    time = start + BLOCK;
    return channels;
  }
  function warmUp() { for (let i = 0; i < 120; i++) block(); }
  const errors = () => messages.filter(message => message.type === 'error');

  it('restarts silent warm-up after a startup clock gap, then plays the first note once', () => {
    block(); command({ type: 'play', epoch: 1, includeBoundary: true });
    for (let i = 0; i < 20; i++) block();
    const resumedAt = time + .5;
    expect(block(resumedAt)[0].every(value => value === 0)).toBe(true);
    for (let i = 0; i < 50; i++) expect(block()[0].every(value => value === 0)).toBe(true);
    expect(errors()).toEqual([]);
    warmUp();
    const attacks = messages.flatMap(message => message.attacks ?? []);
    expect(attacks.map(attack => attack.eventId)).toEqual(['first']);
    expect(attacks[0].audioTime).toBeGreaterThanOrEqual(resumedAt + .25);
    expect(messages.at(-1)?.snapshot.playing).toBe(true);
  });

  it('accepts deliberate Play when the last idle block predates a clock gap', () => {
    block(); vi.stubGlobal('currentTime', .5);
    command({ type: 'play', epoch: 1, includeBoundary: true });
    block(.5); warmUp();
    expect(errors()).toEqual([]);
    expect(messages.flatMap(message => message.attacks ?? []).map(attack => attack.eventId)).toEqual(['first']);
    expect(messages.at(-1)?.snapshot.playing).toBe(true);
  });

  it('still pauses a real interruption after notes start and never resumes automatically', () => {
    block(); command({ type: 'play', epoch: 1, includeBoundary: true }); warmUp();
    expect(messages.at(-1)?.snapshot.playing).toBe(true);
    const attacks = messages.flatMap(message => message.attacks ?? []).length;
    expect(block(time + .5)[0].every(value => value === 0)).toBe(true);
    expect(errors()).toHaveLength(1);
    expect(errors()[0].error).toContain('Audio clock interrupted');
    expect(errors()[0].snapshot.playing).toBe(false);
    const position = errors()[0].snapshot.position;
    warmUp();
    expect(messages.at(-1)?.snapshot).toEqual({ playing: false, position });
    expect(messages.flatMap(message => message.attacks ?? [])).toHaveLength(attacks);
  });

  it('cancels a pending warm-up when Stop is pressed after a startup gap', () => {
    block(); command({ type: 'play', epoch: 1, includeBoundary: true }); block(time + .5);
    command({ type: 'stop', epoch: 2 }); warmUp();
    expect(errors()).toEqual([]);
    expect(messages.at(-1)?.snapshot).toEqual({ playing: false, position: 0 });
    expect(messages.flatMap(message => message.attacks ?? [])).toEqual([]);
  });
});
