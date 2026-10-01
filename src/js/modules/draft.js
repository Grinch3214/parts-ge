// Keeps typed answers in localStorage so a reload, a language switch or a failed
// submit never loses them. Files are not stored.
export function createDraft(key) {
	return {
		load() {
			try {
				return JSON.parse(localStorage.getItem(key)) || {}
			} catch {
				return {}
			}
		},
		save(data) {
			try {
				localStorage.setItem(key, JSON.stringify(data))
			} catch {
				// Private mode / storage disabled — the form still works, just without a draft
			}
		},
		clear() {
			try {
				localStorage.removeItem(key)
			} catch {
				// see above
			}
		},
	}
}
