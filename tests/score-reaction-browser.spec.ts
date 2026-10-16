import { test, expect } from '@playwright/test';
import { addEvent, addPerformer, createComposition } from '../src/model';

for (const assetSetId of ['bongo', 'mario'] as const) {
  test(`${assetSetId} score notes dip together with native timing and transparent editing targets`, async ({ page }) => {
    let composition = addPerformer(createComposition(assetSetId), assetSetId === 'mario' ? 'mario' : 'guitar', 1);
    for (const beat of [1, 3, 5]) for (const pitch of [60, 64, 67]) {
      composition = addEvent(composition, { performerId: composition.performers[0].id, pitch, startBeat: beat, durationBeats: .5, velocity: .8 });
    }
    const chordIds = composition.events.filter(event => event.startBeat === 1).map(event => event.id);
    await page.addInitScript(value => localStorage.setItem('bongo-planet-philharmonic-v1', JSON.stringify(value)), composition);
    await page.goto('./');
    await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
    await page.getByRole('button', { name: 'Composer', exact: true }).click();
    await page.locator('.family-tile:not(.unplaced)').click();
    const score = page.locator('#score-host svg');
    const chord = page.locator(`[data-event-id="${chordIds[0]}"]`);
    await expect(page.locator('.duration-line')).toHaveCount(0);
    await expect(score).toHaveCSS('cursor', 'crosshair');
    await chord.focus();
    await page.keyboard.press('Enter');
    await expect(chord).toHaveClass(/selected/);
    expect(await page.locator('.score-note.current-performer').count()).toBeGreaterThan(0);
    for (const style of await page.locator('.note-hit').evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return { fill: style.fill, opacity: style.fillOpacity, pointerEvents: style.pointerEvents };
    }))) expect(style).toEqual({ fill: 'none', opacity: '0', pointerEvents: 'all' });
    const corners = await chord.locator('image').evaluate(async node => {
      const image = new Image(); image.src = node.getAttribute('href')!; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      return [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]]
        .map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]);
    });
    expect(corners).toEqual([0, 0, 0, 0]);

    // The editing crosshairs remain, and their preview picture has no backplate.
    await chord.scrollIntoViewIfNeeded();
    const rect = (await chord.locator('image').boundingBox())!;
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 56, rect.y + rect.height / 2 - 30, { steps: 6 });
    await expect(page.locator('.score-drag-preview > line')).toHaveCount(2);
    await expect(page.locator('.score-drag-preview .note-hit')).toHaveCSS('fill', 'none');
    await page.keyboard.press('Escape'); await page.mouse.up();
    await expect(page.locator('.score-drag-preview')).toHaveCount(0);
    await expect(score).toHaveCSS('cursor', 'crosshair');

    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBeGreaterThan(.01);
    const frames = await page.evaluate(ids => new Promise<{ beat: number; offsets: number[]; sizes: string[] }[]>(resolve => {
      const frames: { beat: number; offsets: number[]; sizes: string[] }[] = [], start = performance.now();
      const capture = () => {
        const notes = ids.map(id => document.querySelector<SVGGElement>(`[data-event-id="${id}"]`)!);
        frames.push({ beat: (window as any).__bongoPhilharmonic.transport.position,
          offsets: notes.map(note => note.transform.baseVal.consolidate()?.matrix.f ?? 0),
          sizes: notes.map(note => `${note.querySelector('image')!.getAttribute('width')}x${note.querySelector('image')!.getAttribute('height')}`) });
        if (performance.now() - start < 1900) requestAnimationFrame(capture); else resolve(frames);
      }; requestAnimationFrame(capture);
    }), chordIds);
    expect(frames.length).toBeGreaterThan(20);
    expect(frames.every(frame => frame.offsets.every(offset => offset === frame.offsets[0]))).toBe(true);
    expect(frames.every(frame => frame.sizes.every(size => size === '48x48'))).toBe(true);
    expect(Math.max(...frames.map(frame => frame.offsets[0]))).toBeCloseTo(7 * 48 / 16);
    expect(frames.filter(frame => frame.beat < 1 || frame.beat > 1.6).every(frame => frame.offsets[0] === 0)).toBe(true);
    expect(frames.some(frame => frame.beat > 1 && frame.beat < 1.6 && frame.offsets[0] > 0)).toBe(true);
    await expect.poll(() => page.locator('.score-note[transform]').count(), { intervals: [30, 50, 70, 90] }).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.locator('.score-note[transform]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
    expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition.events)).toEqual(composition.events);
    await page.screenshot({ path: `evidence/note-reaction-${assetSetId}-desktop.png` });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBeGreaterThan(1.2);
    await expect(page.locator('.score-note[transform]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `evidence/note-reaction-${assetSetId}-mobile.png`, fullPage: true });
  });
}
