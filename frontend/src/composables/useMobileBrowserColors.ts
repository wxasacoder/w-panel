import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

// Match the CSS guard: desktop (including a narrow desktop window) is untouched.
const MOBILE_MEDIA = '(hover: none) and (pointer: coarse)'
const FALLBACK = [26, 26, 46] as const
const COLOR_PROPERTIES = [
  '--mobile-wallpaper-top', '--mobile-wallpaper-bottom', '--mobile-page-color',
] as const

function rgb(channels: readonly number[], brightness = 1) {
  return `rgb(${channels.map(value => Math.round(value * brightness)).join(', ')})`
}

export function useMobileBrowserColors(
  image: Ref<HTMLImageElement | undefined>,
  viewport: Ref<HTMLElement | undefined>,
  source: Ref<string>,
  wallpaperBlur: Ref<number>,
) {
  const mobileBrowser = ref(false)
  let media: MediaQueryList | undefined
  let frame = 0
  let disposed = false

  function apply(top: readonly number[], bottom: readonly number[]) {
    const style = document.documentElement.style
    // The two backing strips sit under the existing 8% black wallpaper overlay.
    style.setProperty('--mobile-wallpaper-top', rgb(top))
    style.setProperty('--mobile-wallpaper-bottom', rgb(bottom))
    style.setProperty('--mobile-page-color', rgb(top, 0.92))
  }

  function clear() {
    for (const property of COLOR_PROPERTIES) document.documentElement.style.removeProperty(property)
  }

  function sample() {
    frame = 0
    if (!mobileBrowser.value || disposed) return
    const img = image.value
    const area = viewport.value
    if (!img || !area || !img.complete || !img.naturalWidth) {
      apply(FALLBACK, FALLBACK)
      return
    }

    // Use the actual object-fit: cover crop and the image's existing 1.06 scale,
    // not the file's first/last rows (which may be cropped out on a phone).
    const bounds = img.getBoundingClientRect()
    const screen = area.getBoundingClientRect()
    if (!bounds.width || !bounds.height || !screen.width || !screen.height) return
    const scale = Math.max(bounds.width / img.naturalWidth, bounds.height / img.naturalHeight)
    const left = bounds.left + (bounds.width - img.naturalWidth * scale) / 2
    const top = bounds.top + (bounds.height - img.naturalHeight * scale) / 2
    const band = Math.max(8, wallpaperBlur.value * 0.6)

    // Only two tiny readbacks per image load/resize; never sample on card scrolling.
    const canvas = document.createElement('canvas')
    canvas.width = 48
    canvas.height = 4
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const edge = (y: number) => {
      const sx = Math.max(0, Math.min(img.naturalWidth - 1, (screen.left - left) / scale))
      const sy = Math.max(0, Math.min(img.naturalHeight - 1, (y - top) / scale))
      const sw = Math.min(screen.width / scale, img.naturalWidth - sx)
      const sh = Math.min(band / scale, img.naturalHeight - sy)
      ctx.fillStyle = rgb(FALLBACK)
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const sums = [0, 0, 0]
      for (let i = 0; i < pixels.length; i += 4) {
        for (let channel = 0; channel < 3; channel++) sums[channel]! += pixels[i + channel]!
      }
      return sums.map(value => value / (pixels.length / 4))
    }

    try {
      apply(edge(screen.top), edge(screen.bottom - band))
    } catch {
      // An external wallpaper may taint the canvas. Keep it visible; use an
      // opaque fallback without adding a proxy, changing its URL, or saving data.
      apply(FALLBACK, FALLBACK)
    }
  }

  function refreshBrowserColors() {
    if (!mobileBrowser.value || disposed || frame) return
    frame = requestAnimationFrame(sample)
  }

  function onMediaChange() {
    mobileBrowser.value = media!.matches
    if (mobileBrowser.value) {
      apply(FALLBACK, FALLBACK)
      refreshBrowserColors()
    } else {
      cancelAnimationFrame(frame)
      frame = 0
      clear()
    }
  }

  watch(source, () => {
    if (mobileBrowser.value) apply(FALLBACK, FALLBACK)
    refreshBrowserColors()
  }, { flush: 'post' })
  watch(wallpaperBlur, refreshBrowserColors)

  onMounted(() => {
    media = matchMedia(MOBILE_MEDIA)
    media.addEventListener('change', onMediaChange)
    window.addEventListener('resize', refreshBrowserColors)
    window.visualViewport?.addEventListener('resize', refreshBrowserColors)
    onMediaChange()
  })

  onUnmounted(() => {
    disposed = true
    cancelAnimationFrame(frame)
    media?.removeEventListener('change', onMediaChange)
    window.removeEventListener('resize', refreshBrowserColors)
    window.visualViewport?.removeEventListener('resize', refreshBrowserColors)
    clear()
  })

  return { mobileBrowser, refreshBrowserColors }
}
