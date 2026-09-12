<script setup>
import { onMounted, ref } from 'vue'
import { store, t, setLang, logout } from './store.js'
import LoginView from './components/LoginView.vue'
import ChatView from './components/ChatView.vue'

const booting = ref(true)

onMounted(async () => {
  setLang(store.lang)
  booting.value = false
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <span class="logo">💬 {{ t().title }}</span>
      <div class="controls">
        <button class="ghost" @click="setLang(store.lang === 'fa' ? 'en' : 'fa')">
          {{ store.lang === 'fa' ? 'English' : 'فارسی' }}
        </button>
        <template v-if="store.user">
          <span class="user">@{{ store.user.username }}</span>
          <button class="ghost" @click="logout">{{ t().logout }}</button>
        </template>
      </div>
    </header>

    <main class="main">
      <p v-if="booting">…</p>
      <LoginView v-else-if="!store.user" />
      <ChatView v-else />
    </main>
  </div>
</template>

<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Vazirmatn, "Segoe UI", Tahoma, sans-serif;
  background: #0f1420;
  color: #e8ecf5;
}
.shell { display: flex; flex-direction: column; height: 100vh; }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 20px; background: #161d2f; border-bottom: 1px solid #232c44;
}
.logo { font-weight: 700; font-size: 18px; }
.controls { display: flex; gap: 12px; align-items: center; }
.user { color: #7ea2ff; }
button.ghost {
  background: transparent; color: #9fb0d0; border: 1px solid #2c3854;
  border-radius: 8px; padding: 6px 14px; cursor: pointer; font: inherit;
}
button.ghost:hover { border-color: #4c6fff; color: #cdd9f5; }
.main { flex: 1; min-height: 0; }
</style>
