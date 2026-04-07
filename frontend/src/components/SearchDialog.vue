<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="search-backdrop" @click.self="close">
        <div class="search-dialog">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M12.5 12.5L16 16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              placeholder="Search bookmarks..."
              class="search-input"
              @keydown.down.prevent="moveSelection(1)"
              @keydown.up.prevent="moveSelection(-1)"
              @keydown.enter.prevent="openSelected"
              @keydown.escape="close"
            />
            <kbd class="kbd-hint">ESC</kbd>
          </div>

          <div class="search-results" v-if="results.length > 0">
            <a
              v-for="(card, i) in results"
              :key="card.id"
              :href="card.url"
              :target="card.open_mode"
              class="search-result"
              :class="{ selected: i === selectedIndex }"
              @click.prevent="openCard(card)"
              @mouseenter="selectedIndex = i"
            >
              <div class="result-icon" :style="getIconStyle(card)">
                <img v-if="card.icon_type === 'favicon' || card.icon_type === 'upload'" :src="getIconSrc(card)" @error="($event.target as HTMLImageElement).style.display='none'" />
                <span v-else>{{ (card.title || '?')[0].toUpperCase() }}</span>
              </div>
              <div class="result-info">
                <span class="result-title" v-html="highlight(card.title)"></span>
                <span class="result-url" v-html="highlight(card.url)"></span>
              </div>
            </a>
          </div>

          <div class="search-empty" v-else-if="query.length > 0">
            <span>No results found</span>
          </div>

          <div class="search-footer">
            <span><kbd>&uarr;</kbd> <kbd>&darr;</kbd> Navigate</span>
            <span><kbd>Enter</kbd> Open</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { searchCards, type Card } from '../api'

const visible = ref(false)
const query = ref('')
const results = ref<Card[]>([])
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement>()
let searchTimeout: ReturnType<typeof setTimeout>

const open = () => {
  visible.value = true
  query.value = ''
  results.value = []
  selectedIndex.value = 0
  nextTick(() => inputRef.value?.focus())
}

const close = () => {
  visible.value = false
}

watch(query, (val) => {
  clearTimeout(searchTimeout)
  if (!val.trim()) {
    results.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    try {
      results.value = await searchCards(val.trim())
      selectedIndex.value = 0
    } catch (e) {
      console.error('Search failed:', e)
    }
  }, 150)
})

const moveSelection = (delta: number) => {
  if (results.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + delta + results.value.length) % results.value.length
}

const openSelected = () => {
  if (results.value.length > 0) {
    openCard(results.value[selectedIndex.value])
  }
}

const openCard = (card: Card) => {
  window.open(card.url, card.open_mode)
  close()
}

const getIconSrc = (card: Card) => {
  if (card.icon_type === 'upload') return `/api/uploads/${card.icon_value}`
  return card.icon_value
}

const getIconStyle = (card: Card) => {
  if (card.icon_type === 'letter') {
    return { background: card.icon_bg_color || '#6366f1' }
  }
  return {}
}

const highlight = (text: string) => {
  if (!query.value.trim()) return text
  const escaped = query.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

const onKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    if (visible.value) {
      close()
    } else {
      open()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ open, close })
</script>

<style scoped lang="scss">
.search-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
}

.search-dialog {
  width: 560px;
  max-width: 90vw;
  background: rgba(35, 35, 55, 0.95);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.25s ease;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.search-icon {
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.05rem;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
}

.kbd-hint {
  padding: 2px 8px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.7rem;
  font-family: inherit;
}

.search-results {
  max-height: 340px;
  overflow-y: auto;
  padding: 6px;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;

  &.selected {
    background: rgba(255, 255, 255, 0.08);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}

.result-icon {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;

  img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  span {
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
  }
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.result-title {
  font-size: 0.9rem;
  color: var(--text-primary, rgba(255,255,255,0.9));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  :deep(mark) {
    background: rgba(0, 122, 255, 0.3);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }
}

.result-url {
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(255,255,255,0.5));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  :deep(mark) {
    background: rgba(0, 122, 255, 0.2);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }
}

.search-empty {
  padding: 32px;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.9rem;
}

.search-footer {
  display: flex;
  gap: 16px;
  padding: 10px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.72rem;

  kbd {
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    font-family: inherit;
  }
}
</style>
