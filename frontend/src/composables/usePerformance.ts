import { ref } from 'vue'

const isLinuxChrome = ref(false)
const blurCoefficient = ref(32)
const detected = ref(false)

function detect() {
  if (detected.value) return
  detected.value = true

  const ua = navigator.userAgent
  const linux = /Linux/.test(ua) && !/Android/.test(ua)
  const chrome = /Chrome\//.test(ua) && !/Edg\//.test(ua)

  isLinuxChrome.value = linux && chrome

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
