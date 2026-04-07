<template>
  <canvas ref="canvasRef" class="rain-canvas" :class="{ active: active }"></canvas>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { RainRenderer } from '../effects/rain'

const props = defineProps<{ active: boolean }>()
const canvasRef = ref<HTMLCanvasElement>()
let renderer: RainRenderer | null = null

const onResize = () => renderer?.resize()

onMounted(() => {
  if (canvasRef.value) {
    renderer = new RainRenderer(canvasRef.value)
    if (props.active) renderer.start()
    window.addEventListener('resize', onResize)
  }
})

onUnmounted(() => {
  renderer?.destroy()
  window.removeEventListener('resize', onResize)
})

watch(() => props.active, (val) => {
  if (val) renderer?.start()
  else renderer?.stop()
})
</script>

<style scoped>
.rain-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.8s ease;
}

.rain-canvas.active {
  opacity: 1;
}
</style>
