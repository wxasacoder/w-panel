import { ref } from 'vue'

const isLinuxChrome = ref(false)
const blurCoefficient = ref(32)
const detected = ref(false)

function detect() {
  if (detected.value) return
  detected.value = true

  // 全平台沿用 Linux Chrome 性能预设（模糊强度、悬停才挂 SVG 滤镜等）
  isLinuxChrome.value = true

  if (isLinuxChrome.value) {
    blurCoefficient.value = 16
  }

  const root = document.documentElement
  root.style.setProperty('--ui-blur', isLinuxChrome.value ? 'blur(8px)' : 'blur(20px)')
}

export function usePerformance() {
  detect()

  return {
    isLinuxChrome,
    blurCoefficient,
  }
}
