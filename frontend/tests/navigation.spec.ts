import { test, expect, type Page } from '@playwright/test'

// All requests are intercepted. No live backend or user database is used.
const savedSettings = {
  theme: 'liquid-glass', background_image: '/api/test-wallpaper',
  glass_displacement_scale: '135', glass_blur_amount: '0.45', glass_saturation: '120',
  glass_aberration: '3', glass_elasticity: '0.85', glass_corner_radius: '20',
  wallpaper_blur: '0', card_opacity: '15',
}
const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="#305866"/><path d="M0 900L450 130L900 1000ZM350 1000L1000 90L1500 1000" fill="#ddd0ac"/></svg>`

async function prepare(page: Page, count = 45) {
  const writes: Record<string, string>[] = []
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() !== 'GET') {
      writes.push(request.postDataJSON())
      await route.fulfill({ json: { message: 'updated' } })
    } else if (path === '/api/test-wallpaper') {
      await route.fulfill({ contentType: 'image/svg+xml', body: wallpaper })
    } else {
      await route.fulfill({ json: path === '/api/settings' ? savedSettings : path === '/api/groups' ? [{
        id: 1, name: 'Services', cards: Array.from({ length: count }, (_, i) => ({
          id: i + 1, group_id: 1, title: `Service ${i + 1}`, url: 'https://service.example',
          icon_type: 'letter', icon_value: 'S', icon_bg_color: '#6366f1', open_mode: '_blank', sort_order: i,
        })),
      }] : [] })
    }
  })
  await page.goto('/')
  await expect(page.locator('.bookmark-card')).toHaveCount(count)
  return writes
}

for (const width of [320, 390, 844]) {
  test(`mobile viewport ${width}px stays fixed while bookmarks scroll`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    const writes = await prepare(page)
    const metrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth, viewport: innerWidth,
      height: document.querySelector('#app')!.getBoundingClientRect().height,
      viewportHeight: innerHeight,
    }))
    expect(metrics.width).toBe(metrics.viewport)
    expect(metrics.height).toBe(metrics.viewportHeight)
    await expect(page.locator('.app-scroll')).toHaveCSS('overscroll-behavior-y', 'none')
    // Browser-dispatched touch gesture, including a pull down at the upper boundary.
    const cdp = await context.newCDPSession(page)
    const swipe = async (from: number, to: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: from }] })
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150, y: from + (to - from) * i / 8 }] })
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await swipe(200, 500)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(await page.locator('.app-scroll').evaluate(el => el.getBoundingClientRect().top)).toBe(0)
    await swipe(550, 200)
    await expect.poll(() => page.locator('.app-scroll').evaluate(el => el.scrollTop)).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(writes).toEqual([])
    await context.close()
  })
}

test('desktop keeps the centered 1400px layout and has no writes on load or settings open', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const writes = await prepare(page)
  const grid = (await page.locator('.navigation-grid').boundingBox())!
  const scrollArea = (await page.locator('.app-scroll').boundingBox())!
  expect(grid.width).toBe(1400)
  // Allow for the reserved scrollbar gutter on the right.
  expect(Math.abs(grid.x - (scrollArea.width - grid.width) / 2)).toBeLessThanOrEqual(6)
  await page.locator('.edit-toggle').click()
  await page.locator('.settings-btn').click()
  await expect(page.locator('.glass-preview .bookmark-card')).toBeVisible()
  await page.waitForTimeout(400)
  expect(writes).toEqual([])
  const values = await page.locator('.glass-param input').evaluateAll(inputs => inputs.map(el => (el as HTMLInputElement).value))
  expect(values).toEqual(['135', '0.45', '120', '3', '0.85', '20'])
})

test('desktop wallpaper canvas and no-wallpaper fallback stay unchanged without settings writes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 })
  const writes = await prepare(page)
  await expect(page.locator('html')).toHaveClass('has-wallpaper')
  await expect(page.locator('html')).toHaveCSS('background-image', /test-wallpaper/)
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.locator('body')).toHaveCSS('position', 'static')
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(0)
  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest.theme_color).toBeUndefined()
  expect(manifest.display).toBe('standalone')
  const background = (await page.locator('.app-background').boundingBox())!
  expect(background.y).toBe(0)
  expect(background.height).toBeGreaterThanOrEqual(740)
  expect(writes).toEqual([])

  // Clearing is an explicit user action: it restores the no-wallpaper fallback,
  // and makes exactly the existing background_image update, with no other keys.
  await page.locator('.edit-toggle').click()
  await page.locator('.settings-btn').click()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass('has-wallpaper')
  await expect(page.locator('html')).toHaveCSS('background-image', 'none')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(26, 26, 46)')
  expect(writes).toEqual([{ background_image: '' }])
})

test('all six glass controls update the preview and save only the edited key', async ({ page }) => {
  const writes = await prepare(page)
  await page.locator('.edit-toggle').click()
  await page.locator('.settings-btn').click()
  const preview = page.locator('.glass-preview .bookmark-card')
  const warp = preview.locator('.glass-warp')
  await expect(warp).toHaveCSS('filter', /glass-filter-shared/)
  const changes = [
    ['glass_displacement_scale', '80'], ['glass_blur_amount', '1.2'], ['glass_saturation', '200'],
    ['glass_aberration', '5'], ['glass_elasticity', '0.2'], ['glass_corner_radius', '32'],
  ]
  const oldTransform = await preview.evaluate(el => getComputedStyle(el).transform)
  for (const [i, [key, value]] of changes.entries()) {
    await page.locator('.glass-param input').nth(i).fill(value!)
    await expect.poll(() => writes.length).toBe(i + 1)
    expect(writes[i]).toEqual({ [key!]: String(Number(value)) })
  }
  await expect(page.locator('#glass-filter-shared feDisplacementMap').first()).toHaveAttribute('scale', '-80')
  await expect(page.locator('#glass-filter-shared feDisplacementMap').nth(1)).toHaveAttribute('scale', '-220')
  await expect(warp).toHaveCSS('backdrop-filter', 'blur(23.2px) saturate(2)')
  await expect(preview).toHaveCSS('border-radius', '32px')
  await expect.poll(() => preview.evaluate(el => getComputedStyle(el).transform)).not.toBe(oldTransform)
  // Range controls must not inherit text-input padding/borders.
  await expect(page.locator('.glass-param input').first()).toHaveCSS('padding', '0px')
})

test('touch does not leave hover filters active; edit mode clears mouse tilt', async ({ page }) => {
  await prepare(page)
  const card = page.locator('.bookmark-card').first()
  await card.dispatchEvent('pointermove', { pointerType: 'touch', clientX: 100, clientY: 100 })
  await expect(card.locator('.glass-warp')).toHaveCSS('filter', 'none')
  await card.hover({ position: { x: 40, y: 20 } })
  await expect(card.locator('.glass-warp')).toHaveCSS('filter', /glass-filter-shared/)
  await page.locator('.edit-toggle').click()
  await expect(card.locator('.glass-warp')).toHaveCSS('filter', 'none')
  await expect(card).toHaveCSS('transform', 'none')
})

test('refraction preserves the center instead of applying RGB separation to the whole card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepare(page)
  // Lock geometry to measure color changes, independently of the intended 3D tilt.
  await page.addStyleTag({ content: '.bookmark-card { transform: none !important; transition: none !important; }' })
  const card = page.locator('.bookmark-card').nth(2)
  const before = await card.screenshot()
  await card.hover({ position: { x: 150, y: 35 } })
  const after = await card.screenshot()
  const difference = await page.evaluate(async ([a, b]) => {
    const pixels = async (base64: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
      // Sample the background beside the text, away from the refracted rim.
      return ctx.getImageData(Math.floor(image.width * .7), 28, 25, 14).data
    }
    const [pa, pb] = await Promise.all([pixels(a!), pixels(b!)])
    return pa.reduce((sum, v, i) => sum + Math.abs(v - pb[i]!), 0) / pa.length
  }, [before.toString('base64'), after.toString('base64')])
  expect(difference).toBeLessThan(2)
})

test('small-screen settings stay within the viewport and scroll independently', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await prepare(page, 1)
  await page.locator('.edit-toggle').click()
  await page.locator('.settings-btn').click()
  const panel = page.locator('.settings-panel')
  await expect(panel).toBeVisible()
  const box = (await panel.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(320)
  await expect(panel).toHaveCSS('overscroll-behavior-y', 'none')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(panel).toHaveCount(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('preview corner radius visibly clips the tilted SVG layer, not only its parent style', async ({ page }) => {
  await prepare(page)
  await page.locator('.edit-toggle').click()
  await page.locator('.settings-btn').click()
  const preview = page.locator('.glass-preview')
  const card = preview.locator('.bookmark-card')
  const radius = page.locator('.glass-param input').last()
  const shots: Buffer[] = []
  for (const value of ['0', '40']) {
    await radius.fill(value)
    await page.mouse.move(0, 0)
    await expect(card.locator('.glass-warp')).toHaveCSS('clip-path', value === '0' ? 'inset(0px)' : `inset(0px round ${value}px)`)
    shots.push(await preview.screenshot())
  }
  // Project a point 4px inside the unrounded corner through the real 3D tilt.
  const point = await card.evaluate(el => {
    const style = getComputedStyle(el)
    const matrix = new DOMMatrix(style.transform)
    const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat)
    const width = (el as HTMLElement).offsetWidth, height = (el as HTMLElement).offsetHeight
    const project = (x: number, y: number) => {
      const p = new DOMPoint(x - ox!, y - oy!, 0, 1).matrixTransform(matrix)
      return { x: p.x / p.w + ox!, y: p.y / p.w + oy! }
    }
    const corners = [project(0, 0), project(width, 0), project(0, height), project(width, height)]
    const p = project(4, 4), bounds = el.getBoundingClientRect(), panel = el.parentElement!.getBoundingClientRect()
    return {
      x: Math.round(bounds.x - panel.x + p.x - Math.min(...corners.map(c => c.x))),
      y: Math.round(bounds.y - panel.y + p.y - Math.min(...corners.map(c => c.y))),
    }
  })
  await card.evaluate(el => (el as HTMLElement).style.visibility = 'hidden')
  shots.push(await preview.screenshot())
  const [square, rounded, background] = await page.evaluate(async ({ images, point }) => {
    return Promise.all(images.map(async base64 => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
      return Array.from(ctx.getImageData(point.x, point.y, 1, 1).data).slice(0, 3)
    }))
  }, { images: shots.map(image => image.toString('base64')), point })
  const difference = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]!), 0)
  expect(difference(square!, background!)).toBeGreaterThan(10)
  expect(difference(rounded!, background!)).toBeLessThan(6)
})

test('mobile cards blend into the wallpaper at scroll edges without changing central glass or blocking taps', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 740 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const writes = await prepare(page)
  const scroll = page.locator('.app-scroll')
  const fade = page.locator('.mobile-scroll-fade')
  await expect(fade).toHaveClass(/fade-bottom/)
  await expect(fade).not.toHaveClass(/fade-top/)
  await expect(fade).toHaveCSS('pointer-events', 'none')
  // A mask on the scroll container would isolate descendant backdrop filters.
  await expect(scroll).toHaveCSS('mask-image', 'none')
  await scroll.evaluate(el => { el.scrollTop = 200 })
  await expect(fade).toHaveClass(/fade-top/)
  await expect(fade).toHaveClass(/fade-bottom/)
  // The decorative copy must also retain the mobile browser's matching colors
  // when Safari excludes images during fixed-layer color sampling.
  await expect(page.locator('.mobile-scroll-fade-background')).toHaveCSS('background-color',
    await page.locator('.mobile-browser-edge-top').evaluate(el => getComputedStyle(el).backgroundColor))
  await expect(page.locator('.fade-browser-edge-bottom')).toHaveCSS('background-color',
    await page.locator('.mobile-browser-edge-bottom').evaluate(el => getComputedStyle(el).backgroundColor))
  await page.locator('.fade-bg-image').evaluate(el => (el as HTMLImageElement).decode())
  const withFade = await page.screenshot()
  const removeFade = await page.addStyleTag({ content: '.mobile-scroll-fade { display: none !important; }' })
  const withoutFade = await page.screenshot()
  const hideContent = await page.addStyleTag({ content: '.navigation-grid { visibility: hidden !important; }' })
  const wallpaperOnly = await page.screenshot()
  const differences = await page.evaluate(async images => {
    const pixels = await Promise.all(images.map(async base64 => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
      return ctx.getImageData(0, 0, image.width, image.height)
    }))
    const [faded, original, background] = pixels
    const differenceAt = (a: ImageData, b: ImageData, x: number, y: number) => {
      const offset = (y * a.width + x) * 4
      return [0, 1, 2].reduce((sum, channel) => sum + Math.abs(a.data[offset + channel]! - b.data[offset + channel]!), 0)
    }
    let centerDifference = 0, samples = 0
    for (let y = 100; y < faded!.height - 100; y += 8) {
      for (let x = 25; x < faded!.width - 25; x += 8) {
        centerDifference += differenceAt(faded!, original!, x, y); samples++
      }
    }
    return {
      center: centerDifference / samples,
      edges: [1, faded!.height - 2].map(y => ({
        faded: differenceAt(faded!, background!, 240, y),
        original: differenceAt(original!, background!, 240, y),
      })),
    }
  }, [withFade, withoutFade, wallpaperOnly].map(image => image.toString('base64')))
  expect(differences.center).toBeLessThan(1)
  for (const edge of differences.edges) {
    expect(edge.original).toBeGreaterThan(10)
    expect(edge.faded).toBeLessThan(edge.original / 4)
  }
  await hideContent.evaluate(el => el.remove())
  await removeFade.evaluate(el => el.remove())

  await scroll.evaluate(el => { el.scrollTop = el.scrollHeight })
  await expect(fade).not.toHaveClass(/fade-bottom/)
  const last = page.locator('.bookmark-card').last()
  const box = (await last.boundingBox())!
  expect(box.y).toBeGreaterThan(24)
  expect(box.y + box.height).toBeLessThan(740)
  expect(await last.evaluate(el => {
    const bounds = el.getBoundingClientRect()
    return document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.closest('.bookmark-card') === el
  })).toBe(true)
  await page.locator('.edit-toggle').click()
  await expect(fade).toHaveCount(0)
  expect(writes).toEqual([])
  await context.close()
})

test('short mobile lists and desktop do not get scroll fades', async ({ browser, page }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 740 }, isMobile: true, hasTouch: true })
  const mobile = await context.newPage()
  await prepare(mobile, 1)
  await expect(mobile.locator('.mobile-scroll-fade')).toHaveCount(0)
  await prepare(page)
  await page.locator('.app-scroll').evaluate(el => { el.scrollTop = 200 })
  await expect(page.locator('.mobile-scroll-fade')).toHaveCount(0)
  await context.close()
})
