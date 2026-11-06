import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

export function useScrollEdges(viewport: Ref<HTMLElement | undefined>, enabled: Ref<boolean>) {
  const contentAbove = ref(false)
  const contentBelow = ref(false)
  let frame = 0
  let observer: ResizeObserver | undefined
  let element: HTMLElement | undefined

  function refresh() {
    if (!enabled.value) {
      contentAbove.value = contentBelow.value = false
      return
    }
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (!enabled.value || !element) return
      const maximum = Math.max(0, element.scrollHeight - element.clientHeight)
      const position = Math.max(0, element.scrollTop)
      contentAbove.value = maximum > 1 && position > 1
      contentBelow.value = maximum - position > 1
    })
  }

  watch(enabled, refresh, { flush: 'post' })
  onMounted(() => {
    element = viewport.value
    if (!element) return
    element.addEventListener('scroll', refresh, { passive: true })
    observer = new ResizeObserver(refresh)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    refresh()
  })
  onUnmounted(() => {
    cancelAnimationFrame(frame)
    observer?.disconnect()
    element?.removeEventListener('scroll', refresh)
  })

  return { contentAbove, contentBelow }
}
