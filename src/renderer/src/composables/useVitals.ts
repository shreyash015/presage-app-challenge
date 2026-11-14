import { ref, shallowRef, watch, onMounted, onBeforeUnmount, type Ref, type ShallowRef } from 'vue'
import { SmartSpectraSDK, MetricType } from '@smartspectra/node-sdk/renderer'
import { decodeMetrics } from '@smartspectra/node-sdk/messages'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const last = (arr?: any[] | null): any => (arr?.length ? arr[arr.length - 1] : undefined)

/** Whether each reading is reported stable by the SDK (until then the UI says "Settling"). */
export interface Stability {
  pulse: boolean
  breathing: boolean
  hrv: boolean
}

export interface UseVitals {
  videoEl: Ref<HTMLVideoElement | null>
  /** The camera stream, kept so a view mounted after start() can still show it */
  stream: ShallowRef<MediaStream | null>
  pulse: Ref<number | undefined>
  breathing: Ref<number | undefined>
  /** HRV as RMSSD, in milliseconds */
  hrv: Ref<number | undefined>
  stable: Ref<Stability>
  hint: Ref<string>
  /** Last SDK error message while running, if any */
  error: Ref<string | null>
  running: Ref<boolean>
  start: () => Promise<void>
  stop: () => Promise<void>
}

export function useVitals(): UseVitals {
  const videoEl = ref<HTMLVideoElement | null>(null)
  const stream = shallowRef<MediaStream | null>(null)
  const sdk = shallowRef<SmartSpectraSDK | null>(null)
  const pulse = ref<number>()
  const breathing = ref<number>()
  const hrv = ref<number>()
  const stable = ref<Stability>({ pulse: false, breathing: false, hrv: false })
  const hint = ref('')
  const error = ref<string | null>(null)
  const running = ref(false)

  // The SDK hands over the stream during start(), before any session view exists; attach it
  // whenever both a <video> element and a stream are present.
  watch([videoEl, stream], ([el, s]) => {
    if (el && el.srcObject !== s) el.srcObject = s
  })

  onMounted(() => {
    const s = new SmartSpectraSDK({
      apiKey: import.meta.env.RENDERER_VITE_SMARTSPECTRA_API_KEY,
      // Only what Aurae shows. The full breathingMetrics + cardioMetrics groups (11 types) also
      // requested an arterial-pressure trace, whose model isn't bundled with the SDK and was
      // fetched from Presage at start-up ("Falling back to remote delivery"), plus breathing
      // amplitude, apnea and others that Aurae neither displays nor discloses.
      requestedMetrics: [MetricType.PULSE_RATE, MetricType.HRV, MetricType.BREATHING_RATE]
    })
    s.on('streamAvailable', (st) => {
      stream.value = st
    })
    s.on('metrics', (buf) => {
      const m = decodeMetrics(buf)
      const p = last(m.cardio?.pulseRate)
      const b = last(m.breathing?.rate)
      const h = last(m.cardio?.hrv)
      if (p?.value) [pulse.value, stable.value.pulse] = [p.value, !!p.stable]
      if (b?.value) [breathing.value, stable.value.breathing] = [b.value, !!b.stable]
      if (h?.rmssd) {
        // RMSSD is conventionally reported in ms; convert if the SDK reports seconds
        hrv.value = h.rmssd < 2 ? h.rmssd * 1000 : h.rmssd
        stable.value.hrv = !!h.stable
      }
      error.value = null
    })
    s.on('validationStatus', (_c, _t, h) => (hint.value = h))
    s.on('error', (code, msg) => {
      console.error('SmartSpectra', code, msg)
      error.value = msg
    })
    sdk.value = s
  })
  onBeforeUnmount(() => sdk.value?.destroy())

  const start = async (): Promise<void> => {
    error.value = null
    await sdk.value?.start()
    running.value = true
  }
  const stop = async (): Promise<void> => {
    await sdk.value?.stop() // also releases the camera the SDK opened
    running.value = false
    // Nothing is kept between sessions
    stream.value = null
    pulse.value = breathing.value = hrv.value = undefined
    stable.value = { pulse: false, breathing: false, hrv: false }
    hint.value = ''
  }
  return { videoEl, stream, pulse, breathing, hrv, stable, hint, error, running, start, stop }
}
