import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getMarioNoteOffset, getMarioPlayheadFrame } from '../src/marioPlayhead';
import original from '../src/assets/mario-paint-playhead.json' with { type: 'json' };

const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('Original Mario Paint note reaction', () => {
  const offsets = [0,0,1,2,3,3,4,5,5,6,6,7,7,7,7,7,7,7,7,7,7,7,6,6,5,5,4,3,3,2,1,0];

  it('follows the original displacement table as Mario passes a column', () => {
    expect(original.noteReaction).toMatchObject({ routine: 'CODE_00FC23', tableAddress: '0x00FC73', travelPixels: 32, offsetY: offsets });
    for (let pixel = 0; pixel < offsets.length; pixel++) {
      expect(getMarioNoteOffset(pixel * 2, 2, true, false)).toBe(offsets[pixel] * 2);
    }
    for (const distance of [-64, -.01, 64, 80]) expect(getMarioNoteOffset(distance, 2, true, false)).toBe(0);
  });

  it('scales with the score artwork and resets when playback or motion stops', () => {
    for (const scale of [1, 25 / 16, 29 / 16, 2.5]) {
      expect(getMarioNoteOffset(16 * scale, scale, true, false)).toBe(7 * scale);
      expect(getMarioNoteOffset(16 * scale, scale, false, false)).toBe(0);
      expect(getMarioNoteOffset(16 * scale, scale, true, true)).toBe(0);
    }
    for (const distance of [NaN, Infinity, -Infinity]) expect(getMarioNoteOffset(distance, 2, true, false)).toBe(0);
    for (const scale of [0, -1, NaN, Infinity]) expect(getMarioNoteOffset(20, scale, true, false)).toBe(0);
  });
});

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

  it('uses the exact native arc and jump pose over 32 source pixels into a note', () => {
    expect(getMarioPlayheadFrame(0, true, false)).toMatchObject({ pose: 'walk-a', width: 32, height: 48, offsetY: 0 });
    const timing = { beatWidth: 64, targetBeat: 1, previousBeat: 0, pixelScale: 2 };
    const apex = getMarioPlayheadFrame(19 / 32, true, false, timing);
    expect(apex.pose).toBe('jump');
    expect(apex.href).toContain('mario-paint-jump.png');
    expect(apex.offsetY).toBe(-34);
    expect(apex.hopDistance).toBe(64);
    for (let index = 0; index < original.jumpY.length; index++) {
      expect(getMarioPlayheadFrame(index / 32, true, false, timing)).toMatchObject({
        pose: 'jump', offsetY: (original.jumpY[index] - original.jumpY[0]) * 2,
      });
    }
    expect(getMarioPlayheadFrame(1, true, false, timing)).toMatchObject({ offsetY: 0, hopDistance: 0 });
  });

  it('walks through rests and shortens the arc to land on closely spaced notes', () => {
    const timing = { beatWidth: 112, targetBeat: 1, previousBeat: 0 };
    expect(getMarioPlayheadFrame(.25, true, false, timing)).toMatchObject({ offsetY: 0, hopDistance: 0 });
    expect(getMarioPlayheadFrame(1-64/112, true, false, timing)).toMatchObject({ pose: 'jump', phase: 0, hopDistance: 64, offsetY: 0 });
    const dense = { beatWidth: 112, targetBeat: 1, previousBeat: .75 };
    expect(getMarioPlayheadFrame(.75+19/32/4, true, false, dense)).toMatchObject({ pose: 'jump', hopDistance: 28, offsetY: -14.875, targetBeat: 1 });
    expect(getMarioPlayheadFrame(.999, true, false, dense).pose).toBe('jump');
    expect(getMarioPlayheadFrame(1, true, false, dense).offsetY).toBe(0);
    expect(getMarioPlayheadFrame(20, true, false).offsetY).toBe(0);
  });

  it('rests without pose flicker when paused or reduced motion is requested', () => {
    for (const beat of [0, .123, .25, .5, 1, 3.777]) {
      expect(getMarioPlayheadFrame(beat, false, false)).toMatchObject({ pose: 'walk-a', offsetY: 0 });
      expect(getMarioPlayheadFrame(beat, true, true)).toMatchObject({ pose: 'walk-a', offsetY: 0 });
    }
    for (const beat of [-1, NaN, Infinity]) {
      expect(getMarioPlayheadFrame(beat, true, false)).toMatchObject({ phase: 0, offsetY: 0 });
    }
  });
});
