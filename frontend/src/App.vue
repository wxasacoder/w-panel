<template>
  <div class="app-root" :class="{ 'has-bg': backgroundImage }">
    <!-- Background -->
    <div class="app-background">
      <img v-if="backgroundImage" :src="backgroundImage" class="bg-image" />
      <div class="bg-overlay"></div>
    </div>

    <!-- Rain effect -->
    <RainEffect :active="weatherEffect === 'rain'" :intensity="rainIntensity" />

    <!-- Main content -->
    <NavigationGrid
      :groups="groups"
      @add-group="showAddGroup = true"
      @add-card="onAddCard"
      @delete-group="onDeleteGroup"
      @delete-card="onDeleteCard"
      @edit-card="onEditCard"
      @updated="loadGroups"
    />

    <!-- Edit mode toggle -->
    <EditModeToggle />

    <!-- Settings button (only in edit mode) -->
    <button v-if="editMode" class="settings-btn" @click="showSettings = true" title="Settings">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M3.4 16.6l1.4-1.4M15.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Dialogs -->
    <AddGroupDialog v-if="showAddGroup" @close="showAddGroup = false" @create="onCreateGroup" />
    <AddCardDialog
      v-if="addCardGroupId !== null || editingCard !== null"
      :group-id="cardDialogGroupId"
      :edit-card="editingCard"
      @close="closeCardDialog"
      @create="onCreateCard"
      @update="onUpdateCard"
    />
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <SearchDialog ref="searchRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getGroups, createGroup, createCard, updateCard, deleteGroup, deleteCard, type Group, type Card } from './api'
import { useEditMode } from './composables/useEditMode'
import { useTheme } from './composables/useTheme'
import NavigationGrid from './components/NavigationGrid.vue'
import EditModeToggle from './components/EditModeToggle.vue'
import AddGroupDialog from './components/AddGroupDialog.vue'
import AddCardDialog from './components/AddCardDialog.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import SearchDialog from './components/SearchDialog.vue'
import RainEffect from './components/RainEffect.vue'

const { editMode } = useEditMode()
const { backgroundImage, weatherEffect, rainIntensity, loadSettings } = useTheme()

const groups = ref<Group[]>([])
const showAddGroup = ref(false)
const addCardGroupId = ref<number | null>(null)
const editingCard = ref<Card | null>(null)

const cardDialogGroupId = computed(() =>
  editingCard.value ? editingCard.value.group_id : addCardGroupId.value!
)
const showSettings = ref(false)
const searchRef = ref<InstanceType<typeof SearchDialog>>()
// Keep searchRef for future programmatic access
void searchRef

const loadGroups = async () => {
  try {
    groups.value = await getGroups()
  } catch (e) {
    console.error('Failed to load groups:', e)
  }
}

const onAddCard = (groupId: number) => {
  editingCard.value = null
  addCardGroupId.value = groupId
}

const onEditCard = (card: Card) => {
  addCardGroupId.value = null
  editingCard.value = card
}

const closeCardDialog = () => {
  addCardGroupId.value = null
  editingCard.value = null
}

const onCreateGroup = async (name: string) => {
  try {
    await createGroup(name)
    showAddGroup.value = false
    await loadGroups()
  } catch (e) {
    console.error('Failed to create group:', e)
  }
}

const onCreateCard = async (card: Parameters<typeof createCard>[0]) => {
  try {
    await createCard(card)
    closeCardDialog()
    await loadGroups()
  } catch (e) {
    console.error('Failed to create card:', e)
  }
}

const onUpdateCard = async (payload: {
  id: number
  group_id: number
  title: string
  url: string
  icon_type: string
  icon_value: string
  icon_bg_color: string
  open_mode: string
}) => {
  try {
    const { id, ...body } = payload
    await updateCard(id, body)
    closeCardDialog()
    await loadGroups()
  } catch (e) {
    console.error('Failed to update card:', e)
  }
}

const onDeleteGroup = async (id: number) => {
  if (!confirm('Delete this group and all its cards?')) return
  try {
    await deleteGroup(id)
    await loadGroups()
  } catch (e) {
    console.error('Failed to delete group:', e)
  }
}

const onDeleteCard = async (id: number) => {
  try {
    await deleteCard(id)
    await loadGroups()
  } catch (e) {
    console.error('Failed to delete card:', e)
  }
}

onMounted(async () => {
  await loadSettings()
  await loadGroups()
})
</script>

<style scoped lang="scss">
.app-root {
  position: relative;
  min-height: 100vh;
}

.app-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(var(--wallpaper-blur-px, 0px));
  transform: scale(1.06);
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.08);
}

.settings-btn {
  position: fixed;
  bottom: 84px;
  right: 28px;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  background: rgba(30, 30, 50, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  &:hover {
    background: rgba(40, 40, 65, 0.85);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    color: white;
  }
}
</style>
