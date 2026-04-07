<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-content" style="min-width: 420px;">
        <h3 class="modal-title">New Bookmark</h3>

        <div class="form-group">
          <label>URL</label>
          <div class="url-row">
            <input v-model="form.url" placeholder="https://example.com" @blur="onUrlBlur" />
            <button class="btn btn-secondary fetch-btn" @click="fetchIcon" :disabled="fetching" title="Fetch icon">
              <svg v-if="!fetching" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1112 0A6 6 0 012 8z" stroke="currentColor" stroke-width="1.2"/><path d="M8 5v3l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              <span v-else class="spinner"></span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Title</label>
          <input v-model="form.title" placeholder="Bookmark title" />
        </div>

        <div class="form-group">
          <label>Icon Mode</label>
          <div class="icon-mode-tabs">
            <button :class="{ active: form.icon_type === 'letter' }" @click="form.icon_type = 'letter'">Letter</button>
            <button :class="{ active: form.icon_type === 'favicon' }" @click="form.icon_type = 'favicon'">Favicon</button>
            <button :class="{ active: form.icon_type === 'upload' }" @click="form.icon_type = 'upload'">Upload</button>
          </div>
        </div>

        <div v-if="form.icon_type === 'letter'" class="form-group">
          <label>Background Color</label>
          <div class="color-picker">
            <button
              v-for="color in presetColors"
              :key="color"
              :style="{ background: color }"
              :class="{ selected: form.icon_bg_color === color }"
              class="color-swatch"
              @click="form.icon_bg_color = color"
            />
            <input type="color" v-model="form.icon_bg_color" class="custom-color" />
          </div>
        </div>

        <div v-if="form.icon_type === 'favicon'" class="form-group">
          <label>Favicon URL</label>
          <input v-model="form.icon_value" placeholder="Auto-detected or enter manually" />
          <div v-if="form.icon_value" class="icon-preview">
            <img :src="form.icon_value" @error="form.icon_value = ''" />
          </div>
        </div>

        <div v-if="form.icon_type === 'upload'" class="form-group">
          <label>Upload Icon</label>
          <div class="upload-area" @click="fileInput?.click()">
            <img v-if="uploadPreview" :src="uploadPreview" class="upload-preview" />
            <span v-else>Click to upload</span>
            <input ref="fileInput" type="file" accept="image/*" @change="onFileSelect" hidden />
          </div>
        </div>

        <div class="form-group">
          <label>Open Mode</label>
          <select v-model="form.open_mode">
            <option value="_blank">New Tab</option>
            <option value="_self">Current Tab</option>
          </select>
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="submit" :disabled="!form.url.trim() || !form.title.trim()">Add</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { fetchFavicon, uploadFile } from '../api'

const props = defineProps<{ groupId: number }>()
const emit = defineEmits<{
  close: []
  create: [card: { group_id: number; title: string; url: string; icon_type: string; icon_value: string; icon_bg_color: string; open_mode: string }]
}>()

const presetColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b']

const form = reactive({
  url: '',
  title: '',
  icon_type: 'letter' as string,
  icon_value: '',
  icon_bg_color: '#6366f1',
  open_mode: '_blank',
})

const fetching = ref(false)
const fileInput = ref<HTMLInputElement>()
const uploadPreview = ref('')

const onUrlBlur = () => {
  if (form.url && !form.title) {
    try {
      const url = new URL(form.url.startsWith('http') ? form.url : `https://${form.url}`)
      form.title = url.hostname.replace('www.', '')
    } catch { /* ignore */ }
  }
}

const fetchIcon = async () => {
  if (!form.url) return
  fetching.value = true
  try {
    const { icon_url } = await fetchFavicon(form.url)
    if (icon_url) {
      form.icon_type = 'favicon'
      form.icon_value = icon_url
    }
  } catch (e) {
    console.error('Failed to fetch icon:', e)
  }
  fetching.value = false
}

const onFileSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const res = await uploadFile(file)
    form.icon_type = 'upload'
    form.icon_value = res.id
    uploadPreview.value = res.url
  } catch (e) {
    console.error('Upload failed:', e)
  }
}

const submit = () => {
  if (!form.url.trim() || !form.title.trim()) return
  let url = form.url.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  emit('create', {
    group_id: props.groupId,
    title: form.title.trim(),
    url,
    icon_type: form.icon_type,
    icon_value: form.icon_type === 'letter' ? form.title[0]?.toUpperCase() || '?' : form.icon_value,
    icon_bg_color: form.icon_bg_color,
    open_mode: form.open_mode,
  })
}
</script>

<style scoped lang="scss">
.url-row {
  display: flex;
  gap: 8px;

  input { flex: 1; }
}

.fetch-btn {
  padding: 10px 12px !important;
  min-width: 40px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: rgba(255,255,255,0.8);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon-mode-tabs {
  display: flex;
  gap: 6px;

  button {
    flex: 1;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: var(--accent-color, #007AFF);
      border-color: var(--accent-color, #007AFF);
      color: white;
    }

    &:hover:not(.active) {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.color-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;

  &.selected {
    border-color: white;
    transform: scale(1.15);
    box-shadow: 0 0 8px rgba(255,255,255,0.3);
  }

  &:hover:not(.selected) {
    transform: scale(1.1);
  }
}

.custom-color {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: none;
  padding: 0;
}

.icon-preview {
  margin-top: 8px;

  img {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: rgba(255,255,255,0.1);
  }
}

.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.6);
  }
}

.upload-preview {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: contain;
}
</style>
