<script setup lang="ts">
/**
 * LedDots — dots of the `.au-hero` dot grid light up like soft LEDs around the mouse pointer.
 *
 * The dots themselves are a CSS background (a 12px grid with a dot in the centre of each cell),
 * and CSS can't light one dot of a background. So this draws on a <canvas> laid exactly over
 * that grid, and paints a glow on top of the dots near the pointer.
 *
 * Dots fade in quickly as the pointer arrives and fade out slowly after it leaves, which leaves a
 * gentle trail. Nothing runs while the pointer is away and every dot has faded.
 *
 * Place it as a child of the element that has the dot background; that element must be
 * `position: relative` (au-hero is) and `isolation: isolate`, so the canvas can sit behind content.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const GRID = 12 // must match `background-size` in .au-hero
const RADIUS = 60 // px around the pointer that lights up

// Timing (seconds, as easing time constants). With "Reduce motion" on, the light no longer
// glides or leaves a trail: dots simply switch on under the pointer and off when it leaves.
const MOTION = { fadeIn: 0.12, fadeOut: 0.7, follow: 0.08 } // fadeOut = trail length
const REDUCED = { fadeIn: 0.04, fadeOut: 0.06, follow: 0 }
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
let timing = reducedQuery.matches ? REDUCED : MOTION
const onReducedChange = (e: MediaQueryListEvent): void => {
  timing = e.matches ? REDUCED : MOTION
}

const canvas = ref<HTMLCanvasElement | null>(null)

let host: HTMLElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let cols = 0
let rows = 0
let colors = { lime: '#d6f21e', edge: '#6f8a05' }
let observer: ResizeObserver | null = null
let raf = 0
let last = 0

// Pointer: where it really is (target) and where the light currently is (eased towards target)
let inside = false
let targetX = 0
let targetY = 0
let lightX = 0
let lightY = 0

// Brightness (0–1) of every dot that is currently lit, keyed by `row * cols + col`
const lit = new Map<number, number>()

// Smooth 0→1 curve, so brightness falls off softly towards the edge of the circle
const smooth = (x: number): number => x * x * (3 - 2 * x)
// Tiny fixed per-dot variation, so the glow looks like real LEDs rather than a perfect disc
const variety = (key: number): number => 0.8 + 0.2 * ((Math.sin(key * 12.9898) * 43758.5453) % 1 + 1) % 1

function resize(): void {
  const el = canvas.value
  if (!el || !ctx) return
  const dpr = window.devicePixelRatio || 1
  width = el.clientWidth
  height = el.clientHeight
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // draw in CSS pixels, stay sharp on Retina
  cols = Math.ceil(width / GRID)
  rows = Math.ceil(height / GRID)
  lit.clear()
  wake()
}

/** Brightness each dot should be heading towards, given where the light is now. */
function targets(): Map<number, number> {
  const out = new Map<number, number>()
  if (!inside) return out
  const c0 = Math.max(0, Math.floor((lightX - RADIUS) / GRID))
  const c1 = Math.min(cols - 1, Math.floor((lightX + RADIUS) / GRID))
  const r0 = Math.max(0, Math.floor((lightY - RADIUS) / GRID))
  const r1 = Math.min(rows - 1, Math.floor((lightY + RADIUS) / GRID))
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const dx = c * GRID + GRID / 2 - lightX
      const dy = r * GRID + GRID / 2 - lightY
      const t = 1 - Math.hypot(dx, dy) / RADIUS
      if (t > 0) {
        const key = r * cols + c
        out.set(key, smooth(t) * variety(key))
      }
    }
  }
  return out
}

function frame(now: number): void {
  if (!ctx) return
  const dt = Math.min((now - last) / 1000, 0.05) // seconds since last frame (capped after tab switches)
  last = now

  // Glide the light towards the pointer (jump straight there with reduced motion)
  const follow = timing.follow > 0 ? 1 - Math.exp(-dt / timing.follow) : 1
  lightX += (targetX - lightX) * follow
  lightY += (targetY - lightY) * follow

  // Ease every dot towards its target brightness: quick to light, slow to fade
  const want = targets()
  for (const key of want.keys()) if (!lit.has(key)) lit.set(key, 0)
  const up = 1 - Math.exp(-dt / timing.fadeIn)
  const down = 1 - Math.exp(-dt / timing.fadeOut)
  for (const [key, a] of lit) {
    const target = want.get(key) ?? 0
    const next = a + (target - a) * (target > a ? up : down)
    if (target === 0 && next < 0.01) lit.delete(key)
    else lit.set(key, next)
  }

  // Draw
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = colors.lime
  ctx.strokeStyle = colors.edge
  ctx.lineWidth = 0.75
  for (const [key, a] of lit) {
    // Same maths as the CSS radial-gradient: dot sits in the centre of each 12px cell
    const x = (key % cols) * GRID + GRID / 2
    const y = Math.floor(key / cols) * GRID + GRID / 2

    ctx.globalAlpha = a * 0.28 // soft glow
    ctx.beginPath()
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = a // the LED itself: lime with a darker rim, like the live dot
    ctx.beginPath()
    ctx.arc(x, y, 1.75, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Keep animating while the pointer is here or anything is still fading; otherwise sleep
  raf = inside || lit.size > 0 ? requestAnimationFrame(frame) : 0
}

function wake(): void {
  if (raf) return
  last = performance.now()
  raf = requestAnimationFrame(frame)
}

function onMove(e: PointerEvent): void {
  if (!host) return
  const r = host.getBoundingClientRect()
  targetX = e.clientX - r.left
  targetY = e.clientY - r.top
  if (!inside) {
    // Start the light where the pointer entered, instead of sliding in from the last spot
    lightX = targetX
    lightY = targetY
    inside = true
  }
  wake()
}

function onLeave(): void {
  inside = false
  wake() // let the lit dots fade out
}

onMounted(() => {
  const el = canvas.value
  host = el?.parentElement ?? null
  if (!el || !host) return
  ctx = el.getContext('2d')
  const css = getComputedStyle(el)
  colors = {
    lime: css.getPropertyValue('--lime').trim() || colors.lime,
    edge: css.getPropertyValue('--lime-edge').trim() || colors.edge
  }
  // The canvas ignores the mouse (so content stays clickable); listen on the panel instead
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)
  reducedQuery.addEventListener('change', onReducedChange)
  observer = new ResizeObserver(resize)
  observer.observe(el)
  resize()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  host?.removeEventListener('pointermove', onMove)
  host?.removeEventListener('pointerleave', onLeave)
  reducedQuery.removeEventListener('change', onReducedChange)
})
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none absolute inset-0 -z-10 size-full" aria-hidden="true" />
</template>
