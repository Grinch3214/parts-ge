// Downscales photos in the browser before upload: a 4–8 MB phone photo becomes ~300–700 KB
// at 1920px, which is plenty to read a VIN or recognise a part. Faster on mobile data and
// keeps the request under the hosting body limit. Anything we can't decode is sent as is.
const COMPRESSIBLE = /^image\/(jpeg|png|webp)$/
const MAX_SIDE = 1920
const QUALITY = 0.82
const SKIP_BELOW_BYTES = 600 * 1024

export async function compressImage(file) {
	if (!COMPRESSIBLE.test(file.type) || !('createImageBitmap' in window)) return file

	try {
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
		const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
		if (scale === 1 && file.size < SKIP_BELOW_BYTES) {
			bitmap.close()
			return file
		}

		const canvas = document.createElement('canvas')
		canvas.width = Math.round(bitmap.width * scale)
		canvas.height = Math.round(bitmap.height * scale)
		const context = canvas.getContext('2d')
		context.fillStyle = '#fff' // PNG transparency → white instead of black in JPEG
		context.fillRect(0, 0, canvas.width, canvas.height)
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
		bitmap.close()

		const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
		if (!blob || blob.size >= file.size) return file
		return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
	} catch {
		return file
	}
}
