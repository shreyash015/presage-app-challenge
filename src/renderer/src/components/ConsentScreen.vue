<script setup lang="ts">
/**
 * ConsentScreen — shown before the camera turns on (Aurae v2 design system, design/tokens.css).
 *
 *   - emits `accept` only when the consent box is ticked
 *   - emits `decline` from "Not now"
 *   - never touches the camera or the SDK itself; the parent starts the camera and, if that
 *     fails, passes the message back through the `error` prop
 * Disclosure text is unchanged from the original screen (proposed corrections await approval).
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import OrbitMotif from './OrbitMotif.vue'
import AtmosCard from './AtmosCard.vue'
import LedDots from './LedDots.vue'
import { enter } from '../design/motion'
import '../design/tokens.css'

const emit = defineEmits<{ accept: []; decline: [] }>()

/**
 * Optional: the parent passes `error` if starting the camera fails (e.g. permission denied).
 * The screen then leaves its "Starting camera…" state and shows the message.
 */
const props = defineProps<{ error?: string | null }>()

const reduce = useReducedMotion()
const agreed = ref(false)
const needTick = ref(false)
const starting = ref(false)
const checkbox = ref<HTMLInputElement | null>(null)

// ---- Disclosures (unchanged from the original screen) ----
const lead =
  'Aurae turns signals from your camera into the shapes and colours on this screen. Here is exactly what that means.'
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
const disclaimer =
  'Readings are for reflection and play. They are not medical advice and cannot diagnose anything.'
const consentLine = 'I understand what Aurae reads and sends, and I want to start a session.'
const sitNote =
  'Sit comfortably and face the camera in soft, even light. Readings appear after a few seconds of stillness.'

// Only readings the app actually requests (useVitals: breathingMetrics + cardioMetrics)
const readings = [
  { label: 'Pulse', unit: 'bpm', family: 'verdant', art: 'orbit' },
  { label: 'Breathing rate', unit: '/ min', family: 'champagne', art: 'helix' },
  { label: 'Heart-rate variability', unit: 'ms', family: 'dusk', art: 'arcs' }
] as const

// ---- Explicit consent: the button stays focusable, but only a ticked box lets it through ----
function onTurnOn(): void {
  if (starting.value) return // ignore repeat presses while the camera starts
  if (agreed.value) {
    starting.value = true
    emit('accept')
    return
  }
  needTick.value = true
  checkbox.value?.focus()
}
watch(agreed, (v) => {
  if (v) needTick.value = false
})
// A start failure reported by the parent ends the "Starting camera…" state
watch(
  () => props.error,
  (e) => {
    if (e) starting.value = false
  }
)

// ---- Scroll cue: fade the bottom edge of the explanation while more is below ----
const body = ref<HTMLElement | null>(null)
const moreBelow = ref(false)
// Only a region that actually scrolls takes a Tab stop (below 1024px the page scrolls instead)
const scrollable = ref(false)
function checkScroll(): void {
  const el = body.value
  if (!el) return
  scrollable.value = el.scrollHeight > el.clientHeight + 1
  moreBelow.value = el.scrollHeight - el.scrollTop - el.clientHeight > 4
}
let ro: ResizeObserver | null = null
onMounted(() => {
  checkScroll()
  ro = new ResizeObserver(checkScroll)
  if (body.value) ro.observe(body.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <main class="aurae-v2 v2">
    <!-- ============ Hero: what is about to happen ============ -->
    <motion.section v-bind="enter(0, reduce)" class="hero" aria-label="About this session">
      <LedDots />

      <header class="hero__bar">
        <span class="brand">
          <svg class="brand__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
          </svg>
          <span class="brand__name">Aurae</span>
        </span>
        <span class="chip"><span class="chip__dot" />Camera off</span>
      </header>

      <p class="hero__title t-display">Heart &amp;<br />Breath</p>

      <div class="hero__orbit">
        <OrbitMotif callout />
      </div>

      <p class="hero__note t-body">{{ sitNote }}</p>
    </motion.section>

    <!-- ============ Consent: the decision ============ -->
    <motion.section v-bind="enter(1, reduce)" class="consent" aria-labelledby="consent-title">
      <!-- Named region; when it scrolls, Tab reaches it and arrow/Page keys scroll it -->
      <div
        ref="body"
        class="consent__body"
        :class="{ 'is-clipped': moreBelow }"
        :tabindex="scrollable ? 0 : undefined"
        role="region"
        aria-label="Consent details"
        @scroll="checkScroll"
      >
        <p class="t-micro consent__eyebrow">Camera consent</p>
        <h1 id="consent-title" class="t-headline consent__title">Before your camera turns on</h1>
        <p class="t-body consent__lead">{{ lead }}</p>

        <dl class="facts">
          <div v-for="s in sections" :key="s.title" class="fact">
            <dt class="t-body fact__title">{{ s.title }}</dt>
            <dd class="t-body fact__body">{{ s.body }}</dd>
          </div>
        </dl>

        <p class="t-label consent__disclaimer">{{ disclaimer }}</p>
      </div>

      <!-- Pinned: the decision never scrolls out of view -->
      <div class="decide">
        <label class="tick">
          <input
            ref="checkbox"
            v-model="agreed"
            type="checkbox"
            class="tick__box"
            :disabled="starting"
            aria-describedby="need-tick"
          />
          <svg class="tick__mark" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M5.5 10.5l3 3 6-7" />
          </svg>
          <span class="t-body">{{ consentLine }}</span>
        </label>
        <!-- One message slot, reserved height: no layout shift when it appears -->
        <p id="need-tick" class="need t-label" :class="{ 'need--error': error }" role="status" aria-live="polite">
          <Transition name="notice">
            <span v-if="error" key="e">{{ error }}</span>
            <span v-else-if="needTick" key="t">Tick the box above to turn on the camera.</span>
          </Transition>
        </p>
        <div class="actions">
          <button
            type="button"
            class="btn btn--primary"
            :class="{ 'is-starting': starting }"
            :aria-disabled="!agreed || starting"
            :aria-busy="starting"
            aria-describedby="need-tick"
            @click="onTurnOn"
          >
            <span v-if="starting" class="spinner" aria-hidden="true" />
            {{ starting ? 'Starting camera…' : 'Turn on camera' }}
          </button>
          <button type="button" class="btn" :disabled="starting" @click="emit('decline')">
            Not now
          </button>
        </div>
      </div>
    </motion.section>

    <!-- ============ Preview of what the camera unlocks ============ -->
    <ul class="cards" aria-label="Readings Aurae will show">
      <motion.li v-for="(r, i) in readings" :key="r.label" v-bind="enter(2 + i, reduce)" class="cards__item">
        <AtmosCard :label="r.label" :unit="r.unit" :family="r.family" :art="r.art" />
      </motion.li>
    </ul>
  </main>
</template>

<style scoped>
/* ================= Page grid =================
   < 1024    one column: compact hero, consent (decision pinned to the window bottom), cards
   1024–1359 two columns: hero over a row of cards | consent
   ≥ 1360    three columns: hero | consent | stacked cards                                     */
.v2 {
  box-sizing: border-box;
  min-height: 100dvh;
  padding: var(--seam);
  gap: var(--seam);
  background: var(--c-canvas);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'hero' 'consent' 'cards';
  -webkit-font-smoothing: antialiased;
}
@media (min-width: 1024px) {
  .v2 {
    height: 100dvh;
    min-height: 600px;
    grid-template-columns: minmax(0, 1fr) clamp(420px, 36vw, 480px);
    grid-template-rows: minmax(0, 1fr) 148px;
    grid-template-areas: 'hero consent' 'cards consent';
  }
}
@media (min-width: 1360px) {
  .v2 {
    grid-template-columns: minmax(0, 1fr) 460px minmax(260px, 300px);
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: 'hero consent cards';
  }
}

/* ================= Hero ================= */
.hero {
  grid-area: hero;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  border-radius: var(--r-panel);
  background-color: var(--c-panel);
  background-image: radial-gradient(var(--c-canvas-dot) 1px, transparent 1.2px);
  background-size: 12px 12px;
  padding: var(--s-5);
  display: grid;
  gap: var(--s-4);
  grid-template-columns: minmax(0, 1fr) clamp(116px, 28vw, 220px);
  grid-template-areas: 'bar bar' 'title orbit' 'note orbit';
  align-items: start;
}
.hero__bar {
  grid-area: bar;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
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
.hero__title {
  grid-area: title;
  margin: 0;
  position: relative;
  z-index: 1;
}
.hero__orbit {
  grid-area: orbit;
  height: clamp(116px, 28vw, 220px);
  min-width: 0;
}
/* No room for the callout in the compact hero: hide its label and its leader together */
.hero__orbit :deep(:is(.callout, .leader, .leader-joint)) {
  display: none;
}
.hero__note {
  grid-area: note;
  margin: 0;
  max-width: 36ch;
  color: var(--c-ink-2);
  position: relative;
  z-index: 1;
}
@media (min-width: 1024px) {
  .hero {
    padding: 28px 32px 32px;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    grid-template-areas: 'bar' 'title' 'orbit' 'note';
  }
  /* The orbit sits behind the title and note, filling the panel: asymmetric, editorial */
  .hero__orbit {
    grid-area: auto;
    grid-column: 1;
    grid-row: 2 / 5;
    height: 100%;
    padding: 24px 0 8px 12%;
  }
  .hero__orbit :deep(.callout) {
    display: grid;
  }
  .hero__orbit :deep(:is(.leader, .leader-joint)) {
    display: inline;
  }
}

/* ================= Consent ================= */
.consent {
  grid-area: consent;
  min-width: 0;
  min-height: 0;
  border-radius: var(--r-panel);
  background: var(--c-panel);
  box-shadow: var(--shadow-panel);
  display: flex;
  flex-direction: column;
  container-type: inline-size;
}
.consent__body {
  padding: 32px var(--s-5) var(--s-6);
}
/* Inset ring: the fade mask would otherwise clip an outside ring's bottom edge */
.consent__body:focus-visible {
  outline-offset: -3px;
  border-radius: var(--r-panel);
}
.consent__eyebrow {
  margin: 0 0 var(--s-3);
  color: var(--c-ink-3);
}
.consent__title {
  margin: 0 0 var(--s-3);
}
.consent__lead {
  margin: 0;
  max-width: 48ch;
  color: var(--c-ink-2);
}
.facts {
  margin: var(--s-6) 0 0;
  border-top: var(--b-hairline);
}
.fact {
  display: grid;
  gap: 2px;
  padding: 12px 0;
  border-bottom: var(--b-hairline);
}
.fact__title {
  font-weight: 500;
}
.fact__body {
  margin: 0;
  color: var(--c-ink-2);
}
@container (min-width: 520px) {
  .fact {
    grid-template-columns: 168px minmax(0, 1fr);
    gap: var(--s-6);
  }
}
.consent__disclaimer {
  margin: var(--s-4) 0 0;
  color: var(--c-ink-3);
  font-weight: 400;
  max-width: 56ch;
}

.decide {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: var(--s-4) var(--s-5) var(--s-5);
  background: var(--c-panel);
  border-top: var(--b-hairline);
  border-radius: 0 0 var(--r-panel) var(--r-panel);
}
/* ---- Checkbox: drawn to match the system (native input kept for semantics and keyboard) ---- */
.tick {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
  min-height: 44px;
  cursor: pointer;
}
.tick__box {
  appearance: none;
  flex: none;
  width: 20px;
  height: 20px;
  margin: 1px 0 0;
  border: 1.5px solid var(--c-control);
  border-radius: 3px;
  background: var(--c-panel);
  cursor: pointer;
  transition:
    background-color var(--dur-quick) var(--ease-out-soft),
    border-color var(--dur-quick) var(--ease-out-soft),
    box-shadow var(--dur-quick) var(--ease-out-soft);
}
.tick:hover .tick__box {
  border-color: var(--c-ink);
}
.tick__box:checked {
  background: var(--c-ink);
  border-color: var(--c-ink);
  /* the signal colour marks the moment of consent: a faint chartreuse halo */
  box-shadow: 0 0 0 3px var(--c-signal-halo);
}
.tick__box:disabled {
  cursor: default;
}
.tick__mark {
  position: absolute;
  left: 0;
  top: 1px;
  width: 20px;
  height: 20px;
  pointer-events: none;
  fill: none;
  stroke: var(--c-panel);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 14;
  stroke-dashoffset: 14;
  transition: stroke-dashoffset var(--dur-gentle) var(--ease-out-soft);
}
.tick__box:checked + .tick__mark {
  stroke-dashoffset: 0; /* the tick draws itself in */
}

.need {
  min-height: 18px;
  margin: 0 0 var(--s-2);
  padding-left: 32px;
  color: var(--c-notice);
}
.need--error {
  margin-top: var(--s-1);
  max-width: 52ch;
  line-height: 1.45;
}
.notice-enter-active {
  transition:
    opacity var(--dur-gentle) var(--ease-out-soft),
    transform var(--dur-gentle) var(--ease-out-soft);
}
.notice-enter-from {
  opacity: 0;
  transform: translateY(-3px);
}
.notice-leave-active {
  display: none;
}

/* ---- Starting state: a small signal dot breathing inside the button ---- */
.btn--primary.is-starting {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: progress;
}
.spinner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-signal);
  animation: signal-breathe 1.4s var(--ease-in-out-calm) infinite;
}
@keyframes signal-breathe {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none; /* the label "Starting camera…" carries the state */
  }
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}
.actions .btn {
  flex: 1 1 auto;
}

/* Short windows (or 200% zoom): pinning the decision would cover too much of the disclosures,
   so it returns to the normal flow after the text. */
@media (max-width: 1023px) and (max-height: 560px) {
  .decide {
    position: static;
  }
}

@media (min-width: 640px) {
  .consent__body {
    padding: 40px var(--s-10) var(--s-6);
  }
  .decide {
    padding: var(--s-5) var(--s-10) var(--s-6);
  }
  .actions .btn {
    flex: 0 0 auto;
  }
}
@media (min-width: 1024px) {
  /* Only the explanation scrolls; the decision stays put */
  .consent__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .consent__body.is-clipped {
    -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 56px), transparent);
    mask-image: linear-gradient(180deg, #000 calc(100% - 56px), transparent);
  }
  .decide {
    position: static;
  }
}

/* ================= Cards ================= */
.cards {
  grid-area: cards;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--seam);
  grid-template-columns: minmax(0, 1fr);
  min-height: 0;
}
.cards__item {
  min-width: 0;
  min-height: 0;
}
@media (min-width: 640px) {
  .cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1360px) {
  .cards {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(3, minmax(0, 1fr));
  }
}
</style>
