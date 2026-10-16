import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BANKS, grooveEvents } from './catalog.mjs';

const root = new URL('./', import.meta.url);
const url = process.env.BONGO_RESOURCE_BASE_URL ?? 'http://127.0.0.1:5417/BongoPlanet/instrument-candidates/';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });
const report = { url, checkedAt: new Date().toISOString(), errors: [], coverage: [], audio: [] };
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
// Acceptance artifacts must not trigger Vite reloads while the test is running.
await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
page.on('pageerror', error => report.errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') report.errors.push(msg.text()); });
const state = () => page.evaluate(() => window.candidateDiagnostics.state);
try {
  await page.goto(url);
  await page.waitForSelector('.sound-card');
  assert.equal(await page.locator('.sound-card').count(), 16);
  assert.equal((await state()).context, 'uninitialized', 'No automatic audio startup');
  await page.screenshot({ path: fileURLToPath(new URL('preview-desktop.png', root)), fullPage: true });

  for (const bank of BANKS) {
    assert.equal(bank.voices.length, 16);
    const covered = new Set(Array.from({ length: 64 }, (_, step) => grooveEvents(bank, step, 60 / bank.bpm)).flat().map(e => e.voice.id));
    assert.equal(covered.size, 16, `Groove must include all voices in ${bank.name}`);
    await page.locator(`[data-bank="${bank.id}"]`).click();
    for (const v of bank.voices) {
      await page.locator(`[data-id="${v.id}"] .audition`).click();
      await page.waitForFunction(id => window.candidateDiagnostics.state.history.at(-1)?.id === id && window.candidateDiagnostics.state.activity === 'preview', v.id);
      assert.equal((await state()).loadedSamples, 5);
      await page.locator('#stop').click();
    }
    await page.locator('#groove').click();
    await page.waitForFunction(() => window.candidateDiagnostics.state.activity === 'groove');
    const start = (await state()).history.length;
    await page.waitForFunction(({ ids, start }) => {
      const found = new Set(window.candidateDiagnostics.state.history.slice(start).map(e => e.id));
      return ids.every(id => found.has(id));
    }, { ids: bank.voices.map(v => v.id), start }, { timeout: 15000 });
    const grooveState = await state();
    report.coverage.push({ bank: bank.id, individualButtons: 16, grooveVoices: [...new Set(grooveState.history.slice(start).map(e => e.id))].length });
    await page.locator('#stop').click();
  }

  await page.locator('[data-bank="icons"]').click();
  await page.locator('[data-mode="phrase"]').click();
  await page.locator('[data-id="jump"] .audition').click();
  await page.waitForFunction(() => window.candidateDiagnostics.state.activity === 'preview');
  assert.equal((await state()).history.slice(-6).filter(e => e.id === 'jump').length, 6);
  await page.locator('[data-mode="chord"]').click();
  await page.locator('[data-id="jump"] .audition').click();
  await page.waitForFunction(() => window.candidateDiagnostics.state.activity === 'preview');
  assert.equal(new Set((await state()).history.slice(-3).map(e => e.note)).size, 3);
  await page.keyboard.press('Escape');
  assert.equal((await state()).activity, 'idle');

  await page.locator('[data-id="jump"] .heart').click();
  await page.reload();
  assert.equal(await page.locator('[data-id="jump"] .heart').getAttribute('aria-pressed'), 'true');
  await page.locator('#show-picks').click();
  assert.equal(await page.locator('.sound-card').count(), 1);
  await page.locator('#show-picks').click();
  await page.locator('[data-filter="voice"]').click();
  assert.equal(await page.locator('.sound-card').count(), 2);
  await page.locator('[data-filter="all"]').click();
  await page.locator('[data-id="jump"] .card-mute').click();
  assert.ok((await state()).muted.includes('jump'));
  await page.locator('#unmute').click();
  assert.equal((await state()).muted.length, 0);

  // Stop must also win a race against lazy asset loading.
  await page.reload();
  await page.route('**/assets/*.mp3', async route => { await new Promise(resolve => setTimeout(resolve, 250)); await route.continue(); });
  await page.locator('#groove').click();
  await page.locator('#stop').click();
  await page.waitForTimeout(600);
  assert.equal((await state()).activity, 'idle');
  assert.equal((await state()).history.length, 0);
  await page.unroute('**/assets/*.mp3');
  await page.locator('#tour').click();
  await page.waitForFunction(() => window.candidateDiagnostics.state.activity === 'tour');
  await page.locator('[data-bank="cinema"]').click();
  assert.equal((await state()).activity, 'idle');
  await page.waitForTimeout(300);
  assert.equal((await state()).activeSources, 0);

  // Offline rendering exercises the actual graph, including all downloaded voices.
  report.audio = await page.evaluate(async () => {
    const { BANKS, grooveEvents } = await import('./catalog.mjs');
    const { SoundEngine } = await import('./audio.mjs');
    const decoded = new SoundEngine(new OfflineAudioContext(2, 44100, 44100));
    await decoded.load();
    const results = [];
    for (const bank of BANKS) for (const voice of bank.voices) {
      const ctx = new OfflineAudioContext(2, 44100 * 6, 44100);
      const engine = new SoundEngine(ctx, decoded.samples); engine.ranges = decoded.ranges;
      engine.play(voice, voice.auditionNote ?? voice.root ?? 62, .05, voice.role === 'pad' ? 1.8 : .9, .85);
      const buffer = await ctx.startRendering();
      const data = buffer.getChannelData(0);
      let peak = 0, energy = 0, tail = 0, changes = 0;
      for (let i = 0; i < data.length; i++) { if (!Number.isFinite(data[i])) throw new Error(`Nonfinite audio: ${voice.id}`); peak = Math.max(peak, Math.abs(data[i])); energy += data[i] ** 2; if (i > data.length - 4410) tail += data[i] ** 2; if (i && data[i] * data[i - 1] < 0) changes++; }
      results.push({ id: voice.id, peak, rms: Math.sqrt(energy / data.length), tailRms: Math.sqrt(tail / 4410), crossings: changes });
    }
    for (const bank of BANKS) {
      const seconds = 16 * 60 / bank.bpm;
      const ctx = new OfflineAudioContext(2, Math.ceil((seconds + 4) * 44100), 44100);
      const engine = new SoundEngine(ctx, decoded.samples); engine.ranges = decoded.ranges;
      for (let step = 0; step < 64; step++) for (const e of grooveEvents(bank, step, 60 / bank.bpm)) engine.play(e.voice, e.note, .05 + step * 60 / bank.bpm / 4, e.duration, e.velocity);
      const data = (await ctx.startRendering()).getChannelData(0);
      let peak = 0, energy = 0; for (const x of data) { peak = Math.max(peak, Math.abs(x)); energy += x * x; }
      results.push({ id: `${bank.id}-mix`, peak, rms: Math.sqrt(energy / data.length) });
    }
    return results;
  });
  for (const item of report.audio) {
    assert.ok(item.peak > .008, `Audible signal required: ${item.id}`);
    assert.ok(item.peak < .99, `Headroom required: ${item.id}`);
    // RMS includes six seconds of silence after short percussion hits.
    assert.ok(item.rms > .0002, `Nontrivial audio required: ${item.id}`);
    if ('tailRms' in item) assert.ok(item.tailRms < .002, `Tail must settle: ${item.id}`);
  }

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, `No horizontal overflow at ${width}px`);
    if (width === 390) await page.screenshot({ path: fileURLToPath(new URL('preview-mobile.png', root)), fullPage: true });
  }
  assert.equal(report.errors.length, 0, 'No browser errors');
  report.passed = true;
  console.log(JSON.stringify({ passed: true, banks: report.coverage, signals: report.audio.length, errors: report.errors }));
} finally {
  await writeFile(new URL('validation.json', root), JSON.stringify(report, null, 2));
  await browser.close();
}
