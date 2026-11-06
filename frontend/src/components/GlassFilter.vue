<template>
  <svg class="glass-filter-svg-global" aria-hidden="true">
    <defs>
      <filter id="glass-filter-shared" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
        <feImage
          x="0" y="0" width="100%" height="100%" result="DISPLACEMENT_MAP"
          :href="displacementMapUrl" preserveAspectRatio="none"
        />
        <!-- Alpha from the JPEG is opaque everywhere; use a real edge mask instead. -->
        <feImage :href="edgeMaskUrl" x="0" y="0" width="100%" height="100%"
          preserveAspectRatio="none" result="EDGE_MASK" />
        <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />
        <feDisplacementMap
          in="SourceGraphic" in2="DISPLACEMENT_MAP" :scale="-glassDisplacementScale"
          xChannelSelector="R" yChannelSelector="B" result="RED_DISPLACED"
        />
        <feColorMatrix
          in="RED_DISPLACED" type="matrix"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="RED_CHANNEL"
        />
        <feDisplacementMap
          in="SourceGraphic" in2="DISPLACEMENT_MAP"
          :scale="-glassDisplacementScale - glassAberration * 0.35 * glassDisplacementScale"
          xChannelSelector="R" yChannelSelector="B" result="GREEN_DISPLACED"
        />
        <feColorMatrix
          in="GREEN_DISPLACED" type="matrix"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="GREEN_CHANNEL"
        />
        <feDisplacementMap
          in="SourceGraphic" in2="DISPLACEMENT_MAP"
          :scale="-glassDisplacementScale - glassAberration * 0.7 * glassDisplacementScale"
          xChannelSelector="R" yChannelSelector="B" result="BLUE_DISPLACED"
        />
        <feColorMatrix
          in="BLUE_DISPLACED" type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          result="BLUE_CHANNEL"
        />
        <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
        <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />
        <feGaussianBlur
          in="RGB_COMBINED" :stdDeviation="filterStdDeviation"
          result="ABERRATED_BLURRED"
        />
        <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />
        <feComposite in="CENTER_ORIGINAL" in2="EDGE_MASK" operator="out" result="CENTER_CLEAN" />
        <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>
    </defs>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'
import { usePerformance } from '../composables/usePerformance'
import { DISPLACEMENT_MAP_URL } from '../config/liquidGlassOptions'

const { glassDisplacementScale, glassAberration, glassCornerRadius } = useTheme()
const { isLinuxChrome } = usePerformance()
const displacementMapUrl = DISPLACEMENT_MAP_URL
const filterStdDeviation = computed(() => {
  const base = Math.max(0.1, 1.0 - glassAberration.value * 0.15)
  return isLinuxChrome.value ? Math.max(0.1, base * 0.7) : base
})
// Keep refraction/chromatic separation at the rim, with an untouched center.
// Stretch the mask with the card instead of cropping a square map into it.
const edgeMaskUrl = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="70" viewBox="0 0 300 70"><defs><filter id="soft"><feGaussianBlur stdDeviation="2"/></filter></defs><rect width="300" height="70" rx="${glassCornerRadius.value}" fill="none" stroke="white" stroke-width="16" filter="url(#soft)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})
</script>

<style scoped>
.glass-filter-svg-global {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
</style>
