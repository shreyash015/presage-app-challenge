<script setup lang="ts">
/**
 * AtmosCard — metric preview card.
 * One atmosphere (gradient family) + one line-art form per reading. The art is decorative and
 * carries no data: no values, scales or classifications are shown until the camera is on.
 */
const props = defineProps<{
  label: string
  unit: string
  family: 'verdant' | 'champagne' | 'dusk' | 'mist'
  art: 'orbit' | 'helix' | 'arcs'
}>()

// Helix: a bundle of sine waves tied together at both ends (breathing)
const helix = Array.from({ length: 5 }, (_, i) => {
  const amp = 14 + i * 4
  const phase = i * 0.45
  const pts: string[] = []
  for (let s = 0; s <= 60; s++) {
    const t = s / 60
    const x = 22 + t * 170
    const y = 84 + amp * Math.sin(t * Math.PI * 3 + phase) * Math.sin(t * Math.PI)
    pts.push(`${s ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
})

// Arcs: from one origin to points along a baseline (variability between beats)
const arcEnds = [84, 132, 182]
const arcs = arcEnds.map((x2, i) => {
  const h = 52 + i * 18
  return `M24 118 C24 ${118 - h} ${x2} ${118 - h * 1.15} ${x2} 118`
})
const ticks = [44, 64, 104, 116, 152, 166]

// Orbit: the hero motif in miniature (pulse)
const minis = [10, 18, 26, 34, 42]
const ringsFor = props.art === 'orbit' ? minis : []
</script>

<template>
  <article :class="['card', 'card--' + family]" :aria-label="`${label}, waiting for camera`">
    <svg class="card__art" viewBox="0 0 200 140" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      <g v-if="art === 'orbit'" class="art">
        <template v-for="k in ringsFor" :key="k">
          <ellipse cx="140" :cy="78 - k * 0.7" :rx="k * 0.85" :ry="k * 0.7" />
          <ellipse cx="140" :cy="78 + k * 0.7" :rx="k * 0.85" :ry="k * 0.7" />
        </template>
        <ellipse cx="140" cy="78" rx="62" ry="7" opacity=".6" />
        <circle cx="140" cy="78" r="3" class="art__signal" />
      </g>

      <g v-else-if="art === 'helix'" class="art">
        <line x1="12" y1="84" x2="198" y2="84" opacity=".45" />
        <path v-for="(d, i) in helix" :key="i" :d="d" />
        <circle cx="22" cy="84" r="2.5" class="art__dot" />
        <circle cx="192" cy="84" r="3" class="art__signal" />
      </g>

      <g v-else class="art">
        <path v-for="(d, i) in arcs" :key="i" :d="d" />
        <circle v-for="x in ticks" :key="'t' + x" :cx="x" cy="118" r="1.2" class="art__dot" />
        <circle v-for="x in arcEnds" :key="'e' + x" :cx="x" cy="118" r="2.6" class="art__dot" />
        <circle cx="24" cy="118" r="3" class="art__signal" />
      </g>
    </svg>

    <span class="card__label">{{ label }}</span>
    <div class="card__value" aria-hidden="true">
      <span class="t-metric">–&thinsp;–</span><span class="card__unit">{{ unit }}</span>
    </div>
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
.card--verdant { background: var(--atmos-verdant); }
.card--champagne { background: var(--atmos-champagne); }
.card--dusk { background: var(--atmos-dusk); }
.card--mist { background: var(--atmos-mist); }

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

/* The art lives in its own right-hand zone and never runs under the text column
   (in short cards it used to cross the label and unit, failing contrast) */
.card__art {
  position: absolute;
  right: 10px;
  bottom: 36px; /* clear of the status chip row */
  width: min(42%, 170px);
  height: calc(100% - 52px);
  z-index: -1;
}
.art {
  fill: none;
  stroke: var(--c-geometry-atmos);
  stroke-width: 0.9;
}
.art :is(path, ellipse, line) {
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
  max-width: 56%; /* text column: the art zone takes the rest */
  min-height: 2.7em; /* room for two lines, so values align across cards */
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
  margin-top: auto;
  align-self: flex-start;
  max-width: 100%;
}
</style>
