/**
 * Aurae v2 motion tokens.
 * The same values as the CSS custom properties in tokens.css, for Motion (motion-v) animations.
 */

export const ease = {
  outSoft: [0.22, 1, 0.36, 1] as const, // things arriving and settling
  inOutCalm: [0.65, 0, 0.35, 1] as const // loops and things that return
}

export const duration = {
  instant: 0.1, // press feedback
  quick: 0.18, // hover, colour
  gentle: 0.36, // notices, small reveals
  calm: 0.64, // entrances
  breathe: 8, // ambient ring breathing
  drift: 20 // ambient belt tilt
}

export const stagger = 0.07 // between entering panels

// Pointer-following spring: slow to start, no bounce
export const softSpring = { stiffness: 40, damping: 16 }

/**
 * Entrance for a panel. With reduced motion the panel simply appears (no rise, no fade),
 * so nothing moves and nothing waits.
 */
export function enter(
  index: number,
  reduced: boolean | null
): { initial: false | { opacity: number; y: number }; animate: { opacity: number; y: number }; transition: object } {
  return {
    initial: reduced ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: duration.calm, ease: ease.outSoft, delay: index * stagger }
  }
}
