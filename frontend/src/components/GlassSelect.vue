<template>
  <div class="glass-select" ref="rootRef">
    <button
      ref="triggerRef"
      type="button"
      class="glass-select-trigger"
      :class="{ open: panelOpen, disabled }"
      :disabled="disabled"
      :aria-expanded="panelOpen"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="glass-select-label">{{ displayLabel }}</span>
      <svg class="glass-select-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path fill="currentColor" d="M6 8L1 3h10z" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="panelOpen"
        ref="panelRef"
        class="glass-select-panel"
        :style="panelStyle"
        role="listbox"
        :id="listboxId"
        tabindex="-1"
        @keydown.stop="onPanelKeydown"
      >
        <button
          v-for="(opt, i) in options"
          :key="opt.value"
          type="button"
          role="option"
          class="glass-select-option"
          :class="{ active: opt.value === modelValue, highlighted: i === highlightIndex }"
          :aria-selected="opt.value === modelValue"
          @click="selectOption(opt.value)"
          @mouseenter="highlightIndex = i"
        >
          {{ opt.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

export interface GlassSelectOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: GlassSelectOption[]
    placeholder?: string
    disabled?: boolean
  }>(),
  { placeholder: 'Select…', disabled: false }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelOpen = ref(false)
const panelStyle = ref<Record<string, string>>({})
const highlightIndex = ref(0)
const listboxId = `glass-select-${Math.random().toString(36).slice(2, 9)}`

const displayLabel = computed(() => {
  const o = props.options.find((x) => x.value === props.modelValue)
  return o?.label ?? props.placeholder
})

function positionPanel() {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom
  const estimatedH = props.options.length * 44 + 12
  const openUp = spaceBelow < estimatedH && r.top > spaceBelow
  panelStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${Math.max(r.width, 160)}px`,
    zIndex: '2500',
    ...(openUp
      ? { bottom: `${window.innerHeight - r.top + 4}px` }
      : { top: `${r.bottom + 4}px` }),
  }
}

function syncHighlight() {
  const i = props.options.findIndex((o) => o.value === props.modelValue)
  highlightIndex.value = i >= 0 ? i : 0
}

function openPanel() {
  if (props.disabled) return
  panelOpen.value = true
  syncHighlight()
  nextTick(() => {
    positionPanel()
    panelRef.value?.focus({ preventScroll: true })
  })
}

function closePanel() {
  panelOpen.value = false
}

function toggle() {
  if (panelOpen.value) closePanel()
  else openPanel()
}

function selectOption(value: string) {
  emit('update:modelValue', value)
  closePanel()
  triggerRef.value?.focus()
}

function onDocumentPointerDown(e: MouseEvent) {
  if (!panelOpen.value) return
  const t = e.target as Node
  if (rootRef.value?.contains(t) || panelRef.value?.contains(t)) return
  closePanel()
}

function onDocumentEscape(e: KeyboardEvent) {
  if (!panelOpen.value || e.key !== 'Escape') return
  e.preventDefault()
  e.stopPropagation()
  closePanel()
  triggerRef.value?.focus()
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!panelOpen.value) openPanel()
    else if (e.key === 'ArrowDown') moveHighlight(1)
    else moveHighlight(-1)
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle()
  }
}

function onPanelKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    closePanel()
    triggerRef.value?.focus()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    moveHighlight(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    moveHighlight(-1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = props.options[highlightIndex.value]
    if (opt) selectOption(opt.value)
  }
}

function moveHighlight(delta: number) {
  const n = props.options.length
  if (n === 0) return
  highlightIndex.value = (highlightIndex.value + delta + n) % n
}

function onWinResizeOrScroll() {
  if (panelOpen.value) positionPanel()
}

watch(panelOpen, (open) => {
  if (open) {
    document.addEventListener('mousedown', onDocumentPointerDown, true)
    document.addEventListener('keydown', onDocumentEscape, true)
    window.addEventListener('resize', onWinResizeOrScroll)
    window.addEventListener('scroll', onWinResizeOrScroll, true)
  } else {
    document.removeEventListener('mousedown', onDocumentPointerDown, true)
    document.removeEventListener('keydown', onDocumentEscape, true)
    window.removeEventListener('resize', onWinResizeOrScroll)
    window.removeEventListener('scroll', onWinResizeOrScroll, true)
  }
})

watch(
  () => props.modelValue,
  () => syncHighlight()
)

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentEscape, true)
  window.removeEventListener('resize', onWinResizeOrScroll)
  window.removeEventListener('scroll', onWinResizeOrScroll, true)
})
</script>

<style scoped lang="scss">
.glass-select {
  position: relative;
  width: 100%;
}

.glass-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover:not(.disabled):not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.18);
  }

  &:focus-visible {
    border-color: var(--accent-color, #007aff);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
  }

  &.open {
    border-color: var(--accent-color, #007aff);
    background: rgba(255, 255, 255, 0.12);
  }

  &:disabled,
  &.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.glass-select-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.glass-select-chevron {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.45);
  transition: transform 0.2s ease;
}

.glass-select-trigger.open .glass-select-chevron {
  transform: rotate(180deg);
}

.glass-select-panel {
  padding: 6px;
  background: rgba(36, 36, 52, 0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  outline: none;
}

.glass-select-option {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.92rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover,
  &.highlighted {
    background: rgba(255, 255, 255, 0.08);
  }

  &.active {
    background: rgba(0, 122, 255, 0.22);
    color: white;
  }
}
</style>
