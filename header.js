// Hides the sticky header while scrolling down and brings it back on any scroll up.
// Movement is transform-only (see header.is-hidden in the page CSS), work is done at most once
// per frame, small scroll jitter is ignored, and the header stays put near the top of the page,
// while it has keyboard focus, and while a logo card is being dragged.
const header = document.querySelector('header')

if (header) {
  const TOLERANCE = 8 // px of scroll in one direction before reacting
  let lastY = Math.max(0, scrollY)
  let ticking = false

  const update = () => {
    ticking = false
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight)
    const y = Math.min(Math.max(0, scrollY), max) // ignore overscroll bounce at either end
    const delta = y - lastY
    if (Math.abs(delta) < TOLERANCE) return
    const pinned = y <= header.offsetHeight || header.matches(':focus-within') || header.querySelector('.cw-dragging')
    header.classList.toggle('is-hidden', delta > 0 && !pinned)
    lastY = y
  }

  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update) }
  }, { passive: true })

  // Tabbing into a hidden header brings it back.
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'))
}
