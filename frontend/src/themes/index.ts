import type { ThemeVars } from './types'
import { liquidGlassVars } from './liquid-glass'

export type { ThemeVars } from './types'
export { liquidGlassVars }

export const builtInThemes: Record<string, ThemeVars> = {
  'liquid-glass': liquidGlassVars,
}
