import { describe, expect, it } from 'vitest';
import { AGENT_MUSIC_PROMPT, EXAMPLE_SONG, MAX_SONG_FILE_BYTES, readSongFile } from '../src/songGuide';
import { validateComposition } from '../src/model';
import { prepareScore, preflightScore } from '../src/audio-score';

describe('portable song contract', () => {
  it('imports the literal example embedded in the agent prompt and prepares audible playback', async () => {
    const json = AGENT_MUSIC_PROMPT.match(/\n(\{[\s\S]+\})\n\nBEFORE DELIVERING:/)![1];
    const song = await readSongFile(new File([json], 'example.json'));
    expect(song).toEqual(EXAMPLE_SONG);
    expect(validateComposition(JSON.parse(json))).toEqual(song);
    const samples = Object.fromEntries(song.performers.map(p => [p.instrumentTypeId, { channels: [new Float32Array(4800).fill(.25)], sampleRate: 48000 }]));
    const score = prepareScore(song, samples);
    expect(score.events).toHaveLength(12);
    expect(score.events.every(event => event.velocity > 0)).toBe(true);
    expect(preflightScore(score, samples).peakVoices).toBeGreaterThan(0);
  });

  it('rejects oversized files before reading their contents', async () => {
    await expect(readSongFile({ size: MAX_SONG_FILE_BYTES + 1, text: async () => { throw Error('Read should never run'); } })).rejects.toThrow('12 MiB');
  });

  it('rejects broken JSON and missing performer references without changing the example', async () => {
    const before = structuredClone(EXAMPLE_SONG);
    await expect(readSongFile(new File(['{broken'], 'broken.json'))).rejects.toThrow();
    await expect(readSongFile(new File([JSON.stringify({ ...EXAMPLE_SONG, performers: [] })], 'broken.json'))).rejects.toThrow('not placed');
    expect(EXAMPLE_SONG).toEqual(before);
  });
});
