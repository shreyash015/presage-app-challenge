<script setup lang="ts">
/**
 * Preview harness for the consent-screen redesign. Renders ConsentScreenV2 on its own and only
 * records the events it emits: it never starts the camera, the SDK or any network call.
 *
 * URL options:
 *   ?shots           hide the prototype bar (for screenshots)
 *   ?simulate=error  1.6s after "Turn on camera", report a start failure, to preview the error state
 */
import { ref } from 'vue'
import ConsentScreenV2 from './ConsentScreenV2.vue'

const params = new URLSearchParams(location.search)
const showFlag = !params.has('shots')
const last = ref('none yet')
const error = ref<string | null>(null)

function record(name: string): void {
  last.value = `${name} at ${new Date().toLocaleTimeString()}`
  if (name === 'accept' && params.get('simulate') === 'error') {
    setTimeout(() => {
      error.value =
        'Aurae couldn’t start the camera. Allow camera access for Aurae in System Settings › Privacy & Security › Camera, then try again.'
    }, 1600)
  }
}
</script>

<template>
  <ConsentScreenV2 :error="error" @accept="record('accept')" @decline="record('decline')" />
  <p v-if="showFlag" class="flag" role="status">
    Prototype · camera stays off · last event: <b>{{ last }}</b>
  </p>
</template>

<style scoped>
.flag {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  margin: 0;
  padding: 6px 12px;
  border-radius: 2px;
  background: rgba(27, 27, 25, 0.86);
  color: #faf9f6;
  font: 500 12px/1.4 'Urbanist Variable', 'Urbanist', system-ui, sans-serif;
  z-index: 50;
  pointer-events: none;
}
</style>
