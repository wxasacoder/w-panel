export interface Raindrop {
  x: number
  y: number
  radius: number
  speed: number
  opacity: number
  trail: number
}

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
  private drops: Raindrop[] = []
  private fallingDrops: FallingDrop[] = []
  private animationId = 0
  private running = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.running) return
    this.running = true
    this.initDrops()
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

  private initDrops() {
    this.drops = []
    const count = Math.floor((this.canvas.width * this.canvas.height) / 8000)
    for (let i = 0; i < count; i++) {
      this.drops.push(this.createDrop())
    }
  }

  private createDrop(): Raindrop {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      radius: 1.5 + Math.random() * 3.5,
      speed: 0.02 + Math.random() * 0.06,
      opacity: 0.15 + Math.random() * 0.35,
      trail: 0,
    }
  }

  private initFallingDrops() {
    this.fallingDrops = []
    const count = Math.floor(this.canvas.width / 12)
    for (let i = 0; i < count; i++) {
      this.fallingDrops.push(this.createFallingDrop())
    }
  }

  private createFallingDrop(): FallingDrop {
    return {
      x: Math.random() * this.canvas.width,
      y: -20 - Math.random() * this.canvas.height,
      length: 15 + Math.random() * 25,
      speed: 8 + Math.random() * 12,
      opacity: 0.05 + Math.random() * 0.12,
      thickness: 1 + Math.random() * 1.5,
    }
  }

  private animate = () => {
    if (!this.running) return
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.drawFallingRain()
    this.drawGlassDrops()
    this.animationId = requestAnimationFrame(this.animate)
  }

  private drawGlassDrops() {
    const ctx = this.ctx
    for (const drop of this.drops) {
      // Main droplet body with refraction effect
      ctx.save()

      // Outer glow
      const gradient = ctx.createRadialGradient(
        drop.x - drop.radius * 0.3, drop.y - drop.radius * 0.3, 0,
        drop.x, drop.y, drop.radius
      )
      gradient.addColorStop(0, `rgba(255, 255, 255, ${drop.opacity * 0.8})`)
      gradient.addColorStop(0.5, `rgba(200, 220, 255, ${drop.opacity * 0.4})`)
      gradient.addColorStop(1, `rgba(150, 180, 220, ${drop.opacity * 0.1})`)

      ctx.beginPath()
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Light reflection highlight
      ctx.beginPath()
      ctx.arc(drop.x - drop.radius * 0.25, drop.y - drop.radius * 0.25, drop.radius * 0.35, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 0.9})`
      ctx.fill()

      // Bottom shadow for depth
      ctx.beginPath()
      ctx.ellipse(drop.x, drop.y + drop.radius * 0.8, drop.radius * 0.7, drop.radius * 0.2, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0, 0, 0, ${drop.opacity * 0.08})`
      ctx.fill()

      ctx.restore()

      // Slowly slide down
      drop.trail += drop.speed
      if (drop.trail > 1) {
        drop.y += drop.radius * 0.15
        drop.trail = 0
      }

      // Reset when off screen
      if (drop.y > this.canvas.height + drop.radius) {
        drop.y = -drop.radius * 2
        drop.x = Math.random() * this.canvas.width
        drop.trail = 0
      }
    }
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
