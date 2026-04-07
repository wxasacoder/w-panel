<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-content settings-panel">
        <h3 class="modal-title">Settings</h3>

        <div class="form-group">
          <label>Theme</label>
          <div class="theme-cards">
            <div
              v-for="theme in themes"
              :key="theme.id"
              class="theme-card"
              :class="{ active: currentTheme === theme.id }"
              @click="setTheme(theme.id)"
            >
              <div class="theme-preview" :class="theme.id"></div>
              <span>{{ theme.name }}</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Wallpaper</label>
          <div class="bg-controls">
            <button class="btn btn-secondary" @click="bgFileInput?.click()">Upload Image</button>
            <button v-if="backgroundImage" class="btn btn-danger" @click="clearBg">Clear</button>
            <input ref="bgFileInput" type="file" accept="image/*" @change="onBgSelect" hidden />
          </div>
          <div v-if="wallpapers.length" class="wallpaper-gallery">
            <div
              v-for="wp in wallpapers"
              :key="wp.id"
              class="wallpaper-thumb"
              :class="{ active: backgroundImage === wp.url }"
              @click="selectWallpaper(wp)"
            >
              <img :src="wp.url" />
              <button class="wallpaper-delete" @click.stop="removeWallpaper(wp)" title="Delete">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div v-if="backgroundImage" class="form-group">
          <label>Wallpaper Blur: {{ wallpaperBlur }}%</label>
          <input type="range" min="0" max="100" step="1" :value="wallpaperBlur" @input="onWallpaperBlurChange" class="slider" />
        </div>

        <div class="form-group">
          <label>Card Opacity: {{ cardOpacity }}%</label>
          <input type="range" min="5" max="100" step="5" :value="cardOpacity" @input="onOpacityChange" class="slider" />
        </div>

        <div class="form-group">
          <label>Card Color</label>
          <div class="text-color-row">
            <input type="color" :value="cardColorHex" @input="onCardColorChange" class="color-picker" />
            <span class="color-value">{{ cardColor || 'Theme default' }}</span>
            <button v-if="cardColor" class="btn btn-small btn-secondary" @click="resetCardSettings">Reset</button>
          </div>
        </div>

        <div class="form-group">
          <label>Glass Blur: {{ blurLevel }}px</label>
          <input type="range" min="0" max="200" step="2" :value="blurLevel" @input="onBlurChange" class="slider" />
        </div>

        <div class="form-group glass-section">
          <label class="section-label">Glass Effect</label>
          <div class="glass-param">
            <label>Displacement: {{ glassDisplacementScale }}</label>
            <input type="range" min="0" max="200" step="5" :value="glassDisplacementScale" @input="onGlassParam('displacementScale', $event)" class="slider" />
          </div>
          <div class="glass-param">
            <label>Blur Amount: {{ glassBlurAmount.toFixed(2) }}</label>
            <input type="range" min="0" max="2" step="0.05" :value="glassBlurAmount" @input="onGlassParam('blurAmount', $event)" class="slider" />
          </div>
          <div class="glass-param">
            <label>Saturation: {{ glassSaturation }}%</label>
            <input type="range" min="100" max="300" step="10" :value="glassSaturation" @input="onGlassParam('saturation', $event)" class="slider" />
          </div>
          <div class="glass-param">
            <label>Chromatic Aberration: {{ glassAberration }}</label>
            <input type="range" min="0" max="10" step="0.5" :value="glassAberration" @input="onGlassParam('aberration', $event)" class="slider" />
          </div>
          <div class="glass-param">
            <label>Elasticity: {{ glassElasticity.toFixed(2) }}</label>
            <input type="range" min="0" max="1" step="0.05" :value="glassElasticity" @input="onGlassParam('elasticity', $event)" class="slider" />
          </div>
          <div class="glass-param">
            <label>Corner Radius: {{ glassCornerRadius }}px</label>
            <input type="range" min="0" max="40" step="2" :value="glassCornerRadius" @input="onGlassParam('cornerRadius', $event)" class="slider" />
          </div>
        </div>

        <div class="form-group">
          <label>Weather Effect</label>
          <GlassSelect :model-value="weatherEffect" :options="weatherOptions" @update:model-value="setWeatherEffect" />
        </div>

        <div v-if="weatherEffect === 'rain'" class="form-group">
          <label>Rain Intensity: {{ rainIntensity.toFixed(1) }}x</label>
          <input type="range" min="0.5" max="3" step="0.1" :value="rainIntensity" @input="onRainIntensityChange" class="slider" />
        </div>

        <div class="form-group">
          <label>Text Color</label>
          <div class="text-color-row">
            <input type="color" :value="textColorHex" @input="onTextColorChange" class="color-picker" />
            <span class="color-value">{{ textColor || 'Theme default' }}</span>
            <button v-if="textColor" class="btn btn-small btn-secondary" @click="resetTextSettings">Reset</button>
          </div>
        </div>

        <div class="form-group">
          <label>Text Opacity: {{ textOpacityDisplay }}%</label>
          <input type="range" min="10" max="100" step="5" :value="textOpacityDisplay" @input="onTextOpacityChange" class="slider" />
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getThemes, uploadFile, getWallpapers, addWallpaper, deleteWallpaper, type ThemeInfo, type WallpaperItem } from '../api'
import { useTheme } from '../composables/useTheme'
import GlassSelect from './GlassSelect.vue'

const weatherOptions = [
  { value: 'none', label: 'None' },
  { value: 'rain', label: 'Rain' },
]

const emit = defineEmits<{ close: [] }>()

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

const {
  currentTheme, cardOpacity, blurLevel, backgroundImage, weatherEffect, rainIntensity, wallpaperBlur, textColor, textOpacity, cardColor,
  glassDisplacementScale, glassBlurAmount, glassSaturation, glassAberration, glassElasticity, glassCornerRadius,
  setTheme, setCardOpacity, setCardColor, resetCardSettings, setBlurLevel, setBackgroundImage, setWeatherEffect, setRainIntensity, setWallpaperBlur, setTextColor, setTextOpacity, resetTextSettings, setGlassParam,
} = useTheme()

const themes = ref<ThemeInfo[]>([])
const wallpapers = ref<WallpaperItem[]>([])
const bgFileInput = ref<HTMLInputElement>()

const textColorHex = computed(() => textColor.value || '#ffffff')
const textOpacityDisplay = computed(() => textOpacity.value ? Math.round(parseFloat(textOpacity.value)) : 95)
const cardColorHex = computed(() => cardColor.value || '#ffffff')

const loadWallpapers = async () => {
  try {
    wallpapers.value = await getWallpapers()
  } catch (e) {
    console.error('Failed to load wallpapers:', e)
  }
}

onMounted(async () => {
  try {
    themes.value = await getThemes()
  } catch (e) {
    console.error('Failed to load themes:', e)
  }
  await loadWallpapers()
})

let opacityTimeout: ReturnType<typeof setTimeout>
const onOpacityChange = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value)
  cardOpacity.value = val
  clearTimeout(opacityTimeout)
  opacityTimeout = setTimeout(() => setCardOpacity(val), 300)
}

let cardColorTimeout: ReturnType<typeof setTimeout>
const onCardColorChange = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  cardColor.value = val
  clearTimeout(cardColorTimeout)
  cardColorTimeout = setTimeout(() => setCardColor(val), 200)
}

let blurTimeout: ReturnType<typeof setTimeout>
const onBlurChange = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value)
  blurLevel.value = val
  document.documentElement.style.setProperty('--card-backdrop-blur', `${val}px`)
  clearTimeout(blurTimeout)
  blurTimeout = setTimeout(() => setBlurLevel(val), 300)
}

const glassTimeouts: Record<string, ReturnType<typeof setTimeout>> = {}
const onGlassParam = (param: string, e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  const refMap: Record<string, any> = {
    displacementScale: glassDisplacementScale,
    blurAmount: glassBlurAmount,
    saturation: glassSaturation,
    aberration: glassAberration,
    elasticity: glassElasticity,
    cornerRadius: glassCornerRadius,
  }
  if (refMap[param]) refMap[param].value = val
  clearTimeout(glassTimeouts[param])
  glassTimeouts[param] = setTimeout(() => setGlassParam(param, val), 300)
}

let textColorTimeout: ReturnType<typeof setTimeout>
const onTextColorChange = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  textColor.value = val
  clearTimeout(textColorTimeout)
  textColorTimeout = setTimeout(() => setTextColor(val), 200)
}

let textOpacityTimeout: ReturnType<typeof setTimeout>
const onTextOpacityChange = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  textOpacity.value = val
  clearTimeout(textOpacityTimeout)
  textOpacityTimeout = setTimeout(() => setTextOpacity(val), 300)
}

let wallpaperBlurTimeout: ReturnType<typeof setTimeout>
const onWallpaperBlurChange = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value)
  wallpaperBlur.value = val
  document.documentElement.style.setProperty('--wallpaper-blur-px', `${Math.round(val * 0.6)}px`)
  clearTimeout(wallpaperBlurTimeout)
  wallpaperBlurTimeout = setTimeout(() => setWallpaperBlur(val), 300)
}

let rainTimeout: ReturnType<typeof setTimeout>
const onRainIntensityChange = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  rainIntensity.value = val
  clearTimeout(rainTimeout)
  rainTimeout = setTimeout(() => setRainIntensity(val), 300)
}

const onBgSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const res = await uploadFile(file)
    await addWallpaper(res.id)
    setBackgroundImage(res.url)
    await loadWallpapers()
  } catch (err) {
    console.error('Background upload failed:', err)
  }
}

const selectWallpaper = (wp: WallpaperItem) => {
  setBackgroundImage(wp.url)
}

const removeWallpaper = async (wp: WallpaperItem) => {
  try {
    const res = await deleteWallpaper(wp.id)
    if (res.cleared_background) {
      backgroundImage.value = ''
    }
    await loadWallpapers()
  } catch (err) {
    console.error('Failed to delete wallpaper:', err)
  }
}

const clearBg = () => {
  setBackgroundImage('')
}
</script>

<style scoped lang="scss">
.settings-panel {
  width: 520px;
  max-width: 90vw;
}

.theme-cards {
  display: flex;
  gap: 10px;
}

.theme-card {
  flex: 1;
  padding: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;

  &.active {
    border-color: var(--accent-color, #007AFF);
    background: rgba(0, 122, 255, 0.08);
  }

  &:hover:not(.active) {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.06);
  }

  span {
    display: block;
    margin-top: 8px;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.7);
  }
}

.theme-preview {
  height: 48px;
  border-radius: 8px;

  &.liquid-glass {
    background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
    border: 1px solid rgba(255,255,255,0.2);
    backdrop-filter: blur(10px);
  }

  &.flat {
    background: rgba(255,255,255,0.8);
    border: 1px solid rgba(0,0,0,0.08);
  }
}

.bg-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.wallpaper-gallery {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
  max-height: 136px;
  overflow-y: auto;
  padding-right: 2px;

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }
}

.wallpaper-thumb {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  width: 100px;
  height: 62px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &.active {
    border-color: var(--accent-color, #007AFF);
    box-shadow: 0 0 12px rgba(0, 122, 255, 0.3);
  }

  &:hover:not(.active) {
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:hover .wallpaper-delete {
    opacity: 1;
  }
}

.wallpaper-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 59, 48, 0.8);
    color: white;
  }
}

.text-color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-picker {
  width: 36px;
  height: 36px;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  &::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }
}

.color-value {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.5);
  flex: 1;
}

.btn-small {
  padding: 4px 10px;
  font-size: 0.75rem;
}

.slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-color, #007AFF);
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.3);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-color, #007AFF);
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.3);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
}

.glass-section {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.04);

  .section-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 10px;
    display: block;
  }
}

.glass-param {
  margin-bottom: 10px;
  &:last-child { margin-bottom: 0; }

  label {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 4px;
    display: block;
  }
}
</style>
