/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue-draggable-plus' {
  import type { DefineComponent } from 'vue'
  export const VueDraggable: DefineComponent<any, any, any>
}
