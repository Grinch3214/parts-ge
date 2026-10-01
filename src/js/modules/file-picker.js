import { MAX_FILE_SIZE, isAcceptedFile } from './validation.js'

// Wraps <input type="file"> with previews and per-file removal
export class FilePicker {
	constructor(root, { max = 1, removeLabel = 'Remove', onError, onChange } = {}) {
		this.input = root.querySelector('input[type="file"]')
		this.list = root.querySelector('[data-files]')
		this.max = max
		this.removeLabel = removeLabel
		this.onError = onError
		this.onChange = onChange
		this.files = []
		this.rendered = new WeakSet()
		this.urls = []

		this.input.addEventListener('change', () => this.add([...this.input.files]))
	}

	add(incoming) {
		let error = null

		for (const file of incoming) {
			if (!isAcceptedFile(file)) {
				error = 'fileType'
			} else if (file.size > MAX_FILE_SIZE) {
				error = 'fileTooBig'
			} else if (this.max === 1) {
				this.files = [file]
			} else if (this.files.length >= this.max) {
				error = 'tooManyFiles'
				break
			} else {
				this.files.push(file)
			}
		}

		// Reset so choosing the same file again still fires "change"
		this.input.value = ''
		this.render()
		this.onError?.(error)
		this.onChange?.(this.files)
	}

	remove(file) {
		this.files = this.files.filter(f => f !== file)
		this.render()
		this.onError?.(null)
		this.onChange?.(this.files)
		this.input.focus()
	}

	clear() {
		this.files = []
		this.render()
	}

	render() {
		this.urls.forEach(url => URL.revokeObjectURL(url))
		this.urls = []
		this.list.replaceChildren(...this.files.map(file => this.renderItem(file)))
	}

	renderItem(file) {
		const item = document.createElement('li')
		item.className = 'upload__item'
		if (!this.rendered.has(file)) {
			item.classList.add('is-new')
			this.rendered.add(file)
		}

		const previewable = file.type.startsWith('image/') && !/hei[cf]/i.test(file.type)
		if (previewable) {
			const url = URL.createObjectURL(file)
			this.urls.push(url)
			const img = new Image()
			img.src = url
			img.alt = file.name
			img.decoding = 'async'
			item.append(img)
		} else {
			const label = document.createElement('span')
			label.className = 'upload__file'
			label.textContent = (file.name.split('.').pop() || 'FILE').toUpperCase()
			item.append(label)
		}

		const remove = document.createElement('button')
		remove.type = 'button'
		remove.className = 'upload__remove'
		remove.setAttribute('aria-label', `${this.removeLabel}: ${file.name}`)
		remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-x"></use></svg>'
		remove.addEventListener('click', () => this.remove(file))
		item.append(remove)

		return item
	}
}
