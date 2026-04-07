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
      :data-group-id="group.id"
      @end="onDragEnd"
    >
      <BookmarkCard v-for="card in cards" :key="card.id" :card="card" :data-card-id="card.id" @delete="$emit('deleteCard', $event)" @edit="$emit('editCard', $event)" />
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

const onDragEnd = async (evt: any) => {
  try {
    const sourceIds = cards.value.map(c => c.id)

    if (evt.from !== evt.to) {
      // Cross-group move: update both source and destination groups
      const destGroupId = Number(evt.to.dataset.groupId)
      const destCardEls = evt.to.querySelectorAll('[data-card-id]')
      const destCardIds = Array.from(destCardEls).map((el: any) => Number(el.dataset.cardId))

      await Promise.all([
        reorderCards(props.group.id, sourceIds),
        reorderCards(destGroupId, destCardIds)
      ])
    } else {
      // Same-group reorder
      await reorderCards(props.group.id, sourceIds)
    }

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
  gap: 10px;
  margin-bottom: 14px;
  padding: 0 4px;
}

.group-title {
  font: var(--group-title-font);
  color: var(--group-title-color);
  letter-spacing: -0.01em;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7), 0 0 8px rgba(0, 0, 0, 0.4);
}

.group-actions {
  display: flex;
  gap: 6px;
}

.group-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(30, 30, 50, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  &:hover {
    background: rgba(40, 40, 65, 0.85);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    color: white;
  }

  &.delete-btn:hover {
    background: rgba(255, 59, 48, 0.3);
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
