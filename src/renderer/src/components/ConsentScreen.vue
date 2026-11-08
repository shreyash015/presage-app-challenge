<script setup lang="ts">
/**
 * ConsentScreen — shown before the camera turns on (Aurae design system).
 * Emits `accept` only after the person ticks the checkbox and presses "Turn on camera".
 * The parent decides what to do next (save consent, start the SmartSpectra SDK).
 */
import { ref, computed } from 'vue'
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'motion-v'
import LedDots from './LedDots.vue'

const emit = defineEmits<{ accept: []; decline: [] }>()

const agreed = ref(false)
const reduceMotion = useReducedMotion()

// Orbit motif (the Pulse motif), drawn in hairlines on the light panel
const rings = Array.from({ length: 10 }, (_, i) => 18 + i * 10)
const belts = [30, 52, 74, 96, 118]

const sections = [
  {
    title: 'What Aurae reads',
    body: 'Your pulse, breathing rate, heart-rate variability and blinks, measured from small changes in your face on camera.'
  },
  {
    title: 'What leaves this device',
    body: 'Camera frames are sent to Presage’s SmartSpectra service, which returns the readings. Aurae sends nothing else.'
  },
  {
    title: 'What Aurae keeps',
    body: 'Nothing. Readings live in memory while the app is open and are gone when you close it. No video or images are saved.'
  },
  {
    title: 'You’re in control',
    body: 'Turn the camera off at any time with the camera button. You can reopen this page from the privacy button.'
  }
]

const vitals = [
  { label: 'Pulse', unit: 'bpm', card: 'au-card--pulse' },
  { label: 'Breathing', unit: '/ min', card: 'au-card--breath' },
  { label: 'Variability (HRV)', unit: 'ms', card: 'au-card--hrv' }
]

const ease = [0.22, 1, 0.36, 1] as const
const rise = (i: number) => ({
  initial: reduceMotion.value ? false : { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease, delay: i * 0.06 }
})

const halo = computed(() =>
  reduceMotion.value
    ? {}
    : {
      animate: { opacity: [0.55, 1, 0.55], scale: [1, 1.12, 1] },
      transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
    }
)

// ---------- Orbit motion ----------
// Idle: the rings breathe and the belts tilt, both slowly and by tiny amounts.
const breathe = computed(() =>
  reduceMotion.value
    ? {}
    : {
      animate: { scale: [1, 1.015, 1] },
      transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' }
    }
)
const tilt = computed(() =>
  reduceMotion.value
    ? {}
    : {
      animate: { rotate: [0, 2.5, 0, -2.5, 0] },
      transition: { duration: 18, repeat: Infinity, ease: 'easeInOut' }
    }
)

// Hover: where the pointer is over the orbit, from -1 (left/top) to 1 (right/bottom); 0 = centre.
const pointerX = useMotionValue(0)
const pointerY = useMotionValue(0)
// Springs smooth the raw pointer so the layers glide instead of snapping to the cursor.
const soft = { stiffness: 40, damping: 16 }
const smoothX = useSpring(pointerX, soft)
const smoothY = useSpring(pointerY, soft)
// Parallax: each layer drifts a different distance (in SVG units), which reads as depth.
// The belts move the opposite way to the rings; the dot leans furthest, towards the cursor.
const ringsX = useTransform(smoothX, (v) => v * 4)
const ringsY = useTransform(smoothY, (v) => v * 4)
const beltsX = useTransform(smoothX, (v) => v * -3)
const beltsY = useTransform(smoothY, (v) => v * -2)
const dotX = useTransform(smoothX, (v) => v * 10)
const dotY = useTransform(smoothY, (v) => v * 10)

const hovering = ref(false)
const hoverEase = { duration: 0.8, ease }
const clamp = (v: number): number => Math.max(-1, Math.min(1, v))

function onOrbitMove(e: PointerEvent): void {
  if (reduceMotion.value) return
  const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
  pointerX.set(clamp(((e.clientX - r.left) / r.width) * 2 - 1))
  pointerY.set(clamp(((e.clientY - r.top) / r.height) * 2 - 1))
}

function onOrbitLeave(): void {
  hovering.value = false
  pointerX.set(0)
  pointerY.set(0)
}

function accept() {
  if (agreed.value) emit('accept')
}
</script>

<template>
  <!--
    Layout is mobile-first:
      < 640px (phones)     one column, everything stacks and the page scrolls
      640–1023px (sm/md)   still one column, roomier spacing, 3 cards in a row
      ≥ 1024px (lg)        the original two-panel desktop layout, fitted to the window
  -->
  <main
    class="min-h-dvh box-border bg-ground p-1.5 sm:p-3.5 font-sans text-ink grid grid-cols-1 gap-1.5 lg:h-dvh lg:min-h-190 lg:grid-cols-[minmax(0,780px)_minmax(480px,1fr)]">
    <!-- Left: the hero panel, camera still off.
         Small screens: normal top-to-bottom flow. lg+: pieces are pinned in place (absolute). -->
    <motion.section v-bind="rise(0)"
      class="au-hero relative isolate flex flex-col gap-6 p-5 sm:p-8 lg:block lg:h-full lg:min-h-0 lg:p-0"
      aria-label="About this session">
      <!-- Dots of the background grid light up around the mouse pointer (sits behind everything else) -->
      <LedDots />
      <div class="flex items-center gap-3.5 lg:absolute lg:left-8 lg:top-7">
        <span class="au-tile cursor-default" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
          </svg>
        </span>
        <span class="title">Aurae</span>
      </div>

      <h1 class="display m-0 lg:absolute lg:left-8 lg:top-[110px]">Heart &amp;<br />Breath</h1>

      <span class="au-chip au-chip--paused absolute right-5 top-7 sm:right-8 sm:top-10 lg:top-9"><span
          class="au-chip__dot" />Camera off</span>

      <!-- Orbit motif with the live dot waiting -->
      <div class="grid place-items-center lg:absolute lg:inset-x-0 lg:top-57.5 lg:bottom-50" aria-hidden="true">
        <svg viewBox="-20 0 340 320" class="w-full max-w-64 sm:max-w-88 lg:max-w-110 max-h-full overflow-visible"
          @pointerenter="hovering = true" @pointermove="onOrbitMove" @pointerleave="onOrbitLeave">
          <!-- Each layer: outer group = pointer drift + hover state, inner group = idle loop.
               Kept separate so a hover change never restarts the loop. -->

          <!-- Rings: breathe; sharpen a little on hover -->
          <motion.g :style="{ x: ringsX, y: ringsY }" :initial="false" :animate="{ opacity: hovering ? 1 : 0.8 }"
            :transition="hoverEase" fill="none" stroke="var(--line-strong)" stroke-width="1">
            <motion.g v-bind="breathe">
              <template v-for="k in rings" :key="k">
                <ellipse cx="150" :cy="160 - k * 0.75" :rx="k * 0.8" :ry="k * 0.75" />
                <ellipse cx="150" :cy="160 + k * 0.75" :rx="k * 0.8" :ry="k * 0.75" />
              </template>
            </motion.g>
          </motion.g>

          <!-- Belts: tilt; open out slightly on hover -->
          <motion.g :style="{ x: beltsX, y: beltsY }" :initial="false" :animate="{ scale: hovering ? 1.04 : 1 }"
            :transition="hoverEase" fill="none" stroke="var(--line-strong)" stroke-width="1" opacity=".8">
            <motion.g v-bind="tilt">
              <ellipse v-for="k in belts" :key="'b' + k" cx="150" cy="160" :rx="k * 1.25" :ry="k * 0.16"
                opacity=".6" />
            </motion.g>
          </motion.g>

          <!-- Live dot: keeps its pulse; leans towards the cursor and grows a touch on hover -->
          <motion.g :style="{ x: dotX, y: dotY }" :initial="false" :animate="{ scale: hovering ? 1.15 : 1 }"
            :transition="hoverEase">
            <motion.circle v-bind="halo" cx="150" cy="160" r="14" fill="var(--lime-halo)"
              style="transform-origin: 150px 160px" />
            <circle cx="150" cy="160" r="6" fill="var(--lime)" stroke="var(--lime-edge)" stroke-width="1" />
          </motion.g>
        </svg>
      </div>

      <p class="body m-0 max-w-105 text-ink-muted lg:absolute lg:left-8 lg:right-8 lg:bottom-24">
        Sit comfortably and face the camera in soft, even light. Readings appear after a few seconds
        of stillness.
      </p>

      <!-- What will appear: 2×2 on phones, one row of 4 from 640px up -->
      <ul
        class="m-0 grid list-none grid-cols-2 sm:grid-cols-4 gap-1.5 p-0 lg:absolute lg:left-6 lg:right-6 lg:bottom-6">
        <li v-for="v in ['Pulse', 'Breathing', 'Variability', 'Blinks']" :key="v"
          class="flex min-w-0 items-center gap-3 rounded-card bg-panel px-3 xl:px-4 py-3 shadow-[var(--shadow-tile)]">
          <span class="au-chip__dot shrink-0" />
          <span class="label truncate">{{ v }}</span>
        </li>
      </ul>
    </motion.section>

    <!-- Right: the consent itself, and the cards it unlocks -->
    <div class="flex flex-col gap-1.5 min-w-0 lg:grid lg:grid-rows-[minmax(0,1fr)_150px] lg:min-h-0">
      <motion.section v-bind="rise(1)"
        class="rounded-card bg-panel px-5 py-6 sm:px-8 sm:py-8 lg:px-12 flex flex-col lg:min-h-0 lg:overflow-y-auto shadow-[var(--shadow-tile)]"
        aria-labelledby="consent-title">
        <h2 id="consent-title"
          class="mt-0 mb-3 text-[28px] leading-8 sm:text-[36px] sm:leading-10 font-normal tracking-[-0.02em]">
          Before your camera turns on
        </h2>
        <p class="body m-0 max-w-140 text-ink-muted">
          Aurae turns signals from your camera into the shapes and colours on this screen. Here is
          exactly what that means.
        </p>

        <dl class="mt-6 mb-0 border-t border-line">
          <!-- Phones: title above its text. 640px+: title and text side by side -->
          <div v-for="s in sections" :key="s.title"
            class="grid grid-cols-1 gap-1 sm:grid-cols-[180px_1fr] sm:gap-6 border-b border-line py-[10px]">
            <dt class="body font-medium text-ink">{{ s.title }}</dt>
            <dd class="body m-0 text-ink-muted">{{ s.body }}</dd>
          </div>
        </dl>

        <p class="label mt-4 mb-0 text-ink-muted">
          Readings are for reflection and play. They are not medical advice and cannot diagnose
          anything.
        </p>

        <div class="mt-auto pt-5">
          <label class="flex items-start gap-3 body text-ink cursor-pointer">
            <input v-model="agreed" type="checkbox" class="mt-[2px] size-4 shrink-0 accent-ink au-focusable" />
            I understand what Aurae reads and sends, and I want to start a session.
          </label>
          <!-- Phones: full-width stacked buttons (easy to tap). 640px+: side by side -->
          <div class="mt-5 flex flex-col gap-2 sm:flex-row">
            <button class="au-btn au-btn--primary disabled:cursor-not-allowed disabled:opacity-40" :disabled="!agreed"
              :aria-disabled="!agreed" @click="accept">
              Turn on camera
            </button>
            <button class="au-btn" @click="emit('decline')">Not now</button>
          </div>
        </div>
      </motion.section>

      <!-- Preview of the cards, waiting for the camera: stacked on phones, 3 across from 640px -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        <motion.article v-for="(v, i) in vitals" :key="v.label" v-bind="rise(2 + i)"
          :class="['au-card', 'au-grain', 'min-w-0', v.card]" :aria-label="`${v.label}, waiting for camera`">
          <span class="au-card__label">{{ v.label }}</span>
          <div class="au-card__value">
            <span class="metric">—</span><span class="au-card__unit">{{ v.unit }}</span>
          </div>
        </motion.article>
      </div>
    </div>
  </main>
</template>
