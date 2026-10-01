// Shared by the browser form and the server endpoint — keep it dependency-free.

export const VIN_LENGTH = 17
export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_PART_PHOTOS = 5
// Whole request limit: Netlify Functions accept bodies up to 6 MB. Photos are compressed
// in the browser first (image-compress.js), so this is rarely reached.
export const MAX_UPLOAD_BYTES = 5.5 * 1024 * 1024

// People often type a VIN on a Cyrillic keyboard layout: map look-alike letters to Latin
const CYRILLIC_LOOKALIKES = {
	А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y',
}

export function normalizeVin(value) {
	return String(value ?? '')
		.toUpperCase()
		.replace(/[АВЕКМНОРСТХУ]/g, char => CYRILLIC_LOOKALIKES[char])
		.replace(/[^A-Z0-9]/g, '')
}

// Returns an error code or null
export function validateVin(vin) {
	if (!vin) return 'vinRequired'
	if (/[IOQ]/.test(vin)) return 'vinChars'
	if (vin.length !== VIN_LENGTH) return 'vinLength'
	return null
}

export function validatePart(value) {
	return String(value ?? '').trim().length >= 2 ? null : 'partRequired'
}

export function validateContact(method, value) {
	const contact = String(value ?? '').trim()
	if (!contact) return 'contactRequired'
	if (method === 'telegram' && /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(contact)) return null
	const digits = contact.replace(/\D/g, '')
	if (digits.length < 8 || digits.length > 15) {
		return method === 'telegram' ? 'telegramInvalid' : 'contactInvalid'
	}
	return null
}

export function isAcceptedFile(file) {
	if (file.type.startsWith('image/') || file.type === 'application/pdf') return true
	// Some browsers report HEIC photos with an empty type
	return file.type === '' && /\.(heic|heif)$/i.test(file.name)
}
