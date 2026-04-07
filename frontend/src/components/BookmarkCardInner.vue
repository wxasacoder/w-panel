<template>
  <div class="bookmark-card-inner">
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
  </div>
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
</script>

<style scoped lang="scss">
.bookmark-card-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-width: 0;
  position: relative;
  z-index: 1;
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
}

:global(.bookmark-card.edit-mode) .card-edit,
:global(.bookmark-card.edit-mode) .card-delete {
  opacity: 1;
  transform: scale(1);
}

.card-edit {
  right: 32px;
  background: rgba(0, 122, 255, 0.85);
  color: white;

  &:hover {
    background: rgba(0, 122, 255, 1);
    transform: scale(1.1);
  }

  :global(.bookmark-card.edit-mode) &:hover {
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

  :global(.bookmark-card.edit-mode) &:hover {
    transform: scale(1.1);
  }
}
</style>
