export interface FallingDrop {
  x: number
  y: number
  length: number
  speed: number
  opacity: number
  thickness: number
}

export class RainRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private fallingDrops: FallingDrop[] = []
  private animationId = 0
  private running = false
  private intensity: number

  constructor(canvas: HTMLCanvasElement, intensity = 1.0) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.intensity = intensity
    this.resize()
  }

  setIntensity(val: number) {
    this.intensity = val
    if (this.running) {
      this.initFallingDrops()
    }
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.running) return
    this.running = true
    this.initFallingDrops()
    this.animate()
  }

  stop() {
    this.running = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = 0
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private initFallingDrops() {
    this.fallingDrops = []
    const count = Math.floor(this.canvas.width / 12 * this.intensity)
    for (let i = 0; i < count; i++) {
      this.fallingDrops.push(this.createFallingDrop())
    }
  }

  private createFallingDrop(): FallingDrop {
    const s = this.intensity
    return {
      x: Math.random() * this.canvas.width,
      y: -20 - Math.random() * this.canvas.height,
      length: (15 + Math.random() * 25) * s,
      speed: 8 + Math.random() * 12,
      opacity: 0.05 + Math.random() * 0.12,
      thickness: (1 + Math.random() * 1.5) * s,
    }
  }

  private animate = () => {
    if (!this.running) return
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.drawFallingRain()
    this.animationId = requestAnimationFrame(this.animate)
  }

  private drawFallingRain() {
    const ctx = this.ctx
    for (const drop of this.fallingDrops) {
      ctx.save()
      ctx.strokeStyle = `rgba(174, 194, 224, ${drop.opacity})`
      ctx.lineWidth = drop.thickness
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(drop.x, drop.y)
      ctx.lineTo(drop.x + 1, drop.y + drop.length)
      ctx.stroke()
      ctx.restore()

      drop.y += drop.speed
      if (drop.y > this.canvas.height + drop.length) {
        drop.y = -drop.length - Math.random() * 100
        drop.x = Math.random() * this.canvas.width
      }
    }
  }

  destroy() {
    this.stop()
  }
}
