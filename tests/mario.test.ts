import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getMarioPlayheadFrame } from '../src/marioPlayhead';
import original from '../src/assets/mario-paint-playhead.json' with { type: 'json' };

const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('Original full-body Mario Paint playhead', () => {
  it('keeps exact native poses, source atlas crops and provenance', () => {
    expect(original.nativeFrameSize).toEqual([16, 24]);
    expect(original.sourceAtlasSize).toEqual([48, 24]);
    expect(original.frames.map(frame => [frame.name, frame.id, frame.sourceCrop])).toEqual([
      ['walk-a', '0x014A', [0, 0, 16, 24]],
      ['walk-b', '0x014B', [16, 0, 16, 24]],
      ['jump', '0x014D', [32, 0, 16, 24]],
    ]);
    const atlas = readFileSync(new URL(`./fixtures/${original.sourceAtlas}`, import.meta.url));
    expect(hash(atlas)).toBe(original.sourceAtlasSha256);
    for (const frame of original.frames) {
      const bytes = readFileSync(new URL(`../src/assets/${frame.file}`, import.meta.url));
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([16, 24]);
      expect(hash(bytes)).toBe(frame.sha256);
    }
    expect(original.romSha256).toBe('ef1b5c47d7c76de43492d9745def235fa24e01b9b6f5c636584b7ae639563ff2');
    expect(original.jumpTableAddress).toBe('0x00F7B4');
  });

  it('uses original jump pose and asymmetric hop table on the score grid', () => {
    expect(getMarioPlayheadFrame(0, true, false, 4)).toMatchObject({ pose: 'walk-a', width: 32, height: 48, offsetY: 0 });
    expect(getMarioPlayheadFrame(.25, true, false, 4)).toMatchObject({ pose: 'walk-b', offsetY: 0 });
    const apex = getMarioPlayheadFrame(19 / 32 / 4, true, false, 4);
    expect(apex.pose).toBe('jump');
    expect(apex.href).toContain('mario-paint-jump.png');
    expect(apex.offsetY).toBe(-21.25);
    for (let index = 0; index < original.jumpY.length; index++) {
      expect(getMarioPlayheadFrame(index / 32, true, false).offsetY)
        .toBe((original.jumpY[index] - original.jumpY[0]) * 1.25);
    }
    expect(getMarioPlayheadFrame(1 - 1e-12, true, false).offsetY).toBe(0);
    expect(getMarioPlayheadFrame(.999, true, false).offsetY).toBeCloseTo(-.16);
  });

  it('rests without pose flicker when paused or reduced motion is requested', () => {
    for (const beat of [0, .123, .25, .5, 1, 3.777]) {
      expect(getMarioPlayheadFrame(beat, false, false, 4)).toMatchObject({ pose: 'walk-a', offsetY: 0 });
      expect(getMarioPlayheadFrame(beat, true, true, 4)).toMatchObject({ pose: 'walk-a', offsetY: 0 });
    }
    for (const beat of [-1, NaN, Infinity]) {
      expect(getMarioPlayheadFrame(beat, true, false, NaN)).toMatchObject({ phase: 0, offsetY: 0 });
    }
  });
});
