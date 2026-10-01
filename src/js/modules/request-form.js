import { API_ENDPOINT, TURNSTILE_SITE_KEY, DRAFT_KEY } from '../config.js'
import { normalizeVin, validateVin, validatePart, validateContact, VIN_LENGTH, MAX_PART_PHOTOS } from './validation.js'
import { FilePicker } from './file-picker.js'
import { createDraft } from './draft.js'
import { swapPanels, scrollBehavior } from './motion.js'

const DRAFT_FIELDS = ['mode', 'vin', 'part', 'contactMethod', 'contact', 'car', 'partNumber', 'preference', 'name']
const FIELD_ORDER = ['vin', 'docPhoto', 'part', 'contact', 'partPhotos']
const MIN_LOADING_MS = 600

const format = (template, vars = {}) => template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export default function initRequestForm() {
	const root = document.querySelector('[data-request]')
	const i18nNode = document.getElementById('form-i18n')
	if (!root || !i18nNode) return

	const t = JSON.parse(i18nNode.textContent)
	const form = root.querySelector('[data-request-form]')
	const success = root.querySelector('[data-success]')
	const startedAt = Date.now()
	const draft = createDraft(DRAFT_KEY)
	const errors = {}
	let sending = false

	const $ = selector => form.querySelector(selector)
	const fieldEl = name => form.querySelector(`[data-field="${name}"]`)
	const els = {
		vin: $('#f-vin'),
		vinCounter: $('[data-vin-counter]'),
		vinHelp: $('[data-vin-help]'),
		vinWhere: $('#vin-where'),
		part: $('#f-part'),
		contact: $('#f-contact'),
		contactLabel: $('[data-contact-label]'),
		moreToggle: $('[data-more-toggle]'),
		morePanel: $('[data-more-panel]'),
		alert: $('[data-alert]'),
		alertText: $('[data-alert-text]'),
		submit: $('[data-submit]'),
		submitLabel: $('[data-submit-label]'),
		captcha: $('[data-turnstile]'),
	}

	const mode = () => form.elements.mode.value
	const method = () => form.elements.contactMethod.value

	// ── Errors ────────────────────────────────────────────────
	function setError(name, code, vars) {
		const field = fieldEl(name)
		if (!field) return
		errors[name] = code || null
		field.classList.toggle('is-invalid', Boolean(code))
		field.querySelector('[data-error]').textContent = code ? format(t.errors[code] || t.errors.server, vars) : ''
		field.querySelectorAll('input:not([type="radio"]), textarea').forEach(input => {
			if (code) input.setAttribute('aria-invalid', 'true')
			else input.removeAttribute('aria-invalid')
		})
	}

	const validators = {
		vin: () => {
			if (mode() !== 'vin') return [null]
			const vin = normalizeVin(els.vin.value)
			return [validateVin(vin), { n: vin.length }]
		},
		docPhoto: () => [mode() === 'photo' && !docPicker.files.length ? 'photoRequired' : null],
		part: () => [validatePart(els.part.value)],
		contact: () => [validateContact(method(), els.contact.value)],
	}

	function validate(name) {
		const [code, vars] = validators[name]()
		setError(name, code, vars)
		return !code
	}

	function showAlert(message) {
		els.alertText.textContent = message
		els.alert.hidden = false
	}

	const hideAlert = () => (els.alert.hidden = true)

	// ── VIN ───────────────────────────────────────────────────
	function updateVinCounter(vin) {
		els.vinCounter.textContent = `${vin.length}/${VIN_LENGTH}`
		els.vinCounter.classList.toggle('is-complete', !validateVin(vin))
	}

	els.vin.addEventListener('input', () => {
		// Uppercase, drop spaces/dashes, map Cyrillic look-alikes — keeping the caret in place
		const raw = els.vin.value
		const caret = els.vin.selectionStart ?? raw.length
		const vin = normalizeVin(raw)
		if (vin !== raw) {
			const position = normalizeVin(raw.slice(0, caret)).length
			els.vin.value = vin
			els.vin.setSelectionRange(position, position)
		}
		updateVinCounter(vin)

		const code = validateVin(vin)
		// I/O/Q is reported immediately; other problems only once the field was already flagged
		if (code === 'vinChars' || (errors.vin && vin)) setError('vin', code, { n: vin.length })
		else if (!code) setError('vin', null)
	})

	els.vin.addEventListener('blur', () => {
		if (els.vin.value) validate('vin')
	})

	els.vinHelp.addEventListener('click', () => {
		const open = els.vinHelp.getAttribute('aria-expanded') !== 'true'
		els.vinHelp.setAttribute('aria-expanded', String(open))
		els.vinWhere.hidden = !open
	})

	// ── VIN / photo mode ──────────────────────────────────────
	function applyMode({ animate = false } = {}) {
		const isVin = mode() === 'vin'
		const show = fieldEl(isVin ? 'vin' : 'docPhoto')
		fieldEl('vin').hidden = !isVin
		fieldEl('docPhoto').hidden = isVin
		setError(isVin ? 'docPhoto' : 'vin', null)
		if (animate) {
			show.classList.remove('is-entering')
			void show.offsetWidth
			show.classList.add('is-entering')
		}
	}

	form.querySelectorAll('[data-mode]').forEach(radio => {
		radio.addEventListener('change', () => {
			applyMode({ animate: true })
			saveDraft()
		})
	})

	// ── Uploads ───────────────────────────────────────────────
	const docPicker = new FilePicker(fieldEl('docPhoto'), {
		max: 1,
		removeLabel: t.remove,
		// A new valid file clears a previous error; removing a file doesn't nag right away
		onError: code => (code ? setError('docPhoto', code) : errors.docPhoto && validate('docPhoto')),
	})
	const partPicker = new FilePicker(fieldEl('partPhotos'), {
		max: MAX_PART_PHOTOS,
		removeLabel: t.remove,
		onError: code => setError('partPhotos', code),
	})

	// ── Contact method ────────────────────────────────────────
	function applyMethod() {
		const current = method()
		els.contactLabel.textContent = t.contact.labels[current]
		els.contact.placeholder = t.contact.placeholders[current]
		const isTelegram = current === 'telegram'
		els.contact.type = isTelegram ? 'text' : 'tel'
		els.contact.inputMode = isTelegram ? 'text' : 'tel'
		els.contact.autocomplete = isTelegram ? 'off' : 'tel'
		if (errors.contact && els.contact.value) validate('contact')
	}

	form.querySelectorAll('[data-method]').forEach(radio => {
		radio.addEventListener('change', () => {
			applyMethod()
			saveDraft()
		})
	})

	// ── Part / contact: validate on blur, re-check while fixing ─
	;['part', 'contact'].forEach(name => {
		els[name].addEventListener('blur', () => {
			if (els[name].value.trim()) validate(name)
		})
		els[name].addEventListener('input', () => {
			if (errors[name]) validate(name)
		})
	})

	// ── "More details" disclosure ─────────────────────────────
	function setMore(open) {
		els.moreToggle.setAttribute('aria-expanded', String(open))
		els.morePanel.classList.toggle('is-open', open)
		els.morePanel.inert = !open
	}

	els.moreToggle.addEventListener('click', () => {
		setMore(els.moreToggle.getAttribute('aria-expanded') !== 'true')
		saveDraft()
	})

	// ── Draft ─────────────────────────────────────────────────
	function saveDraft() {
		const data = Object.fromEntries(DRAFT_FIELDS.map(name => [name, form.elements[name].value]))
		data.moreOpen = els.moreToggle.getAttribute('aria-expanded') === 'true'
		draft.save(data)
	}

	function restoreDraft() {
		const data = draft.load()
		DRAFT_FIELDS.forEach(name => {
			if (typeof data[name] !== 'string') return
			const control = form.elements[name]
			if (control instanceof RadioNodeList) {
				const radio = [...control].find(r => r.value === data[name])
				if (radio) radio.checked = true
			} else {
				control.value = data[name]
			}
		})
		return data
	}

	let saveTimer
	form.addEventListener('input', () => {
		clearTimeout(saveTimer)
		saveTimer = setTimeout(saveDraft, 300)
	})

	// ── Cloudflare Turnstile (only when a site key is configured) ─
	let turnstileWidget = null
	function loadTurnstile() {
		if (!TURNSTILE_SITE_KEY || loadTurnstile.started) return
		loadTurnstile.started = true
		els.captcha.hidden = false
		window.onTurnstileLoad = () => {
			turnstileWidget = window.turnstile.render(els.captcha, {
				sitekey: TURNSTILE_SITE_KEY,
				language: document.documentElement.lang,
				appearance: 'interaction-only',
				size: 'flexible',
			})
		}
		const script = document.createElement('script')
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit'
		script.async = true
		document.head.append(script)
	}
	form.addEventListener('focusin', loadTurnstile, { once: true })

	// ── Submit ────────────────────────────────────────────────
	function setSending(state) {
		sending = state
		els.submit.classList.toggle('is-loading', state)
		els.submit.setAttribute('aria-disabled', String(state))
		els.submitLabel.textContent = state ? t.sending : t.submit
		form.setAttribute('aria-busy', String(state))
	}

	function focusField(name) {
		const field = fieldEl(name)
		const control = field?.querySelector('input:not([type="radio"]), textarea')
		if (!control) return
		if (name === 'partPhotos') setMore(true)
		field.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
		control.focus({ preventScroll: true })
	}

	function buildPayload() {
		const data = new FormData()
		data.append('mode', mode())
		if (mode() === 'vin') data.append('vin', normalizeVin(els.vin.value))
		else data.append('docPhoto', docPicker.files[0])
		;['part', 'contact', 'car', 'partNumber', 'name'].forEach(name => data.append(name, form.elements[name].value.trim()))
		data.append('contactMethod', method())
		data.append('preference', form.elements.preference.value)
		partPicker.files.forEach(file => data.append('partPhotos', file))
		// Anti-spam signals checked by the server
		data.append('website', form.elements.website.value)
		data.append('_t', String(startedAt))
		const token = turnstileWidget !== null ? window.turnstile?.getResponse(turnstileWidget) : null
		if (token) data.append('cf-turnstile-response', token)
		// Context for the manager
		data.append('lang', document.documentElement.lang)
		data.append('page', location.href)
		return data
	}

	async function sendRequest(payload) {
		let response
		try {
			;[response] = await Promise.all([fetch(API_ENDPOINT, { method: 'POST', body: payload }), wait(MIN_LOADING_MS)])
		} catch {
			throw { code: 'network' }
		}
		const body = await response.json().catch(() => ({}))
		if (response.status === 429) throw { code: 'rateLimit' }
		if (response.status === 422 && body.errors) throw { code: 'summary', fields: body.errors }
		if (!response.ok || !body.ok) throw { code: 'server' }
		return body
	}

	form.addEventListener('submit', async event => {
		event.preventDefault()
		if (sending) return
		hideAlert()

		const invalid = ['vin', 'docPhoto', 'part', 'contact'].filter(name => !validate(name))
		if (invalid.length) {
			showAlert(t.errors.summary)
			focusField(invalid[0])
			return
		}

		setSending(true)
		try {
			const result = await sendRequest(buildPayload())
			draft.clear()
			await showSuccess(result.id)
		} catch (error) {
			if (error.fields) {
				Object.entries(error.fields).forEach(([name, code]) => setError(name, code))
				const first = FIELD_ORDER.find(name => error.fields[name])
				if (first) focusField(first)
			}
			showAlert(t.errors[error.code] || t.errors.server)
			if (turnstileWidget !== null) window.turnstile?.reset(turnstileWidget)
		} finally {
			setSending(false)
		}
	})

	// ── Success / reset ───────────────────────────────────────
	async function showSuccess(id) {
		const title = success.querySelector('[data-success-title]')
		const [before, after = ''] = t.successTitle.split('{id}')
		const idNode = document.createElement('span')
		idNode.className = 'success__id'
		idNode.textContent = id
		title.replaceChildren(before, idNode, after)

		await swapPanels(root, form, success)
		success.classList.add('is-active')
		if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
		title.focus({ preventScroll: true })
	}

	success.querySelector('[data-again]').addEventListener('click', async () => {
		form.reset()
		docPicker.clear()
		partPicker.clear()
		FIELD_ORDER.forEach(name => setError(name, null))
		hideAlert()
		applyMode()
		applyMethod()
		setMore(false)
		updateVinCounter('')
		success.classList.remove('is-active')
		if (turnstileWidget !== null) window.turnstile?.reset(turnstileWidget)
		await swapPanels(root, success, form)
		form.querySelector('#request-title').focus({ preventScroll: true })
	})

	// ── Init ──────────────────────────────────────────────────
	const restored = restoreDraft()
	applyMode()
	applyMethod()
	setMore(Boolean(restored.moreOpen))
	updateVinCounter(normalizeVin(els.vin.value))
}
