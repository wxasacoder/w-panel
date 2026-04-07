<template>
  <button class="edit-toggle" :class="{ active: editMode }" @click="toggle" :title="editMode ? 'Switch to Display Mode' : 'Switch to Edit Mode'">
    <svg v-if="!editMode" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M14.85 2.85a1.5 1.5 0 012.3 0l.5.5a1.5 1.5 0 010 2.3L7.35 15.95l-3.5.7.7-3.5L14.85 2.85z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M16.5 7.5L8.5 15.5l-5 1 1-5 8-8M4 17h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 8l7-7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
    <span class="toggle-label">{{ editMode ? 'Editing' : 'Edit' }}</span>
  </button>
</template>

<script setup lang="ts">
import { useEditMode } from '../composables/useEditMode'
const { editMode, toggle } = useEditMode()
</script>

<style scoped lang="scss">
.edit-toggle {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: rgba(30, 30, 50, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  &:hover {
    background: rgba(40, 40, 65, 0.85);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  }

  &.active {
    background: rgba(0, 122, 255, 0.25);
    border-color: rgba(0, 122, 255, 0.5);
    color: #4da3ff;

    &:hover {
      background: rgba(0, 122, 255, 0.35);
    }
  }
}

.toggle-label {
  letter-spacing: 0.02em;
}
</style>
