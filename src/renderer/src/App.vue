<script setup lang="ts">
import { ref } from 'vue'
import ConsentScreen from './components/ConsentScreen.vue'
import SessionScreen from './components/SessionScreen.vue'
import { useVitals } from './composables/useVitals'
import { startProblem } from './composables/errorMessages'

const consented = ref(false)
const startError = ref<string | null>(null)
const stopping = ref(false)

const { stream, pulse, breathing, hrv, stable, hint, error, start, stop } = useVitals()

// The consent screen stays up (showing "Starting camera…") until the camera has started,
// so a failure can be shown there instead of on a blank page.
async function onAccept(): Promise<void> {
  startError.value = null
  try {
    await start() // camera turns on only here
    consented.value = true
  } catch (e) {
    console.error('Aurae: camera start failed', e)
    // Say what actually went wrong (permission, no camera, camera busy, API key, network…)
    const { what, fix } = startProblem(e)
    startError.value = `${what} ${fix} Then try again.`
  }
}

// Stop camera: release the camera, clear the readings, return to the consent screen
async function onStop(): Promise<void> {
  stopping.value = true
  try {
    await stop()
  } catch (e) {
    console.error('Aurae: camera stop failed', e)
  } finally {
    stopping.value = false
    consented.value = false
  }
}
</script>

<template>
  <ConsentScreen v-if="!consented" :error="startError" @accept="onAccept" />
  <SessionScreen
    v-else
    :stream="stream"
    :pulse="pulse"
    :breathing="breathing"
    :hrv="hrv"
    :stable="stable"
    :hint="hint"
    :error="error"
    :stopping="stopping"
    @stop="onStop"
  />
</template>
