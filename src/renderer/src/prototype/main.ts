// Entry for the consent-screen redesign prototype (prototype.html). Not loaded by the live app.
import '@fontsource-variable/urbanist' // bundled font: no request to Google Fonts
import '../assets/main.css'
import { createApp } from 'vue'
import PrototypeHarness from './PrototypeHarness.vue'

createApp(PrototypeHarness).mount('#app')
