import type { ThemeVars } from './types'

export const liquidGlassVars: ThemeVars = {
  '--card-bg': 'rgba(255, 255, 255, 0.14)',
  '--card-border': '1px solid rgba(255, 255, 255, 0.32)',
  '--card-shadow':
    '0 8px 32px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.38), inset 0 -1px 0 rgba(255, 255, 255, 0.06)',
  '--card-radius': '20px',
  '--card-backdrop-blur': '40px',
  '--card-hover-transform': 'translateY(-2px) scale(1.02)',
  '--card-hover-shadow':
    '0 14px 44px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(255, 255, 255, 0.08)',
  '--card-hover-glow': '0 0 32px rgba(255, 255, 255, 0.18)',
  '--group-title-color': 'rgba(255, 255, 255, 0.92)',
  '--group-title-font': "600 1.1rem -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
  '--text-primary': 'rgba(255, 255, 255, 0.96)',
  '--text-secondary': 'rgba(255, 255, 255, 0.62)',
  '--bg-overlay': 'rgba(0, 0, 0, 0.15)',
  '--accent-color': '#007AFF',
  '--glass-reflection':
    'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.12) 100%)',
  '--glass-reflection-hover':
    'linear-gradient(122deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.08) 100%)',
  '--glass-cursor-shine-opacity': '0.94',
  '--glass-shine-intensity': '1.12',
}
