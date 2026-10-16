import { test, expect, type Page } from '@playwright/test';

async function openPerformance(page: Page) {
  await page.goto('./');
  await page.waitForFunction(() => !!(window as any).__bongoPhilharmonic);
  await page.getByRole('button', { name: 'Performance', exact: true }).click();
}

test('stars and glowing fireflies render, and the nebula stays fixed through globe rotation and zoom', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPerformance(page);
  const style = page.getByRole('combobox', { name: 'Visual style', exact: true });
  const stage = (await page.locator('#sphere-host').boundingBox())!;
  const leftSky = { x: Math.ceil(stage.x), y: Math.ceil(stage.y), width: Math.floor(stage.width * .2), height: Math.floor(stage.height) };
  for (const id of ['original', 'firefly-garden']) {
    await style.selectOption(id);
    const pixels = await page.screenshot({ clip: leftSky });
    const brightPixels = await page.evaluate(async source => {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let bright = 0;
      for (let i = 0; i < data.length; i += 4) if (Math.max(data[i], data[i + 1], data[i + 2]) > 150) bright++;
      return bright;
    }, `data:image/png;base64,${pixels.toString('base64')}`);
    expect(brightPixels, `${id} has visible sky particles`).toBeGreaterThan(20);
  }
  await style.selectOption('nebula-space');
  const corner = { x: Math.ceil(stage.x + stage.width * .77), y: Math.ceil(stage.y + stage.height * .01), width: Math.floor(stage.width * .22), height: Math.floor(stage.height * .27) };
  const sky = await page.screenshot({ clip: corner });
  const initialCamera = await page.evaluate(() => (window as any).__bongoPhilharmonic.sphere.camera.position.toArray());
  await page.mouse.move(stage.x + stage.width * .5, stage.y + stage.height * .4);
  await page.mouse.down();
  await page.mouse.move(stage.x + stage.width * .7, stage.y + stage.height * .75, { steps: 30 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.sphere.camera.position.toArray())).not.toEqual(initialCamera);
  expect((await page.screenshot({ clip: corner })).equals(sky)).toBe(true);
  await page.mouse.wheel(0, -380);
  await expect.poll(() => page.evaluate(() => (window as any).__bongoPhilharmonic.sphere.camera.zoom)).not.toBe(1);
  expect((await page.screenshot({ clip: corner })).equals(sky)).toBe(true);
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.sphere.camera.position.toArray())).toEqual(initialCamera);
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.sphere.camera.zoom)).toBe(1);
  expect(errors).toEqual([]);
});

test('Performance camera buttons fit mobile, rotate the globe and respect reduced motion', async ({ page }) => {
  await openPerformance(page);
  const camera = () => page.evaluate(() => (window as any).__bongoPhilharmonic.sphere.camera.position.toArray());
  const composition = await page.evaluate(() => (window as any).__bongoPhilharmonic.composition);
  const initial = await camera();
  const rotate = page.getByRole('button', { name: 'Slow rotate', exact: true });
  await rotate.click();
  await expect(rotate).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(camera).not.toEqual(initial);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Read after a presentation frame so the preference change has taken effect.
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const stopped = await camera();
  await page.waitForTimeout(150);
  expect(await camera()).toEqual(stopped);
  await rotate.click();
  await expect(rotate).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  expect(await camera()).toEqual(initial);
  for (const width of [1024, 900, 768, 390, 319]) {
    await page.setViewportSize({ width, height: 844 });
    for (const selector of ['#performance-style', '#reset-camera', '#slow-rotate', '#play', '#stop', '#loop']) {
      await expect(page.locator(selector)).toBeVisible();
      const bounds = (await page.locator(selector).boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(10);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 10);
    }
  }
  expect(await page.evaluate(() => (window as any).__bongoPhilharmonic.composition)).toEqual(composition);
  await page.getByRole('button', { name: 'Placement', exact: true }).click();
  await expect(page.locator('.sphere-stage #reset-camera')).toBeVisible();
  await expect(page.locator('.sphere-stage #slow-rotate')).toHaveAttribute('aria-pressed', 'false');
});
