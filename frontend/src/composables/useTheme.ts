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
  [key: string]: string
}

const currentTheme = ref('liquid-glass')
const cardOpacity = ref(0.8)
const blurLevel = ref(20)
const backgroundImage = ref('')
const weatherEffect = ref('none')
const settingsLoaded = ref(false)

const liquidGlassVars: ThemeVars = {
  '--card-bg': 'rgba(255, 255, 255, 0.12)',
  '--card-border': '1px solid rgba(255, 255, 255, 0.25)',
  '--card-shadow': '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
  '--card-radius': '20px',
  '--card-backdrop-blur': '40px',
  '--card-hover-transform': 'translateY(-2px) scale(1.02)',
  '--card-hover-shadow': '0 12px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
  '--group-title-color': 'rgba(255, 255, 255, 0.9)',
  '--group-title-font': "600 1.1rem -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
  '--text-primary': 'rgba(255, 255, 255, 0.95)',
  '--text-secondary': 'rgba(255, 255, 255, 0.6)',
  '--bg-overlay': 'rgba(0, 0, 0, 0.15)',
  '--accent-color': '#007AFF',
  '--glass-reflection': 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)',
}

const flatVars: ThemeVars = {
  '--card-bg': 'rgba(255, 255, 255, 0.85)',
  '--card-border': '1px solid rgba(0, 0, 0, 0.08)',
  '--card-shadow': '0 2px 8px rgba(0, 0, 0, 0.06)',
  '--card-radius': '14px',
  '--card-backdrop-blur': '10px',
  '--card-hover-transform': 'translateY(-1px)',
  '--card-hover-shadow': '0 4px 16px rgba(0, 0, 0, 0.1)',
  '--group-title-color': 'rgba(30, 30, 30, 0.85)',
  '--group-title-font': "600 1.05rem -apple-system, 'Inter', 'Helvetica Neue', sans-serif",
  '--text-primary': 'rgba(30, 30, 30, 0.9)',
  '--text-secondary': 'rgba(30, 30, 30, 0.5)',
  '--bg-overlay': 'rgba(245, 245, 247, 0.6)',
  '--accent-color': '#5856D6',
  '--glass-reflection': 'none',
}

const themes: Record<string, ThemeVars> = {
  'liquid-glass': liquidGlassVars,
  'flat': flatVars,
}

function applyTheme(themeId: string) {
  const vars = themes[themeId] || liquidGlassVars
  const root = document.documentElement
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.style.setProperty('--user-card-opacity', String(cardOpacity.value))
  root.style.setProperty('--user-blur-level', `${blurLevel.value}px`)
  root.setAttribute('data-theme', themeId)
}

export function useTheme() {
  const loadSettings = async () => {
    try {
      const s = await getSettings()
      currentTheme.value = s.theme || 'liquid-glass'
      cardOpacity.value = parseFloat(s.card_opacity) || 0.8
      blurLevel.value = parseInt(s.blur_level) || 20
      backgroundImage.value = s.background_image || ''
      weatherEffect.value = s.weather_effect || 'none'
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
    document.documentElement.style.setProperty('--user-card-opacity', String(val))
    await apiUpdateSettings({ card_opacity: String(val) })
  }

  const setBlurLevel = async (val: number) => {
    blurLevel.value = val
    document.documentElement.style.setProperty('--user-blur-level', `${val}px`)
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

  watch(currentTheme, (val) => applyTheme(val))

  return {
    currentTheme,
    cardOpacity,
    blurLevel,
    backgroundImage,
    weatherEffect,
    settingsLoaded,
    loadSettings,
    setTheme,
    setCardOpacity,
    setBlurLevel,
    setBackgroundImage,
    setWeatherEffect,
  }
}
