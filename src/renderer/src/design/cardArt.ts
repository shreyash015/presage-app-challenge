/**
 * Reading-card artwork geometry (used by components/AtmosCard.vue).
 *
 * Coordinate system: viewBox "0 0 340 130". Every drawing spans x = 14 … 326 (92% of the box).
 *
 * Each curve is a mathematical function y(t) over t ∈ [0, 1] with x(t) = 14 + 312·t. It is
 * converted exactly into cubic Bézier segments by cubic Hermite interpolation: for a segment
 * [a, b], the control points sit one third of the way along the curve's own tangent at each end
 * (P1 = P0 + (b−a)/3 · C′(a), P2 = P3 − (b−a)/3 · C′(b)). The result is smooth (C¹) with no
 * hand-placed coordinates. HRV arches are single cubics whose apex height is exact (see below).
 *
 * One parameter set for every card size: the card grows to fit the drawing (option A), so the
 * drawing scales uniformly and is never stretched or flattened.
 * Static by design: no time parameter, nothing animates.
 */

export type ArtKind = 'pulse' | 'breathing' | 'hrv'

export interface Stroke {
  d: string
  opacity: number
  width?: number
  /** Fade the stroke out towards both ends (an implied line rather than a ruled one) */
  fade?: boolean
}
export interface Dot {
  x: number
  y: number
  r: number
  tone: 'white' | 'signal'
}
export interface Drawing {
  strokes: Stroke[]
  dots: Dot[]
}

const X0 = 14
const X1 = 326
const W = X1 - X0
const SEGMENTS = 16
const f = (n: number): string => (Math.round(n * 100) / 100).toString()

/** Cubic Hermite → Bézier path of a function y(t), x(t) = X0 + W·t. */
function curve(y: (t: number) => number): string {
  const eps = 1e-4
  const dy = (t: number): number => (y(Math.min(1, t + eps)) - y(Math.max(0, t - eps))) / (Math.min(1, t + eps) - Math.max(0, t - eps))
  let d = `M${f(X0)} ${f(y(0))}`
  for (let s = 0; s < SEGMENTS; s++) {
    const a = s / SEGMENTS
    const b = (s + 1) / SEGMENTS
    const h = (b - a) / 3
    const x0 = X0 + W * a
    const x3 = X0 + W * b
    d += ` C${f(x0 + W * h)} ${f(y(a) + dy(a) * h)} ${f(x3 - W * h)} ${f(y(b) - dy(b) * h)} ${f(x3)} ${f(y(b))}`
  }
  return d
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

// ---------------------------------------------------------------- Pulse
/**
 * Six harmonic curves tied at both ends. A gently rising carrier B(t) (smoothstep from start to
 * end height) plus 1.5 cycles of a sine whose envelope sin(πt) is zero at both ends:
 *   y_i(t) = B(t) − a_i · sin(πt) · sin(3πt + φ_i)
 * Amplitudes grow and phases step evenly, so the family overlaps in a lens rather than a knot.
 */
function pulse(): Drawing {
  const [yStart, yEnd] = [90, 44]
  const strokes = Array.from({ length: 6 }, (_, i) => {
    const a = 10 + 6.4 * i // wide amplitude spread, so the six curves open into a lens
    const phi = -0.62 + 0.27 * i
    const y = (t: number): number =>
      lerp(yStart, yEnd, smoothstep(t)) - a * Math.sin(Math.PI * t) * Math.sin(3 * Math.PI * t + phi)
    return { d: curve(y), opacity: 0.84 - i * 0.08 }
  })
  return {
    strokes,
    dots: [
      { x: X0, y: yStart, r: 2.6, tone: 'white' },
      { x: X1, y: yEnd, r: 4, tone: 'signal' }
    ]
  }
}

// ---------------------------------------------------------------- Breathing
/**
 * Five slow oscillations, one full cycle each, sharing phase:
 *   y_i(t) = c − a_i · sin(2πt)
 * Equal phase means the family only meets at the three nodes (start, middle, end): no other
 * crossings. Amplitudes are evenly spaced, so the gaps between curves stay open and even.
 */
function breathing(): Drawing {
  const c = 66
  const amps = [10, 18, 26, 34, 42]
  const strokes = amps.map((a, i) => {
    return { d: curve((t) => c - a * Math.sin(2 * Math.PI * t)), opacity: 0.86 - i * 0.1 }
  })
  return { strokes, dots: [{ x: X1, y: c, r: 4, tone: 'signal' }] }
}

// ---------------------------------------------------------------- HRV
/**
 * Four leaning spans over an implied baseline: the intervals between beats, not a chart.
 *
 * Each span is one cubic Bézier from foot (x0, b) to foot (x1, b) with a "lean" λ ∈ [−1, 1]:
 *   P1 = (x0 + (0.10 + 0.12λ)·w,  b − H·(1 − 0.28λ))
 *   P2 = (x1 − (0.10 − 0.12λ)·w,  b − H·(1 + 0.28λ))
 * A positive lean moves the apex towards the right foot, a negative lean to the left. The curve's
 * height is linear in H, so H is solved exactly for the intended apex height h (one sample pass).
 *
 * Composition rules (controlled asymmetry):
 *  - the spans overlap rather than nest, and none shares a foot
 *  - the eight feet fall at deliberately irregular intervals (22–64 units), the variability itself
 *  - heights vary out of order (84, 54, 42, 26); the tallest span carries the chartreuse apex
 *  - two faint echo strokes follow the principal spans for depth
 *  - the baseline is implied: a hairline that fades out at both ends
 *  - raised: baseline at y = 98 (was 112), so the drawing's weight sits above the card's centre line
 */
interface Span {
  x0: number
  x1: number
  h: number
  lean: number
}
const HRV_BASE = 98

function spanCurve({ x0, x1, h, lean }: Span): { d: string; apex: { x: number; y: number } } {
  const b = HRV_BASE
  const w = x1 - x0
  const ax1 = x0 + (0.1 + 0.12 * lean) * w
  const ax2 = x1 - (0.1 - 0.12 * lean) * w
  const k1 = 1 - 0.28 * lean
  const k2 = 1 + 0.28 * lean
  // height of the curve above b at parameter t, for H = 1 (height is linear in H)
  const height = (t: number): number => 3 * (1 - t) ** 2 * t * k1 + 3 * (1 - t) * t ** 2 * k2
  let tMax = 0.5
  let best = 0
  for (let i = 0; i <= 400; i++) {
    const t = i / 400
    if (height(t) > best) [best, tMax] = [height(t), t]
  }
  const H = h / best
  const xAt = (t: number): number =>
    (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * ax1 + 3 * (1 - t) * t ** 2 * ax2 + t ** 3 * x1
  return {
    d: `M${x0} ${b} C${f(ax1)} ${f(b - H * k1)} ${f(ax2)} ${f(b - H * k2)} ${x1} ${b}`,
    apex: { x: xAt(tMax), y: b - h }
  }
}

function hrv(): Drawing {
  const b = HRV_BASE
  const principal: Span = { x0: 70, x1: 268, h: 84, lean: -0.35 }
  const spans: Array<{ span: Span; opacity: number }> = [
    { span: { x0: 24, x1: 172, h: 54, lean: 0.55 }, opacity: 0.62 },
    { span: principal, opacity: 0.9 },
    { span: { x0: 150, x1: 318, h: 42, lean: -0.7 }, opacity: 0.56 },
    { span: { x0: 112, x1: 204, h: 26, lean: 0.25 }, opacity: 0.44 }
  ]
  const echoes: Array<{ span: Span; opacity: number }> = [
    { span: { ...principal, h: 72 }, opacity: 0.2 },
    { span: { x0: 24, x1: 172, h: 45, lean: 0.55 }, opacity: 0.16 }
  ]

  const strokes: Stroke[] = [{ d: `M8 ${b} H332`, opacity: 0.55, width: 0.75, fade: true }]
  for (const e of echoes) strokes.push({ d: spanCurve(e.span).d, opacity: e.opacity, width: 0.75 })
  for (const s of spans) strokes.push({ d: spanCurve(s.span).d, opacity: s.opacity })

  const feet = spans.flatMap(({ span }) => [span.x0, span.x1]).sort((a, b2) => a - b2)
  const dots: Dot[] = feet.map((x) => ({ x, y: b, r: 1.6, tone: 'white' }))
  const top = spanCurve(principal).apex
  dots.push({ x: top.x, y: top.y, r: 4, tone: 'signal' })
  return { strokes, dots }
}

export function drawing(kind: ArtKind): Drawing {
  return kind === 'pulse' ? pulse() : kind === 'breathing' ? breathing() : hrv()
}
