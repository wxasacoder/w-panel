import { ref, watch } from 'vue'
import { getSettings, updateSettings as apiUpdateSettings } from '../api'

export interface ThemeVars {
  '--card-bg': string
  '--card-border': string
  '--card-shadow': string
  '--card-radius': string
  '--card-backdrop-blur': string
  '--card-hover-transform': string
  '--card-hover-shadow': string
  '--group-title-color': string
  '--group-title-font': string
  '--text-primary': string
  '--text-secondary': string
  '--bg-overlay': string
  '--accent-color': string
  '--glass-reflection': string
  '--glass-reflection-hover': string
  '--card-hover-glow': string
  /** 随鼠标移动的高光层不透明度，flat 主题为 0 */
  '--glass-cursor-shine-opacity': string
  [key: string]: string
}

const currentTheme = ref('liquid-glass')
const cardOpacity = ref(15)
const blurLevel = ref(40)
const backgroundImage = ref('')
const weatherEffect = ref('none')
const rainIntensity = ref(1.0)
const wallpaperBlur = ref(15)
const textColor = ref('')
const textOpacity = ref('')
const cardColor = ref('')
const glassDisplacementScale = ref(70)
const glassBlurAmount = ref(0.5)
const glassSaturation = ref(140)
const glassAberration = ref(2)
const glassElasticity = ref(0.15)
const glassCornerRadius = ref(20)
const settingsLoaded = ref(false)

const liquidGlassVars: ThemeVars = {
  '--card-bg': 'rgba(255, 255, 255, 0.08)',
  '--card-border': '1px solid rgba(255, 255, 255, 0.22)',
  '--card-shadow': '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
  '--card-radius': '20px',
  '--card-backdrop-blur': '40px',
  '--card-hover-transform': 'translateY(-2px) scale(1.02)',
  '--card-hover-shadow': '0 12px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
  '--card-hover-glow': '0 0 28px rgba(255, 255, 255, 0.14)',
  '--group-title-color': 'rgba(255, 255, 255, 0.9)',
  '--group-title-font': "600 1.1rem -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
  '--text-primary': 'rgba(255, 255, 255, 0.95)',
  '--text-secondary': 'rgba(255, 255, 255, 0.6)',
  '--bg-overlay': 'rgba(0, 0, 0, 0.15)',
  '--accent-color': '#007AFF',
  '--glass-reflection': 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)',
  '--glass-reflection-hover':
    'linear-gradient(125deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.06) 100%)',
  '--glass-cursor-shine-opacity': '0.92',
}

const flatVars: ThemeVars = {
  '--card-bg': 'rgba(255, 255, 255, 0.85)',
  '--card-border': '1px solid rgba(0, 0, 0, 0.08)',
  '--card-shadow': '0 2px 8px rgba(0, 0, 0, 0.06)',
  '--card-radius': '14px',
  '--card-backdrop-blur': '10px',
  '--card-hover-transform': 'translateY(-1px)',
  '--card-hover-shadow': '0 4px 16px rgba(0, 0, 0, 0.1)',
  '--card-hover-glow': 'none',
  '--group-title-color': 'rgba(30, 30, 30, 0.85)',
  '--group-title-font': "600 1.05rem -apple-system, 'Inter', 'Helvetica Neue', sans-serif",
  '--text-primary': 'rgba(30, 30, 30, 0.9)',
  '--text-secondary': 'rgba(30, 30, 30, 0.5)',
  '--bg-overlay': 'rgba(245, 245, 247, 0.6)',
  '--accent-color': '#5856D6',
  '--glass-reflection': 'none',
  '--glass-reflection-hover': 'none',
  '--glass-cursor-shine-opacity': '0',
}

const themes: Record<string, ThemeVars> = {
  'liquid-glass': liquidGlassVars,
  'flat': flatVars,
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null
}

function parseRgba(val: string): { r: number; g: number; b: number } | null {
  const m = val.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/)
  return m ? { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) } : null
}

function applyTextColor() {
  const root = document.documentElement
  const themeVars = themes[currentTheme.value] || liquidGlassVars

  if (textColor.value) {
    const rgb = hexToRgb(textColor.value)
    if (!rgb) return
    const alpha = textOpacity.value ? parseFloat(textOpacity.value) / 100 : 0.95
    const alphaSecondary = Math.max(0, alpha - 0.35)
    root.style.setProperty('--text-primary', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`)
    root.style.setProperty('--text-secondary', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaSecondary})`)
    root.style.setProperty('--group-title-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, alpha + 0.05)})`)
  } else if (textOpacity.value) {
    const alpha = parseFloat(textOpacity.value) / 100
    const alphaSecondary = Math.max(0, alpha - 0.35)
    const primaryRgb = parseRgba(themeVars['--text-primary'])
    const titleRgb = parseRgba(themeVars['--group-title-color'])
    if (primaryRgb) {
      root.style.setProperty('--text-primary', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${alpha})`)
      root.style.setProperty('--text-secondary', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${alphaSecondary})`)
    }
    if (titleRgb) {
      root.style.setProperty('--group-title-color', `rgba(${titleRgb.r}, ${titleRgb.g}, ${titleRgb.b}, ${Math.min(1, alpha + 0.05)})`)
    }
  }
}

function applyCardBg() {
  const root = document.documentElement
  const alpha = Math.min(1, cardOpacity.value / 100)
  let r: number, g: number, b: number
  if (cardColor.value) {
    const rgb = hexToRgb(cardColor.value)
    if (!rgb) return
    r = rgb.r; g = rgb.g; b = rgb.b
  } else {
    const themeVars = themes[currentTheme.value] || liquidGlassVars
    const parsed = parseRgba(themeVars['--card-bg'])
    if (!parsed) return
    r = parsed.r; g = parsed.g; b = parsed.b
  }
  root.style.setProperty('--card-bg-user', `rgba(${r}, ${g}, ${b}, ${alpha})`)
}

function applyWallpaperBlur(val: number) {
  const root = document.documentElement
  const blurPx = Math.round(val * 0.6)
  root.style.setProperty('--wallpaper-blur-px', `${blurPx}px`)
}

function applyTheme(themeId: string) {
  const vars = themes[themeId] || liquidGlassVars
  const root = document.documentElement
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  applyCardBg()
  root.style.setProperty('--card-backdrop-blur', `${blurLevel.value}px`)
  applyWallpaperBlur(wallpaperBlur.value)
  applyTextColor()
  root.setAttribute('data-theme', themeId)
}

export function useTheme() {
  const loadSettings = async () => {
    try {
      const s = await getSettings()
      currentTheme.value = s.theme || 'liquid-glass'
      const rawOp = parseFloat(s.card_opacity)
      if (!isNaN(rawOp)) {
        cardOpacity.value = rawOp <= 1 ? Math.round(rawOp * 100) : Math.round(rawOp)
      }
      const rawBlur = parseInt(s.blur_level)
      if (!isNaN(rawBlur)) blurLevel.value = rawBlur
      backgroundImage.value = s.background_image || ''
      weatherEffect.value = s.weather_effect || 'none'
      const rawRain = parseFloat(s.rain_intensity)
      if (!isNaN(rawRain)) rainIntensity.value = rawRain
      const rawWpBlur = parseInt(s.wallpaper_blur)
      if (!isNaN(rawWpBlur)) wallpaperBlur.value = rawWpBlur
      textColor.value = s.text_color || ''
      textOpacity.value = s.text_opacity || ''
      cardColor.value = s.card_color || ''
      const rawGDS = parseFloat(s.glass_displacement_scale)
      if (!isNaN(rawGDS)) glassDisplacementScale.value = rawGDS
      const rawGBA = parseFloat(s.glass_blur_amount)
      if (!isNaN(rawGBA)) glassBlurAmount.value = rawGBA
      const rawGSat = parseFloat(s.glass_saturation)
      if (!isNaN(rawGSat)) glassSaturation.value = rawGSat
      const rawGAb = parseFloat(s.glass_aberration)
      if (!isNaN(rawGAb)) glassAberration.value = rawGAb
      const rawGEl = parseFloat(s.glass_elasticity)
      if (!isNaN(rawGEl)) glassElasticity.value = rawGEl
      const rawGCR = parseFloat(s.glass_corner_radius)
      if (!isNaN(rawGCR)) glassCornerRadius.value = rawGCR
      applyTheme(currentTheme.value)
      settingsLoaded.value = true
    } catch (e) {
      console.error('Failed to load settings:', e)
      applyTheme('liquid-glass')
      settingsLoaded.value = true
    }
  }

  const setTheme = async (themeId: string) => {
    currentTheme.value = themeId
    applyTheme(themeId)
    await apiUpdateSettings({ theme: themeId })
  }

  const setCardOpacity = async (val: number) => {
    cardOpacity.value = val
    applyCardBg()
    await apiUpdateSettings({ card_opacity: String(val) })
  }

  const setCardColor = async (color: string) => {
    cardColor.value = color
    applyCardBg()
    await apiUpdateSettings({ card_color: color })
  }

  const resetCardSettings = async () => {
    cardColor.value = ''
    applyCardBg()
    await apiUpdateSettings({ card_color: '' })
  }

  const setBlurLevel = async (val: number) => {
    blurLevel.value = val
    document.documentElement.style.setProperty('--card-backdrop-blur', `${val}px`)
    await apiUpdateSettings({ blur_level: String(val) })
  }

  const setBackgroundImage = async (url: string) => {
    backgroundImage.value = url
    await apiUpdateSettings({ background_image: url })
  }

  const setWeatherEffect = async (effect: string) => {
    weatherEffect.value = effect
    await apiUpdateSettings({ weather_effect: effect })
  }

  const setRainIntensity = async (val: number) => {
    rainIntensity.value = val
    await apiUpdateSettings({ rain_intensity: String(val) })
  }

  const setWallpaperBlur = async (val: number) => {
    wallpaperBlur.value = val
    applyWallpaperBlur(val)
    await apiUpdateSettings({ wallpaper_blur: String(val) })
  }

  const setTextColor = async (color: string) => {
    textColor.value = color
    if (color) {
      applyTextColor()
    } else {
      applyTheme(currentTheme.value)
    }
    await apiUpdateSettings({ text_color: color })
  }

  const setTextOpacity = async (opacity: string) => {
    textOpacity.value = opacity
    if (textColor.value || opacity) {
      applyTextColor()
    } else {
      applyTheme(currentTheme.value)
    }
    await apiUpdateSettings({ text_opacity: opacity })
  }

  const resetTextSettings = async () => {
    textColor.value = ''
    textOpacity.value = ''
    applyTheme(currentTheme.value)
    await apiUpdateSettings({ text_color: '', text_opacity: '' })
  }

  const glassRefs: Record<string, { ref: typeof glassDisplacementScale; key: string }> = {
    displacementScale: { ref: glassDisplacementScale, key: 'glass_displacement_scale' },
    blurAmount: { ref: glassBlurAmount, key: 'glass_blur_amount' },
    saturation: { ref: glassSaturation, key: 'glass_saturation' },
    aberration: { ref: glassAberration, key: 'glass_aberration' },
    elasticity: { ref: glassElasticity, key: 'glass_elasticity' },
    cornerRadius: { ref: glassCornerRadius, key: 'glass_corner_radius' },
  }

  const setGlassParam = async (param: string, val: number) => {
    const entry = glassRefs[param]
    if (!entry) return
    entry.ref.value = val
    await apiUpdateSettings({ [entry.key]: String(val) })
  }

  watch(currentTheme, (val) => applyTheme(val))

  return {
    currentTheme,
    cardOpacity,
    blurLevel,
    backgroundImage,
    weatherEffect,
    rainIntensity,
    wallpaperBlur,
    textColor,
    textOpacity,
    cardColor,
    glassDisplacementScale,
    glassBlurAmount,
    glassSaturation,
    glassAberration,
    glassElasticity,
    glassCornerRadius,
    settingsLoaded,
    loadSettings,
    setTheme,
    setCardOpacity,
    setCardColor,
    resetCardSettings,
    setBlurLevel,
    setBackgroundImage,
    setWeatherEffect,
    setRainIntensity,
    setWallpaperBlur,
    setTextColor,
    setTextOpacity,
    resetTextSettings,
    setGlassParam,
  }
}
