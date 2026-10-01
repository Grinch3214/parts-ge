// Set in .env.local / hosting env. Nothing secret belongs here — this file ships to the browser.
export const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '/api/request'
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

export const DRAFT_KEY = 'zp:request-draft'
