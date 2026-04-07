<template>
  <div class="card-group">
    <div class="group-header">
      <h3 class="group-title">{{ group.name }}</h3>
      <div v-if="editMode" class="group-actions">
        <button class="group-action-btn" @click="$emit('addCard', group.id)" title="Add card">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <button class="group-action-btn delete-btn" @click="$emit('deleteGroup', group.id)" title="Delete group">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
    <VueDraggable
      v-model="cards"
      :group="'cards'"
      :disabled="!editMode"
      class="card-grid"
      ghost-class="ghost"
      @end="onDragEnd"
    >
      <BookmarkCard v-for="card in cards" :key="card.id" :card="card" @delete="$emit('deleteCard', $event)" @edit="$emit('editCard', $event)" />
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { Group, Card } from '../api'
import { reorderCards } from '../api'
import { useEditMode } from '../composables/useEditMode'
import BookmarkCard from './BookmarkCard.vue'

const props = defineProps<{ group: Group }>()
const emit = defineEmits<{
  addCard: [groupId: number]
  deleteGroup: [groupId: number]
  deleteCard: [cardId: number]
  editCard: [card: Card]
  updated: []
}>()

const { editMode } = useEditMode()

const cards = computed({
  get: () => props.group.cards || [],
  set: (val) => {
    props.group.cards = val
  }
})

const onDragEnd = async () => {
  const ids = cards.value.map(c => c.id)
  try {
    await reorderCards(props.group.id, ids)
    emit('updated')
  } catch (e) {
    console.error('Failed to reorder cards:', e)
  }
}
</script>

<style scoped lang="scss">
.card-group {
  margin-bottom: 32px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 0 4px;
}

.group-title {
  font: var(--group-title-font);
  color: var(--group-title-color);
  letter-spacing: -0.01em;
}

.group-actions {
  display: flex;
  gap: 6px;
}

.group-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  &.delete-btn:hover {
    background: rgba(255, 59, 48, 0.2);
    color: #FF3B30;
    border-color: rgba(255, 59, 48, 0.3);
  }
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.ghost {
  opacity: 0.4;
  background: var(--accent-color) !important;
  border-radius: var(--card-radius);
}
</style>
