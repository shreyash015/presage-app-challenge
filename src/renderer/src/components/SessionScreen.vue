<script setup lang="ts">
/**
 * SessionScreen — shown while the camera is on (minimal version, before the full dashboard).
 *
 *  - the camera feed, softened: greyscale, mirrored, faded at the edges (never a sharp video)
 *  - "Camera on" status and a Stop camera button, always in the same place
 *  - the SDK's positioning hint, and any SDK error, announced to screen readers
 *  - live pulse, breathing rate and heart-rate variability in the Aurae reading cards
 * It only displays what it is given; starting and stopping the camera stay in App.vue.
 */
import { computed, onMounted, ref, watch } from 'vue'
import AtmosCard from './AtmosCard.vue'
import type { Stability } from '../composables/useVitals'
import '../design/tokens.css'

const props = defineProps<{
  stream: MediaStream | null
  pulse?: number
  breathing?: number
  hrv?: number
  stable: Stability
  hint: string
  error: string | null
  stopping?: boolean
}>()
const emit = defineEmits<{ stop: [] }>()

const video = ref<HTMLVideoElement | null>(null)
const attach = (): void => {
  if (video.value && video.value.srcObject !== props.stream) video.value.srcObject = props.stream
}
onMounted(attach)
watch(() => props.stream, attach)

// Status chips: honest about what the reading is doing; never a clinical judgement
const status = (value: number | undefined, stable: boolean): string =>
  value == null ? 'Waiting for a reading' : stable ? 'Steady signal' : 'Settling'

const anyReading = computed(() => props.pulse != null || props.breathing != null || props.hrv != null)
const hintText = computed(
  () =>
    props.hint ||
    (anyReading.value ? '' : 'Sit still and face the camera. Readings settle after a few seconds.')
)
</script>

<template>
  <main class="aurae-v2 session">
    <section class="hero" aria-label="Your camera">
      <div class="cam" aria-hidden="true">
        <video ref="video" autoplay muted playsinline />
      </div>

      <header class="hero__bar">
        <span class="brand">
          <svg class="brand__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
          </svg>
          <span class="brand__name">Aurae</span>
        </span>
        <span class="controls">
          <span class="chip chip--live"><span class="chip__dot" />Camera on</span>
          <button
            type="button"
            class="btn btn--primary"
            :disabled="stopping"
            :aria-busy="stopping"
            @click="emit('stop')"
          >
            {{ stopping ? 'Stopping…' : 'Stop camera' }}
          </button>
        </span>
      </header>

      <p class="hero__title t-display">Heart &amp;<br />Breath</p>

      <div class="hero__foot">
        <p v-if="error" class="hero__error t-body" role="alert">
          {{ error }} Stop the camera and try again.
        </p>
        <p v-else class="hero__hint t-body" role="status" aria-live="polite">{{ hintText }}</p>
        <p class="hero__note t-label">
          Readings are for reflection and play. They are not medical advice and cannot diagnose
          anything.
        </p>
      </div>
    </section>

    <ul class="readings" aria-label="Your readings">
      <li>
        <AtmosCard
          label="Pulse"
          unit="bpm"
          family="verdant"
          art="orbit"
          :value="pulse"
          :status="status(pulse, stable.pulse)"
        />
      </li>
      <li>
        <AtmosCard
          label="Breathing rate"
          unit="/ min"
          family="champagne"
          art="helix"
          :value="breathing"
          :status="status(breathing, stable.breathing)"
        />
      </li>
      <li>
        <AtmosCard
          label="Heart-rate variability"
          unit="ms"
          family="dusk"
          art="arcs"
          :value="hrv"
          :status="status(hrv, stable.hrv)"
        />
      </li>
    </ul>
  </main>
</template>

<style scoped>
/* ================= Page grid =================
   < 1024  one column: camera panel, then the cards (3 across from 640px)
   ≥ 1024  camera panel | a column of the three cards                       */
.session {
  box-sizing: border-box;
  min-height: 100dvh;
  padding: var(--seam);
  gap: var(--seam);
  background: var(--c-canvas);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  -webkit-font-smoothing: antialiased;
}
@media (min-width: 1024px) {
  .session {
    height: 100dvh;
    min-height: 600px;
    grid-template-columns: minmax(0, 1fr) clamp(290px, 27vw, 360px);
  }
}

/* ================= Camera panel ================= */
.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: min(70dvh, 560px);
  border-radius: var(--r-panel);
  background-color: var(--c-panel);
  background-image: radial-gradient(var(--c-canvas-dot) 1px, transparent 1.2px);
  background-size: 12px 12px;
  padding: var(--s-5);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: var(--s-4);
}
@media (min-width: 1024px) {
  .hero {
    min-height: 0;
    padding: 28px 32px 32px;
  }
}
.cam {
  position: absolute;
  inset: 0;
  z-index: -1;
}
.cam video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scaleX(-1); /* mirrored, like a mirror */
  filter: grayscale(1) contrast(1.06) brightness(1.05);
  opacity: 0.92;
  -webkit-mask-image: radial-gradient(ellipse 46% 62% at 58% 46%, #000 40%, transparent 88%);
  mask-image: radial-gradient(ellipse 46% 62% at 58% 46%, #000 40%, transparent 88%);
}
/* fade into the panel at the bottom, so the hint and note sit on a calm ground */
.cam::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 55%, var(--c-panel) 96%);
  pointer-events: none;
}

.hero__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  flex-wrap: wrap;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.brand__mark {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: var(--c-ink);
  stroke-width: 1.1;
  stroke-linecap: round;
}
.brand__name {
  font-size: 17px;
  font-weight: 500;
}
.controls {
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
}
.chip--live .chip__dot {
  background: var(--c-signal);
  box-shadow: 0 0 0 1px var(--c-signal-edge);
}
.hero__title {
  margin: 0;
}
.hero__foot {
  grid-row: 4;
  display: grid;
  gap: var(--s-2);
  max-width: 46ch;
}
.hero__hint {
  margin: 0;
  min-height: 1.55em; /* reserved: no shift when the hint changes */
  color: var(--c-ink);
  font-weight: 500;
}
.hero__error {
  margin: 0;
  color: var(--c-notice);
  font-weight: 500;
}
.hero__note {
  margin: 0;
  color: var(--c-ink-3);
  font-weight: 400;
}

/* ================= Readings ================= */
.readings {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--seam);
  grid-template-columns: minmax(0, 1fr);
  min-height: 0;
}
@media (min-width: 640px) and (max-width: 1023px) {
  .readings {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
/* Wide windows: the three cards share the column height equally. If that is less than their
   natural height, each card's drawing shrinks evenly (AtmosCard's art is flex-shrinkable),
   so all three readings stay on screen without scrolling. */
@media (min-width: 1024px) {
  .readings {
    grid-template-rows: repeat(3, minmax(0, 1fr));
  }
  .readings > li {
    min-height: 0;
  }
}
</style>
