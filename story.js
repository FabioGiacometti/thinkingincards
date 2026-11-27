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
    ['nested', 'Product', 'many', 'product'],
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
  const d = roundedPath(pts, r)
  let best = 0, label = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
    if (len > best) { best = len; label = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 } }
  }
  return { d, label }
}
function roundedPath(pts, r = 14) {
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], prev = pts[i - 1], next = pts[i + 1]
    const k = Math.min(r, Math.hypot(p.x - prev.x, p.y - prev.y) / 2, Math.hypot(next.x - p.x, next.y - p.y) / 2)
    const ux = Math.sign(p.x - prev.x), uy = Math.sign(p.y - prev.y), vx = Math.sign(next.x - p.x), vy = Math.sign(next.y - p.y)
    d += ` L${p.x - ux * k} ${p.y - uy * k} Q${p.x} ${p.y} ${p.x + vx * k} ${p.y + vy * k}`
  }
  return d + ` L${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`
}
// From a nested card to the object it refers to: out through the gap beside the column, then into the
// object's header from the side (next column) or over the top of the board (further away).
function nestRoute(fromIndex, cardY, toIndex) {
  const a = { x: colX(fromIndex) + COL_W - 10, y: cardY }, gapX = colX(fromIndex) + COL_W + GAP / 2
  if (toIndex === fromIndex + 1) {
    const b = { x: colX(toIndex), y: BOARD_Y + HEAD / 2 }
    return roundedPath([a, { x: gapX, y: a.y }, { x: gapX, y: b.y }, b], 10)
  }
  const overY = BOARD_Y - 26, tx = colX(toIndex) + COL_W / 2
  return roundedPath([a, { x: gapX, y: a.y }, { x: gapX, y: overY }, { x: tx, y: overY }, { x: tx, y: BOARD_Y }], 10)
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

// Step 04: notes from different people on the team, stuck around the model. They illustrate the
// conversation the shared model starts; the app itself has no comments.
const STICKIES = [
  { who: 'Product manager', text: 'Can a Client have more than one open Order?', color: 'yellow', x: 40, y: 448, tilt: -2.5 },
  { who: 'Designer', text: 'Payment shows inside the Order. Does it need a page of its own?', color: 'pink', x: 270, y: 452, tilt: 1.8 },
  { who: 'Engineer', text: 'Is Stock per Product, or per warehouse?', color: 'blue', x: 520, y: 486, tilt: -1.2 },
  { who: 'Operations', text: 'Lead time decides when we reorder from a Provider.', color: 'green', x: 760, y: 414, tilt: 2.2 },
  { who: 'Finance', text: 'Can we refund part of a Payment, or only all of it?', color: 'purple', x: 990, y: 384, tilt: -1.8 },
]

// Step 05: the CTA Matrix. Objects stay as columns, each role is a row, and every action appears in the
// cell of each role that can take it.
const ROLES = ['Customer', 'Staff', 'Admin']
const PERMISSIONS = {
  'Create order': ['Customer', 'Staff'], 'Contact client': ['Staff', 'Admin'], 'Cancel order': ['Customer', 'Staff', 'Admin'],
  'Add to cart': ['Customer'], 'Contact provider': ['Staff', 'Admin'], 'Refund': ['Admin'],
}
const ROW_H = 82, MATRIX_TOP = BOARD_Y + HEAD + 6

// Camera: the world rectangle each step frames.
const productCol = { x: colX(2), w: COL_W }, orderCol = { x: colX(1) }
const CAMERA = [
  { x: 30, y: 150, w: 960, h: 300 },
  { x: productCol.x - 70, y: BOARD_Y - 50, w: COL_W + 140, h: 200 },
  { x: productCol.x - 80, y: BOARD_Y - 30, w: COL_W + 160, h: 380 },
  { x: orderCol.x - 50, y: BOARD_Y - 30, w: productCol.x + COL_W - orderCol.x + 100, h: 400 },
  { x: 0, y: 80, w: 1200, h: 540 },
  { x: -215, y: 90, w: 1405, h: 370 },
  { x: 40, y: 90, w: 1100, h: 800 },
  { x: 60, y: 540, w: 1070, h: 370 },
]
// On a phone the stage is narrow: frame fewer columns so cards stay readable.
const CAMERA_MOBILE = {
  0: { x: 40, y: 175, w: 900, h: 250 },
  4: { x: 10, y: 100, w: 720, h: 530 },
  5: { x: -200, y: 100, w: 950, h: 370 },
  6: { x: 240, y: 575, w: 880, h: 330 },
  7: { x: 60, y: 540, w: 600, h: 370 },
}
const CRUMB = ['Commerce', 'Commerce · Objects', 'Commerce · Objects', 'Commerce · Objects', 'Commerce · Objects',
  'Commerce · Access', 'Commerce · Views', 'Commerce · Screens']

// Three Views of the Product object (step 6). Each one grows out of a manifestation on the board:
// the Card from the Product card nested in Order, the Detail from the whole Product object, the List item
// from the Product card nested in Provider. In step 7 they are placed on two screens.
const cardRect = (objectId, nestedId) => {
  const o = byId[objectId], k = o.cards.findIndex((c) => c[0] === 'nested' && c[3] === nestedId)
  return { x: colX(o.index) + 10, y: cardTop(o, k), w: COL_W - 20, h: CARD_H }
}
const VIEWS = {
  card: { from: () => cardRect('order', 'product'), nested: true,
    s6: { x: 255, y: 610, w: 200, h: 226 }, s7: { x: 724, y: 606, w: 180, h: 226 } },
  detail: { from: () => ({ x: colX(2), y: BOARD_Y, w: COL_W, h: colHeight(byId.product) + 2 }), nested: false,
    s6: { x: 500, y: 600, w: 230, h: 286 }, s7: { x: 412, y: 600, w: 220, h: 286 } },
  list: { from: () => cardRect('provider', 'product'), nested: true,
    s6: { x: 770, y: 650, w: 340, h: 48 }, s7: { x: 96, y: 646, w: 300, h: 48 } },
}
// A View is made of blocks that stand for the object's cards, like the Views in the app
const block = (type, label, extra = '') => `<div class="vb vb-${type}${extra}"><span>${label}</span></div>`
const VIEW_HTML = {
  card: `<div class="vframe">${block('attribute', 'Image', ' tall')}${block('attribute', 'Name')}${block('attribute', 'Price')}${block('cta', 'Add to cart')}</div>`,
  detail: `<div class="vframe">${block('attribute', 'Image', ' tall')}${block('attribute', 'Name')}${block('attribute', 'Description')}<div class="vrow">${block('attribute', 'Price')}${block('metadata', 'Stock')}</div>${block('metadata', 'Last updated')}${block('cta', 'Add to cart')}${block('nested', 'Provider')}</div>`,
  list: `<div class="vframe vrow">${block('attribute', 'Image', ' square')}${block('attribute', 'Name', ' grow')}${block('attribute', 'Price')}${block('metadata', 'Stock')}</div>`,
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
  nestLinks.innerHTML = `<defs><marker id="nest-arrow${uid}" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0.8 L10 5 L0 9.2 L2.2 5 z"/></marker></defs>`
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
        const p = document.createElementNS(svgNS, 'path')
        p.setAttribute('d', nestRoute(byId[o.id].index, cardTop(o, k) + CARD_H / 2, byId[card[3]].index))
        p.setAttribute('marker-end', `url(#nest-arrow${uid})`)
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

  // Views (no connecting lines: each view visibly grows out of its source)
  const viewLinks = svg('view-links')
  world.append(viewLinks)
  const labels = { card: el('div', 'view-label', 'Card'), detail: el('div', 'view-label', 'Detail'), list: el('div', 'view-label', 'List item') }
  const views = {}
  for (const [k, v] of Object.entries(VIEWS)) {
    views[k] = el('div', `view view-${k}`, VIEW_HTML[k])
    labels[k].style.left = v.s6.x + 'px'; labels[k].style.top = (v.s6.y - 22) + 'px'
    world.append(labels[k], views[k])
  }

  // Screens place those views: the Catalog shows the list (repeated) and the detail; the Shop shows cards
  const screens = {
    catalog: el('div', 'screen', `<div class="screen-bar"><i></i><i></i><i></i><span>Catalog</span></div>`),
    shop: el('div', 'screen', `<div class="screen-bar"><i></i><i></i><i></i><span>Shop</span></div>`),
  }
  Object.assign(screens.catalog.style, { left: '70px', top: '560px', width: '580px', height: '340px' })
  Object.assign(screens.shop.style, { left: '700px', top: '560px', width: '420px', height: '340px' })
  const extras = []
  const repeat = (top) => `<div class="view view-list repeat" style="position:absolute;left:26px;width:300px;height:48px;top:${top}px">${VIEW_HTML.list}</div>`
  const more = el('div', 'extra', repeat(140) + repeat(194) + repeat(248))
  more.style.left = '0'; more.style.top = '0'
  screens.catalog.append(more); extras.push(more)
  const other = el('div', 'extra', `<div class="view view-card repeat" style="position:relative;width:180px;height:226px">${VIEW_HTML.card}</div>`)
  Object.assign(other.style, { left: '216px', top: '46px' })
  screens.shop.append(other); extras.push(other)
  world.prepend(screens.catalog, screens.shop)

  const stickies = STICKIES.map((n) => {
    const st = el('div', `sticky sticky-${n.color}`, `<span>${n.who}</span><p>${n.text}</p>`)
    Object.assign(st.style, { left: n.x + 'px', top: n.y + 'px', '--tilt': n.tilt + 'deg' })
    world.append(st)
    return st
  })
  const matrix = el('div', 'matrix')
  ROLES.forEach((role, r) => {
    const top = MATRIX_TOP + r * ROW_H
    const line = el('div', 'matrix-line'); Object.assign(line.style, { top: top + 'px' })
    const label = el('div', 'matrix-role', role); Object.assign(label.style, { top: top + ROW_H / 2 + 'px' })
    matrix.append(line, label)
    for (const o of OBJECTS) {
      const ctas = o.cards.filter((c) => c[0] === 'cta' && (PERMISSIONS[c[1]] || []).includes(role))
      if (!ctas.length) continue
      const cell = el('div', 'matrix-cell', ctas.map((c) => `<div class="card cta">${c[1]}</div>`).join(''))
      Object.assign(cell.style, { left: colX(byId[o.id].index) + 10 + 'px', top: top + 8 + 'px', width: COL_W - 20 + 'px' })
      matrix.append(cell)
    }
  })
  world.append(matrix)
  cols.product.dataset.mapId = 'product' // in the hero the Product column is the Product box of the map
  return { lines, nodes, nestLinks, cols, cards, ghost, flyer, viewLinks, labels, views, screens, extras, mapLinks, addLink, stickies, matrix }
}

// While Product is being filled in, its cards can be put in a different order by dragging them up or down.
// Only the stage's own copy changes; nothing is saved.
function makeCardsSortable(parts, world) {
  let drag = null
  const movable = (card) => card && card.closest('.col') === parts.cols.product && !card.classList.contains('nested') &&
    !card.classList.contains('ghost-card') && !card.classList.contains('is-hidden')
  world.addEventListener('pointerdown', (e) => {
    if (!(parts.step === 2 || parts.step === 3) || e.button > 0) return
    const card = e.target.closest('.card')
    if (!movable(card)) return
    e.preventDefault()
    drag = { card, list: card.parentElement }
    card.classList.add('is-sorting')
    try { card.setPointerCapture(e.pointerId) } catch {}
  })
  world.addEventListener('pointermove', (e) => {
    if (!drag) return
    const others = [...drag.list.children].filter((c) => c !== drag.card && movable(c))
    const before = others.find((c) => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 })
    const anchorCard = before ?? [...drag.list.children].find((c) => c.classList.contains('nested')) ?? null
    if (drag.card.nextElementSibling !== anchorCard) drag.list.insertBefore(drag.card, anchorCard)
  })
  const end = () => { if (drag) { drag.card.classList.remove('is-sorting'); drag = null } }
  world.addEventListener('pointerup', end)
  world.addEventListener('pointercancel', end)
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
      const height = step === 5 ? HEAD + ROLES.length * ROW_H + 8 : HEAD + list + PAD + 2 // step 05: a matrix column
      Object.assign(c.style, { left: colX(byId[id].index) + 'px', top: BOARD_Y + 'px', width: COL_W + 'px', height: height + 'px' })
    }
  }
  nestLinks.classList.add('is-off') // the board reads without them

  // Product's copy shrinks into Order's nested slot at step 3, then the real nested card takes over.
  const order = byId.order, slot = order.cards.findIndex((c) => c[3] === 'product')
  if (step === 3) {
    flyer.classList.remove('is-off')
    flyer.classList.add('as-nested')
    Object.assign(flyer.style, { left: colX(order.index) + 10 + 'px', top: cardTop(order, slot) + 'px', width: COL_W - 20 + 'px', height: CARD_H + 'px' })
    setTimeout(() => {
      if (parts.step !== 3) return
      flyer.style.transition = 'none'
      flyer.classList.add('is-off')
      cols.order.querySelectorAll('.card')[slot].classList.remove('is-waiting')
      requestAnimationFrame(() => { flyer.style.transition = '' })
    }, 900)
  } else {
    flyer.classList.add('is-off')
    flyer.classList.remove('as-nested')
    Object.assign(flyer.style, { left: colX(2) + 'px', top: BOARD_Y + 'px', width: COL_W + 'px', height: colHeight(byId.product) + 'px' })
  }
  // While the copy travels, the real nested card in Order keeps its place but stays invisible
  const realSlot = cols.order.querySelectorAll('.card')[slot]
  realSlot.classList.toggle('is-hidden', step < 3)
  realSlot.classList.toggle('is-waiting', step === 3 && !flyer.classList.contains('is-off'))

  world.classList.toggle('can-sort', step === 2 || step === 3)
  // Each note is stuck on in turn, like a post-it pressed onto the board
  parts.stickies.forEach((st, i) => {
    const on = step === 4
    st.classList.toggle('is-off', !on)
    if (on && !st.classList.contains('is-in')) {
      st.style.animationDelay = `${0.5 + i * 0.6}s`
      void st.offsetWidth // restart the animation each time the step is entered
      st.classList.add('is-in')
    }
    if (!on) st.classList.remove('is-in')
  })
  world.classList.toggle('mode-matrix', step === 5)
  parts.matrix.classList.toggle('is-off', step !== 5)
  world.classList.toggle('mode-dim', step >= 6)
  for (const [id, c] of Object.entries(cols)) c.classList.toggle('is-source', id === 'product')
  for (const [id, c] of Object.entries(cols)) if (step >= 7) c.classList.add('is-off')

  roles.classList.remove('is-on') // the matrix itself says who can do what

  viewLinks.classList.add('is-off')
  for (const [k, v] of Object.entries(views)) {
    const spec = VIEWS[k], p = step >= 7 ? spec.s7 : step === 6 ? spec.s6 : spec.from()
    Object.assign(v.style, { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px' })
    v.classList.toggle('is-off', step < 6)
    v.classList.toggle('at-source', step < 6)
    v.classList.toggle('from-nested', spec.nested)
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
  // "Add attribute" is a real button: it moves the story on to the step where Product gets its cards
  parts.ghost.setAttribute('role', 'button')
  parts.ghost.addEventListener('click', () => {
    if (parts.step === 1) steps[2].scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  makeCardsSortable(parts, world)

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
