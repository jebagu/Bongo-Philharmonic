const hz = midi => 440 * 2 ** ((midi - 69) / 12);

export class SoundEngine {
  constructor(context, samples = new Map()) {
    this.context = context;
    this.samples = samples;
    this.sources = new Set();
    this.outputs = new Set();
    this.master = context.createGain();
    this.master.gain.value = .62;
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 15;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = .004;
    this.compressor.release.value = .15;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.compressor).connect(this.analyser).connect(context.destination);
    this.noise = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 142857;
    for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; data[i] = seed / 2147483648; }
  }

  async load() {
    const files = ['ellenmentor-ooh-aha.mp3', 'cough-e-initializing.wav', 'kenney-female-ready.ogg', 'kenney-male-go.ogg', 'leonschi13-yeah.mp3'];
    await Promise.all(files.map(async file => {
      const response = await fetch(new URL(`./assets/${file}`, import.meta.url));
      if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`);
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      this.samples.set(file, buffer);
    }));
    // Measure each voice file's real active range so speech doesn't begin with dead air.
    this.ranges = new Map();
    for (const [file, buffer] of this.samples) {
      let start = buffer.length, end = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) > .016) { start = Math.min(start, i); break; }
        for (let i = data.length - 1; i >= 0; i--) if (Math.abs(data[i]) > .016) { end = Math.max(end, i); break; }
      }
      this.ranges.set(file, { start: Math.max(0, start / buffer.sampleRate - .012), end: Math.min(buffer.duration, end / buffer.sampleRate + .05) });
    }
  }

  volume(value) { this.master.gain.setTargetAtTime(value, this.context.currentTime, .025); }

  stop() {
    const now = this.context.currentTime;
    for (const output of this.outputs) { output.gain.cancelScheduledValues(now); output.gain.setTargetAtTime(0, now, .009); }
    for (const source of this.sources) { try { source.stop(now + .04); } catch {} }
    this.sources.clear();
  }

  track(source, end) {
    this.sources.add(source);
    source.addEventListener('ended', () => { this.sources.delete(source); source.disconnect(); }, { once: true });
    source.stop(end);
    return source;
  }

  envelope(node, t, duration, v, strength = 1) {
    const attack = Math.max(.002, v.attack ?? .008), decay = v.decay ?? .25, sustain = v.sustain ?? .45, release = v.release ?? .18;
    const gate = Math.max(duration, attack + .02), peak = Math.max(.0001, strength);
    node.gain.setValueAtTime(0, t);
    node.gain.linearRampToValueAtTime(peak, t + attack);
    const decEnd = Math.min(t + attack + decay, t + gate);
    node.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * sustain), decEnd);
    node.gain.setValueAtTime(Math.max(.0001, peak * sustain), t + gate);
    node.gain.exponentialRampToValueAtTime(.0001, t + gate + release);
    return t + gate + release + .03;
  }

  oscillator(type, frequency, destination, t, end, detune = 0) {
    const o = this.context.createOscillator(); o.type = type; o.frequency.setValueAtTime(frequency, t); o.detune.value = detune;
    o.connect(destination); o.start(t); this.track(o, end); return o;
  }

  noiseSource(destination, t, end) {
    const source = this.context.createBufferSource(); source.buffer = this.noise;
    source.connect(destination); source.start(t, .137); this.track(source, end); return source;
  }

  play(v, note = v.root ?? 62, t = this.context.currentTime + .015, duration = .6, velocity = .85, pan = 0) {
    const ctx = this.context;
    const input = ctx.createGain(), output = ctx.createGain(), panner = ctx.createStereoPanner();
    input.gain.value = (v.gain ?? .2) * velocity;
    output.gain.value = 1;
    panner.pan.value = Math.max(-.75, Math.min(.75, pan));
    input.connect(output); output.connect(panner).connect(this.master);
    this.outputs.add(output);
    const endEstimate = t + Math.max(duration, 3.8) + (v.release ?? 1.5) + 1.5;
    // Disconnect effect networks after their audible tail, including during repeated auditions.
    const cleanup = () => { this.outputs.delete(output); for (const node of nodes) node.disconnect(); };
    const nodes = [input, output, panner];
    if (typeof ctx.startRendering !== 'function') setTimeout(cleanup, Math.max(0, endEstimate - ctx.currentTime) * 1000);

    if (v.chorus) {
      for (const side of [-1, 1]) {
        const delay = ctx.createDelay(.06), gain = ctx.createGain(), spread = ctx.createStereoPanner();
        delay.delayTime.value = .018 + (side + 1) * .004;
        gain.gain.value = v.chorus * .45; spread.pan.value = side * .85;
        input.connect(delay).connect(gain).connect(spread).connect(output);
        const lfo = ctx.createOscillator(), amount = ctx.createGain();
        lfo.frequency.value = side < 0 ? .63 : .81; amount.gain.value = .003;
        lfo.connect(amount).connect(delay.delayTime); lfo.start(t); this.track(lfo, endEstimate);
        nodes.push(delay, gain, spread, amount);
      }
    }
    if (v.echo) {
      const delay = ctx.createDelay(.6), feedback = ctx.createGain(), wet = ctx.createGain();
      delay.delayTime.value = .267; feedback.gain.value = .27; wet.gain.value = v.echo;
      input.connect(delay).connect(wet).connect(output); delay.connect(feedback).connect(delay);
      nodes.push(delay, feedback, wet);
    }
    if (v.engine === 'sample') this.sample(v, note, t, duration, input, nodes);
    else if (v.engine === 'drum') this.drum(v, note, t, input, nodes);
    else if (v.engine === 'orchestra') this.orchestra(v, note, t, input, nodes);
    else if (v.engine === 'flute') this.flute(v, note, t, duration, input, nodes);
    else if (v.engine === 'laser') this.laser(v, note, t, input, nodes);
    else if (v.engine === 'piano' || v.engine === 'fantasia') this.piano(v, note, t, duration, input, nodes);
    else if (v.engine === 'fm') this.fm(v, note, t, duration, input, nodes);
    else this.analog(v, note, t, duration, input, nodes);
    return { id: v.id, note, time: t };
  }

  analog(v, note, t, duration, destination, nodes) {
    const ctx = this.context, filter = ctx.createBiquadFilter(), amp = ctx.createGain();
    filter.type = v.bandpass ? 'bandpass' : 'lowpass'; filter.Q.value = v.resonance ?? .65;
    const top = Math.min(ctx.sampleRate * .4, (v.cutoff ?? 2200) * 2 ** ((note - 62) / 36));
    filter.frequency.setValueAtTime(v.open ? 300 : top, t);
    if (v.open) filter.frequency.exponentialRampToValueAtTime(top, t + (v.attack ?? .3) + .2);
    else if (v.sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(90, v.sweep), t + (v.decay ?? .2));
    const end = this.envelope(amp, t, duration, v);
    filter.connect(amp).connect(destination); nodes.push(filter, amp);
    const f = hz(note), count = v.unison ?? 2;
    const mix = ctx.createGain(); mix.gain.value = 1 / Math.sqrt(count + (v.sub ? 1 : 0)); mix.connect(filter); nodes.push(mix);
    for (let i = 0; i < count; i++) {
      const detune = count === 1 ? 0 : (i / (count - 1) * 2 - 1) * (v.detune ?? 7);
      const oscillator = this.oscillator(v.wave ?? 'sawtooth', v.octave && i === count - 1 ? f * 2 : f, mix, t, end, detune);
      if (v.scoop) { oscillator.frequency.setValueAtTime(f * 2 ** (-v.scoop / 1200), t); oscillator.frequency.exponentialRampToValueAtTime(f, t + .055); }
      if (v.vibrato) {
        const lfo = ctx.createOscillator(), amount = ctx.createGain(); lfo.frequency.value = 5.2;
        amount.gain.setValueAtTime(0, t); amount.gain.linearRampToValueAtTime(v.vibrato, t + .35);
        lfo.connect(amount).connect(oscillator.detune); lfo.start(t); this.track(lfo, end); nodes.push(amount);
      }
    }
    if (v.sub) this.oscillator('sine', f / 2, mix, t, end);
    if (v.engine === 'wavetable' || v.engine === 'sync') {
      const real = new Float32Array(24), imag = new Float32Array(24);
      for (let h = 1; h < 24; h++) imag[h] = Math.sin(h * (v.engine === 'sync' ? 1.12 : .67)) / h ** .6;
      const o = ctx.createOscillator(); o.setPeriodicWave(ctx.createPeriodicWave(real, imag)); o.frequency.value = f;
      const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 3;
      band.frequency.setValueAtTime(f * 6, t); band.frequency.exponentialRampToValueAtTime(f * 1.5, t + .55);
      o.connect(band).connect(mix); o.start(t); this.track(o, end); nodes.push(band);
    }
  }

  fm(v, note, t, duration, destination, nodes) {
    const ctx = this.context, f = hz(note), amp = ctx.createGain();
    const end = this.envelope(amp, t, duration, v); amp.connect(destination); nodes.push(amp);
    const carrier = this.oscillator('sine', f, amp, t, end), modGain = ctx.createGain();
    modGain.gain.setValueAtTime(f * (v.index ?? 2), t);
    modGain.gain.exponentialRampToValueAtTime(f * .06, t + (v.indexDecay ?? .4));
    modGain.connect(carrier.frequency); this.oscillator('sine', f * (v.ratio ?? 1), modGain, t, end); nodes.push(modGain);
    if (v.bell) {
      const bellAmp = ctx.createGain(); bellAmp.gain.setValueAtTime(.18, t); bellAmp.gain.exponentialRampToValueAtTime(.001, t + .7);
      bellAmp.connect(amp); this.oscillator('sine', f * 7, bellAmp, t, end); nodes.push(bellAmp);
    }
  }

  piano(v, note, t, duration, destination, nodes) {
    const ctx = this.context, f = hz(note), amp = ctx.createGain();
    const end = this.envelope(amp, t, duration, { attack: .002, decay: .9, sustain: .18, release: v.release ?? .6 });
    amp.connect(destination); nodes.push(amp);
    const partials = v.engine === 'fantasia' ? [[1, .7], [2, .25], [3.01, .12], [5.02, .2], [8.01, .12]] : [[1, .7], [2.002, .35], [3.006, .2], [4.012, .1], [6.028, .05]];
    for (const [ratio, level] of partials) {
      const g = ctx.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(.0001, t + (ratio > 3 ? .5 : 2.4));
      g.connect(amp); this.oscillator('sine', f * ratio, g, t, end); nodes.push(g);
    }
    if (v.engine === 'fantasia') this.analog({ wave: 'triangle', unison: 3, detune: 8, cutoff: 2100, attack: .25, decay: .7, sustain: .3, release: .8 }, note, t, duration, amp, nodes);
  }

  sample(v, note, t, duration, destination, nodes) {
    const buffer = this.samples.get(v.asset); if (!buffer) throw new Error(`Voice not loaded: ${v.asset}`);
    const ctx = this.context, source = ctx.createBufferSource(), amp = ctx.createGain();
    source.buffer = buffer;
    const rate = 2 ** ((note - v.root) / 12); source.playbackRate.value = rate;
    const range = this.ranges?.get(v.asset) ?? { start: 0, end: buffer.duration };
    const offset = Math.min(v.offset ?? range.start, buffer.duration - .03);
    const sampleLength = Math.min(v.length ?? range.end - offset, buffer.duration - offset);
    const length = v.speech ? sampleLength / rate : Math.min(sampleLength / rate, Math.max(.35, duration + .25));
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(1, t + .012);
    amp.gain.setValueAtTime(1, t + Math.max(.013, length - .07)); amp.gain.linearRampToValueAtTime(0, t + length);
    if (v.lowpass) { const filter = ctx.createBiquadFilter(); filter.frequency.value = v.lowpass; source.connect(filter).connect(amp); nodes.push(filter); }
    else source.connect(amp);
    amp.connect(destination); nodes.push(amp); source.start(t, offset); this.track(source, t + length + .01);
  }

  flute(v, note, t, duration, destination, nodes) {
    const ctx = this.context, amp = ctx.createGain(), f = hz(note);
    const end = this.envelope(amp, t, duration, { attack: .06, decay: .15, sustain: .65, release: .25 });
    amp.connect(destination); nodes.push(amp);
    for (const [ratio, level] of [[1, .75], [2, .16], [3, .07]]) {
      const g = ctx.createGain(); g.gain.value = level; g.connect(amp); nodes.push(g);
      const o = this.oscillator('sine', f * ratio, g, t, end); o.frequency.setValueAtTime(f * ratio * .92, t); o.frequency.exponentialRampToValueAtTime(f * ratio, t + .09);
    }
    const noiseAmp = ctx.createGain(), filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 2300; filter.Q.value = .8;
    noiseAmp.gain.setValueAtTime(.65, t); noiseAmp.gain.exponentialRampToValueAtTime(.025, t + .2);
    filter.connect(noiseAmp).connect(amp); this.noiseSource(filter, t, end); nodes.push(noiseAmp, filter);
  }

  orchestra(v, note, t, destination, nodes) {
    const ctx = this.context, amp = ctx.createGain(), filter = ctx.createBiquadFilter(); filter.frequency.value = 4000;
    const end = this.envelope(amp, t, .35, { attack: .004, decay: .17, sustain: .08, release: .25 });
    filter.connect(amp).connect(destination); nodes.push(amp, filter);
    for (const semitones of [-12, 0, 7, 12, 19]) {
      const mix = ctx.createGain(); mix.gain.value = .25; mix.connect(filter); nodes.push(mix);
      const f = hz(note + semitones), o = this.oscillator('sawtooth', f, mix, t, end, semitones % 5 * 4);
      o.frequency.setValueAtTime(f * 1.025, t); o.frequency.exponentialRampToValueAtTime(f * .98, t + .2);
    }
    const ng = ctx.createGain(); ng.gain.value = .17; ng.connect(filter); this.noiseSource(ng, t, t + .12); nodes.push(ng);
  }

  laser(v, note, t, destination, nodes) {
    const amp = this.context.createGain(); amp.gain.setValueAtTime(.8, t); amp.gain.exponentialRampToValueAtTime(.0001, t + .4); amp.connect(destination); nodes.push(amp);
    const o = this.oscillator('triangle', hz(note) * 5, amp, t, t + .45); o.frequency.exponentialRampToValueAtTime(85, t + .35);
  }

  drum(v, note, t, destination, nodes) {
    const ctx = this.context, kind = v.drum, pitch = 2 ** ((note - (v.root ?? note)) / 12);
    const noiseHit = (start, length, filterType, frequency, level = 1, reverse = false) => {
      const filter = ctx.createBiquadFilter(), amp = ctx.createGain(); filter.type = filterType; filter.frequency.value = frequency;
      amp.gain.setValueAtTime(reverse ? .0001 : level, start);
      if (reverse) amp.gain.exponentialRampToValueAtTime(level, start + length - .02);
      else amp.gain.exponentialRampToValueAtTime(.0001, start + length);
      if (reverse) amp.gain.linearRampToValueAtTime(0, start + length);
      filter.connect(amp).connect(destination); this.noiseSource(filter, start, start + length + .01); nodes.push(filter, amp);
    };
    const tone = (wave, from, to, length, level) => {
      const amp = ctx.createGain(); amp.gain.setValueAtTime(level, t); amp.gain.exponentialRampToValueAtTime(.0001, t + length);
      amp.connect(destination); nodes.push(amp); const o = this.oscillator(wave, from * pitch, amp, t, t + length + .01);
      o.frequency.exponentialRampToValueAtTime(to * pitch, t + Math.min(length, .14));
    };
    if (kind === '808' || kind === '909') {
      tone('sine', kind === '808' ? 130 : 180, kind === '808' ? 48 : 52, kind === '808' ? .85 : .4, 1);
      noiseHit(t, .015, 'lowpass', kind === '808' ? 1800 : 4800, .28);
    } else if (kind === 'gated' || kind === 'snare' || kind === 'reverse') {
      if (kind === 'reverse') { noiseHit(t, .38, 'bandpass', 1700, .8, true); noiseHit(t + .37, .08, 'highpass', 900, .7); }
      else {
        tone('triangle', 220, 140, .12, .65); noiseHit(t, kind === 'gated' ? .22 : .16, 'highpass', 1300, .95);
        if (kind === 'gated') for (let i = 1; i <= 5; i++) noiseHit(t + i * .013, .19 - i * .013, 'bandpass', 1900 + i * 200, .25);
      }
    } else if (kind === 'clap') {
      for (let i = 0; i < 3; i++) noiseHit(t + i * .012, .012, 'bandpass', 1300, .8);
      noiseHit(t + .036, .16, 'bandpass', 1500, .45);
    } else if (kind === 'hat' || kind === 'openhat') {
      const filter = ctx.createBiquadFilter(), amp = ctx.createGain(), length = kind === 'hat' ? .055 : .32;
      filter.type = 'highpass'; filter.frequency.value = 7200;
      amp.gain.setValueAtTime(.32, t); amp.gain.exponentialRampToValueAtTime(.0001, t + length);
      filter.connect(amp).connect(destination); nodes.push(filter, amp);
      for (const f of [205.3, 369.6, 522.7, 800, 1048, 1616]) this.oscillator('square', f * pitch, filter, t, t + length + .01);
    } else if (kind === 'tom') tone('sine', 320, 90, .38, 1);
    else if (kind === 'cowbell') { tone('square', 540, 540, .14, .35); tone('square', 800, 800, .1, .3); }
  }
}

export const BACKING = [
  { id: 'back-kick', engine: 'drum', drum: '808', role: 'kick', root: 36, gain: .5 },
  { id: 'back-snare', engine: 'drum', drum: 'clap', role: 'snare', root: 38, gain: .23 },
  { id: 'back-hat', engine: 'drum', drum: 'hat', role: 'hat', root: 42, gain: .13 },
];
