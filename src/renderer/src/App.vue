<script setup lang="ts">
import { computed } from 'vue'
import { motion } from 'motion-v'
import { ref } from 'vue'
import ConsentScreen from './components/ConsentScreen.vue'
import { useVitals } from './composables/useVitals'

const consented = ref(false)
const startError = ref<string | null>(null)

// The consent screen stays up (showing "Starting camera…") until the camera has started,
// so a failure can be shown there instead of on a blank page.
async function onAccept(): Promise<void> {
  startError.value = null
  try {
    await start() // camera turns on only here
    consented.value = true
  } catch (e) {
    console.error('Aurae: camera start failed', e)
    startError.value =
      'Aurae couldn’t start the camera. Allow camera access for Aurae in System Settings › Privacy & Security › Camera, then try again.'
  }
}

const { videoEl, pulse, breathing, hint, running, start, stop } = useVitals()
const beat = computed(() => (pulse.value ? 60 / pulse.value : 1))
</script>

<template>
  <!-- The consent screen is a full page of its own, so it is not wrapped in the session layout -->
  <!-- "Not now" (decline) still has no destination: see the readiness report, item A5 -->
  <ConsentScreen
    v-if="!consented"
    :error="startError"
    @accept="onAccept"
    @decline="consented = false"
  />
  <main
    v-else
    class="min-h-dvh bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-6 p-4 sm:p-8"
  >
    <!-- <video ref="videoEl" autoplay muted playsinline class="w-full max-w-120 rounded-2xl ring-1 ring-white/10" />
    <motion.div class="text-6xl inline-block" :animate="{ scale: [1, 1.18, 1] }"
      :transition="{ duration: beat, repeat: Infinity, ease: 'easeOut' }">❤</motion.div>
    <p class="text-lg">
      Pulse: <b>{{ pulse?.toFixed(0) ?? '…' }}</b> bpm · Breathing:
      <b>{{ breathing?.toFixed(0) ?? '…' }}</b> /min
    </p>
    <p class="text-sm text-amber-300">{{ hint }}</p>
    <button class="rounded-full bg-rose-500 px-6 py-2 font-medium hover:bg-rose-400"
      @click="running ? stop() : start()">
      {{ running ? 'Stop camera' : 'Start' }}
    </button> -->
  </main>
</template>
