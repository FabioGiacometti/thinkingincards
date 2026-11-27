// Homepage scroll story — prototype. One sample project; the stage changes with the text step in view.
// Every frame is a state: each element gets its position and visibility for the active step, and CSS
// transitions carry it there. Reduced motion shows the same frames without movement.

const COL_W = 210, GAP = 24, X0 = 27, BOARD_Y = 120
const HEAD = 44, CARD_H = 30, CARD_GAP = 6, PAD = 10
const colX = (i) => X0 + i * (COL_W + GAP)

const OBJECTS = [
  { id: 'client', name: 'Client', cards: [
    ['attribute', 'Name', 'text'], ['attribute', 'Email', 'text'], ['attribute', 'Phone', 'text'],
    ['metadata', 'Status', 'enum'], ['cta', 'Create order'], ['cta', 'Contact client'],
    ['nested', 'Order', 'many', 'order'],
  ] },
  { id: 'order', name: 'Order', cards: [
    ['attribute', 'Number', 'text'], ['attribute', 'Date', 'date'], ['attribute', 'Total', 'money'],
    ['metadata', 'Status', 'enum'], ['cta', 'Cancel order'],
    ['nested', 'Product', 'many', 'product'], ['nested', 'Payment', 'one', 'payment'],
  ] },
  { id: 'product', name: 'Product', cards: [
    ['attribute', 'Image', 'image'], ['attribute', 'Name', 'text'], ['attribute', 'Description', 'text'], ['attribute', 'Price', 'money'],
    ['metadata', 'Stock', 'number'], ['metadata', 'Last updated', 'date'], ['cta', 'Add to cart'],
    ['nested', 'Provider', 'one', 'provider'],
  ] },
  { id: 'provider', name: 'Provider', cards: [
    ['attribute', 'Name', 'text'], ['attribute', 'Email', 'text'], ['attribute', 'Lead time', 'days'],
    ['metadata', 'Status', 'enum'], ['cta', 'Contact provider'],
  ] },
  { id: 'payment', name: 'Payment', cards: [
    ['attribute', 'Amount', 'money'], ['attribute', 'Date', 'date'],
    ['metadata', 'Status', 'enum'], ['metadata', 'Method', 'enum'], ['cta', 'Refund'],
  ] },
]
const byId = Object.fromEntries(OBJECTS.map((o, i) => [o.id, { ...o, index: i }]))
const colHeight = (o) => HEAD + o.cards.length * (CARD_H + CARD_GAP) - CARD_GAP + PAD
const cardTop = (o, k) => BOARD_Y + HEAD + k * (CARD_H + CARD_GAP)

// The abstract map of the hero: one node per object, above its future column.
const NODE_Y = { client: 220, order: 360, product: 200, provider: 380, payment: 520 }
const MAP_LINKS = [['client', 'order'], ['order', 'product'], ['product', 'provider'], ['order', 'payment'], ['client', 'payment']]
const nodePos = (id) => ({ x: colX(byId[id].index) + COL_W / 2, y: NODE_Y[id] })

// When each piece appears (step index). Steps: 0 map, 1 name, 2 fill, 3 nest, 4 board, 5 actions, 6 views, 7 screens.
const columnFrom = { product: 1, order: 3, client: 4, provider: 4, payment: 4 }
function cardFrom(objectId, card) {
  if (objectId === 'product') return card[0] === 'nested' ? 4 : 2
  if (objectId === 'order') return card[0] === 'nested' ? (card[3] === 'product' ? 3 : 4) : 3
  return 4
}

// Camera: the world rectangle each step frames.
const productCol = { x: colX(2), w: COL_W }, orderCol = { x: colX(1) }
const CAMERA = [
  { x: 20, y: 150, w: 1160, h: 420 },
  { x: productCol.x - 70, y: BOARD_Y - 50, w: COL_W + 140, h: 200 },
  { x: productCol.x - 80, y: BOARD_Y - 30, w: COL_W + 160, h: 380 },
  { x: orderCol.x - 50, y: BOARD_Y - 30, w: productCol.x + COL_W - orderCol.x + 100, h: 400 },
  { x: 0, y: 70, w: 1200, h: 450 },
  { x: 0, y: 70, w: 1200, h: 450 },
  { x: 40, y: 400, w: 1100, h: 450 },
  { x: 60, y: 540, w: 1070, h: 370 },
]
// On a phone the stage is narrow: frame fewer columns so cards stay readable.
const CAMERA_MOBILE = {
  4: { x: 10, y: 90, w: 720, h: 420 },
  5: { x: 10, y: 90, w: 720, h: 420 },
  6: { x: 40, y: 560, w: 760, h: 320 },
  7: { x: 60, y: 540, w: 600, h: 370 },
}
const CRUMB = ['Commerce', 'Commerce · Objects', 'Commerce · Objects', 'Commerce · Objects', 'Commerce · Objects',
  'Commerce · Access', 'Commerce · Views', 'Commerce · Screens']

// Views of the Order (step 6) and where they land in the two screens (step 7).
const VIEWS = {
  row: { s6: { x: 70, y: 640, w: 330, h: 44 }, s7: { x: 96, y: 640, w: 300, h: 44 } },
  detail: { s6: { x: 450, y: 600, w: 290, h: 230 }, s7: { x: 410, y: 614, w: 220, h: 230 } },
  summary: { s6: { x: 800, y: 620, w: 300, h: 132 }, s7: { x: 722, y: 614, w: 376, h: 132 } },
}

const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n }

function build(world) {
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = (cls) => { const s = document.createElementNS(svgNS, 'svg'); s.setAttribute('class', cls); s.setAttribute('viewBox', '0 0 1200 1000'); return s }

  // Map lines + nodes
  const lines = svg('map-lines')
  for (const [a, b] of MAP_LINKS) {
    const p = nodePos(a), q = nodePos(b), l = document.createElementNS(svgNS, 'line')
    l.setAttribute('x1', p.x); l.setAttribute('y1', p.y); l.setAttribute('x2', q.x); l.setAttribute('y2', q.y)
    lines.append(l)
  }
  world.append(lines)
  const nodes = {}
  for (const o of OBJECTS) {
    const n = el('div', 'map-node', o.name), p = nodePos(o.id)
    n.style.left = p.x + 'px'; n.style.top = p.y + 'px'
    world.append(n); nodes[o.id] = n
  }

  // Links from each nested card to the object it refers to (step 4 onward)
  const nestLinks = svg('nest-links')
  world.append(nestLinks)

  // Columns
  const cols = {}, cards = []
  for (const o of OBJECTS) {
    const c = el('div', 'col')
    c.innerHTML = `<div class="col-head">${o.name}<span>${o.cards.length} cards</span></div>`
    const list = el('div', 'col-cards')
    o.cards.forEach((card, k) => {
      const [type, label, note] = card
      const node = el('div', `card ${type}`, `${label}${note ? `<small>${note}</small>` : ''}`)
      node.dataset.from = cardFrom(o.id, card)
      list.append(node); cards.push(node)
      if (type === 'nested') {
        const target = byId[card[3]], y = cardTop(o, k) + CARD_H / 2, x1 = colX(byId[o.id].index) + COL_W - 10
        const tx = colX(target.index) + COL_W / 2, ty = BOARD_Y - 2
        const p = document.createElementNS(svgNS, 'path')
        const mid = (x1 + tx) / 2
        p.setAttribute('d', `M${x1} ${y} C ${mid} ${y}, ${tx} ${ty - 60}, ${tx} ${ty}`)
        nestLinks.append(p)
      }
    })
    c.append(list)
    c.style.left = colX(byId[o.id].index) + 'px'; c.style.top = BOARD_Y + 'px'
    world.append(c); cols[o.id] = c
  }
  // Step 1 shows an empty Product with a ghost card, as a fresh object looks on the Board
  const ghost = el('div', 'card ghost-card', 'Add attribute')
  cols.product.querySelector('.col-cards').prepend(ghost)

  // The copy of Product that shrinks into the nested card slot inside Order (step 3)
  const flyer = el('div', 'col', `<div class="col-head">Product<span>many</span></div><div class="col-cards"></div>`)
  for (const n of cols.product.querySelectorAll('.card:not(.ghost-card):not(.nested)')) flyer.querySelector('.col-cards').append(n.cloneNode(true))
  world.append(flyer)

  // Views
  const viewLinks = svg('view-links')
  const order = byId.order, ox = colX(order.index) + COL_W / 2, oy = BOARD_Y + colHeight(order)
  for (const v of Object.values(VIEWS)) {
    const p = document.createElementNS(svgNS, 'path'), tx = v.s6.x + v.s6.w / 2, ty = v.s6.y - 26
    p.setAttribute('d', `M${ox} ${oy} C ${ox} ${oy + 60}, ${tx} ${ty - 60}, ${tx} ${ty}`)
    viewLinks.append(p)
  }
  world.append(viewLinks)
  const labels = {
    row: el('div', 'view-label', 'In a list'), detail: el('div', 'view-label', 'As a detail'), summary: el('div', 'view-label', 'As a summary'),
  }
  const views = {
    row: el('div', 'view', `<div class="row"><b>#1042</b><span>Ana Ruiz</span><span class="sp"></span><span>$120.00</span><span class="pill">Paid</span></div>`),
    detail: el('div', 'view', `<div class="detail"><h5>Order #1042</h5><div class="field">Date<b>Nov 24</b></div><div class="field">Total<b>$120.00</b></div><div class="field">Products<b>3</b></div><div class="field">Status<b>Paid</b></div><span class="btn">Cancel order</span></div>`),
    summary: el('div', 'view', `<div class="summary"><div>Order #1042</div><div class="total">$120.00</div><span class="pill">Paid</span></div>`),
  }
  for (const [k, v] of Object.entries(views)) {
    const p = VIEWS[k].s6, l = labels[k]
    l.style.left = p.x + 'px'; l.style.top = (p.y - 22) + 'px'
    world.append(l, v)
  }

  // Screens
  const screens = {
    orders: el('div', 'screen', `<div class="screen-bar"><i></i><i></i><i></i><span>Orders</span></div><div class="chips"><em>All</em><em>Paid</em><em>Pending</em></div>`),
    checkout: el('div', 'screen', `<div class="screen-bar"><i></i><i></i><i></i><span>Checkout</span></div>`),
  }
  Object.assign(screens.orders.style, { left: '70px', top: '560px', width: '580px', height: '330px' })
  Object.assign(screens.checkout.style, { left: '700px', top: '560px', width: '420px', height: '330px' })
  const extras = []
  const rowHtml = (n, name, total, st) => `<div class="view" style="position:absolute;left:26px;width:300px;height:44px;top:${n}px"><div class="row"><b>${name.split(' ')[0]}</b><span>${name.split(' ').slice(1).join(' ')}</span><span class="sp"></span><span>${total}</span><span class="pill" ${st !== 'Paid' ? 'style="background:#fff4db;color:#8a5a00"' : ''}>${st}</span></div></div>`
  const more = el('div', 'extra', rowHtml(132, '#1041 Luis Paz', '$48.00', 'Paid') + rowHtml(184, '#1040 Mara Gil', '$96.50', 'Pending') + rowHtml(236, '#1039 Joe Kim', '$210.00', 'Paid'))
  more.style.left = '0'; more.style.top = '0'
  screens.orders.append(more); extras.push(more)
  const pay = el('div', 'extra', `<div class="pay">Pay with card<b>•••• 4242</b></div>`)
  Object.assign(pay.style, { left: '22px', top: '204px', width: '376px' })
  const place = el('div', 'extra', `<div class="place">Place order</div>`)
  Object.assign(place.style, { left: '22px', top: '260px', width: '376px' })
  screens.checkout.append(pay, place); extras.push(pay, place)
  world.prepend(screens.orders, screens.checkout)

  return { lines, nodes, nestLinks, cols, cards, ghost, flyer, viewLinks, labels, views, screens, extras }
}

function render(step, parts, world, stage, chromeCrumb, roles) {
  const { lines, nodes, nestLinks, cols, cards, ghost, flyer, viewLinks, labels, views, screens, extras } = parts
  chromeCrumb.innerHTML = CRUMB[step].replace(/· (\w+)$/, '· <b>$1</b>')

  lines.classList.toggle('is-off', step !== 0)
  for (const [id, n] of Object.entries(nodes)) {
    n.classList.toggle('is-off', step !== 0)
    n.classList.toggle('is-focus', id === 'product' && step === 0)
  }
  for (const [id, c] of Object.entries(cols)) c.classList.toggle('is-off', step < columnFrom[id])
  for (const card of cards) card.classList.toggle('is-hidden', step < Number(card.dataset.from))
  ghost.style.display = step === 1 ? '' : 'none'
  for (const c of Object.values(cols)) {
    const n = c.querySelectorAll('.card:not(.ghost-card):not(.is-hidden)').length
    c.querySelector('.col-head span').textContent = n === 1 ? '1 card' : `${n} cards`
  }
  nestLinks.classList.toggle('is-off', step < 4 || step > 5)

  // Product's copy shrinks into Order's nested slot at step 3, then the real nested card takes over.
  const order = byId.order, slot = order.cards.findIndex((c) => c[3] === 'product')
  if (step === 3) {
    flyer.classList.remove('is-off')
    flyer.classList.add('as-nested')
    Object.assign(flyer.style, { left: colX(order.index) + 10 + 'px', top: cardTop(order, slot) + 'px', width: COL_W - 20 + 'px', height: CARD_H + 'px' })
    setTimeout(() => { if (parts.step === 3) flyer.classList.add('is-off') }, 950)
  } else {
    flyer.classList.add('is-off')
    flyer.classList.remove('as-nested')
    Object.assign(flyer.style, { left: colX(2) + 'px', top: BOARD_Y + 'px', width: COL_W + 'px', height: colHeight(byId.product) + 'px' })
  }
  // While the copy travels, the real nested card in Order waits
  const realSlot = cols.order.querySelectorAll('.card')[slot]
  realSlot.classList.toggle('is-hidden', step < 3)
  if (step === 3) { realSlot.style.transitionDelay = '0.85s' } else { realSlot.style.transitionDelay = '' }

  world.classList.toggle('mode-actions', step === 5)
  world.classList.toggle('mode-dim', step >= 6)
  for (const [id, c] of Object.entries(cols)) c.classList.toggle('is-source', id === 'order')
  for (const [id, c] of Object.entries(cols)) if (step >= 7) c.classList.add('is-off')

  roles.classList.toggle('is-on', step === 5)

  viewLinks.classList.toggle('is-off', step !== 6)
  for (const [k, v] of Object.entries(views)) {
    const p = step >= 7 ? VIEWS[k].s7 : VIEWS[k].s6
    Object.assign(v.style, { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px' })
    v.classList.toggle('is-off', step < 6)
    labels[k].classList.toggle('is-off', step !== 6)
  }
  for (const s of Object.values(screens)) s.classList.toggle('is-off', step < 7)
  for (const x of extras) x.classList.toggle('is-off', step < 7)

  // Camera
  const vp = stage.querySelector('.stage-viewport'), W = vp.clientWidth, H = vp.clientHeight
  const r = (W < 520 && CAMERA_MOBILE[step]) || CAMERA[step]
  const s = Math.min(W / r.w, H / r.h) * 0.94
  const tx = W / 2 - (r.x + r.w / 2) * s, ty = H / 2 - (r.y + r.h / 2) * s
  world.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
}

function init() {
  const story = document.querySelector('.story')
  if (!story) return
  const stage = story.querySelector('.story-stage'), world = story.querySelector('.world')
  const crumb = story.querySelector('.stage-chrome .crumb'), roles = story.querySelector('.roles')
  const steps = [...story.querySelectorAll('.story-step')]
  // Review switch: ?motion=1 shows the animation even when the system asks for reduced motion
  if (new URLSearchParams(location.search).has('motion') || location.hash === '#motion') story.classList.add('force-motion')
  const parts = build(world)
  parts.step = 0

  const go = (n) => {
    if (n === parts.step && world.dataset.ready) return
    parts.step = n
    steps.forEach((s, i) => s.classList.toggle('is-active', i === n))
    render(n, parts, world, stage, crumb, roles)
    world.dataset.ready = '1'
  }
  // The step whose middle crosses the reading line is the active one
  const mobile = window.matchMedia('(max-width: 900px)')
  let io
  const observe = () => {
    io?.disconnect()
    io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) go(steps.indexOf(e.target))
    }, { rootMargin: mobile.matches ? '-62% 0px -30% 0px' : '-48% 0px -48% 0px' })
    steps.forEach((s) => io.observe(s))
  }
  observe()
  mobile.addEventListener('change', observe)
  window.addEventListener('resize', () => render(parts.step, parts, world, stage, crumb, roles))
  go(0)
}

init()
