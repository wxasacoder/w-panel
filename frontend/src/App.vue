<template>
  <div class="app-root" :class="{ 'has-bg': backgroundImage }">
    <GlassFilter />

    <!-- Background -->
    <div class="app-background">
      <!-- Safari excludes <img> content when sampling fixed edge colors. These
           opaque backing strips are covered by the wallpaper in the actual UI. -->
      <template v-if="mobileBrowser">
        <div class="mobile-browser-edge mobile-browser-edge-top" aria-hidden="true"></div>
        <div class="mobile-browser-edge mobile-browser-edge-bottom" aria-hidden="true"></div>
      </template>
      <img v-if="backgroundImage" ref="wallpaperRef" :src="backgroundImage" class="bg-image"
        @load="refreshBrowserColors" @error="refreshBrowserColors" />
      <div class="bg-overlay"></div>
    </div>

    <!-- Rain effect -->
    <RainEffect :active="weatherEffect === 'rain'" :intensity="rainIntensity" />

    <!-- Main content -->
    <main ref="viewportRef" class="app-scroll" tabindex="-1" aria-label="Bookmarks">
      <NavigationGrid
        :groups="groups"
        @add-group="showAddGroup = true"
        @add-card="onAddCard"
        @delete-group="onDeleteGroup"
        @delete-card="onDeleteCard"
        @edit-card="onEditCard"
        @updated="loadGroups"
      />
    </main>

    <!-- Fade into an aligned copy of the wallpaper. Masking the scroll container
         itself would create a backdrop root and change the cards' glass effect. -->
    <div v-if="mobileBrowser && !editMode && (contentAbove || contentBelow)"
      class="mobile-scroll-fade" :class="{ 'fade-top': contentAbove, 'fade-bottom': contentBelow }"
      aria-hidden="true">
      <div class="mobile-scroll-fade-background">
        <div class="fade-browser-edge-bottom"></div>
        <img v-if="backgroundImage" :src="backgroundImage" class="fade-bg-image" alt="" />
        <div class="fade-bg-overlay"></div>
      </div>
    </div>

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
import { useMobileBrowserColors } from './composables/useMobileBrowserColors'
import { useScrollEdges } from './composables/useScrollEdges'
import GlassFilter from './components/GlassFilter.vue'
import NavigationGrid from './components/NavigationGrid.vue'
import EditModeToggle from './components/EditModeToggle.vue'
import AddGroupDialog from './components/AddGroupDialog.vue'
import AddCardDialog from './components/AddCardDialog.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import SearchDialog from './components/SearchDialog.vue'
import RainEffect from './components/RainEffect.vue'

const { editMode } = useEditMode()
const {
  backgroundImage, weatherEffect, rainIntensity, wallpaperBlur, loadSettings,
} = useTheme()
const wallpaperRef = ref<HTMLImageElement>()
const viewportRef = ref<HTMLElement>()
const { mobileBrowser, refreshBrowserColors } = useMobileBrowserColors(
  wallpaperRef, viewportRef, backgroundImage, wallpaperBlur,
)
const { contentAbove, contentBelow } = useScrollEdges(
  viewportRef, computed(() => mobileBrowser.value && !editMode.value),
)
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
  await Promise.all([loadSettings(), loadGroups()])
})
</script>

<style scoped lang="scss">
.app-root {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.app-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
  overscroll-behavior: none;
  scrollbar-gutter: stable;
}

.app-background,
.mobile-scroll-fade-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  // Keep the wallpaper behind the browser's expanded/collapsed toolbar area.
  // Bookmarks still use the visible (dynamic) viewport and scroll independently.
  height: 100lvh;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-image,
.fade-bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(var(--wallpaper-blur-px, 0px));
  transform: scale(1.06);
}

.bg-overlay,
.fade-bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.08);
}

.mobile-scroll-fade { display: none; }

@media (hover: none) and (pointer: coarse) {
  .mobile-scroll-fade {
    --edge-fade-top: 0px;
    --edge-fade-bottom: 0px;
    display: block;
    position: absolute;
    inset: 0;
    z-index: 2;
    overflow: hidden;
    pointer-events: none;
    // Only the decorative wallpaper copy is masked, never the glass cards.
    --edge-mask: linear-gradient(to bottom,
      black 0, transparent var(--edge-fade-top),
      transparent calc(100% - var(--edge-fade-bottom)), black 100%);
    -webkit-mask-image: var(--edge-mask);
    mask-image: var(--edge-mask);

    &.fade-top { --edge-fade-top: calc(24px + env(safe-area-inset-top)); }
    &.fade-bottom { --edge-fade-bottom: calc(48px + env(safe-area-inset-bottom)); }
  }

  .mobile-scroll-fade-background {
    // Safari's sampler skips this image too; preserve the same edge colors
    // underneath the decorative copy instead of reintroducing a blue fallback.
    background: var(--mobile-wallpaper-top, #1a1a2e);
  }

  .mobile-browser-edge,
  .fade-browser-edge-bottom {
    position: fixed;
    left: 0;
    right: 0;
    height: 12px;
    pointer-events: none;
    z-index: 0;
  }

  .mobile-browser-edge-top {
    top: 0;
    background-color: var(--mobile-wallpaper-top, #1a1a2e);
  }

  .mobile-browser-edge-bottom,
  .fade-browser-edge-bottom {
    bottom: 0;
    background-color: var(--mobile-wallpaper-bottom, #1a1a2e);
  }

  // Normal rendering stays identical: the wallpaper covers the color strips.
  // Keep filters on the image/cards, not on the solid surfaces Safari samples.
  .bg-image, .fade-bg-image { position: relative; z-index: 1; }
  .bg-overlay, .fade-bg-overlay { z-index: 2; }
}

.settings-btn {
  position: fixed;
  bottom: calc(84px + env(safe-area-inset-bottom));
  right: calc(28px + env(safe-area-inset-right));
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  background: rgba(30, 30, 50, 0.7);
  backdrop-filter: var(--ui-blur, blur(20px));
  -webkit-backdrop-filter: var(--ui-blur, blur(20px));
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
