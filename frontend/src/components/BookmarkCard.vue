<template>
  <a
    :href="card.url"
    :target="card.open_mode"
    class="bookmark-card"
    :class="{ 'edit-mode': editMode }"
    @click.prevent="handleClick"
    @mousemove="onCardMouseMove"
    @mouseleave="onCardMouseLeave"
  >
    <div class="card-reflection"></div>
    <div class="card-shine" :style="specularStyle" aria-hidden="true"></div>

    <div class="card-icon" :style="iconStyle">
      <img v-if="card.icon_type === 'favicon' || card.icon_type === 'upload'" :src="iconSrc" @error="iconError = true" />
      <span v-else class="letter-icon">{{ letterChar }}</span>
    </div>
    <div class="card-info">
      <span class="card-title">{{ card.title }}</span>
      <span class="card-url">{{ displayUrl }}</span>
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

const props = defineProps<{ card: Card }>()
const emit = defineEmits<{ delete: [id: number]; edit: [card: Card] }>()

const { editMode } = useEditMode()
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

const specularStyle = ref<Record<string, string>>({
  '--spec-x': '50%',
  '--spec-y': '50%',
})

function onCardMouseMove(e: MouseEvent) {
  if (editMode.value) return
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * 100
  const y = ((e.clientY - r.top) / r.height) * 100
  specularStyle.value = {
    '--spec-x': `${Math.max(0, Math.min(100, x))}%`,
    '--spec-y': `${Math.max(0, Math.min(100, y))}%`,
  }
}

function onCardMouseLeave() {
  specularStyle.value = { '--spec-x': '50%', '--spec-y': '50%' }
}

const handleClick = () => {
  if (editMode.value) return
  window.open(props.card.url, props.card.open_mode)
}
</script>

<style scoped lang="scss">
.bookmark-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-width: 0;
  padding: 14px 18px;
  background: var(--card-bg);
  border: var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(var(--card-backdrop-blur, 40px));
  -webkit-backdrop-filter: blur(var(--card-backdrop-blur, 40px));
  opacity: var(--user-card-opacity, 0.8);
  cursor: pointer;
  text-decoration: none;
  transition:
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:hover:not(.edit-mode) {
    transform: var(--card-hover-transform);
    box-shadow: var(--card-hover-shadow), var(--card-hover-glow, none);
  }

  &.edit-mode {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }
}

.card-reflection {
  position: absolute;
  inset: 0;
  background: var(--glass-reflection, none);
  pointer-events: none;
  border-radius: inherit;
  transition: background 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.45s ease;
}

.bookmark-card:hover:not(.edit-mode) .card-reflection {
  background: var(--glass-reflection-hover, var(--glass-reflection, none));
}

.card-shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.35s ease;
  background:
    radial-gradient(
      circle 14% at var(--spec-x, 50%) var(--spec-y, 50%),
      rgba(255, 255, 255, 0.85) 0%,
      rgba(255, 255, 255, 0.2) 45%,
      transparent 52%
    ),
    radial-gradient(
      circle 30% at var(--spec-x, 50%) var(--spec-y, 50%),
      rgba(255, 255, 255, 0.28) 0%,
      rgba(255, 255, 255, 0.06) 50%,
      transparent 62%
    );
  mix-blend-mode: overlay;
}

.bookmark-card:hover:not(.edit-mode) .card-shine {
  opacity: var(--glass-cursor-shine-opacity, 0);
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
  position: relative;
  z-index: 1;

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
  position: relative;
  z-index: 1;
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
  z-index: 2;

  .edit-mode & {
    opacity: 1;
    transform: scale(1);
  }
}

.card-edit {
  right: 32px;
  background: rgba(0, 122, 255, 0.85);
  color: white;

  &:hover {
    background: rgba(0, 122, 255, 1);
    transform: scale(1.1);
  }

  .edit-mode &:hover {
    transform: scale(1.1);
  }
}

.card-delete {
  right: 6px;
  background: rgba(255, 59, 48, 0.8);
  color: white;

  &:hover {
    background: rgba(255, 59, 48, 1);
    transform: scale(1.1);
  }

  .edit-mode &:hover {
    transform: scale(1.1);
  }
}
</style>
