import { test, expect, type Page } from '@playwright/test';
import { addEvent, addPerformer, createComposition } from '../src/model';
async function ready(page: Page) {
  await page.goto('./');
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
}
test('public release loads its own ten portraits and Bongo library without missing assets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await ready(page);
  await expect(page).toHaveTitle('Bongo Philharmonic');
  await expect(page.locator('#asset-set option')).toHaveCount(1);
  await expect(page.locator('#placement-palette img')).toHaveCount(10);
  await page.waitForFunction(() => [...document.querySelectorAll('#placement-palette img')].every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0));
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.locator('.composition-card')).toHaveCount(22);
  await expect(page.locator('#library-count')).toHaveText('22 compositions · Bongo Favorites');
  await expect(page.getByText('Mario Paint', { exact: true })).toHaveCount(0);
  await page.locator('[data-library-id="bongo-F10"]').click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.transport.playing)).toBe(true);
  await page.getByRole('button', { name: 'Stop and rewind' }).click();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'evidence/public-desktop.png' });
});
test('public release preserves chords and files and rejects a local-only sound set atomically', async ({ page }) => {
  let composition = addPerformer(createComposition(), 'guitar', 1);
  for (const pitch of [60,64,67]) composition = addEvent(composition, { performerId: composition.performers[0].id, pitch, startBeat: 0, durationBeats: .5, velocity: .8 });
  await page.addInitScript(value => localStorage.setItem('bongo-planet-philharmonic-v1', JSON.stringify(value)), composition);
  await ready(page);
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition.events.length)).toBe(3);
  await page.getByRole('button', { name: 'More options' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/-Philharmonic\.json$/);
  await page.locator('#import-file').setInputFiles({ name: 'local-score.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(createComposition('mario'))) });
  await expect(page.locator('#notice')).toContainText('local application only');
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition.id)).toBe(composition.id);
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
