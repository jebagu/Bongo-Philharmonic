import { test, expect } from '@playwright/test';
import { addEvent, addPerformer, createComposition } from '../src/model';

test('Mario uses native hop distances and lands on notes without sideways jumps', async ({ page }) => {
  let composition = addPerformer(createComposition(), 'guitar', 1);
  for (let beat=0;beat<8;beat++) composition=addEvent(composition,{performerId:composition.performers[0].id,pitch:60,startBeat:beat,durationBeats:.5,velocity:.8});
  await page.addInitScript(value=>localStorage.setItem('bongo-planet-philharmonic-v1',JSON.stringify(value)),composition);
  await page.goto('./');
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
  await page.getByRole('button', { name: 'Composer', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('#play')).not.toHaveText('Loading…', { timeout: 15000 });
  await page.getByRole('button', { name: 'Stop and rewind' }).click();
  for (const grid of ['4', '8']) {
    await page.locator('#edit-grid').selectOption(grid);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBeGreaterThan(.1);
    const frames = await page.evaluate(() => new Promise<{ beat: number; x: number; y: number; distance: number; target: number; pose: string|null }[]>(resolve => {
      const frames: { beat: number; x: number; y: number; distance: number; target: number; pose: string|null }[] = [];
      const start = performance.now();
      const capture = () => {
        const image = document.querySelector('.mario-runner')!;
        frames.push({ beat: (window as any).__bongoPhilharmonic.transport.position, x: Number(image.getAttribute('x')), y: Number(image.getAttribute('y')),distance:Number(image.getAttribute('data-hop-distance')),target:Number(image.getAttribute('data-hop-target')),pose:image.getAttribute('data-pose') });
        if (performance.now() - start < 1300) requestAnimationFrame(capture);
        else resolve(frames);
      };
      requestAnimationFrame(capture);
    }));
    const beats = frames.at(-1)!.beat - frames[0].beat;
    expect(beats).toBeGreaterThan(2);
    expect(frames.every(frame => frame.x === -24)).toBe(true);
    expect(frames.some(frame => frame.distance === 96)).toBe(true);
    expect(frames.some(frame => frame.distance === 0 && frame.y === 60)).toBe(true);
    expect(frames.filter(frame=>frame.distance>0).every(frame=>frame.pose==='jump' && frame.target>frame.beat && frame.target-frame.beat<=96/168+.01)).toBe(true);
    expect(Math.min(...frames.map(frame=>frame.y))).toBeGreaterThanOrEqual(9);
    let peaks = 0, nearApex = false;
    for (const frame of frames) {
      const next = frame.y < 13.5;
      if (next && !nearApex) peaks++;
      nearApex = next;
    }
    expect(peaks).toBeGreaterThanOrEqual(2);
    expect(peaks).toBeLessThanOrEqual(Math.ceil(beats) + 1);
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
  }
  await page.screenshot({ path: 'evidence/mario-smooth-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  // Vary sampling intervals so a 120 BPM hop cannot alias the assertion's clock.
  await expect.poll(() => page.locator('.mario-runner').getAttribute('data-pose'), {
    intervals: [30, 50, 70, 90],
  }).toBe('jump');
  await page.screenshot({ path: 'evidence/mario-smooth-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Stop and rewind' }).click();
});
