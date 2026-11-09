<script setup lang="ts">
/**
 * OrbitMotif — PROTOTYPE of the hero visualization.
 * Same geometry and gentle motion as the live orbit, refined:
 *  - hairline strokes that stay 0.75px at any size (vector-effect: non-scaling-stroke)
 *  - every animated SVG element has tabindex="-1" (motion-v's focus listeners made them tab stops)
 *  - an editorial callout from the signal dot, explaining what the dot is
 * Sizes itself to the largest box that fits its container (container query units).
 */
import { computed, ref } from 'vue'
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'motion-v'
import { duration, ease, softSpring } from './motion'

defineProps<{ callout?: boolean }>()

const reduce = useReducedMotion()
const rings = Array.from({ length: 10 }, (_, i) => 18 + i * 10)
const belts = [30, 52, 74, 96, 118]

// Idle: rings breathe, belts tilt. Off with reduced motion.
const breathe = computed(() =>
  reduce.value
    ? {}
    : {
        animate: { scale: [1, 1.012, 1] },
        transition: { duration: duration.breathe, repeat: Infinity, ease: ease.inOutCalm }
      }
)
const tilt = computed(() =>
  reduce.value
    ? {}
    : {
        animate: { rotate: [0, 2, 0, -2, 0] },
        transition: { duration: duration.drift, repeat: Infinity, ease: ease.inOutCalm }
      }
)
const halo = computed(() =>
  reduce.value
    ? {}
    : {
        animate: { opacity: [0.5, 1, 0.5], scale: [1, 1.14, 1] },
        transition: { duration: 2.6, repeat: Infinity, ease: ease.inOutCalm }
      }
)

// Hover: layers drift a few units towards the pointer (parallax). Off with reduced motion.
const px = useMotionValue(0)
const py = useMotionValue(0)
const sx = useSpring(px, softSpring)
const sy = useSpring(py, softSpring)
const ringsX = useTransform(sx, (v) => v * 4)
const ringsY = useTransform(sy, (v) => v * 4)
const beltsX = useTransform(sx, (v) => v * -3)
const beltsY = useTransform(sy, (v) => v * -2)
const dotX = useTransform(sx, (v) => v * 4)
const dotY = useTransform(sy, (v) => v * 4)
const hovering = ref(false)
const clamp = (v: number): number => Math.max(-1, Math.min(1, v))

function onMove(e: PointerEvent): void {
  if (reduce.value) return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  px.set(clamp(((e.clientX - r.left) / r.width) * 2 - 1))
  py.set(clamp(((e.clientY - r.top) / r.height) * 2 - 1))
}
function onLeave(): void {
  hovering.value = false
  px.set(0)
  py.set(0)
}
const soft = { duration: duration.calm, ease: ease.outSoft }
</script>

<template>
  <div class="orbit-area">
    <div class="orbit" @pointerenter="hovering = true" @pointermove="onMove" @pointerleave="onLeave">
      <svg viewBox="-20 0 340 320" class="orbit__svg" aria-hidden="true" focusable="false">
        <motion.g
          tabindex="-1"
          :style="{ x: ringsX, y: ringsY }"
          :initial="false"
          :animate="{ opacity: hovering ? 1 : 0.85 }"
          :transition="soft"
          class="lines"
        >
          <motion.g v-bind="breathe" tabindex="-1">
            <template v-for="k in rings" :key="k">
              <ellipse cx="150" :cy="160 - k * 0.75" :rx="k * 0.8" :ry="k * 0.75" />
              <ellipse cx="150" :cy="160 + k * 0.75" :rx="k * 0.8" :ry="k * 0.75" />
            </template>
          </motion.g>
        </motion.g>

        <motion.g
          tabindex="-1"
          :style="{ x: beltsX, y: beltsY }"
          :initial="false"
          :animate="{ scale: hovering ? 1.03 : 1 }"
          :transition="soft"
          class="lines lines--belts"
        >
          <motion.g v-bind="tilt" tabindex="-1">
            <ellipse
              v-for="k in belts"
              :key="'b' + k"
              cx="150"
              cy="160"
              :rx="k * 1.25"
              :ry="k * 0.16"
            />
          </motion.g>
        </motion.g>

        <motion.g
          tabindex="-1"
          :style="{ x: dotX, y: dotY }"
          :initial="false"
          :animate="{ scale: hovering ? 1.12 : 1 }"
          :transition="soft"
        >
          <!-- Callout leader: dot → elbow → under the label -->
          <polyline v-if="callout" class="leader" points="150,160 196,118 270,118" />
          <circle v-if="callout" cx="196" cy="118" r="1.5" class="leader-joint" />
          <motion.circle
            v-bind="halo"
            tabindex="-1"
            cx="150"
            cy="160"
            r="15"
            fill="var(--c-signal-halo)"
            style="transform-origin: 150px 160px"
          />
          <circle cx="150" cy="160" r="5.5" class="signal" />
        </motion.g>
      </svg>

      <!-- Label sits on the leader's horizontal run: x = (196 + 20) / 340, y = 118 / 320 -->
      <div v-if="callout" class="callout" style="left: 63.5%; top: 36.9%">
        <span class="callout__title">Your signal</span>
        <span class="callout__note">Appears when the camera is on</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orbit-area {
  container-type: size;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  min-height: 0;
}
.orbit {
  position: relative;
  width: min(100cqw, calc(100cqh * 1.0625), 520px);
  aspect-ratio: 340 / 320;
}
/* Atmosphere: a warm champagne haze and a faint chartreuse core, always centred on the orbit */
.orbit::before {
  content: '';
  position: absolute;
  inset: -18%;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(closest-side, rgba(212, 240, 28, 0.08), transparent 45%),
    radial-gradient(closest-side, rgba(232, 214, 180, 0.5), transparent 100%);
}
.orbit__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.lines {
  fill: none;
  stroke: var(--c-geometry);
  stroke-width: 0.75;
}
.lines ellipse,
.leader {
  vector-effect: non-scaling-stroke;
}
.lines--belts {
  opacity: 0.75;
}
.leader {
  fill: none;
  stroke: var(--c-ink-3);
  stroke-width: 0.75;
}
.leader-joint {
  fill: var(--c-ink-3);
}
.signal {
  fill: var(--c-signal);
  stroke: var(--c-signal-edge);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.callout {
  position: absolute;
  transform: translateY(calc(-100% - 6px));
  display: grid;
  gap: 2px;
  padding: 8px 18px 4px 0;
  white-space: nowrap;
  pointer-events: none;
  /* Feathered panel-coloured backing so the label never sits directly on the ring lines */
  background: radial-gradient(
    farthest-side at 40% 55%,
    rgba(250, 249, 246, 0.96) 55%,
    rgba(250, 249, 246, 0)
  );
}
.callout__title {
  font-size: 15px;
  font-weight: 500;
  color: var(--c-ink);
}
.callout__note {
  font-size: 13px;
  color: var(--c-ink-3);
}
</style>
