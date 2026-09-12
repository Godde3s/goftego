import { createApp } from 'vue'
import App from './App.vue'
import { setLang } from './store.js'

setLang(localStorage.getItem('goftego-lang') || 'fa')
createApp(App).mount('#app')
