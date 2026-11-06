import { test, expect, type Page } from '@playwright/test'

// Wide wallpaper with different edge bands; landscape crops both bands away.
const bands = '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="#c08040"/><rect width="1500" height="100" fill="#204e60"/><rect y="900" width="1500" height="100" fill="#051619"/></svg>'
async function prepare(page: Page, broken = false) {
  const writes: unknown[] = []
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    if (route.request().method() !== 'GET') {
      writes.push(route.request().postDataJSON())
      return route.fulfill({ json: { message: 'updated' } })
    }
    const path = new URL(route.request().url()).pathname
    if (path === '/api/wallpaper') {
      return route.fulfill(broken ? { status: 404, body: '' } : { contentType: 'image/svg+xml', body: bands })
    }
    return route.fulfill({ json: path === '/api/settings'
      ? { background_image: '/api/wallpaper', wallpaper_blur: '0' }
      : [] })
  })
  await page.goto('/')
  return writes
}

test('mobile supplies opaque top/bottom colors from the visible crop, without changing the wallpaper', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  const writes = await prepare(page)
  const top = page.locator('.mobile-browser-edge-top')
  const bottom = page.locator('.mobile-browser-edge-bottom')
  await expect(top).toHaveCSS('background-color', 'rgb(32, 78, 96)')
  await expect(bottom).toHaveCSS('background-color', 'rgb(5, 22, 25)')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(29, 72, 88)')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(29, 72, 88)')
  await expect(top).toHaveCSS('filter', 'none')
  await expect(bottom).toHaveCSS('backdrop-filter', 'none')
  expect(writes).toEqual([])

  // Backing colors must not cover any of the visible wallpaper or controls.
  const withBacking = await page.screenshot()
  const hiddenBacking = await page.addStyleTag({ content: '.mobile-browser-edge { display: none !important; }' })
  expect(await page.screenshot()).toEqual(withBacking)
  await hiddenBacking.evaluate(el => el.remove())

  // Like WebKit's fixed-layer color sampler, exclude the replaced image and
  // inspect the painted backing at both edges, not just CSS variable values.
  const imageHidden = await page.addStyleTag({ content: '.bg-image, .app-scroll, .edit-toggle { visibility: hidden !important; }' })
  const screenshot = await page.screenshot()
  const pixels = await page.evaluate(async base64 => {
    const img = new Image(); img.src = `data:image/png;base64,${base64}`; await img.decode()
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height
    const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0)
    return [1, img.height - 2].map(y => Array.from(ctx.getImageData(Math.floor(img.width / 2), y, 1, 1).data))
  }, screenshot.toString('base64'))
  const expected = [[29, 72, 88, 255], [5, 20, 23, 255]]
  // Allow one level of compositor rounding for the 8% overlay.
  for (let edge = 0; edge < 2; edge++) {
    for (let channel = 0; channel < 4; channel++) {
      expect(Math.abs(pixels[edge]![channel]! - expected[edge]![channel]!)).toBeLessThanOrEqual(1)
    }
  }
  await imageHidden.evaluate(el => el.remove())

  await page.setViewportSize({ width: 844, height: 390 })
  await expect(top).toHaveCSS('background-color', 'rgb(192, 128, 64)')
  await expect(bottom).toHaveCSS('background-color', 'rgb(192, 128, 64)')
  expect(writes).toEqual([])

  await page.locator('.edit-toggle').click()
  await page.locator('.settings-btn').click()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(top).toHaveCSS('background-color', 'rgb(26, 26, 46)')
  await expect(bottom).toHaveCSS('background-color', 'rgb(26, 26, 46)')
  expect(writes).toEqual([{ background_image: '' }])
  await context.close()
})

test('a failed mobile wallpaper load keeps an opaque fallback and does not rewrite settings', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  const writes = await prepare(page, true)
  await expect(page.locator('.mobile-browser-edge-top')).toHaveCSS('background-color', 'rgb(26, 26, 46)')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(24, 24, 42)')
  expect(writes).toEqual([])
  await context.close()
})

test('desktop does not create mobile backing layers or change its background colors', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const writes = await prepare(page)
  await page.locator('.bg-image').evaluate(img => (img as HTMLImageElement).decode())
  await expect(page.locator('.mobile-browser-edge')).toHaveCount(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  expect(await page.locator('html').evaluate(el => (el as HTMLElement).style.getPropertyValue('--mobile-page-color'))).toBe('')
  await page.setViewportSize({ width: 390, height: 740 })
  await expect(page.locator('.mobile-browser-edge')).toHaveCount(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  expect(writes).toEqual([])
})
