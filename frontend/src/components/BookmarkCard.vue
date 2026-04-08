<template>
  <a
    :href="card.url"
    :target="card.open_mode"
    class="bookmark-card"
    :class="{ 'edit-mode': editMode }"
    :style="cardDynamicStyle"
    @click.prevent="handleClick"
    @mousemove="onCardMouseMove"
    @mouseleave="onCardMouseLeave"
  >
    <!-- Glass warp layer: backdrop-filter captures background, shared SVG filter adds displacement -->
    <span class="glass-warp" :style="warpStyle" />

    <!-- Tinted background layer (separate from filter to avoid displacement artifacts) -->
    <span class="glass-tint" :style="tintStyle" />

    <!-- Card content -->
    <div class="card-inner">
      <div class="card-icon" :style="iconStyle">
        <img v-if="card.icon_type === 'favicon' || card.icon_type === 'upload'" :src="iconSrc" @error="iconError = true" />
        <span v-else class="letter-icon">{{ letterChar }}</span>
      </div>
      <div class="card-info">
        <span class="card-title">{{ card.title }}</span>
        <span class="card-url">{{ displayUrl }}</span>
      </div>
    </div>

    <button type="button" class="card-edit" @click.stop.prevent="emit('edit', card)" title="Edit">
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M8.5 2.5l3 3M1 13l3.5-.5L12 4.5a2 2 0 00-2-2L2.5 10.5 1 13z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <button type="button" class="card-delete" @click.stop.prevent="emit('delete', card.id)" title="Delete">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
  </a>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '../api'
import { useEditMode } from '../composables/useEditMode'
import { useTheme } from '../composables/useTheme'
import { usePerformance } from '../composables/usePerformance'

const props = defineProps<{ card: Card }>()
const emit = defineEmits<{ delete: [id: number]; edit: [card: Card] }>()

const { editMode } = useEditMode()
const {
  glassBlurAmount, glassSaturation,
  glassElasticity, glassCornerRadius,
  backgroundImage,
} = useTheme()
const { blurCoefficient, isLinuxChrome } = usePerformance()

const iconError = ref(false)
const isHovered = ref(false)

const letterChar = computed(() => {
  return (props.card.title || props.card.url || '?')[0].toUpperCase()
})

const iconSrc = computed(() => {
  if (iconError.value) return ''
  if (props.card.icon_type === 'upload') return `/api/uploads/${props.card.icon_value}`
  return props.card.icon_value
})

const iconStyle = computed(() => {
  if (props.card.icon_type === 'letter' || iconError.value) {
    return { background: props.card.icon_bg_color || '#6366f1' }
  }
  return {}
})

const displayUrl = computed(() => {
  try {
    const url = new URL(props.card.url)
    return url.hostname
  } catch {
    return props.card.url
  }
})

const blurPx = computed(() => 4 + glassBlurAmount.value * blurCoefficient.value)

const warpStyle = computed(() => {
  const blur = `blur(${blurPx.value}px) saturate(${glassSaturation.value}%)`
  if (isLinuxChrome.value) {
    return isHovered.value
      ? { filter: 'url(#glass-filter-shared)', backdropFilter: blur }
      : { backdropFilter: blur }
  }
  return {
    filter: 'url(#glass-filter-shared)',
    backdropFilter: blur,
  }
})

const tintStyle = computed(() => ({
  background: 'var(--card-bg-user, var(--card-bg))',
}))

const maxTilt = computed(() => 4 + glassElasticity.value * 26)
const lift = computed(() => 2 + glassElasticity.value * 18)
const transitionDuration = computed(() => 0.15 + glassElasticity.value * 0.45)
const transitionCurve = computed(() => {
  const overshoot = 0.8 + glassElasticity.value * 1.2
  return `cubic-bezier(0.2, ${overshoot.toFixed(2)}, 0.2, 1)`
})

const cardDynamicStyle = ref<Record<string, string>>({})

let rafId = 0
function onCardMouseMove(e: MouseEvent) {
  if (editMode.value) return
  isHovered.value = true
  cancelAnimationFrame(rafId)
  const clientX = e.clientX
  const clientY = e.clientY
  const el = e.currentTarget as HTMLElement
  rafId = requestAnimationFrame(() => {
    const r = el.getBoundingClientRect()
    const nx = (clientX - r.left) / r.width
    const ny = (clientY - r.top) / r.height

    const tilt = maxTilt.value
    const tiltX = (0.5 - ny) * tilt
    const tiltY = (nx - 0.5) * tilt
    const shadowX = Math.round((0.5 - nx) * 14)
    const shadowY = Math.round(8 + ny * 8)

    cardDynamicStyle.value = {
      transform: `perspective(800px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg) translateZ(${lift.value}px)`,
      'box-shadow': `${shadowX}px ${shadowY}px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.4)`,
      transition: 'none',
    }
  })
}

function onCardMouseLeave() {
  cancelAnimationFrame(rafId)
  isHovered.value = false
  cardDynamicStyle.value = {
    transition: `transform ${transitionDuration.value}s ${transitionCurve.value}, box-shadow ${transitionDuration.value}s ${transitionCurve.value}`,
  }
}

const handleClick = () => {
  if (editMode.value) return
  window.open(props.card.url, props.card.open_mode)
}
</script>

<style scoped lang="scss">
.bookmark-card {
  display: block;
  width: 100%;
  min-width: 0;
  cursor: pointer;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  border-radius: v-bind('glassCornerRadius + "px"');
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.2) inset,
    0 1px 1px rgba(255, 255, 255, 0.15) inset,
    0 8px 32px rgba(0, 0, 0, 0.12);
  transition:
    transform v-bind('transitionDuration + "s"') v-bind('transitionCurve'),
    box-shadow v-bind('transitionDuration + "s"') v-bind('transitionCurve');
  contain: layout style paint;
  content-visibility: auto;
  contain-intrinsic-size: auto 70px;

  &:hover {
    will-change: transform, box-shadow;
  }

  &.edit-mode {
    cursor: grab;
    &:active { cursor: grabbing; }
  }
}

.glass-warp {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateZ(0);
}

.glass-tint {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  position: relative;
  z-index: 1;
  padding: 14px 18px;
}

.card-icon {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    border-radius: 4px;
  }

  .letter-icon {
    font-size: 1.15rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.card-title {
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-url {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-edit,
.card-delete {
  position: absolute;
  top: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
  z-index: 10;
  pointer-events: none;

  .edit-mode & {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
}

.card-edit {
  right: 32px;
  background: rgba(0, 122, 255, 0.85);
  color: white;

  &:hover { background: rgba(0, 122, 255, 1); transform: scale(1.1); }
  .edit-mode &:hover { transform: scale(1.1); }
}

.card-delete {
  right: 6px;
  background: rgba(255, 59, 48, 0.8);
  color: white;

  &:hover { background: rgba(255, 59, 48, 1); transform: scale(1.1); }
  .edit-mode &:hover { transform: scale(1.1); }
}
</style>
