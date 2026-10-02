// Technical line drawing of a front brake assembly (disc + caliper) for the hero.
// Generated at build time so the geometry stays exact; ~6 KB of inline SVG, no images.
//
// Classes (styled in src/scss/sections/_drawing.scss):
//   d-line    main contour        d-faint  secondary contour
//   d-accent  highlighted part    d-axis   dash-dot centre lines
//   d-dim     dimension lines     d-dot    leader anchor dots
// Elements with pathLength="1" are "drawn" by the intro animation.

const SIZE = 800
const C = SIZE / 2

const round = n => Math.round(n * 10) / 10
const polar = (r, deg) => {
	const a = (deg * Math.PI) / 180
	return [round(C + r * Math.cos(a)), round(C + r * Math.sin(a))]
}
const circle = (r, cls, [cx, cy] = [C, C]) => `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" pathLength="1"/>`
const path = (d, cls, draw = true) => `<path class="${cls}" d="${d}"${draw ? ' pathLength="1"' : ''}/>`

// Ring sector between two radii and two angles (clockwise in SVG coordinates)
function sector(rOuter, rInner, from, to) {
	const [x1, y1] = polar(rOuter, from)
	const [x2, y2] = polar(rOuter, to)
	const [x3, y3] = polar(rInner, to)
	const [x4, y4] = polar(rInner, from)
	const large = to - from > 180 ? 1 : 0
	return `M${x1} ${y1}A${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}Z`
}

function disc() {
	const parts = [
		circle(300, 'd-line'), // outer edge
		circle(286, 'd-faint'), // friction band
		circle(184, 'd-faint'),
		circle(168, 'd-line'), // inner edge of the friction ring
	]

	// Cross-drilled holes in a staggered spiral
	for (let i = 0; i < 36; i++) {
		const r = [208, 234, 260][i % 3]
		parts.push(circle(5.5, 'd-faint', polar(r, i * 10 + (i % 3) * 3.3)))
	}

	// Curved slots
	for (let k = 0; k < 6; k++) {
		const a = k * 60 + 25
		const [x1, y1] = polar(196, a)
		const [cx, cy] = polar(242, a + 14)
		const [x2, y2] = polar(280, a + 9)
		parts.push(path(`M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`, 'd-faint'))
	}

	// Hat: mounting face, 5 wheel studs, centre bore, locating screws
	parts.push(circle(150, 'd-line'), circle(128, 'd-faint'), circle(44, 'd-line'))
	for (let k = 0; k < 5; k++) parts.push(circle(13, 'd-line', polar(92, -90 + k * 72)))
	parts.push(circle(5, 'd-faint', polar(116, 0)), circle(5, 'd-faint', polar(116, 216)))
	return parts.join('')
}

function caliper() {
	const from = -64
	const to = -8
	const [x1, y1] = polar(275, from + 6)
	const [x2, y2] = polar(275, to - 6)
	return [
		path(sector(338, 212, from, to), 'd-accent d-accent--fill'),
		path(`M${x1} ${y1}A275 275 0 0 1 ${x2} ${y2}`, 'd-accent'), // bridge
		circle(17, 'd-accent', polar(248, -48)), // pistons
		circle(17, 'd-accent', polar(248, -24)),
		circle(6, 'd-accent', polar(322, -36)), // bleed screw
		circle(7, 'd-accent', polar(300, from + 4)), // guide pins
		circle(7, 'd-accent', polar(300, to - 4)),
	].join('')
}

function annotations() {
	const [rimX, rimY] = polar(300, 150)
	return [
		// Centre lines
		path(`M40 ${C}H${SIZE - 40}M${C} 40V${SIZE - 40}`, 'd-axis', false),
		// Diameter dimension under the disc
		path(`M100 ${C + 30}V770M700 ${C + 30}V770`, 'd-dim', false),
		path('M100 750H700', 'd-dim'),
		path('M100 750l14 -5v10zM700 750l-14 -5v10z', 'd-dim d-dim--arrow', false),
		// Radius leader
		path(`M${C} ${C}L${rimX} ${rimY}`, 'd-dim'),
	].join('')
}

// Callouts: anchor on the part → elbow → label. Labels are HTML (positioned in %), so they
// use the site fonts and stay crisp; the SVG only draws the leader lines.
const CALLOUTS = [
	{ text: 'CALIPER · FR-L', anchor: polar(338, -36), elbow: [726, 118], label: [740, 118], accent: true },
	// Sits on the disc face (not above it), so it never reaches the hero text over the drawing
	{ text: 'PART NO. 43512-47040', anchor: polar(234, -120), elbow: [283, 270], label: [297, 270] },
	{ text: 'OEM / AFTERMARKET', anchor: polar(150, 12), elbow: [640, 452], label: [654, 452] },
	{ text: 'VIN ✓ MATCH', anchor: polar(300, 38), elbow: [700, 640], label: [714, 640], accent: true },
]

function leaders() {
	return CALLOUTS.map(({ anchor: [ax, ay], elbow: [ex, ey], label: [lx, ly] }) => [
		path(`M${ax} ${ay}L${ex} ${ey}H${lx}`, 'd-leader'),
		`<circle class="d-dot" cx="${ax}" cy="${ay}" r="4"/>`,
	].join('')).join('')
}

export function brakeDrawing() {
	const svg = `<svg class="drawing__svg" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true" focusable="false">${annotations()}${disc()}${caliper()}${leaders()}</svg>`

	const callouts = CALLOUTS.map(({ text, label: [x, y], side = 'right', accent = false }) => ({
		text,
		side,
		accent,
		x: round((x / SIZE) * 100),
		y: round((y / SIZE) * 100),
	}))

	// Dimension label sits on the diameter line
	callouts.push({ text: 'Ø 296', side: 'center', accent: false, x: 50, y: round((738 / SIZE) * 100) })

	return { svg, callouts }
}
