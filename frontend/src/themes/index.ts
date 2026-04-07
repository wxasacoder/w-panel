import type { ThemeVars } from './types'
import { flatVars } from './flat'
import { liquidGlassVars } from './liquid-glass'

export type { ThemeVars } from './types'
export { flatVars, liquidGlassVars }

export const builtInThemes: Record<string, ThemeVars> = {
  'liquid-glass': liquidGlassVars,
  flat: flatVars,
}
