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
          <label>Background Image</label>
          <div class="bg-controls">
            <button class="btn btn-secondary" @click="bgFileInput?.click()">Upload Image</button>
            <button v-if="backgroundImage" class="btn btn-danger" @click="clearBg">Clear</button>
            <input ref="bgFileInput" type="file" accept="image/*" @change="onBgSelect" hidden />
          </div>
          <div v-if="backgroundImage" class="bg-preview">
            <img :src="backgroundImage" />
          </div>
        </div>

        <div class="form-group">
          <label>Card Opacity: {{ Math.round(cardOpacity * 100) }}%</label>
          <input type="range" min="0.1" max="1" step="0.05" :value="cardOpacity" @input="onOpacityChange" class="slider" />
        </div>

        <div class="form-group">
          <label>Glass Blur: {{ blurLevel }}px</label>
          <input type="range" min="0" max="60" step="2" :value="blurLevel" @input="onBlurChange" class="slider" />
        </div>

        <div class="form-group">
          <label>Weather Effect</label>
          <GlassSelect :model-value="weatherEffect" :options="weatherOptions" @update:model-value="setWeatherEffect" />
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getThemes, uploadFile, type ThemeInfo } from '../api'
import { useTheme } from '../composables/useTheme'
import GlassSelect from './GlassSelect.vue'

const weatherOptions = [
  { value: 'none', label: 'None' },
  { value: 'rain', label: 'Rain' },
]

defineEmits<{ close: [] }>()

const {
  currentTheme, cardOpacity, blurLevel, backgroundImage, weatherEffect,
  setTheme, setCardOpacity, setBlurLevel, setBackgroundImage, setWeatherEffect
} = useTheme()

const themes = ref<ThemeInfo[]>([])
const bgFileInput = ref<HTMLInputElement>()

onMounted(async () => {
  try {
    themes.value = await getThemes()
  } catch (e) {
    console.error('Failed to load themes:', e)
  }
})

let opacityTimeout: ReturnType<typeof setTimeout>
const onOpacityChange = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  cardOpacity.value = val
  document.documentElement.style.setProperty('--user-card-opacity', String(val))
  clearTimeout(opacityTimeout)
  opacityTimeout = setTimeout(() => setCardOpacity(val), 300)
}

let blurTimeout: ReturnType<typeof setTimeout>
const onBlurChange = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value)
  blurLevel.value = val
  document.documentElement.style.setProperty('--user-blur-level', `${val}px`)
  clearTimeout(blurTimeout)
  blurTimeout = setTimeout(() => setBlurLevel(val), 300)
}

const onBgSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const res = await uploadFile(file)
    setBackgroundImage(res.url)
  } catch (err) {
    console.error('Background upload failed:', err)
  }
}

const clearBg = () => {
  setBackgroundImage('')
}
</script>

<style scoped lang="scss">
.settings-panel {
  min-width: 440px;
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

.bg-preview {
  margin-top: 8px;

  img {
    width: 100%;
    max-height: 120px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
  }
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
</style>
