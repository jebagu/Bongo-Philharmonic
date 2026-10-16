import { test, expect, type Page } from '@playwright/test';
import { addEvent, addPerformer, createComposition } from '../src/model';
import manifest from '../asset-packs/mario-paint/manifest.json' with { type: 'json' };
import { NATIVE_MIDI } from '../src/audio-score';
import { LIBRARY } from '../src/library';
async function ready(page: Page) {
  await page.goto('./');
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
}
for (const id of ['full-prelude', 'mario-demo-3']) {
  test(`public cold Play starts ${id} on the first press without a warm-up retry`, async ({ page }) => {
    test.setTimeout(60000);
    for (let attempt = 0; attempt < 3; attempt++) {
      // A fresh document creates a new audio context and an undecoded sound bank.
      await ready(page);
      await page.getByRole('button', { name: 'Library', exact: true }).click();
      await page.locator(`[data-library-id="${id}"]`).click();
      await page.getByRole('button', { name: 'Performance', exact: true }).click();
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position), { timeout: 15000 }).toBeGreaterThan(2);
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
      await expect(page.locator('#notice')).not.toContainText('interrupted');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      if (attempt === 2) await page.screenshot({ path: `evidence/audio-startup/${id}.png` });
      await page.getByRole('button', { name: 'Stop and rewind' }).click();
    }
  });
}
test('public library retains all scores and scrolls through every new arrangement and plays its opening', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await ready(page);
  for (const entry of LIBRARY) {
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await page.locator(`[data-library-id="${entry.id}"]`).click();
    const loaded = await page.evaluate(() => (window as any).__bongoPhilharmonic.composition);
    expect(loaded.events).toEqual(entry.composition.events);
    expect(loaded.performers).toEqual(entry.composition.performers);
    if (entry.kind !== 'full') continue;
    await expect(page.locator('#loop')).toHaveAttribute('aria-pressed', 'false');
    const sections = entry.sections!;
    for (const section of [sections[Math.floor(sections.length / 2)], sections.at(-1)!]) {
      await page.locator('#score-scroll').evaluate((node, beat) => { node.scrollLeft = beat * 168; }, section.startBeat);
      await expect.poll(() => page.locator('#score-host svg').getAttribute('data-page-start')).toBe(String(Math.floor(section.startBeat / 16) * 16));
    }
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBeGreaterThan(.4);
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
  }
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.screenshot({ path: 'evidence/philharmonic/public-library-rows.png' });
  expect(errors).toEqual([]);
});
test('public Composer restores the original Mario Paint playhead with either sound set', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await ready(page);
  for (const assetSetId of ['bongo', 'mario'] as const) {
    let composition = addPerformer(createComposition(assetSetId), assetSetId === 'mario' ? 'mario' : 'guitar', 1);
    composition = addEvent(composition, { performerId: composition.performers[0].id, pitch: 60, startBeat: 0, durationBeats: .5, velocity: .8 });
    composition = addEvent(composition, { performerId: composition.performers[0].id, pitch: 64, startBeat: 2, durationBeats: .5, velocity: .8 });
    await page.locator('#import-file').setInputFiles({ name: 'playhead-score.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(composition)) });
    await page.getByRole('button', { name: 'Composer', exact: true }).click();
    const runner = page.locator('.mario-runner');
    await expect(runner).toHaveAttribute('height', '72');
    await expect(runner).toHaveAttribute('href', /mario-paint-walk-a.*\.png/);
    const nativeSize = await runner.evaluate(async image => {
      const pose = new Image();
      pose.src = image.getAttribute('href')!;
      await pose.decode();
      return [pose.naturalWidth, pose.naturalHeight];
    });
    expect(nativeSize).toEqual([16, 24]);
    const restingY = await runner.getAttribute('y');
    // Warm up network-loaded audio before measuring the playhead animation.
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('#play')).not.toHaveText('Loading…', { timeout: 15000 });
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    // Read one animation frame together, at intervals that do not match the beat.
    await expect.poll(() => runner.evaluate((image, rest) => image.getAttribute('data-pose') === 'jump'
      && /mario-paint-jump.*\.png/.test(image.getAttribute('href') ?? '')
      && Number(image.getAttribute('y')) < Number(rest), restingY), { intervals: [30, 50, 70, 90] }).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position)).toBeGreaterThan(.5);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(runner).toHaveAttribute('data-pose', 'walk-a');
    await expect(runner).toHaveAttribute('y', restingY!);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.playing)).toBe(true);
    await expect(runner).toHaveAttribute('data-pose', 'walk-a');
    await expect(runner).toHaveAttribute('y', restingY!);
    await page.getByRole('button', { name: 'Stop and rewind' }).click();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  await page.screenshot({ path: 'evidence/public-mario-playhead-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mario-runner')).toHaveAttribute('height', '72');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'evidence/public-mario-playhead-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('public release loads its own ten portraits and Bongo library without missing assets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await ready(page);
  await expect(page).toHaveTitle('Bongo Philharmonic');
  await expect(page.locator('#asset-set option')).toHaveCount(2);
  await expect(page.locator('#asset-set option[value="mario"]')).toHaveText('Mario Paint');
  await expect(page.locator('#placement-palette img')).toHaveCount(10);
  await page.waitForFunction(() => [...document.querySelectorAll('#placement-palette img')].every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0));
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.locator('.composition-row')).toHaveCount(32);
  await expect(page.locator('#library-count')).toHaveText('32 compositions · 7 full-length arrangements');
  await expect(page.getByRole('list', { name: 'Original Mario Paint songs' }).locator('li')).toHaveCount(3);
  await page.locator('#library-filters').getByRole('button', { name: 'Mario Paint', exact: true }).click();
  await expect(page.locator('.composition-row')).toHaveCount(5);
  await page.locator('#library-filters').getByRole('button', { name: 'All', exact: true }).click();
  await page.locator('[data-library-id="bongo-F10"]').click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.playing)).toBe(true);
  await page.getByRole('button', { name: 'Stop and rewind' }).click();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'evidence/public-desktop.png' });
});
test('public release preserves chords and files and rejects an invalid sound set atomically', async ({ page }) => {
  let composition = addPerformer(createComposition(), 'guitar', 1);
  for (const pitch of [60,64,67]) composition = addEvent(composition, { performerId: composition.performers[0].id, pitch, startBeat: 0, durationBeats: .5, velocity: .8 });
  await page.addInitScript(value => localStorage.setItem('bongo-planet-philharmonic-v1', JSON.stringify(value)), composition);
  await ready(page);
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition.events.length)).toBe(3);
  await page.getByRole('button', { name: 'More options' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/-Philharmonic\.json$/);
  await page.locator('#import-file').setInputFiles({ name: 'invalid-score.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...composition, assetSetId: 'unknown' })) });
  await expect(page.locator('#notice')).toContainText('Import failed');
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition.id)).toBe(composition.id);
});
test('public Mario palette, all original models and 195 notes load and play, and files restore', async ({ page }) => {
  const errors: string[] = [], notes = new Set<string>(), models = new Set<string>();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    if (response.ok() && response.url().includes('/asset-packs/mario-paint/')) {
      if (response.url().endsWith('.wav')) notes.add(response.url());
      if (response.url().endsWith('.glb')) models.add(response.url());
    }
  });
  await ready(page);
  await page.locator('#asset-set').selectOption('mario');
  await expect(page.locator('#placement-palette img')).toHaveCount(15);
  await page.waitForFunction(() => [...document.querySelectorAll('#placement-palette img')].every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0));
  for (const instrument of manifest.instruments) await expect(page.getByRole('button', { name: `Place ${instrument.name}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Place Mario', exact: true }).click();
  await page.getByLabel('Placement junction', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Place', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.composition.performers.length)).toBe(1);
  let composition = createComposition('mario');
  for (const [index, instrument] of manifest.instruments.entries()) {
    composition = addPerformer(composition, instrument.id, index);
    for (const [position, pitch] of NATIVE_MIDI.entries()) composition = addEvent(composition, {
      performerId: composition.performers[index].id, pitch, startBeat: position / 2, durationBeats: .25, velocity: .5,
    });
  }
  await page.locator('#import-file').setInputFiles({ name: 'mario-score.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(composition)) });
  await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.composition.id)).toBe(composition.id);
  await expect.poll(() => models.size).toBe(15);
  await expect.poll(() => page.evaluate(() => [...(window as any).__bongoPhilharmonic.sphere.performers.values()].filter((visual: any) => visual.body.children.length > 0).length)).toBe(15);
  await page.getByRole('button', { name: 'Composer', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.playing)).toBe(true);
  await expect.poll(() => notes.size).toBe(195);
  await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.position), { timeout: 10000 }).toBeGreaterThan(6.25);
  await page.getByRole('button', { name: 'Stop and rewind' }).click();
  await page.screenshot({ path: 'evidence/public-mario-desktop.png' });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition.assetSetId)).toBe('mario');
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition.events.length)).toBe(195);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Performance', exact: true }).click();
  await expect(page.locator('#score-host svg')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'evidence/public-mario-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('public Performance fits a 390px screen and keeps score pictures available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.locator('[data-library-id="bongo-F10"]').click();
  await page.getByRole('button', { name: 'Performance', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#score-host svg')).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.playing)).toBe(true);
  await page.getByRole('button', { name: 'Stop and rewind' }).click();
  await page.screenshot({ path: 'evidence/public-mobile.png', fullPage: true });
});
