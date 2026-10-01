// Styles are linked in <head> (render-blocking) — see src/partials/layout/head.hbs
import initHeader from './modules/header.js'
import initReveal from './modules/reveal.js'
import initRequestForm from './modules/request-form.js'
import initFaq from './modules/faq.js'
import initFloatingActions from './modules/floating-actions.js'
import initNavigation from './modules/navigation.js'

initHeader()
initNavigation()
initRequestForm()
initFaq()
initReveal()
initFloatingActions()
