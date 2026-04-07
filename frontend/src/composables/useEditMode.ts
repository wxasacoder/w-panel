import { ref } from 'vue'

const editMode = ref(false)

export function useEditMode() {
  const toggle = () => {
    editMode.value = !editMode.value
  }

  return {
    editMode,
    toggle,
  }
}
