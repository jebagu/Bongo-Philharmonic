const v = (id, name, role, engine, description, reference, params = {}) => ({ id, name, role, engine, description, reference, ...params });

export const BANKS = [
  {
    id: 'icons', number: '01', name: 'Pop Icons', subtitle: 'The sounds you already know.',
    era: '1981—1987', color: '#df6848', light: '#fff1e9', bpm: 110,
    description: 'Big brass. Glassy keys. Rubber bass. A greatest-hits palette of unmistakable eighties character.',
    character: 'Bright · bold · instantly familiar',
    voices: [
      v('jump', 'Stadium Brass', 'chord', 'analog', 'A broad sawtooth stack with a fast, brassy bite.', 'Van Halen · Jump', { wave: 'sawtooth', unison: 3, detune: 11, cutoff: 3400, sweep: 900, attack: .008, decay: .24, sustain: .66, release: .22, gain: .16, chorus: .28 }),
      v('countdown', 'Final Fanfare', 'lead', 'analog', 'A nasal, octave-layered horn that holds its ground.', 'Europe · The Final Countdown', { wave: 'sawtooth', unison: 2, detune: 6, octave: true, cutoff: 2600, attack: .018, decay: .15, sustain: .75, release: .16, gain: .17, vibrato: 5 }),
      v('takeon', 'Pencil Pluck', 'arp', 'analog', 'A woody attack with a bright, spring-loaded body.', 'a-ha · Take On Me', { wave: 'square', unison: 2, detune: 4, cutoff: 4200, sweep: 450, attack: .003, decay: .16, sustain: .15, release: .12, gain: .17 }),
      v('axel', 'Beverly Lead', 'lead', 'analog', 'Round, playful and slightly hollow, with a tiny pitch scoop.', 'Harold Faltermeyer · Axel F', { wave: 'square', unison: 2, detune: 5, cutoff: 2400, sweep: 700, attack: .004, decay: .2, sustain: .46, release: .13, scoop: 35, gain: .16 }),
      v('sweet', 'Sweet Pulse', 'bass', 'analog', 'Dark, tightly clipped pulses with a moving filter.', 'Eurythmics · Sweet Dreams', { wave: 'sawtooth', unison: 2, detune: 3, cutoff: 1500, sweep: 230, resonance: 2, attack: .003, decay: .19, sustain: .26, release: .07, gain: .23, root: 38 }),
      v('monday', 'Monday Rubber', 'bass', 'analog', 'A plump bass with a sharp, resonant front edge.', 'New Order · Blue Monday', { wave: 'sawtooth', unison: 1, sub: true, cutoff: 2100, sweep: 320, resonance: 4, attack: .003, decay: .13, sustain: .23, release: .07, gain: .2, root: 38 }),
      v('slap', 'Digital Slap', 'bass', 'fm', 'A metallic snap that falls into a warm low fundamental.', 'Kenny Loggins · Danger Zone', { ratio: 1, index: 5.2, indexDecay: .075, attack: .002, decay: .22, sustain: .2, release: .12, gain: .32, root: 38 }),
      v('epiano', 'Glass Ballad', 'keys', 'fm', 'A bell-like hammer, a soft center and a lingering shimmer.', 'The DX-style eighties ballad piano', { ratio: 1, index: 2.1, indexDecay: .55, bell: true, attack: .002, decay: 1.3, sustain: .23, release: .6, gain: .29, chorus: .22 }),
      v('juno', 'Chorus Clouds', 'pad', 'analog', 'Soft strings gently drifting across a wide stereo chorus.', 'The classic JUNO-style chorus pad', { wave: 'sawtooth', unison: 3, detune: 9, cutoff: 1300, attack: .36, decay: .6, sustain: .7, release: 1.1, chorus: .7, gain: .11 }),
      v('prayer', 'Prayer Sparkle', 'arp', 'analog', 'A small, delicate pluck with a bright resonant peak.', 'Duran Duran · Save a Prayer', { wave: 'triangle', unison: 2, detune: 5, cutoff: 3800, sweep: 1100, resonance: 3, attack: .003, decay: .22, sustain: .12, release: .2, gain: .24, echo: .2 }),
      v('orchhit', 'Orchestra Flash', 'fx', 'orchestra', 'A crunchy, pitch-dropping orchestral stab.', 'Yes · Owner of a Lonely Heart', { gain: .36, root: 62 }),
      v('shaku', 'Breath Flute', 'lead', 'flute', 'An airy breath followed by a bending, hollow tone.', 'Peter Gabriel · Sledgehammer, opening', { gain: .28, root: 74, release: .25 }),
      v('ahh', 'Floating Ahh', 'voice', 'sample', 'A short melodic slice of a real layered female vocal.', 'Art of Noise-era sampled-voice character', { asset: 'ellenmentor-ooh-aha.mp3', source: 'ellenmentor', offset: .65, length: 1.55, root: 67, grooveNote: 70, gain: .39, chorus: .22 }),
      v('robot', 'Initializing', 'voice', 'sample', 'An actual robot-processed spoken phrase.', 'Cough-E · Robot Voice Pack', { asset: 'cough-e-initializing.wav', source: 'cough-e', root: 62, gain: .55, speech: true }),
      v('808', 'Electro Boom', 'kick', 'drum', 'A falling sine wave, a soft click and a long low tail.', 'Planet Rock-era TR-808 character', { drum: '808', root: 36, gain: .7 }),
      v('gatesnare', 'Gated Thunder', 'snare', 'drum', 'An explosive snare with a big room that cuts off suddenly.', 'The eighties gated-reverb snare', { drum: 'gated', root: 38, gain: .38 }),
    ],
  },
  {
    id: 'cinema', number: '02', name: 'Neon Cinema', subtitle: 'After dark. Bigger skies.',
    era: '1981—1989', color: '#8574be', light: '#f1edfb', bpm: 96,
    description: 'Slow brass swells, glassy digital textures and voices from somewhere beyond the city.',
    character: 'Dreamy · cinematic · expansive',
    voices: [
      v('replicant', 'Replicant Brass', 'pad', 'analog', 'Two detuned saw voices bloom into an expressive brass swell.', 'Vangelis · Blade Runner', { wave: 'sawtooth', unison: 3, detune: 13, cutoff: 2400, open: true, attack: .7, decay: .5, sustain: .8, release: 1.4, chorus: .3, gain: .14 }),
      v('chariots', 'Finish-Line Piano', 'keys', 'piano', 'A bright struck piano body with an electronic shimmer.', 'Vangelis · Chariots of Fire', { gain: .24, release: .65 }),
      v('blues', 'Rain Harmonica', 'lead', 'analog', 'A narrow, breathing reed with a slow, expressive vibrato.', 'Vangelis · Blade Runner Blues', { wave: 'sawtooth', unison: 1, cutoff: 1400, bandpass: true, resonance: 1.7, attack: .1, decay: .2, sustain: .7, release: .45, vibrato: 19, gain: .24 }),
      v('terminator', 'Future Pulse', 'bass', 'analog', 'A low, ominous pulse with a hollow metal edge.', 'Brad Fiedel · The Terminator', { wave: 'square', unison: 2, detune: 7, cutoff: 850, sweep: 150, attack: .006, decay: .18, sustain: .36, release: .18, gain: .24, root: 38 }),
      v('escape', 'Night Drive', 'bass', 'analog', 'A short, dark saw bass that stays steady underneath the scene.', 'John Carpenter · Escape from New York', { wave: 'sawtooth', unison: 2, detune: 4, sub: true, cutoff: 700, sweep: 210, attack: .004, decay: .17, sustain: .3, release: .1, gain: .2, root: 38 }),
      v('miami', 'Miami Glide', 'lead', 'analog', 'A singing lead with a soft pitch scoop and wide vibrato.', 'Jan Hammer · Crockett’s Theme', { wave: 'sawtooth', unison: 2, detune: 6, cutoff: 2200, attack: .018, decay: .25, sustain: .7, release: .35, vibrato: 13, scoop: 90, gain: .17, echo: .3 }),
      v('strings', 'Velvet Strings', 'pad', 'analog', 'Muted analog strings with a gentle attack and long release.', 'Tears for Fears-era layered synth-pop', { wave: 'sawtooth', unison: 3, detune: 7, cutoff: 850, attack: .5, decay: .8, sustain: .8, release: 1.3, chorus: .65, gain: .12 }),
      v('hill', 'Hill Cello', 'keys', 'analog', 'A grainy, nasal bowed tone with a little rising pressure.', 'Kate Bush · Running Up That Hill', { wave: 'sawtooth', unison: 2, detune: 5, cutoff: 1600, bandpass: true, resonance: 2, attack: .08, decay: .2, sustain: .65, release: .23, gain: .32 }),
      v('fantasia', 'Crystal Fantasia', 'keys', 'fantasia', 'A crystalline attack floats over a soft synthetic bed.', 'The late-eighties D-50 digital-pad aesthetic', { gain: .19, release: 1.1 }),
      v('tubular', 'Midnight Bells', 'keys', 'fm', 'Long metallic bells with a dark, inharmonic halo.', 'DX-style tubular-bell keyboards', { ratio: 3.5, index: 3.7, indexDecay: 1.8, attack: .002, decay: 2, sustain: .18, release: .9, gain: .24 }),
      v('ppg', 'Glass Waves', 'arp', 'wavetable', 'A shifting, icy harmonic spectrum with a chime-like onset.', 'PPG-era digital new wave', { gain: .2, attack: .008, decay: .45, sustain: .3, release: .5 }),
      v('laser', 'Laser Comet', 'fx', 'laser', 'A resonant electronic pew, falling through a little echo.', 'Eighties sci-fi effects and electronic percussion', { gain: .28, root: 74, echo: .32 }),
      v('simmons', 'Hexagon Tom', 'perc', 'drum', 'A pitched, rubbery electronic tom with an exaggerated dive.', 'Simmons-style eighties fills', { drum: 'tom', root: 45, gain: .38 }),
      v('reverse', 'Reverse Air', 'perc', 'drum', 'A filtered rush rising into a brief, dry snare impact.', 'Eighties reverse-reverb transitions', { drum: 'reverse', root: 38, gain: .3 }),
      v('dreamvox', 'Dream Choir', 'voice', 'sample', 'A lower vowel cut, blurred into a wide vocal pad.', 'EllenMentor · layered female voice, slowed and filtered', { asset: 'ellenmentor-ooh-aha.mp3', source: 'ellenmentor', offset: 5.75, length: 1.45, root: 67, auditionNote: 62, grooveNote: 58, gain: .44, lowpass: 2000, chorus: .7 }),
      v('ready', 'Ready, Dreamer', 'voice', 'sample', 'A real spoken “ready,” softened with a short trailing echo.', 'Kenney · Female / ready', { asset: 'kenney-female-ready.ogg', source: 'kenney', root: 62, gain: .52, speech: true, echo: .25 }),
    ],
  },
  {
    id: 'club', number: '03', name: 'Electro Club', subtitle: 'Machines with a little attitude.',
    era: '1982—1989', color: '#438678', light: '#e8f2ed', bpm: 122,
    description: 'Acid, warehouse bass and metallic percussion. Built for a tight groove and a very small dance floor.',
    character: 'Physical · syncopated · machine-made',
    voices: [
      v('acid', 'Acid Circuit', 'bass', 'analog', 'A squelchy saw through an aggressively resonant moving filter.', 'The TB-303 acid-house sound', { wave: 'sawtooth', unison: 1, cutoff: 3200, sweep: 160, resonance: 12, attack: .002, decay: .12, sustain: .2, release: .065, gain: .13, root: 38, drive: .4 }),
      v('sub', 'One-Oh-One', 'bass', 'analog', 'Round square-wave bass with a sine wave underneath.', 'The SH-101-style electro bass', { wave: 'square', unison: 1, sub: true, cutoff: 620, sweep: 240, attack: .004, decay: .18, sustain: .5, release: .08, gain: .25, root: 38 }),
      v('lately', 'Late-Night FM', 'bass', 'fm', 'A hollow, woody FM knock with a firm low end.', 'The TX81Z / Lately Bass family', { ratio: 2, index: 3.4, indexDecay: .12, attack: .003, decay: .24, sustain: .28, release: .08, gain: .31, root: 38 }),
      v('reese', 'Detroit Swarm', 'bass', 'analog', 'Low, beating detuned saws with a restrained buzzy edge.', 'Kevin Saunderson-era Detroit bass, 1988', { wave: 'sawtooth', unison: 3, detune: 19, cutoff: 1200, attack: .035, decay: .2, sustain: .75, release: .22, chorus: .12, gain: .15, root: 38 }),
      v('house', 'Warehouse Stab', 'chord', 'analog', 'A short, wide chord voice with a sharp, filtered front.', 'Inner City-era late-eighties house', { wave: 'sawtooth', unison: 2, detune: 12, cutoff: 2400, sweep: 380, attack: .002, decay: .18, sustain: .08, release: .14, gain: .17, chorus: .25 }),
      v('sync', 'Chrome Sync', 'lead', 'sync', 'A raspy, sweeping lead with a rising metallic vowel.', 'The hard-sync lead of eighties electro-pop', { gain: .17, attack: .008, decay: .22, sustain: .5, release: .13 }),
      v('wire', 'Wire Pluck', 'arp', 'fm', 'A small, wiry metallic pluck with almost no tail.', 'Digital sequencer and industrial-pop textures', { ratio: 2.7, index: 4, indexDecay: .1, attack: .001, decay: .2, sustain: .06, release: .1, gain: .27 }),
      v('log', 'Digital Wood', 'keys', 'fm', 'A tuned wooden knock with a short hollow resonance.', 'Eighties FM marimba and log-drum patches', { ratio: 1.5, index: 2.3, indexDecay: .08, attack: .001, decay: .28, sustain: .08, release: .1, gain: .31 }),
      v('909kick', 'Warehouse Kick', 'kick', 'drum', 'A short, firm kick with a sharper front edge than the 808.', 'TR-909-style house and techno kick', { drum: '909', root: 36, gain: .65 }),
      v('909snare', 'Machine Snare', 'snare', 'drum', 'A bright snap, noisy body and tight electronic tail.', 'TR-909-style snare', { drum: 'snare', root: 38, gain: .37 }),
      v('clap', 'Handclap Stack', 'clap', 'drum', 'Three tiny noise bursts, then a soft room tail.', 'Classic analog drum-machine claps', { drum: 'clap', root: 39, gain: .7 }),
      v('hat', 'Closed Chrome', 'hat', 'drum', 'A short, metallic six-oscillator tick.', 'Classic electronic closed hi-hat', { drum: 'hat', root: 42, gain: .2 }),
      v('openhat', 'Open Chrome', 'openhat', 'drum', 'The same metal cluster, opened into a loose, sandy sizzle.', 'Classic electronic open hi-hat', { drum: 'openhat', root: 46, gain: .16 }),
      v('cowbell', 'Electric Cowbell', 'perc', 'drum', 'Two square-wave resonances with a dry, unmistakable clonk.', 'TR-808-style cowbell', { drum: 'cowbell', root: 56, gain: .24 }),
      v('yeah', 'Yeah!', 'voice', 'sample', 'A real vocal shout, trimmed for a quick offbeat accent.', 'DJ N.D.5 / leonschi13 · Yeah (Vocal)', { asset: 'leonschi13-yeah.mp3', source: 'leonschi13', root: 62, gain: .42, speech: true }),
      v('go', 'Let’s Go', 'voice', 'sample', 'A real spoken “go,” pitched slightly down into the groove.', 'Kenney · Male / go', { asset: 'kenney-male-go.ogg', source: 'kenney', root: 65, gain: .52, speech: true, echo: .12 }),
    ],
  },
];

export const ALL_VOICES = BANKS.flatMap(bank => bank.voices);
export const ROLE_LABEL = { chord: 'Chords', lead: 'Lead', arp: 'Arpeggio', bass: 'Bass', keys: 'Keys', pad: 'Pad', fx: 'Effect', voice: 'Voice', kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Closed hat', openhat: 'Open hat', perc: 'Percussion' };
export const IS_DRUM = voice => ['kick', 'snare', 'clap', 'hat', 'openhat', 'perc'].includes(voice.role);

// An original four-bar test groove. All sixteen bank voices appear in each cycle.
// Notes are deliberately simple so timbre and blend stay the focus.
export function grooveEvents(bank, step, beatSeconds) {
  const chords = [[50, 57, 60, 64], [46, 53, 57, 60], [53, 60, 64, 69], [48, 55, 60, 64]];
  const bar = Math.floor(step / 16), local = step % 16, chord = chords[bar];
  const basses = bank.voices.filter(v => v.role === 'bass');
  const melodic = bank.voices.filter(v => !IS_DRUM(v) && v.role !== 'voice' && v.role !== 'bass');
  const voices = bank.voices.filter(v => v.role === 'voice');
  const events = [];
  bank.voices.forEach(v => {
    let notes = [], duration = .17, velocity = .65;
    if (v.role === 'kick' && [0, 6, 8, 14].includes(local)) { notes = [v.root]; velocity = local === 0 ? .95 : .8; }
    if (v.role === 'snare' && [4, 12].includes(local)) { notes = [v.root]; velocity = .7; }
    if (v.role === 'clap' && [4, 12].includes(local)) { notes = [v.root]; velocity = .48; }
    if (v.role === 'hat' && local % 2 === 0) { notes = [v.root]; velocity = local % 4 === 0 ? .5 : .35; }
    if (v.role === 'openhat' && [2, 10].includes(local)) { notes = [v.root]; velocity = .5; }
    if (v.role === 'perc' && [3 + bank.voices.indexOf(v) % 4, 11 + bank.voices.indexOf(v) % 3].includes(local)) { notes = [v.root]; velocity = .47; }
    if (v.role === 'bass') {
      const index = basses.indexOf(v);
      if (local === (index * 4) % 16 || local === (index * 4 + 3) % 16) {
        notes = [chord[0] - 12 + (local % 4 === 3 ? 12 : 0)]; duration = beatSeconds * .52; velocity = .8;
      }
    }
    const mi = melodic.indexOf(v);
    if (mi >= 0) {
      if (v.role === 'pad' && local === (mi % 2) * 8) { notes = chord.map(n => n + 12); duration = beatSeconds * 1.6; velocity = .34; }
      if (v.role === 'chord' && local === 2 + (mi % 3) * 4) { notes = chord.map(n => n + 12); duration = beatSeconds * .42; velocity = .44; }
      if (v.role === 'arp' && local % 8 === mi % 8) { notes = [chord[(bar + Math.floor(local / 4)) % 4] + 12]; duration = beatSeconds * .3; velocity = .6; }
      if (v.role === 'keys' && local === 1 + (mi % 4) * 3) { notes = [chord[(mi + bar) % 4] + 12]; duration = beatSeconds * .7; velocity = .6; }
      if (v.role === 'lead' && (step === mi * 4 % 64 || step === (mi * 4 + 18) % 64)) { notes = [chord[(mi + bar) % 4] + 24]; duration = beatSeconds * .65; velocity = .6; }
      if (v.role === 'fx' && step === (mi * 8 + 6) % 64) { notes = [chord[0] + 12]; duration = .5; velocity = .5; }
    }
    if (v.role === 'voice' && step === 28 + voices.indexOf(v) * 32) { notes = [v.speech ? v.root : v.grooveNote ?? 62]; duration = v.speech ? 2 : beatSeconds * 1.3; velocity = .68; }
    for (const note of notes) events.push({ voice: v, note, duration, velocity });
  });
  return events;
}
