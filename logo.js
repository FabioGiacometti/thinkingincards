// Inlines the CARDS wordmark and turns the header into a table: each letter is a card you can
// slide around (with friction), lift by holding it while moving slowly, and toss. Tossed cards
// bounce off the edges of the area (logo to menu, top of the viewport to the header line)
// until friction stops them. The letters of "Thinking in" are kernels: drag one against the
// magic mirror at the table's edge, push through, and it pops into a new card (gone until reload).
// If anything fails, the original <img> with its CSS wave stays.
const LETTERS = ['c', 'a', 'r', 'd', 's'] // left to right
const LETTER_SPREAD = [-1.4, -0.7, 0, 0.7, 1.4]
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const img = document.querySelector('img.cards-logo')
if (img) inline(img).catch(() => {})

async function inline(img) {
  const res = await fetch(img.src)
  if (!res.ok) return
  const svg = new DOMParser().parseFromString(await res.text(), 'image/svg+xml').documentElement
  if (svg.nodeName !== 'svg') return
  svg.setAttribute('class', 'cards-logo')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', img.alt)
  img.replaceWith(svg)
  table(svg)
}

function table(svg) {
  // Units are SVG user units (a card is ~10 × 15, about 3px each in the header); time is in seconds.
  const SHADOW_PX = 2, LIFT_SHADOW_PX = 10, LIFT_BLUR_PX = 6, LIFT_FADE = 0.45, LIFT_SCALE = 0.1
  const FRICTION = 420 // deceleration while a card touches the table
  const AIR_DRAG = 1.2, SPIN_FRICTION = 360, TRAIL = 0.6, TRAIL_DAMP = 8
  const WALL_BOUNCE = 0.55, CARD_BOUNCE = 0.4, GRAVITY = 9, MAX_TOSS = 900
  const LIFT_RATE = 0.7, SETTLE_RATE = 1.5, SLOW = 40, AIRBORNE = 0.3, STEP = 1 / 120
  const POP_SPRING = 320, POP_DAMP = 14, POP_START = 0.2, POP_LIFT = 0.6 // a new card springs out of the mirror
  const DEG = Math.PI / 180
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

  const header = svg.closest('header')
  const nav = header && header.querySelector('nav')
  const base = svg.querySelector('#cw-shadow')
  if (!header || !base) return
  svg.classList.add('cw-physics')
  svg.style.touchAction = 'none'

  const makeCard = (g, box, filterId, spread = 0) => {
    // Each card gets its own shadow filter so the shadow can grow as the card is lifted.
    const filter = base.cloneNode(true)
    filter.id = filterId
    base.parentNode.append(filter)
    g.setAttribute('filter', `url(#${filterId})`)
    return {
      g, el: g.querySelector('.cw-lift'), shadow: filter.querySelector('feOffset'), blur: filter.querySelector('feGaussianBlur'), fade: filter.querySelector('feFuncA'),
      cx: box.x + box.width / 2 + spread, cy: box.y + box.height / 2, hx: box.width / 2, hy: box.height / 2,
      x: 0, y: 0, r: 0, vx: 0, vy: 0, w: 0, z: 0, vz: 0, pop: 1, vpop: 0, held: false, stacked: new Set(),
    }
  }
  // Untouched copies of the five cards, used as moulds for cards popped out of "Thinking in".
  const moulds = LETTERS.map((k) => {
    const g = svg.querySelector('.cw-' + k)
    return { g: g.cloneNode(true), box: g.querySelector('.cw-l').getBBox() }
  })
  const cards = LETTERS.map((k, i) => makeCard(svg.querySelector('.cw-' + k), moulds[i].box, 'cw-shadow-' + k, LETTER_SPREAD[i]))
  const layer = cards[0].g.parentNode

  // Half-extents of a card's (rotated, lifted, popping) footprint.
  const extent = (c) => {
    const s = c.pop * (1 + LIFT_SCALE * c.z), cos = Math.abs(Math.cos(c.r * DEG)), sin = Math.abs(Math.sin(c.r * DEG))
    return [s * (cos * c.hx + sin * c.hy), s * (sin * c.hx + cos * c.hy)]
  }
  const overlap = (a, b) => {
    const [ax, ay] = extent(a), [bx, by] = extent(b)
    const dx = b.cx + b.x - (a.cx + a.x), dy = b.cy + b.y - (a.cy + a.y)
    return { dx, dy, px: ax + bx - Math.abs(dx), py: ay + by - Math.abs(dy) }
  }
  // Cards that start out (or land) on top of each other are a stack, not a collision.
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const o = overlap(cards[i], cards[j])
      if (o.px > 0 && o.py > 0) { cards[i].stacked.add(cards[j]); cards[j].stacked.add(cards[i]) }
    }
  }

  // The table: from the logo's left edge to the menu, from the top of the viewport to the header line.
  let walls = null, unit = 3
  function measure() {
    const m = svg.getScreenCTM()
    if (!m) return false
    unit = m.a
    const toX = (px) => (px - m.e) / m.a, toY = (py) => (py - m.f) / m.d
    const h = header.getBoundingClientRect()
    const homeRight = Math.max(...cards.map((c) => c.cx + c.hx))
    walls = {
      left: Math.min(...cards.map((c) => c.cx - c.hx)),
      right: Math.max(homeRight, toX(nav ? nav.getBoundingClientRect().left - 16 : h.right)),
      top: Math.min(toY(h.top), -1), // the header's own top, so the table moves with it when it hides
      bottom: Math.max(toY(h.bottom - 1), 16),
    }
    return true
  }
  // The table's left edge in page pixels: the magic mirror.
  const mirrorX = () => { const m = svg.getScreenCTM(); return m ? walls.left * m.a + m.e : 0 }

  let grab = null, running = false, last = 0, acc = 0
  const wake = () => {
    if (!running) { running = true; last = performance.now(); acc = 0; requestAnimationFrame(frame) }
  }

  function step(h) {
    for (const c of cards) {
      if (c.pop !== 1 || c.vpop !== 0) {
        c.vpop += (POP_SPRING * (1 - c.pop) - POP_DAMP * c.vpop) * h
        c.pop += c.vpop * h
        if (Math.abs(1 - c.pop) < 0.002 && Math.abs(c.vpop) < 0.02) { c.pop = 1; c.vpop = 0 }
      }
      if (c.held) {
        // Holding still or moving slowly lifts the card; dragging fast keeps it on the table.
        c.z = clamp(c.z + (grab.speed < SLOW ? LIFT_RATE : -SETTLE_RATE) * h, 0, 1)
        // Friction at the card's centre swings it round to trail behind the grab point.
        const arm = grab.arm(c.r)
        c.w += ((arm[0] * c.vy - arm[1] * c.vx) * TRAIL * (1 - c.z) - TRAIL_DAMP * c.w) * h
        c.r += c.w * h
        const after = grab.arm(c.r)
        c.x = grab.px - after[0] - c.cx
        c.y = grab.py - after[1] - c.cy
        continue
      }
      if (c.z > 0 || c.vz > 0) {
        c.vz -= GRAVITY * h
        c.z += c.vz * h
        if (c.z <= 0) { c.z = 0; c.vz = c.vz < -0.6 ? -c.vz * 0.3 : 0 }
      }
      const onTable = c.z < 0.02 ? 1 : 0
      const speed = Math.hypot(c.vx, c.vy)
      if (speed > 0) {
        const k = Math.max(0, speed - (FRICTION * onTable + AIR_DRAG * speed) * h) / speed
        c.vx *= k; c.vy *= k
      }
      c.w = Math.sign(c.w) * Math.max(0, Math.abs(c.w) - (SPIN_FRICTION * onTable + 2 * Math.abs(c.w)) * h)
      c.x += c.vx * h; c.y += c.vy * h; c.r += c.w * h
    }

    // Edges of the table: bounce (held cards are simply stopped).
    for (const c of cards) {
      const [ex, ey] = extent(c), X = c.cx + c.x, Y = c.cy + c.y
      if (X - ex < walls.left) { c.x += walls.left - (X - ex); if (c.vx < 0) { c.vx *= -WALL_BOUNCE; c.w -= c.vy * 0.6 } }
      if (X + ex > walls.right) { c.x -= X + ex - walls.right; if (c.vx > 0) { c.vx *= -WALL_BOUNCE; c.w += c.vy * 0.6 } }
      if (Y - ey < walls.top) { c.y += walls.top - (Y - ey); if (c.vy < 0) { c.vy *= -WALL_BOUNCE; c.w += c.vx * 0.6 } }
      if (Y + ey > walls.bottom) { c.y -= Y + ey - walls.bottom; if (c.vy > 0) { c.vy *= -WALL_BOUNCE; c.w -= c.vx * 0.6 } }
    }

    // Cards on the table knock into each other; lifted cards pass over and land as a stack.
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i], b = cards[j], o = overlap(a, b)
        if (o.px <= 0 || o.py <= 0) { a.stacked.delete(b); b.stacked.delete(a); continue }
        if (a.stacked.has(b)) continue
        if (a.z > AIRBORNE || b.z > AIRBORNE) { a.stacked.add(b); b.stacked.add(a); continue }
        const wa = a.held ? 0 : b.held ? 1 : 0.5, wb = 1 - wa
        const alongX = o.px < o.py
        const s = Math.sign(alongX ? o.dx : o.dy) || 1, depth = alongX ? o.px : o.py
        const rel = alongX ? (b.vx - a.vx) * s : (b.vy - a.vy) * s
        if (alongX) { a.x -= s * depth * wa; b.x += s * depth * wb } else { a.y -= s * depth * wa; b.y += s * depth * wb }
        if (rel < 0) {
          const j2 = -(1 + CARD_BOUNCE) * rel
          if (alongX) { a.vx -= s * j2 * wa; b.vx += s * j2 * wb; a.w += a.vy * 0.3 * wa; b.w -= b.vy * 0.3 * wb }
          else { a.vy -= s * j2 * wa; b.vy += s * j2 * wb; a.w -= a.vx * 0.3 * wa; b.w += b.vx * 0.3 * wb }
        }
      }
    }
  }

  const still = (c) => !c.held && Math.abs(c.vx) < 1 && Math.abs(c.vy) < 1 && Math.abs(c.w) < 1 && c.z === 0 && c.vz === 0 && c.pop === 1
  const home = () => cards.every((c) => Math.abs(c.x) < 0.01 && Math.abs(c.y) < 0.01 && Math.abs(c.r) < 0.01)

  function frame(now) {
    if (!measure()) { running = false; return }
    acc += Math.min((now - last) / 1000, 0.05)
    last = now
    while (acc >= STEP) { step(STEP); acc -= STEP }
    for (const c of cards) {
      c.el.style.transform = `translate(${c.x.toFixed(3)}px,${c.y.toFixed(3)}px) rotate(${c.r.toFixed(2)}deg) scale(${(c.pop * (1 + LIFT_SCALE * c.z)).toFixed(4)})`
      const d = ((SHADOW_PX + LIFT_SHADOW_PX * c.z) / unit).toFixed(3)
      c.shadow.setAttribute('dx', d)
      c.shadow.setAttribute('dy', d)
      c.blur.setAttribute('stdDeviation', ((LIFT_BLUR_PX * c.z) / unit).toFixed(3)) // crisp on the table, softer the higher it is
      c.fade.setAttribute('slope', (1 - LIFT_FADE * c.z).toFixed(3)) // and lighter, as light spills into it
    }
    if (!grab && cards.every(still)) {
      for (const c of cards) { c.vx = c.vy = c.w = 0 }
      running = false
      return
    }
    requestAnimationFrame(frame)
  }

  const pt = svg.createSVGPoint()
  const toSvg = (e) => {
    const m = svg.getScreenCTM()
    if (!m) return null
    pt.x = e.clientX; pt.y = e.clientY
    return pt.matrixTransform(m.inverse())
  }

  function startGrab(c, p, e) {
    layer.append(c.g) // picked-up card goes on top
    // Grab point relative to the card centre, stored in the card's own (unrotated) frame.
    const ox = p.x - (c.cx + c.x), oy = p.y - (c.cy + c.y), cr = Math.cos(-c.r * DEG), sr = Math.sin(-c.r * DEG)
    const lx = ox * cr - oy * sr, ly = ox * sr + oy * cr
    grab = {
      c, px: p.x, py: p.y, sx: p.x, sy: p.y, speed: 0, moved: false, samples: [{ x: p.x, y: p.y, t: e.timeStamp }],
      arm: (r) => [lx * Math.cos(r * DEG) - ly * Math.sin(r * DEG), lx * Math.sin(r * DEG) + ly * Math.cos(r * DEG)],
    }
    c.held = true
    c.vx = c.vy = c.vz = 0
    svg.classList.add('cw-dragging')
    wake()
  }

  let suppressClick = false
  svg.addEventListener('pointerdown', (e) => {
    const g = e.target.closest && e.target.closest('.cw-h')
    const c = g && cards.find((c) => c.g === g)
    const p = toSvg(e)
    if (!c || !p || e.button > 0 || grab) return
    e.preventDefault()
    try { svg.setPointerCapture(e.pointerId) } catch {}
    measure()
    startGrab(c, p, e)
  })

  svg.addEventListener('pointermove', (e) => {
    if (!grab) return
    const p = toSvg(e)
    if (!p) return
    grab.px = p.x; grab.py = p.y
    if (Math.hypot(p.x - grab.sx, p.y - grab.sy) > 1) grab.moved = true
    const s = grab.samples
    s.push({ x: p.x, y: p.y, t: e.timeStamp })
    while (s.length > 2 && e.timeStamp - s[0].t > 80) s.shift()
    const first = s[0], dt = (e.timeStamp - first.t) / 1000
    const c = grab.c
    if (dt > 0) { c.vx = (p.x - first.x) / dt; c.vy = (p.y - first.y) / dt }
    grab.speed = Math.hypot(c.vx, c.vy)
  })

  const release = (e) => {
    if (!grab) return
    const c = grab.c, s = grab.samples
    // Toss with the pointer's last direction and speed; a pause before letting go means no toss.
    const fresh = s.length && e.timeStamp - s[s.length - 1].t < 80
    if (!fresh || reduced) { c.vx = c.vy = 0 }
    const speed = Math.hypot(c.vx, c.vy)
    if (speed > MAX_TOSS) { c.vx *= MAX_TOSS / speed; c.vy *= MAX_TOSS / speed }
    if (reduced) { c.z = 0; c.w = 0 }
    c.held = false
    suppressClick = grab.moved
    grab = null
    svg.classList.remove('cw-dragging')
    wake()
  }
  svg.addEventListener('pointerup', release)
  svg.addEventListener('pointercancel', release)
  // Dragging a card (or a letter) should not also follow the logo's link.
  svg.closest('a')?.addEventListener('click', (e) => {
    if (suppressClick) { e.preventDefault(); suppressClick = false }
  }, true)
  addEventListener('resize', wake)

  // A new card made from one of the moulds, springing out at point p, already in the user's hand.
  let popped = 0
  function popCard(p, e) {
    const n = ++popped, mould = moulds[Math.floor(Math.random() * moulds.length)]
    const g = mould.g.cloneNode(true)
    g.removeAttribute('transform')
    for (const el of g.querySelectorAll('[id]')) { // mask ids must stay unique on the page
      const old = el.id
      el.id = `${old}-pop${n}`
      for (const ref of g.querySelectorAll(`[mask="url(#${old})"]`)) ref.setAttribute('mask', `url(#${el.id})`)
    }
    layer.append(g)
    const c = makeCard(g, mould.box, `cw-shadow-pop${n}`)
    c.x = p.x - c.cx; c.y = p.y - c.cy
    cards.push(c)
    startGrab(c, p, e)
    c.z = POP_LIFT
    if (!reduced) { c.pop = POP_START; c.vpop = 0 }
    grab.moved = true
  }

  // "Thinking in": each letter is a kernel. It follows the pointer on an elastic, presses
  // against the mirror (squashing more the harder you push), then pops through as a card.
  const words = svg.closest('a')?.querySelector('.brand-type')
  if (words) {
    const POP_PX = 26, TETHER = 0.85
    const link = words.closest('a')
    link.setAttribute('aria-label', `${words.textContent.trim()} ${svg.getAttribute('aria-label')}`)
    const style = document.createElement('style')
    style.textContent = `.cw-kernel{display:inline-block;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;transform-origin:100% 50%;padding:10px 0;margin:-10px 0;transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.cw-kernel.is-held{transition:none;cursor:grabbing}.cw-kernel.is-popped{visibility:hidden;transition:none}
.cw-mirror{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;pointer-events:none;opacity:0;background:linear-gradient(transparent,#294cdb 35%,#9cf7cb 65%,transparent);box-shadow:0 0 14px #7cb3fb;transition:opacity .35s}
@media(prefers-reduced-motion:reduce){.cw-kernel,.cw-mirror{transition:none}}`
    document.head.append(style)
    const text = words.textContent
    words.textContent = ''
    for (const ch of text) {
      if (!ch.trim()) { words.append(ch); continue }
      const k = document.createElement('span')
      k.className = 'cw-kernel'
      k.textContent = ch
      words.append(k)
    }
    const mirror = document.createElement('div')
    mirror.className = 'cw-mirror'
    header.append(mirror)

    let kernel = null
    const letGo = () => {
      if (!kernel) return
      kernel.k.classList.remove('is-held')
      kernel.k.style.transform = '' // springs back home
      suppressClick = kernel.moved
      kernel = null
      mirror.style.opacity = ''
      svg.classList.remove('cw-dragging')
    }
    words.addEventListener('pointerdown', (e) => {
      const k = e.target.closest('.cw-kernel')
      if (!k || k.classList.contains('is-popped') || e.button > 0 || grab || kernel) return
      e.preventDefault()
      try { k.setPointerCapture(e.pointerId) } catch {}
      measure()
      const mx = mirrorX()
      kernel = { k, id: e.pointerId, sx: e.clientX, sy: e.clientY, reach: mx - k.getBoundingClientRect().right, moved: false }
      mirror.style.left = `${mx - header.getBoundingClientRect().left}px`
      mirror.style.opacity = '0.25'
      k.classList.add('is-held')
      svg.classList.add('cw-dragging')
    })
    words.addEventListener('pointermove', (e) => {
      if (!kernel || e.pointerId !== kernel.id) return
      const dx = e.clientX - kernel.sx, dy = e.clientY - kernel.sy
      if (Math.hypot(dx, dy) > 3) kernel.moved = true
      let x = dx * TETHER
      const y = 18 * Math.tanh((dy * TETHER) / 18)
      const press = Math.max(0, x - kernel.reach) // how hard it is pushed into the mirror
      if (press > 0) x = kernel.reach
      if (x < 0) x = 24 * Math.tanh(x / 24) // pulling the other way just stretches the elastic
      const t = Math.min(1, press / POP_PX)
      kernel.k.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(1 - 0.45 * t).toFixed(3)},${(1 + 0.3 * t).toFixed(3)})`
      mirror.style.opacity = (0.25 + 0.75 * t).toFixed(2)
      if (t < 1) return
      // Through the mirror: the kernel is spent and a card pops out on the other side.
      const k = kernel.k, p = toSvg(e)
      kernel = null
      k.classList.remove('is-held')
      k.classList.add('is-popped')
      k.style.transform = ''
      mirror.style.opacity = ''
      if (!p) { svg.classList.remove('cw-dragging'); return }
      try { svg.setPointerCapture(e.pointerId) } catch {}
      popCard(p, e)
    })
    words.addEventListener('pointerup', letGo)
    words.addEventListener('pointercancel', letGo)
  }

  // While the cards are still in their original spots, they hop in a wave every 7 seconds.
  if (!reduced) {
    const wave = () => {
      if (grab || !home()) return
      cards.forEach((c, i) => setTimeout(() => { c.vz = 2.2; wake() }, i * 80))
    }
    setTimeout(() => { wave(); setInterval(wave, 7000) }, 1000)
  }
  wake()
}
