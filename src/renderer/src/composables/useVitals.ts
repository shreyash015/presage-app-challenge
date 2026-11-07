import { ref, shallowRef, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { SmartSpectraSDK, breathingMetrics, cardioMetrics } from '@smartspectra/node-sdk/renderer'
import { decodeMetrics } from '@smartspectra/node-sdk/messages'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const last = (arr?: any[] | null): any => (arr?.length ? arr[arr.length - 1] : undefined)

export interface UseVitals {
  videoEl: Ref<HTMLVideoElement | null>
  pulse: Ref<number | undefined>
  breathing: Ref<number | undefined>
  hint: Ref<string>
  running: Ref<boolean>
  start: () => Promise<void>
  stop: () => Promise<void>
}

export function useVitals(): UseVitals {
  const videoEl = ref<HTMLVideoElement | null>(null)
  const sdk = shallowRef<SmartSpectraSDK | null>(null)
  const pulse = ref<number>()
  const breathing = ref<number>()
  const hint = ref('')
  const running = ref(false)

  onMounted(() => {
    const s = new SmartSpectraSDK({
      apiKey: import.meta.env.RENDERER_VITE_SMARTSPECTRA_API_KEY,
      requestedMetrics: [...breathingMetrics, ...cardioMetrics]
    })
    s.on('streamAvailable', (stream) => {
      if (videoEl.value) videoEl.value.srcObject = stream
    })
    s.on('metrics', (buf) => {
      const m = decodeMetrics(buf)
      const p = last(m.cardio?.pulseRate)?.value
      const b = last(m.breathing?.rate)?.value
      if (p) pulse.value = p
      if (b) breathing.value = b
    })
    s.on('validationStatus', (_c, _t, h) => (hint.value = h))
    s.on('error', (code, msg) => console.error('SmartSpectra', code, msg))
    sdk.value = s
  })
  onBeforeUnmount(() => sdk.value?.destroy())

  const start = async (): Promise<void> => {
    await sdk.value?.start()
    running.value = true
  }
  const stop = async (): Promise<void> => {
    await sdk.value?.stop()
    running.value = false
  }
  return { videoEl, pulse, breathing, hint, running, start, stop }
}
