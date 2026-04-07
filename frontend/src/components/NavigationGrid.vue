<template>
  <div class="navigation-grid">
    <VueDraggable
      v-model="groupList"
      :disabled="!editMode"
      handle=".group-title"
      ghost-class="group-ghost"
      @end="onGroupDragEnd"
    >
      <CardGroup
        v-for="group in groupList"
        :key="group.id"
        :group="group"
        @add-card="$emit('addCard', $event)"
        @delete-group="$emit('deleteGroup', $event)"
        @delete-card="$emit('deleteCard', $event)"
        @edit-card="$emit('editCard', $event)"
        @updated="$emit('updated')"
      />
    </VueDraggable>

    <div v-if="editMode" class="add-group-area" @click="$emit('addGroup')">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span>Add Group</span>
    </div>

    <div v-if="groups.length === 0 && !editMode" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" stroke-width="2"/><path d="M6 18h36" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/><circle cx="18" cy="14" r="1.5" fill="currentColor"/><circle cx="24" cy="14" r="1.5" fill="currentColor"/></svg>
      </div>
      <p>Click the edit button in the bottom-right corner to start adding bookmarks</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { Group, Card } from '../api'
import { reorderGroups } from '../api'
import { useEditMode } from '../composables/useEditMode'
import CardGroup from './CardGroup.vue'

const props = defineProps<{ groups: Group[] }>()
const emit = defineEmits<{
  addGroup: []
  addCard: [groupId: number]
  deleteGroup: [groupId: number]
  deleteCard: [cardId: number]
  editCard: [card: Card]
  updated: []
}>()

const { editMode } = useEditMode()

const groupList = computed({
  get: () => props.groups,
  set: (val) => {
    // Parent manages the list
    (props.groups as any).splice(0, props.groups.length, ...val)
  }
})

const onGroupDragEnd = async () => {
  const ids = groupList.value.map(g => g.id)
  try {
    await reorderGroups(ids)
    emit('updated')
  } catch (e) {
    console.error('Failed to reorder groups:', e)
  }
}
</script>

<style scoped lang="scss">
.navigation-grid {
  position: relative;
  z-index: 1;
  padding: 40px 48px 100px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 24px 20px 100px;
  }
}

.add-group-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  margin-top: 8px;
  background: rgba(30, 30, 50, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  &:hover {
    background: rgba(40, 40, 65, 0.85);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    color: white;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  }

  span {
    font-size: 0.9rem;
    font-weight: 500;
  }
}

.group-ghost {
  opacity: 0.3;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.4;
  }

  p {
    font-size: 0.95rem;
    max-width: 300px;
    line-height: 1.5;
  }
}
</style>
