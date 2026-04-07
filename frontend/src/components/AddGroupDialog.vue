<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-content" style="min-width: 340px;">
        <h3 class="modal-title">New Group</h3>
        <div class="form-group">
          <label>Group Name</label>
          <input v-model="name" @keydown.enter="submit" placeholder="e.g. Work Tools" ref="inputRef" />
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="submit" :disabled="!name.trim()">Create</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{ close: []; create: [name: string] }>()
const name = ref('')
const inputRef = ref<HTMLInputElement>()

onMounted(() => {
  inputRef.value?.focus()
})

const submit = () => {
  if (name.value.trim()) {
    emit('create', name.value.trim())
  }
}
</script>
