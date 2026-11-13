<script setup lang="ts">
import { ref } from 'vue'
import ConsentScreen from './components/ConsentScreen.vue'
import SessionScreen from './components/SessionScreen.vue'
import { useVitals } from './composables/useVitals'

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
    startError.value =
      'Aurae couldn’t start the camera. Allow camera access for Aurae in System Settings › Privacy & Security › Camera, then try again.'
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
  <!-- "Not now" (decline) still has no destination: see the readiness report, item A5 -->
  <ConsentScreen
    v-if="!consented"
    :error="startError"
    @accept="onAccept"
    @decline="consented = false"
  />
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
