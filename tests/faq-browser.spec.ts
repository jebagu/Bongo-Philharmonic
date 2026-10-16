import { test, expect } from '@playwright/test';
import { addEvent, addPerformer, createComposition } from '../src/model';

test('FAQ illustrates the workflow and keeps the score and placement intent intact', async ({ page }) => {
  let composition = addPerformer(createComposition(), 'guitar', 1);
  composition = addEvent(composition, { performerId: composition.performers[0].id, pitch: 60, startBeat: 0, durationBeats: 1, velocity: .8 });
  await page.addInitScript(value => localStorage.setItem('bongo-planet-philharmonic-v1', JSON.stringify(value)), composition);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('./');
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
  await page.getByRole('button', { name: 'Composer', exact: true }).click();
  await page.locator('#score-scroll').evaluate(node => { node.scrollLeft = 180; node.scrollTop = 80; });
  const viewport = await page.locator('#score-scroll').evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop }));
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  await expect(page.locator('[data-view="faq"] .faq-page')).toBeVisible();
  await expect(page.locator('.view-nav [data-view="faq"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Your band, from first note to showtime.' })).toBeVisible();
  await expect(page.locator('.faq-page img')).toHaveCount(3);
  for (const image of await page.locator('.faq-page img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThanOrEqual(1280);
    expect(await image.getAttribute('alt')).toBeTruthy();
  }
  const question = page.getByText('Can I try an existing song first?', { exact: true });
  await question.focus();
  await question.press('Space');
  await expect(page.getByRole('button', { name: 'Open Library →', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.transport.playing)).toBe(false);
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition)).toEqual(composition);
  await page.getByRole('button', { name: 'Open Composer →', exact: true }).click();
  expect(await page.locator('#score-scroll').evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop }))).toEqual(viewport);
  // A guide visit must not lose a new instrument requested from Composer.
  await page.locator('#family-row').getByRole('button', { name: 'Place Glass', exact: true }).click();
  await page.getByLabel('Placement junction', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Place', exact: true }).click();
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  await page.getByRole('button', { name: 'Open Composer →', exact: true }).click();
  const state = await page.evaluate(() => {
    const app = (window as any).__bongoPhilharmonic;
    return { brush: app.composition.performers.find((performer: any) => performer.id === app.brushId)?.instrumentTypeId, events: app.composition.events };
  });
  expect(state.brush).toBe('glass');
  expect(state.events).toEqual(composition.events);
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  await page.getByRole('button', { name: 'Open Performance →', exact: true }).click();
  await page.getByRole('button', { name: 'Composer', exact: true }).click();
  await expect(page.locator('#philharmonic-app')).toHaveAttribute('data-view', 'composer');
  expect(errors).toEqual([]);
});

test('FAQ fits desktop and narrow phones and its illustrated steps can be reached', async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
    await page.locator('#faq-guide').evaluate(node => { node.scrollTop = 0; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('#faq-guide').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'FAQ', exact: true })).toBeInViewport();
    expect(await page.locator('.view-nav button').evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth))).toBe(true);
    await page.getByRole('link', { name: '3 Put on a performance' }).click();
    await expect(page.getByRole('heading', { name: 'Let the planet be your stage.' })).toBeInViewport();
    await page.locator('#faq-guide').evaluate(node => { node.scrollTop = 0; });
    await expect(page.getByRole('heading', { name: 'Your band, from first note to showtime.' })).toBeInViewport();
    await page.screenshot({ path: `evidence/faq/guide-${width}.png` });
  }
});

test('Files saves, restores and round-trips an agent song without losing invalid-import recovery', async ({ page }) => {
  const { EXAMPLE_SONG } = await import('../src/songGuide');
  const { readFile } = await import('node:fs/promises');
  await page.goto('./');
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  const exampleDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download example song', exact: true }).click();
  const example = await exampleDownload;
  const examplePath = (await example.path())!;
  expect(JSON.parse(await readFile(examplePath, 'utf8'))).toEqual(EXAMPLE_SONG);
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await picker).setFiles(examplePath);
  await expect(page.locator('#composition-title')).toHaveValue(EXAMPLE_SONG.title);
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition)).toEqual(EXAMPLE_SONG);
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.transport.playing)).toBe(false);
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.locator('#notice')).toHaveText('Composition saved locally');
  await page.locator('#composition-title').fill('Changed draft');
  await page.locator('#composition-title').press('Tab');
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await page.getByRole('button', { name: 'Load local save', exact: true }).click();
  await expect(page.locator('#composition-title')).toHaveValue(EXAMPLE_SONG.title);
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const songFile = await exported;
  expect(songFile.suggestedFilename()).toBe('First-Light-Philharmonic.json');
  expect(JSON.parse(await readFile((await songFile.path())!, 'utf8'))).toEqual(EXAMPLE_SONG);
  const prior = await page.evaluate(() => ({ song: (window as any).__bongoPhilharmonic.composition, draft: localStorage.getItem('bongo-planet-philharmonic-v1'), recovery: localStorage.getItem('bongo-planet-philharmonic-v1-recovery') }));
  await page.locator('#import-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...EXAMPLE_SONG, performers: [] })) });
  await expect(page.locator('#notice')).toContainText('Import failed');
  expect(await page.evaluate(() => ({ song: (window as any).__bongoPhilharmonic.composition, draft: localStorage.getItem('bongo-planet-philharmonic-v1'), recovery: localStorage.getItem('bongo-planet-philharmonic-v1-recovery') }))).toEqual(prior);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition)).toEqual(EXAMPLE_SONG);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  let resumed = false;
  await expect.poll(async () => {
    const state = await page.evaluate(() => ({ ...((window as any).__bongoPhilharmonic.transport), notice: document.querySelector('#notice')?.textContent }));
    // Hosted headless Chrome can interrupt its newly created audio clock. Follow the visible recovery once.
    if (!resumed && !state.playing && ['Audio interrupted. Press Play to resume.', 'Audio clock interrupted. Playback paused; press Play to resume.'].includes(state.notice ?? '')) {
      resumed = true;
      test.info().annotations.push({ type: 'audio-resume', description: 'Pressed Play once after the visible first-start audio interruption.' });
      await page.getByRole('button', { name: 'Play', exact: true }).click();
    }
    return state.position;
  }, { timeout: 15000 }).toBeGreaterThan(.1);
  await page.getByRole('button', { name: 'Stop and rewind', exact: true }).click();
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await page.getByRole('button', { name: 'Recover previous draft', exact: true }).click();
  await expect(page.locator('#composition-title')).toHaveValue('Changed draft');
});

test('FAQ provides the exact copyable and downloadable agent contract at all sizes', async ({ page, context }) => {
  const { AGENT_MUSIC_PROMPT, SONG_FORMAT } = await import('../src/songGuide');
  const { readFile } = await import('node:fs/promises');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await page.getByRole('button', { name: 'File format & agent prompt →', exact: true }).click();
  await expect(page.locator('#guide-agent-prompt')).toHaveValue(AGENT_MUSIC_PROMPT);
  await page.getByRole('button', { name: 'Copy agent prompt', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(AGENT_MUSIC_PROMPT);
  const promptDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download prompt', exact: true }).click();
  expect(await readFile((await (await promptDownload).path())!, 'utf8')).toBe(AGENT_MUSIC_PROMPT);
  // A denied clipboard still leaves a usable, selected prompt and a download.
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw Error('denied'); } }));
  await page.getByRole('button', { name: 'Copy agent prompt', exact: true }).click();
  await expect(page.locator('#notice')).toContainText('prompt is selected');
  expect(await page.locator('#guide-agent-prompt').evaluate(node => (node as HTMLTextAreaElement).selectionEnd - (node as HTMLTextAreaElement).selectionStart)).toBe(AGENT_MUSIC_PROMPT.length);
  await page.getByText('Composition file format · JSON version 1', { exact: true }).click();
  await expect(page.getByLabel('Composition file format', { exact: true })).toHaveText(SONG_FORMAT);
  const formatDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file format', exact: true }).click();
  expect(await readFile((await (await formatDownload).path())!, 'utf8')).toBe(SONG_FORMAT);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('#faq-guide').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Files', exact: true })).toBeInViewport();
    await page.locator('#guide-agent').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `evidence/faq/agent-guide-${width}.png` });
  }
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  const dialog = page.getByRole('dialog');
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  for (const name of ['Save locally', 'Load local save', 'Import JSON', 'Export JSON', 'Recover previous draft']) {
    await expect(dialog.getByRole('button', { name, exact: true })).toBeInViewport();
  }
  await page.screenshot({ path: 'evidence/faq/files-320.png' });
});
