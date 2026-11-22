import { SmartSpectraErrorCode } from '@smartspectra/node-sdk/renderer'

/**
 * Plain-language explanations for why the camera or a session failed.
 *
 * Two sources of failure reach the app:
 *  - the camera itself (the browser's getUserMedia): a named DOMException such as
 *    NotAllowedError, which the SDK wraps as `error.cause`
 *  - the SmartSpectra service: a numeric `code` (SmartSpectraErrorCode) on the thrown error
 *    or on the SDK's 'error' event
 *
 * Each explanation is `what` went wrong plus `fix`, the one thing to do about it. Callers add
 * how to retry, which differs between the consent screen and a running session.
 */
export interface Problem {
  what: string
  fix: string
}

const C = SmartSpectraErrorCode

const PERMISSION: Problem = {
  what: 'Aurae doesn’t have permission to use your camera.',
  fix: 'Allow camera access for Aurae in System Settings › Privacy & Security › Camera.'
}
const NO_CAMERA: Problem = {
  what: 'Aurae couldn’t find a camera.',
  fix: 'Connect a camera, or check that your built-in camera is turned on.'
}
const CAMERA_BUSY: Problem = {
  what: 'Your camera is being used by another app.',
  fix: 'Close apps that might be using it, such as FaceTime or Zoom.'
}
const AUTH: Problem = {
  what: 'Aurae couldn’t sign in to the SmartSpectra service.',
  fix: 'Check the API key in the .env.local file (RENDERER_VITE_SMARTSPECTRA_API_KEY) and restart Aurae.'
}
const CREDITS: Problem = {
  what: 'Your SmartSpectra account has run out of credits.',
  fix: 'Check your plan at physiology.presagetech.com.'
}
const NETWORK: Problem = {
  what: 'Aurae couldn’t reach the SmartSpectra service.',
  fix: 'Check your internet connection.'
}
const SERVER: Problem = {
  what: 'The SmartSpectra service had a problem.',
  fix: 'Wait a minute.'
}
const UNKNOWN: Problem = {
  what: 'Aurae couldn’t start the camera.',
  fix: 'If this keeps happening, restart Aurae.'
}

const byCameraError: Record<string, Problem> = {
  NotAllowedError: PERMISSION,
  SecurityError: PERMISSION,
  NotFoundError: NO_CAMERA,
  OverconstrainedError: NO_CAMERA,
  NotReadableError: CAMERA_BUSY,
  AbortError: CAMERA_BUSY
}

const bySdkCode: Partial<Record<number, Problem>> = {
  [C.kAuthenticationFailed]: AUTH,
  [C.kCreditExhausted]: CREDITS,
  [C.kNetworkError]: NETWORK,
  [C.kServerError]: SERVER,
  [C.kInputUnavailable]: NO_CAMERA
}

/** For an SDK error code plus its message (the 'error' event). Undefined if not recognised. */
export function sdkProblem(code: number, message = ''): Problem | undefined {
  return (
    bySdkCode[code] ??
    // Some failures arrive with code 0 and only a descriptive message
    (/auth|api key|unauthori[sz]ed|forbidden/i.test(message)
      ? AUTH
      : /credit|quota/i.test(message)
        ? CREDITS
        : /network|connect|resolve host|timed? ?out|offline/i.test(message)
          ? NETWORK
          : undefined)
  )
}

/** For anything thrown by starting the camera. Always returns an explanation. */
export function startProblem(err: unknown): Problem {
  const e = err as { name?: string; code?: unknown; message?: string; cause?: { name?: string } }
  const cameraError = e?.cause?.name ?? e?.name
  if (cameraError && byCameraError[cameraError]) return byCameraError[cameraError]
  // The SDK puts the camera error's name in its message too: "Failed to acquire ... (NotAllowedError)"
  const named = /\((\w+Error)\)/.exec(e?.message ?? '')?.[1]
  if (named && byCameraError[named]) return byCameraError[named]
  return sdkProblem(typeof e?.code === 'number' ? e.code : 0, e?.message) ?? UNKNOWN
}
