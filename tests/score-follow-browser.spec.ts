import { test, expect } from '@playwright/test';
import { addEvent, addPerformer, createComposition, type AssetSetId, type Composition } from '../src/model';

function song(assetSetId: AssetSetId, loop = false): Composition {
  let composition = addPerformer(createComposition(assetSetId), assetSetId === 'mario' ? 'mario' : 'guitar', 1);
  composition = { ...composition, tempo: 400, lengthBeats: 32, loopRange: loop ? [4, 20] : [0, 32], loopEnabled: loop };
  for (let beat = 0; beat < 32; beat++) composition = addEvent(composition, {
    performerId: composition.performers[0].id, pitch: 60, startBeat: beat, durationBeats: .25, velocity: .7,
  });
  return composition;
}

for (const view of ['Composer', 'Performance']) for (const width of [1440, 390]) {
  test(`${view} follows to the real song ending at ${width}px`, async ({ page }) => {
    const composition = song(width === 390 ? 'mario' : 'bongo');
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.addInitScript(value => localStorage.setItem('bongo-planet-philharmonic-v1', JSON.stringify(value)), composition);
    await page.goto('./'); await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
    await page.getByRole('button', { name: view, exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBeGreaterThan(.01);
    const frames = await page.evaluate(() => new Promise<{
      beat: number; playing: boolean; left: number; right: number; center: number; viewport: number;
      camera: number; start: number; notes: number; display: string; renderedBeat: number; beatWidth: number;
    }[]>(resolve => {
      const frames: any[] = [], started = performance.now();
      const capture = () => {
        const app = (window as any).__bongoPhilharmonic, svg = document.querySelector<SVGSVGElement>('#score-host svg')!;
        const scroll = document.querySelector('#score-scroll')!.getBoundingClientRect(), image = svg.querySelector('.mario-runner')!.getBoundingClientRect();
        frames.push({ beat: app.transport.position, playing: app.transport.playing,
          left: image.left - scroll.left, right: image.right - scroll.left, center: image.left + image.width / 2 - scroll.left, viewport: scroll.width,
          camera: Number(svg.dataset.cameraX), start: Number(svg.dataset.pageStart), notes: svg.querySelectorAll('.score-note').length,
          renderedBeat: Number(svg.dataset.position), beatWidth: Number(svg.dataset.beatWidth),
          display: (svg.querySelector('.score-playhead') as SVGElement).style.display });
        if (performance.now() - started < 5500) requestAnimationFrame(capture); else resolve(frames);
      }; requestAnimationFrame(capture);
    }));
    const playing = frames.filter(frame => frame.playing && frame.beat < 31.8);
    expect(playing.length).toBeGreaterThan(40);
    expect(playing.every(frame => frame.display !== 'none' && frame.left >= 0 && frame.right <= frame.viewport)).toBe(true);
    expect(playing.some(frame => frame.beat > 20 && frame.start > 0)).toBe(true);
    const centered = playing.filter(frame => frame.beat > 12 && frame.beat < 18);
    expect(centered.length).toBeGreaterThan(5);
    expect(Math.max(...centered.map(frame => frame.center)) - Math.min(...centered.map(frame => frame.center))).toBeLessThan(2);
    // Rebuilding the small render window must not send Mario sideways at a page boundary.
    for (let index = 1; index < playing.length; index++) if (playing[index].start !== playing[index - 1].start) {
      const current = playing[index], previous = playing[index - 1];
      const travel = (current.renderedBeat - previous.renderedBeat) * current.beatWidth - (current.camera - previous.camera);
      expect(Math.abs(current.center - previous.center - travel)).toBeLessThan(1);
    }
    expect(frames.at(-1)).toMatchObject({ beat: 32, playing: false, display: 'none' });
    expect(Math.max(...frames.map(frame => frame.notes))).toBeLessThanOrEqual(32);
    expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition)).toEqual(composition);
    await page.screenshot({ path: `evidence/score-follow-${view.toLowerCase()}-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
    await expect(page.locator('#score-host svg')).toHaveAttribute('data-following', 'false');
    await expect(page.locator('#score-host svg')).toHaveAttribute('data-page-start', '0');
    await expect(page.locator('.score-playhead')).not.toHaveCSS('display', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const view of ['Composer', 'Performance']) {
  test(`${view} follows a loop wrap and freezes on pause`, async ({ page }) => {
    const composition = song('bongo', true);
    await page.addInitScript(value => localStorage.setItem('bongo-planet-philharmonic-v1', JSON.stringify(value)), composition);
    await page.goto('./'); await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
    await page.getByRole('button', { name: view, exact: true }).click();
    if (view === 'Composer') await page.locator('.family-tile:not(.unplaced)').click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBeGreaterThan(12);
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position), { intervals: [30, 50, 70] }).toBeLessThan(6);
    await expect(page.locator('.score-playhead')).not.toHaveCSS('display', 'none');
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBeGreaterThan(12);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    // Let the audio worklet acknowledge Pause before measuring the held position.
    await page.waitForTimeout(200);
    const paused = await page.locator('#score-host svg').getAttribute('viewBox');
    const position = await page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position);
    await page.waitForTimeout(120);
    await expect(page.locator('#score-host svg')).toHaveAttribute('viewBox', paused!);
    expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBe(position);
    expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition)).toEqual(composition);
    await page.screenshot({ path: `evidence/score-follow-${view.toLowerCase()}-paused.png`, fullPage: true });
    if (view === 'Composer') {
      // Editing after a pan uses the moving viewBox's coordinates, not the old page origin.
      const beat = Math.floor(position) - 1.5;
      const point = await page.locator('#score-host svg').evaluate((node, beat) => {
        const svg = node as SVGSVGElement, box = svg.getBoundingClientRect(), data = svg.dataset;
        const x = Number(data.scoreLeft) + (beat - Number(data.pageStart)) * Number(data.beatWidth) - svg.viewBox.baseVal.x;
        const y = Number(data.scoreTop) + (Number(data.topStep) - 37) * Number(data.rowHeight); // E4
        return { x: box.left + x, y: box.top + y };
      }, beat);
      await page.mouse.click(point.x, point.y);
      const events = await page.evaluate(() => (window as any).__bongoPhilharmonic.composition.events);
      expect(events).toHaveLength(composition.events.length + 1);
      expect(events.at(-1)).toMatchObject({ pitch: 64, startBeat: beat });
    }
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
  });
}
