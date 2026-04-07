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
    <!-- SVG displacement filter (invisible, provides glass distortion) -->
    <svg class="glass-filter-svg" :aria-hidden="true">
      <defs>
        <filter :id="filterId" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
          <feImage
            x="0" y="0" width="100%" height="100%" result="DISPLACEMENT_MAP"
            :href="displacementMapUrl" preserveAspectRatio="xMidYMid slice"
          />
          <feColorMatrix
            in="DISPLACEMENT_MAP" type="matrix"
            values="0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0 0 0 1 0"
            result="EDGE_INTENSITY"
          />
          <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
            <feFuncA type="discrete" :tableValues="`0 ${glassAberration * 0.05} 1`" />
          </feComponentTransfer>
          <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />
          <feDisplacementMap
            in="SourceGraphic" in2="DISPLACEMENT_MAP" :scale="-glassDisplacementScale"
            xChannelSelector="R" yChannelSelector="B" result="RED_DISPLACED"
          />
          <feColorMatrix
            in="RED_DISPLACED" type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="RED_CHANNEL"
          />
          <feDisplacementMap
            in="SourceGraphic" in2="DISPLACEMENT_MAP"
            :scale="-glassDisplacementScale - glassAberration * 0.05 * glassDisplacementScale"
            xChannelSelector="R" yChannelSelector="B" result="GREEN_DISPLACED"
          />
          <feColorMatrix
            in="GREEN_DISPLACED" type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="GREEN_CHANNEL"
          />
          <feDisplacementMap
            in="SourceGraphic" in2="DISPLACEMENT_MAP"
            :scale="-glassDisplacementScale - glassAberration * 0.1 * glassDisplacementScale"
            xChannelSelector="R" yChannelSelector="B" result="BLUE_DISPLACED"
          />
          <feColorMatrix
            in="BLUE_DISPLACED" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="BLUE_CHANNEL"
          />
          <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
          <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />
          <feGaussianBlur
            in="RGB_COMBINED" :stdDeviation="Math.max(0.1, 0.5 - glassAberration * 0.1)"
            result="ABERRATED_BLURRED"
          />
          <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />
          <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />
          <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
        </filter>
      </defs>
    </svg>

    <!-- Glass warp layer: backdrop-filter captures background, SVG filter adds displacement -->
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

    <button v-if="editMode" type="button" class="card-edit" @click.stop.prevent="emit('edit', card)" title="Edit">
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M8.5 2.5l3 3M1 13l3.5-.5L12 4.5a2 2 0 00-2-2L2.5 10.5 1 13z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <button v-if="editMode" type="button" class="card-delete" @click.stop.prevent="emit('delete', card.id)" title="Delete">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
  </a>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '../api'
import { useEditMode } from '../composables/useEditMode'
import { useTheme } from '../composables/useTheme'
import { DISPLACEMENT_MAP_URL } from '../config/liquidGlassOptions'

const props = defineProps<{ card: Card }>()
const emit = defineEmits<{ delete: [id: number]; edit: [card: Card] }>()

const { editMode } = useEditMode()
const {
  glassDisplacementScale, glassBlurAmount, glassSaturation,
  glassAberration, glassCornerRadius,
} = useTheme()

const displacementMapUrl = DISPLACEMENT_MAP_URL

const instanceId = Math.random().toString(36).slice(2, 9)
const filterId = `glass-filter-${instanceId}`

const iconError = ref(false)

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

const warpStyle = computed(() => ({
  filter: `url(#${filterId})`,
  backdropFilter: `blur(${4 + glassBlurAmount.value * 32}px) saturate(${glassSaturation.value}%)`,
}))

const tintStyle = computed(() => ({
  background: 'var(--card-bg-user, var(--card-bg))',
}))

const MAX_TILT = 8
const LIFT = 6

const cardDynamicStyle = ref<Record<string, string>>({})

function onCardMouseMove(e: MouseEvent) {
  if (editMode.value) return
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const nx = (e.clientX - r.left) / r.width
  const ny = (e.clientY - r.top) / r.height

  const tiltX = (0.5 - ny) * MAX_TILT
  const tiltY = (nx - 0.5) * MAX_TILT
  const shadowX = Math.round((0.5 - nx) * 14)
  const shadowY = Math.round(8 + ny * 8)

  cardDynamicStyle.value = {
    transform: `perspective(800px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg) translateZ(${LIFT}px)`,
    'box-shadow': `${shadowX}px ${shadowY}px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.4)`,
  }
}

function onCardMouseLeave() {
  cardDynamicStyle.value = {}
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
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform, box-shadow;

  &.edit-mode {
    cursor: grab;
    &:active { cursor: grabbing; }
  }
}

.glass-filter-svg {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.glass-warp {
  position: absolute;
  inset: 0;
  pointer-events: none;
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

  .edit-mode & {
    opacity: 1;
    transform: scale(1);
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
