<script setup lang="ts">
/**
 * AtmosCard — reading preview card.
 * One atmosphere (gradient family) + one static line drawing per reading (design/cardArt.ts).
 * The art is decorative and carries no data: no values, scales or classifications are shown
 * until the camera is on. The drawing sits in the card's flow, so the card grows to fit it.
 */
import { drawing, type ArtKind } from '../design/cardArt'

const props = defineProps<{
  label: string
  unit: string
  family: 'verdant' | 'champagne' | 'dusk' | 'mist'
  art: 'orbit' | 'helix' | 'arcs'
}>()

// Same prop values as the live card; each maps to its new drawing
const kind: ArtKind = props.art === 'orbit' ? 'pulse' : props.art === 'helix' ? 'breathing' : 'hrv'
const drawn = drawing(kind)
const fadeId = `aurae-art-fade-${kind}`
</script>

<template>
  <article :class="['card', 'card--' + family]" :aria-label="`${label}, waiting for camera`">
    <span class="card__label">{{ label }}</span>
    <div class="card__value" aria-hidden="true">
      <span class="t-metric">–&thinsp;–</span><span class="card__unit">{{ unit }}</span>
    </div>
    <!-- In the card's flow, between the value and the status: the card grows to fit it (option A) -->
    <svg
      class="card__art"
      viewBox="0 0 340 130"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      pointer-events="none"
    >
      <!-- Strokes marked `fade` (the implied HRV baseline) dissolve towards both ends -->
      <defs v-if="drawn.strokes.some((s) => s.fade)">
        <linearGradient :id="fadeId" gradientUnits="userSpaceOnUse" x1="8" y1="0" x2="332" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0" />
          <stop offset="0.16" stop-color="#fff" stop-opacity="1" />
          <stop offset="0.84" stop-color="#fff" stop-opacity="1" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g class="art">
        <path
          v-for="(s, i) in drawn.strokes"
          :key="i"
          :d="s.d"
          :stroke="s.fade ? `url(#${fadeId})` : undefined"
          :opacity="s.opacity"
          :stroke-width="s.width ?? 1"
          vector-effect="non-scaling-stroke"
        />
        <circle
          v-for="(d, i) in drawn.dots"
          :key="'d' + i"
          :cx="d.x"
          :cy="d.y"
          :r="d.r"
          :class="d.tone === 'signal' ? 'art__signal' : 'art__dot'"
        />
      </g>
    </svg>
    <span class="chip chip--glass card__status"><span class="chip__dot" />Waiting for camera</span>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  box-sizing: border-box;
  height: 100%;
  min-height: 140px;
  padding: 18px 20px;
  border-radius: var(--r-panel);
  color: var(--c-on-atmos);
  display: flex;
  flex-direction: column;
}

.card--verdant {
  background: var(--atmos-verdant);
}

.card--champagne {
  background: var(--atmos-champagne);
}

.card--dusk {
  background: var(--atmos-dusk);
}

.card--mist {
  background: var(--atmos-mist);
}

/* Scrim behind the label, so white text passes contrast on every family */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--atmos-scrim);
}

/* Film grain, as on the live cards */
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.18;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

/* New artwork, option A: in the card's normal flow between the value and the status chip, so
   the card grows to fit it and the drawing can never overlap the text. The drawing fills
   x 14…326 = 92% of the viewBox, so the box is 87% of the card's full width (87% × 92% ≈ 80%),
   centred across the card's padding. Aspect ratio is locked to 340×130: never distorted. If a
   tall card is ever shorter than its content, the drawing shrinks uniformly (flex-shrink) rather
   than pushing the status chip out of the card. */
.card__art {
  display: block;
  flex: 0 1 auto;
  min-height: 0;
  width: calc((100% + 40px) * 0.87);
  height: auto;
  aspect-ratio: 340 / 130;
  margin: auto 0 12px calc((100% + 40px) * 0.065 - 20px);
  overflow: visible;
  pointer-events: none;
}

.art {
  fill: none;
  stroke: var(--c-on-atmos);
  stroke-linecap: round;
}

.art :is(path, ellipse, line) {
  /* also set as an attribute on each path */
  vector-effect: non-scaling-stroke;
}

.art__dot {
  fill: var(--c-on-atmos);
  stroke: none;
}

.art__signal {
  fill: var(--c-signal);
  stroke: none;
}

.card__label {
  max-width: 56%;
  /* text column: the art zone takes the rest */
  min-height: 2.7em;
  /* room for two lines, so values align across cards */
  font-size: 14px;
  line-height: 1.35;
  font-weight: 500;
}

.card__value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 10px;
}

/* Units set large and light, as in the references ("25 years"). At 24px this is WCAG large text
   (3:1), which holds on the lighter mid-tones of short cards where 15px text could not reach 4.5:1. */
.card__unit {
  font-size: 24px;
  line-height: 1;
  font-weight: 300;
  letter-spacing: -0.01em;
  color: var(--c-on-atmos);
}

.card__status {
  align-self: flex-start;
  max-width: 100%;
}
</style>
