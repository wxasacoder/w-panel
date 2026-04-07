/** CSS custom properties applied to :root per theme; keys must stay stable for components. */
export interface ThemeVars {
  '--card-bg': string
  '--card-border': string
  '--card-shadow': string
  '--card-radius': string
  /** Theme default blur; runtime value is overridden by user Glass Blur in applyTheme */
  '--card-backdrop-blur': string
  '--card-hover-transform': string
  '--card-hover-shadow': string
  '--group-title-color': string
  '--group-title-font': string
  '--text-primary': string
  '--text-secondary': string
  '--bg-overlay': string
  '--accent-color': string
  '--glass-reflection': string
  '--glass-reflection-hover': string
  '--card-hover-glow': string
  /** 随鼠标移动的高光层不透明度，flat 主题为 0 */
  '--glass-cursor-shine-opacity': string
  /** 液态主题下与 cursor shine 相乘，略增强折射感；flat 为 1 */
  '--glass-shine-intensity': string
  [key: string]: string
}
