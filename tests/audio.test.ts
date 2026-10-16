import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { performance } from 'node:perf_hooks';
import { ScoreDriver, NATIVE_MIDI, nativeSource, prepareScore, preflightScore, type PreparedScore, type ScoreSamples } from '../src/audio-score';
import type { Composition, ScoreEvent } from '../src/model';
import type { InstrumentSample } from '../foundation/src/audio/samples';
import { ScoreTransport } from '../src/audio';

const adapterControl = vi.hoisted(() => ({ samples: {} as Record<string, unknown>, load: undefined as undefined | Promise<Record<string, unknown>> }));
vi.mock('../foundation/src/audio/samples', () => ({ loadSamples: () => adapterControl.load ?? Promise.resolve(adapterControl.samples) }));

const RATE = 48_000;
const sample = (seconds: number, value = .2): InstrumentSample => ({ channels: [new Float32Array(Math.round(seconds * RATE)).fill(value)], sampleRate: RATE });
const event = (id: number, startBeat = 0, options: Partial<ScoreEvent> = {}): ScoreEvent => ({ id: `event_${id}`, performerId: 'performer', pitch: 60, startBeat, durationBeats: .1, velocity: 1, ...options });
function composition(events: ScoreEvent[], options: Partial<Composition> = {}): Composition {
  return { schemaVersion: 1, id: 'score', title: 'Test', assetSetId: 'bongo', appearance: 'original',
    performers: [{ id: 'performer', instrumentTypeId: 'piano', junctionId: 0, familyNumber: 1 }], locationNames: {},
    tempo: 120, meter: [4, 4], editSubdivision: 4, lengthBeats: 4, loopRange: [0, 4], masterVolume: .7, events, ...options };
}
function run(driver: ScoreDriver, seconds: number, start = 0, blockSize = 128) {
  const pcm = new Float32Array(Math.ceil(seconds * RATE)), attacks = [];
  for (let frame = 0; frame < pcm.length; frame += blockSize) {
    const block = pcm.subarray(frame, Math.min(frame + blockSize, pcm.length));
    attacks.push(...driver.process([block], start + frame / RATE));
  }
  return { pcm, attacks };
}

describe('Composer score scheduling and sample ownership', () => {
  it('starts fractional, non-grid events from the audio anchor and preserves every unison', () => {
    const bank = { piano: sample(.5) }, beat = 1 / 3 + .000013;
    const comp = composition([event(1, beat), event(2, beat), event(3, .001)]);
    const untouched = structuredClone(comp), score = prepareScore(comp, bank), driver = new ScoreDriver(RATE, bank, score);
    driver.loop = false; driver.play(7, true);
    const result = run(driver, .4, 7);
    expect(comp).toEqual(untouched);
    expect(result.attacks.map(attack => attack.eventId)).toEqual(['event_3', 'event_1', 'event_2']);
    expect(result.attacks[1].audioTime).toBe(7 + beat * .5);
    expect(result.attacks[1].voiceId).not.toBe(result.attacks[2].voiceId);
    expect(driver.totalAttacks).toBe(3);
    expect(driver.peakVoices).toBe(2);
  });
  it('does not lose attacks between a quantum’s last sample and its boundary', () => {
    const onset = (127.6 / RATE), bank = { piano: sample(.01) };
    const score = prepareScore(composition([event(1, onset * 2)]), bank), driver = new ScoreDriver(RATE, bank, score);
    driver.play(0, true);
    const result = run(driver, .01);
    expect(result.attacks).toHaveLength(1);
    expect(result.attacks[0].audioTime).toBe(onset);
    expect(result.pcm.subarray(0, 128).every(value => value === 0)).toBe(true);
    expect(result.pcm[128]).toBeGreaterThan(0);
  });
  it('keeps a polyphonic performer separate from its sounding voices', () => {
    const bank = { piano: sample(.5) }, score = prepareScore(composition([event(1), event(2, 0, { pitch: 64 }), event(3, 0, { pitch: 67 })]), bank);
    const driver = new ScoreDriver(RATE, bank, score);
    driver.play(0, true);
    const { attacks } = run(driver, .03);
    expect(new Set(attacks.map(attack => attack.performerId)).size).toBe(1);
    expect(driver.activeVoices).toBe(3);
  });
  it('retains precise paused beat, fades within 20ms, resumes future attacks, and rewinds on Stop', () => {
    const bank = { piano: sample(1) }, score = prepareScore(composition([event(1, 0, { durationBeats: 2 }), event(2, 1)]), bank);
    const driver = new ScoreDriver(RATE, bank, score);
    driver.play(0, true); run(driver, .2);
    driver.pause(.2);
    expect(driver.snapshot(100)).toEqual({ playing: false, position: .4 });
    expect(run(driver, .03, .2).pcm.subarray(961).every(value => value === 0)).toBe(true);
    driver.play(1);
    const resumed = run(driver, .4, 1);
    expect(resumed.attacks.map(attack => attack.eventId)).toEqual(['event_2']);
    expect(resumed.attacks[0].audioTime).toBe(1.3);
    driver.stop(1.4);
    expect(driver.snapshot(9)).toEqual({ playing: false, position: 0 });
    driver.play(2, true);
    expect(run(driver, .01, 2).attacks[0].eventId).toBe('event_1');
  });
  it('keeps loop onsets anchored over 1,000 iterations without cumulative timing drift', () => {
    const bank = { piano: sample(.003) }, comp = composition([event(1, .125)], { tempo: 137, lengthBeats: .25, loopRange: [0, .25] });
    const driver = new ScoreDriver(RATE, bank, prepareScore(comp, bank));
    driver.play(10, true);
    const { attacks } = run(driver, 1001 * .25 * 60 / 137, 10);
    expect(attacks).toHaveLength(1001);
    for (let cycle = 0; cycle < attacks.length; cycle++) expect(Math.abs(attacks[cycle].audioTime - (10 + (.125 + cycle * .25) * 60 / 137))).toBeLessThan(1e-12);
    expect(new Set(attacks.map(attack => attack.voiceId)).size).toBe(attacks.length);
  });
  it('plays exact native notes at rate 1 with their natural envelopes and supports explicit semitone transposition', () => {
    for (const pitch of NATIVE_MIDI) expect(nativeSource(pitch).rate).toBe(1);
    expect(nativeSource(61)).toEqual({ pitch: 60, position: 2, rate: 2 ** (1 / 12) });
    const bank = { 'mario:60': sample(.2) }, comp = composition([event(1, 0, { durationBeats: .01 })], {
      assetSetId: 'mario', performers: [{ id: 'performer', instrumentTypeId: 'mario', junctionId: 0, familyNumber: 1 }],
    });
    const score = prepareScore(comp, bank), driver = new ScoreDriver(RATE, bank, score);
    expect(score.events[0].gateSeconds).toBeNull();
    driver.play(0, true);
    const pcm = run(driver, .21).pcm;
    expect(pcm[0]).toBeCloseTo(.98 * Math.tanh(.2 * .65 * .7), 7);
    expect(pcm[5000]).toBe(pcm[0]);
    expect(pcm[9600]).toBe(0);
  });
  it('alternates actual drum takes across repeated odd-attack loops, independent of pitch/note-box duration', () => {
    const a = sample(.03, .1), b = sample(.06, .3), bank = { kick: { ...a, alternates: [b] } };
    const comp = composition([event(1, 0, { pitch: 127, durationBeats: 100 })], {
      lengthBeats: .25, loopRange: [0, .25], performers: [{ id: 'performer', instrumentTypeId: 'kick', junctionId: 0, familyNumber: 1 }],
    });
    const score = prepareScore(comp, bank), budget = preflightScore(score, bank), driver = new ScoreDriver(RATE, bank, score);
    expect(budget.alternatePeriod).toBe(2); expect(budget.peakVoices).toBe(1);
    expect(score.events[0].rate).toBe(1);
    driver.play(0, true);
    const result = run(driver, .5);
    expect(result.attacks).toHaveLength(4);
    expect(result.pcm[0]).toBeCloseTo(.98 * Math.tanh(.1 * .65 * .7), 6);
    expect(result.pcm[6000]).toBeCloseTo(.98 * Math.tanh(.3 * .65 * .7), 6);
    expect(result.pcm[12000]).toBeCloseTo(result.pcm[0], 6);
  });
  it('ends non-looping transport at the score end while preserving a natural ringing tail', () => {
    const bank = { kick: sample(.3) }, comp = composition([event(1)], { lengthBeats: .25, loopRange: [0, .25], performers: [{ id: 'performer', instrumentTypeId: 'kick', junctionId: 0, familyNumber: 1 }] });
    const driver = new ScoreDriver(RATE, bank, prepareScore(comp, bank));
    driver.loop = false; driver.play(0, true);
    const result = run(driver, .2);
    expect(driver.snapshot(.2)).toEqual({ playing: false, position: .25 });
    expect(result.pcm[result.pcm.length - 1]).toBeGreaterThan(0);
    expect(run(driver, .2, .2).pcm.subarray(4800).every(value => value === 0)).toBe(true);
    driver.play(1);
    expect(run(driver, .01, 1).attacks.map(attack => attack.eventId)).toEqual(['event_1']);
  });
  it('pauses an interrupted audio clock instead of catching up or automatically restarting', () => {
    const bank = { piano: sample(.1) }, driver = new ScoreDriver(RATE, bank, prepareScore(composition([event(1)]), bank));
    driver.play(0, true); run(driver, .01);
    expect(() => driver.process([new Float32Array(128)], .5)).toThrow('Audio clock interrupted');
    expect(driver.snapshot(100)).toEqual({ playing: false, position: .02 });
    expect(run(driver, .1, .51).attacks).toHaveLength(0);
  });
  it('silences old voices on a backward clock jump without replaying them when the clock catches up', () => {
    const bank = { piano: sample(2) }, driver = new ScoreDriver(RATE, bank, prepareScore(composition([event(1, 0, { durationBeats: 4 })]), bank));
    driver.play(1, true); run(driver, .1, 1);
    expect(() => driver.process([new Float32Array(128)], .5)).toThrow('Audio clock interrupted');
    expect(driver.activeVoices).toBe(0);
    expect(driver.snapshot(100).playing).toBe(false);
    expect(driver.snapshot(100).position).toBeCloseTo(.2);
    expect(run(driver, 1, .51).pcm.every(value => value === 0)).toBe(true);
  });
});

describe('Composer voice and render-work preflight', () => {
  it('rejects real natural tails beyond 64, including across repeated loop boundaries', () => {
    const bank = { kick: sample(1) }, comp = composition([event(1)], {
      tempo: 120, lengthBeats: .025, loopRange: [0, .025], performers: [{ id: 'performer', instrumentTypeId: 'kick', junctionId: 0, familyNumber: 1 }],
    });
    expect(() => preflightScore(prepareScore(comp, bank), bank)).toThrow('80 ringing notes');
    expect(preflightScore(prepareScore(comp, bank), bank, RATE, false).peakVoices).toBe(1);
  });
  it('preflights actual A/B order rather than assigning the longest take to every hit', () => {
    const bank = { kick: { ...sample(.01), alternates: [sample(.09)] } }, comp = composition([event(1)], {
      lengthBeats: .1, loopRange: [0, .1], performers: [{ id: 'performer', instrumentTypeId: 'kick', junctionId: 0, familyNumber: 1 }],
    });
    const score = prepareScore(comp, bank), budget = preflightScore(score, bank), driver = new ScoreDriver(RATE, bank, score);
    expect(budget.alternatePeriod).toBe(2);
    expect(budget.peakVoices).toBe(2);
    driver.play(0, true); run(driver, 1);
    expect(driver.peakVoices).toBe(budget.peakVoices);
  });
  it('includes an introduction’s ringing voices at the first loop wrap', () => {
    const bank = { kick: sample(.45) }, comp = composition(Array.from({ length: 64 }, (_, i) => event(i, 0)).concat(event(65, .5)), {
      lengthBeats: 1, loopRange: [.5, 1], performers: [{ id: 'performer', instrumentTypeId: 'kick', junctionId: 0, familyNumber: 1 }],
    });
    expect(() => preflightScore(prepareScore(comp, bank), bank)).toThrow('65 ringing notes');
  });
  it('retains 64 legal simultaneous notes and explicitly rejects a 65th without stealing', () => {
    const bank = { piano: sample(.05) }, comp = composition(Array.from({ length: 64 }, (_, i) => event(i)));
    const score = prepareScore(comp, bank), budget = preflightScore(score, bank), driver = new ScoreDriver(RATE, bank, score);
    expect(budget.peakVoices).toBe(64);
    driver.play(0, true); const result = run(driver, .1);
    expect(result.attacks).toHaveLength(64); expect(driver.peakVoices).toBe(64);
    expect(result.pcm.every(value => Number.isFinite(value) && Math.abs(value) < .99)).toBe(true);
    expect(() => preflightScore(prepareScore(composition([...comp.events, event(65)]), bank), bank)).toThrow('65 ringing notes');
  });
  it('rejects excessive per-quantum attacks even when tiny non-overlapping samples fit the voice budget', () => {
    const bank = { piano: sample(1 / RATE) }, comp = composition(Array.from({ length: 300 }, (_, i) => event(i, i / RATE / 10)));
    expect(() => preflightScore(prepareScore(comp, bank), bank)).toThrow('Too many note attacks');
  });
  it('accepts 32,768 events, rejects 32,769, and leaves source events unchanged', () => {
    const bank = { piano: sample(.001) }, comp = composition(Array.from({ length: 32768 }, (_, i) => event(i, i * .25)), { lengthBeats: 8192, loopRange: [0, 8192] });
    const budget = preflightScore(prepareScore(comp, bank), bank);
    expect(budget.peakVoices).toBe(1);
    expect(comp.events[32767].startBeat).toBe(8191.75);
    comp.events.push(event(32768, 8191.9));
    expect(() => prepareScore(comp, bank)).toThrow('32,768-event');
  });
  it('measures this score driver’s actual 64-voice render work over 750 real quanta', () => {
    const bank: ScoreSamples = { piano: sample(.5) };
    const score: PreparedScore = prepareScore(composition(Array.from({ length: 64 }, (_, i) => event(i, 0, { durationBeats: 1 })), { lengthBeats: 1, loopRange: [0, 1] }), bank);
    preflightScore(score, bank);
    const driver = new ScoreDriver(RATE, bank, score), block = [new Float32Array(128), new Float32Array(128)];
    driver.play(0, true);
    const measured: number[] = [];
    for (let i = 0; i < 750; i++) {
      const start = performance.now(); driver.process(block, i * 128 / RATE); measured.push(performance.now() - start);
    }
    measured.sort((a, b) => a - b);
    const p95 = measured[Math.floor(measured.length * .95)];
    console.info('Composer score driver: stereo64 voices, 750×128-frame quanta', { p95Ms: +p95.toFixed(4), maxMs: +measured[measured.length - 1].toFixed(4), quantumMs: 128 / RATE * 1000, attacks: driver.totalAttacks, peak: driver.peakVoices });
    expect(driver.totalAttacks).toBe(256); expect(driver.peakVoices).toBe(64);
    // A generous regression guard, not a browser/hardware/acoustic qualification.
    expect(p95).toBeLessThan(20);
  });
});

describe('Composer adapter activation and cancellation', () => {
  const nodes: { commands: any[]; port: { onmessage: ((event: { data: any }) => void) | null } }[] = [];
  let context: { currentTime: number; state: string; onstatechange?: () => void };
  beforeEach(() => {
    nodes.length = 0; adapterControl.samples = { piano: sample(.1) }; adapterControl.load = undefined;
    vi.stubGlobal('AudioContext', class {
      currentTime = 0; sampleRate = RATE; state = 'suspended'; baseLatency = 0;
      onstatechange?: () => void;
      destination = {};
      audioWorklet = { addModule: async () => {} };
      constructor() { context = this; }
      async resume() { this.state = 'running'; }
      async close() { this.state = 'closed'; }
    });
    vi.stubGlobal('AudioWorkletNode', class {
      commands: any[] = [];
      port = { postMessage: (command: any) => { this.commands.push(command); }, onmessage: null as ((event: { data: any }) => void) | null, close: () => {} };
      constructor() { nodes.push(this); }
      connect() {} disconnect() {}
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  const settle = () => new Promise<void>(resolve => setImmediate(resolve));
  const currentEpoch = () => nodes[0].commands.filter(command => command.epoch !== undefined).at(-1).epoch;
  const status = (snapshot: { playing: boolean; position: number }, options: Record<string, unknown> = {}) => nodes[0].port.onmessage!({ data: {
    type: 'status', epoch: currentEpoch(), snapshot, linearPosition: snapshot.position, audioTime: context.currentTime, pending: false, ...options,
  } });

  it('Stop during sample loading cancels the original Play intent without automatic resurrection', async () => {
    let release!: (bank: Record<string, unknown>) => void;
    adapterControl.load = new Promise(resolve => { release = resolve; });
    const transport = new ScoreTransport(), playing = transport.play(composition([event(1)]));
    await settle(); transport.stop();
    release(adapterControl.samples); await playing; await settle();
    expect(nodes[0].commands.some(command => command.type === 'play')).toBe(false);
    expect(transport.snapshot()).toEqual({ playing: false, position: 0 });
    transport.dispose();
  });
  it('Pause during sample loading cancels pending activation and keeps written music intact', async () => {
    let release!: (bank: Record<string, unknown>) => void;
    adapterControl.load = new Promise(resolve => { release = resolve; });
    const transport = new ScoreTransport(), comp = composition([event(1, 1 / 3)]), original = structuredClone(comp);
    const playing = transport.play(comp);
    await settle(); transport.pause(); release(adapterControl.samples); await playing;
    expect(comp).toEqual(original);
    expect(nodes[0].commands.some(command => command.type === 'play')).toBe(false);
    expect(transport.snapshot().playing).toBe(false);
    transport.dispose();
  });
  it('discards old-epoch messages after Pause, keeps one context, and reuses a prepared score', async () => {
    const transport = new ScoreTransport(), comp = composition([event(1)]);
    await transport.play(comp); status({ playing: true, position: .5 });
    context.currentTime = .1;
    expect(transport.snapshot().position).toBeCloseTo(.7);
    const oldEpoch = currentEpoch();
    transport.pause();
    nodes[0].port.onmessage!({ data: { type: 'status', epoch: oldEpoch, snapshot: { playing: true, position: 3 }, linearPosition: 3, audioTime: 0, pending: false } });
    expect(transport.snapshot()).toEqual({ playing: false, position: .7 });
    const loadsBefore = nodes[0].commands.filter(command => command.type === 'load').length;
    await transport.play(comp);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].commands.filter(command => command.type === 'load')).toHaveLength(loadsBefore);
    transport.dispose();
  });
  it('retains exact position on musical edits and requires a new Play after an interruption', async () => {
    const errors: string[] = [], transport = new ScoreTransport(), comp = composition([event(1)]);
    transport.onError = message => errors.push(message);
    await transport.play(comp); status({ playing: true, position: 1 / 3 });
    transport.pause();
    const changed = { ...comp, events: [...comp.events, event(2, .75)] };
    await transport.prepare(changed);
    expect(nodes[0].commands.filter(command => command.type === 'load').at(-1).position).toBe(1 / 3);
    await transport.play(); status({ playing: true, position: .75 });
    const playCount = nodes[0].commands.filter(command => command.type === 'play').length;
    context.state = 'suspended'; context.onstatechange?.();
    expect(errors).toContain('Audio interrupted. Press Play to resume.');
    expect(transport.snapshot().playing).toBe(false);
    context.state = 'running'; context.onstatechange?.();
    expect(nodes[0].commands.filter(command => command.type === 'play')).toHaveLength(playCount);
    transport.dispose();
  });
  it('cancelling the initial warm-up does not erase the first beat on the next deliberate Play', async () => {
    const transport = new ScoreTransport(), comp = composition([event(1)]);
    await transport.play(comp);
    status({ playing: false, position: 0 }, { pending: true });
    transport.pause(); await transport.play(comp);
    const plays = nodes[0].commands.filter(command => command.type === 'play');
    expect(plays).toHaveLength(2);
    expect(plays.map(command => command.includeBoundary)).toEqual([true, true]);
    status({ playing: true, position: .1 });
    transport.pause(); await transport.play(comp);
    expect(nodes[0].commands.filter(command => command.type === 'play').at(-1).includeBoundary).toBe(false);
    transport.dispose();
  });
  it('keeps the latest volume adjustment while samples are still loading', async () => {
    let release!: (bank: Record<string, unknown>) => void;
    adapterControl.load = new Promise(resolve => { release = resolve; });
    const transport = new ScoreTransport(), playing = transport.play(composition([event(1)]));
    await settle(); transport.setVolume(.23); release(adapterControl.samples); await playing;
    expect(nodes[0].commands.filter(command => command.type === 'load').at(-1).score.volume).toBe(.23);
    transport.dispose();
  });
  it('maps separate audio attacks to their audible presentation times instead of message delivery time', async () => {
    const transport = new ScoreTransport();
    await transport.prepare(composition([event(1)]));
    (context as any).getOutputTimestamp = () => ({ contextTime: .2, performanceTime: 900 });
    expect(transport.toPerformanceTime(1)).toBeCloseTo(1.7);
    expect(transport.toPerformanceTime(1.04) - transport.toPerformanceTime(1)).toBeCloseTo(.04);
    delete (context as any).getOutputTimestamp;
    context.currentTime = .3; (context as any).outputLatency = .04;
    vi.stubGlobal('performance', { now: () => 1000 });
    expect(transport.toPerformanceTime(1)).toBeCloseTo(1.74);
    transport.dispose();
  });
});
