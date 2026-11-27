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

// The map of the hero: card-like nodes for the objects and one decision, laid out on a grid and joined by
// labelled, right-angled connectors with rounded corners, the way a flow diagram draws them.
const NODE_W = 172, NODE_H = 52, DIAMOND = 108 // diamond = its full width and height
const NODE_POS = {
  client: { x: 132, y: 220 }, order: { x: 390, y: 220 }, product: { x: 648, y: 220 }, stock: { x: 880, y: 220 },
  shipment: { x: 1110, y: 220 }, provider: { x: 880, y: 400 },
}
const DECISIONS = [{ id: 'stock', label: 'In stock?' }]
// Nodes that exist only in the hero map (they are not objects of the sample model below)
const MAP_ONLY = [{ id: 'shipment', label: 'Shipment' }]
const nodePos = (id) => NODE_POS[id]
const isDecision = (id) => DECISIONS.some((d) => d.id === id)
// [from, to, label]. Which side a connector leaves and enters by follows where the other box is.
const MAP_LINKS = [
  ['client', 'order', 'places'],
  ['order', 'product', 'includes'],
  ['product', 'stock', ''],
  ['stock', 'shipment', 'Yes'],
  ['stock', 'provider', 'No: reorder from'],
]
function anchor(id, side) {
  const p = nodePos(id), hw = isDecision(id) ? DIAMOND / 2 : NODE_W / 2, hh = isDecision(id) ? DIAMOND / 2 : NODE_H / 2
  return { x: p.x + (side === 'right' ? hw : side === 'left' ? -hw : 0), y: p.y + (side === 'bottom' ? hh : side === 'top' ? -hh : 0), side }
}
function sides(from, to) {
  const a = nodePos(from), b = nodePos(to), dx = b.x - a.x, dy = b.y - a.y
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? ['right', 'left'] : ['left', 'right']) : (dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom'])
}
// Smooth step: right-angled runs with rounded corners, like a flow diagram. Returns the path and where its
// label sits (the middle of the longest run).
function smoothStep(a, b, r = 14) {
  const horizontal = (side) => side === 'left' || side === 'right'
  let pts
  if (horizontal(a.side) && horizontal(b.side)) {
    const mx = (a.x + b.x) / 2
    pts = a.y === b.y ? [a, b] : [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b]
  } else if (!horizontal(a.side) && !horizontal(b.side)) {
    const my = (a.y + b.y) / 2
    pts = a.x === b.x ? [a, b] : [a, { x: a.x, y: my }, { x: b.x, y: my }, b]
  } else {
    pts = horizontal(a.side) ? [a, { x: b.x, y: a.y }, b] : [a, { x: a.x, y: b.y }, b]
  }
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], prev = pts[i - 1], next = pts[i + 1]
    const k = Math.min(r, Math.hypot(p.x - prev.x, p.y - prev.y) / 2, Math.hypot(next.x - p.x, next.y - p.y) / 2)
    const ux = Math.sign(p.x - prev.x), uy = Math.sign(p.y - prev.y), vx = Math.sign(next.x - p.x), vy = Math.sign(next.y - p.y)
    d += ` L${p.x - ux * k} ${p.y - uy * k} Q${p.x} ${p.y} ${p.x + vx * k} ${p.y + vy * k}`
  }
  d += ` L${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`
  let best = 0, label = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
    if (len > best) { best = len; label = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 } }
  }
  return { d, label }
}
function routeLink(link) {
  const [fs, ts] = sides(link.from, link.to), step = smoothStep(anchor(link.from, fs), anchor(link.to, ts))
  link.path.setAttribute('d', step.d)
  if (link.label) { link.label.style.left = step.label.x + 'px'; link.label.style.top = step.label.y + 'px' }
}

// When each piece appears (step index). Steps: 0 map, 1 name, 2 fill, 3 nest, 4 board, 5 actions, 6 views, 7 screens.
// Product is on stage from the start: in the hero it IS the Product node of the map, and it grows into its column.
const columnFrom = { product: 0, order: 3, client: 4, provider: 4, payment: 4 }
function cardFrom(objectId, card) {
  if (objectId === 'product') return card[0] === 'nested' ? 4 : 2
  if (objectId === 'order') return card[0] === 'nested' ? (card[3] === 'product' ? 3 : 4) : 3
  return 4
}

// Camera: the world rectangle each step frames.
const productCol = { x: colX(2), w: COL_W }, orderCol = { x: colX(1) }
const CAMERA = [
  { x: 30, y: 150, w: 960, h: 300 },
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
  0: { x: 40, y: 175, w: 900, h: 250 },
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

function build(world, uid = '') {
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = (cls) => { const s = document.createElementNS(svgNS, 'svg'); s.setAttribute('class', cls); s.setAttribute('viewBox', '0 0 1200 1000'); return s }

  // Map lines + nodes
  const lines = svg('map-lines')
  lines.innerHTML = `<defs><marker id="map-arrow${uid}" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0.8 L10 5 L0 9.2 L2.2 5 z"/></marker></defs>`
  const nodes = {}, mapLinks = []
  const addLink = (from, to, text) => {
    const path = document.createElementNS(svgNS, 'path')
    path.setAttribute('marker-end', `url(#map-arrow${uid})`)
    lines.append(path)
    const link = { from, to, path, label: null }
    if (text) {
      link.label = el('div', 'map-label', text)
      nodes['label-' + mapLinks.length] = link.label
    }
    mapLinks.push(link)
    routeLink(link)
    return link
  }
  MAP_LINKS.forEach(([a, b, text]) => addLink(a, b, text))
  world.append(lines)
  for (const o of OBJECTS) {
    if (!nodePos(o.id)) continue // objects left out of the hero map (Payment)
    if (o.id === 'product') continue // drawn by the Product column itself, so the node can grow into it
    const n = el('div', 'map-node', `<b>${o.name}</b>`), p = nodePos(o.id)
    n.dataset.mapId = o.id
    n.style.left = p.x + 'px'; n.style.top = p.y + 'px'
    world.append(n); nodes[o.id] = n
  }
  for (const m of MAP_ONLY) {
    const n = el('div', 'map-node', `<b>${m.label}</b>`), p = nodePos(m.id)
    n.dataset.mapId = m.id
    n.style.left = p.x + 'px'; n.style.top = p.y + 'px'
    world.append(n); nodes[m.id] = n
  }
  for (const d of DECISIONS) {
    const n = el('div', 'map-decision', `<span>${d.label}</span>`), p = nodePos(d.id)
    n.dataset.mapId = d.id
    n.style.left = p.x + 'px'; n.style.top = p.y + 'px'
    world.append(n); nodes[d.id] = n
  }
  for (const [k, n] of Object.entries(nodes)) if (k.startsWith('label-')) world.append(n)

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

  cols.product.dataset.mapId = 'product' // in the hero the Product column is the Product box of the map
  return { lines, nodes, nestLinks, cols, cards, ghost, flyer, viewLinks, labels, views, screens, extras, mapLinks, addLink }
}

// The hero map can be touched: hover a box to see its connectors, drag it around, or pull a new connector
// from its handle to another box. Only on the live stage, only while the hero is on screen. Nothing is saved.
function makeMapInteractive(parts, world, stage) {
  const handle = el('div', 'map-handle')
  handle.title = 'Drag to connect'
  world.append(handle)
  const temp = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  temp.setAttribute('class', 'map-temp')
  parts.lines.append(temp)
  const elOf = (id) => (id === 'product' ? parts.cols.product : parts.nodes[id])
  const scale = () => world.getBoundingClientRect().width / 1200
  const toWorld = (e) => { const r = world.getBoundingClientRect(), k = scale(); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k } }
  const live = () => parts.step === 0
  let hot = null, drag = null, connect = null

  const setHot = (id) => {
    if (hot === id) return
    if (hot) elOf(hot)?.classList.remove('is-hot')
    hot = id
    for (const l of parts.mapLinks) {
      const on = !!id && (l.from === id || l.to === id)
      l.path.classList.toggle('is-hot', on)
      l.label?.classList.toggle('is-hot', on)
    }
    if (id) {
      elOf(id).classList.add('is-hot')
      const a = anchor(id, 'right')
      Object.assign(handle.style, { left: a.x + 'px', top: a.y + 'px' })
    }
    handle.classList.toggle('is-on', !!id)
  }
  const place = (id) => {
    const p = nodePos(id), n = elOf(id)
    if (id === 'product') Object.assign(n.style, { left: p.x - NODE_W / 2 + 'px', top: p.y - NODE_H / 2 + 'px' })
    else Object.assign(n.style, { left: p.x + 'px', top: p.y + 'px' })
    for (const l of parts.mapLinks) if (l.from === id || l.to === id) routeLink(l)
    if (hot === id) { const a = anchor(id, 'right'); Object.assign(handle.style, { left: a.x + 'px', top: a.y + 'px' }) }
  }

  world.addEventListener('pointerover', (e) => {
    if (!live() || drag || connect) return
    if (e.target.closest('.map-handle')) return
    setHot(e.target.closest('[data-map-id]')?.dataset.mapId ?? null)
  })
  world.addEventListener('pointerleave', () => { if (!drag && !connect) setHot(null) })

  world.addEventListener('pointerdown', (e) => {
    if (!live() || e.button > 0) return
    if (e.target.closest('.map-handle') && hot) {
      e.preventDefault()
      connect = { from: hot }
      try { handle.setPointerCapture(e.pointerId) } catch {}
      stage.classList.add('is-connecting')
      return
    }
    const box = e.target.closest('[data-map-id]')
    if (!box) return
    e.preventDefault()
    const id = box.dataset.mapId, start = toWorld(e), p = nodePos(id)
    drag = { id, box, dx: start.x - p.x, dy: start.y - p.y }
    box.classList.add('is-dragging')
    try { box.setPointerCapture(e.pointerId) } catch {}
  })
  world.addEventListener('pointermove', (e) => {
    if (drag) {
      const w = toWorld(e)
      NODE_POS[drag.id] = { x: Math.round(w.x - drag.dx), y: Math.round(w.y - drag.dy) }
      place(drag.id)
    } else if (connect) {
      const a = anchor(connect.from, 'right'), w = toWorld(e)
      temp.setAttribute('d', `M${a.x} ${a.y} L${w.x} ${w.y}`)
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-map-id]')?.dataset.mapId
      for (const id of Object.keys(NODE_POS)) elOf(id)?.classList.toggle('is-target', id === over && id !== connect.from)
    }
  })
  const end = (e) => {
    if (drag) {
      drag.box.classList.remove('is-dragging')
      drag = null
    }
    if (connect) {
      const to = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-map-id]')?.dataset.mapId
      const exists = parts.mapLinks.some((l) => (l.from === connect.from && l.to === to) || (l.to === connect.from && l.from === to))
      if (to && to !== connect.from && !exists) parts.addLink(connect.from, to, '').path.classList.add('is-new')
      for (const id of Object.keys(NODE_POS)) elOf(id)?.classList.remove('is-target')
      temp.setAttribute('d', '')
      stage.classList.remove('is-connecting')
      connect = null
    }
  }
  world.addEventListener('pointerup', end)
  world.addEventListener('pointercancel', end)
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
  for (const [id, c] of Object.entries(cols)) {
    const n = c.querySelectorAll('.card:not(.ghost-card):not(.is-hidden)').length
    c.querySelector('.col-head span').textContent = n === 1 ? '1 card' : `${n} cards`
    // Explicit geometry so every change of size or place animates (a height of auto cannot)
    const asNode = id === 'product' && step === 0
    c.classList.toggle('as-node', asNode)
    if (asNode) {
      const p = nodePos('product')
      Object.assign(c.style, { left: p.x - NODE_W / 2 + 'px', top: p.y - NODE_H / 2 + 'px', width: NODE_W + 'px', height: NODE_H + 'px' })
    } else {
      const rows = n + (id === 'product' && step === 1 ? 1 : 0) // the ghost "Add attribute" card
      const list = rows ? rows * CARD_H + (rows - 1) * CARD_GAP : 0
      Object.assign(c.style, { left: colX(byId[id].index) + 'px', top: BOARD_Y + 'px', width: COL_W + 'px', height: HEAD + list + PAD + 2 + 'px' })
    }
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
  // The header always stays on screen: the stage starts right under it
  const header = document.querySelector('header')
  const syncHeader = () => story.style.setProperty('--header-h', `${header ? header.getBoundingClientRect().height : 0}px`)
  syncHeader()
  addEventListener('resize', syncHeader)
  const parts = build(world)
  parts.step = 0
  makeMapInteractive(parts, world, stage)

  // Reduced motion (without the review switch): fade the stage out, change the frame, fade it back in
  const gentle = () => matchMedia('(prefers-reduced-motion: reduce)').matches && !story.classList.contains('force-motion')
  let swap = 0
  const go = (n) => {
    if (n === parts.step && world.dataset.ready) return
    parts.step = n
    steps.forEach((s, i) => s.classList.toggle('is-active', i === n))
    if (!gentle() || !world.dataset.ready) {
      render(n, parts, world, stage, crumb, roles)
      world.dataset.ready = '1'
      return
    }
    const ticket = ++swap
    stage.classList.add('is-swapping')
    setTimeout(() => {
      if (ticket !== swap) return
      render(parts.step, parts, world, stage, crumb, roles)
      requestAnimationFrame(() => stage.classList.remove('is-swapping'))
    }, 220)
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

  // On a phone the fixed stage would hold the lower half of the screen while the text scrolls under it.
  // Instead, each step carries its own still picture of its final frame, and the page scrolls normally.
  let stills = null
  const renderStills = () => {
    if (!mobile.matches) return
    if (!stills) {
      stills = steps.map((step, i) => {
        const fig = el('figure', 'step-still')
        fig.setAttribute('aria-hidden', 'true')
        fig.innerHTML = '<div class="stage-viewport"><div class="world"></div></div>'
        const w = fig.querySelector('.world'), p = build(w, '-still-' + i)
        p.step = i
        const stepRoles = roles.cloneNode(true)
        stepRoles.classList.add('roles-still')
        const after = step.querySelector('h1, h2')
        if (i === 0) step.querySelector('.more')?.after(fig)
        else after.after(fig)
        if (i === 5) fig.after(stepRoles)
        return { fig, w, p, stepRoles }
      })
    }
    stills.forEach(({ fig, w, p, stepRoles }, i) => render(i, p, w, fig, el('span'), stepRoles))
  }
  renderStills()
  mobile.addEventListener('change', renderStills)
  addEventListener('resize', renderStills)
}

init()
