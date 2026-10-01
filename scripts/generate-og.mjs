// One-off: renders public/og.png (1200×630) for link previews. Run: node scripts/generate-og.mjs
import sharp from 'sharp'

const vin = 'JTDKN3DU5A0123456'
const cell = 52
const cells = [...vin]
	.map((char, i) => {
		const x = 80 + i * (cell + 6)
		const accent = i >= 3 && i < 9
		return `<rect x="${x}" y="400" width="${cell}" height="64" rx="6" fill="${accent ? '#fbeee6' : '#ffffff'}" stroke="${accent ? '#e9b9a1' : '#e2e0d9'}"/>
<text x="${x + cell / 2}" y="443" text-anchor="middle" font-family="Consolas, monospace" font-size="28" font-weight="700" fill="${accent ? '#c2410c' : '#121417'}">${char}</text>`
	})
	.join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#121417" stroke-opacity=".05"/></pattern></defs>
<rect width="1200" height="630" fill="#f4f3ef"/>
<rect width="1200" height="630" fill="url(#grid)"/>
<g transform="translate(80 80) scale(1.75)"><rect width="32" height="32" rx="7" fill="#121417"/><path d="M16 6.5l8.2 4.75v9.5L16 25.5l-8.2-4.75v-9.5z" fill="none" stroke="#e8662a" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="3.3" fill="none" stroke="#fff" stroke-width="2"/></g>
<text x="160" y="122" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="700" fill="#121417">Zapchast<tspan fill="#6f757d" font-weight="400">.ge</tspan></text>
<text x="80" y="270" font-family="Segoe UI, Arial, sans-serif" font-size="76" font-weight="700" fill="#121417" letter-spacing="-2">Запчасти для авто в Батуми</text>
<text x="80" y="335" font-family="Segoe UI, Arial, sans-serif" font-size="32" fill="#474d55">Пришлите VIN — подберём деталь, цену и срок доставки</text>
${cells}
<rect x="80" y="520" width="1040" height="1" fill="#cbc8bf"/>
<text x="80" y="566" font-family="Consolas, monospace" font-size="22" fill="#6f757d" letter-spacing="2">BATUMI · TURKEY · UAE · EUROPE</text>
</svg>`

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og.png')
console.log('public/og.png ready')
