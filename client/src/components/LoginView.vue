<script setup>
import { ref } from 'vue'
import { store, t, login, register } from '../store.js'

const mode = ref('login')
const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (mode.value === 'login') await login(username.value, password.value)
    else await register(username.value, password.value)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <form class="card" @submit.prevent="submit">
      <h2>{{ t().welcome }}</h2>
      <label>{{ t().username }}
        <input v-model="username" autocomplete="username" required minlength="3" />
      </label>
      <label>{{ t().password }}
        <input v-model="password" type="password" required minlength="8"
               :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button :disabled="busy" type="submit">
        {{ mode === 'login' ? t().login : t().register }}
      </button>
      <a href="#" @click.prevent="mode = mode === 'login' ? 'register' : 'login'">
        {{ mode === 'login' ? t().register : t().login }} ↩
      </a>
    </form>
  </div>
</template>

<style scoped>
.auth-wrap { display: grid; place-items: center; height: 100%; }
.card {
  width: min(360px, 92vw); background: #161d2f; border: 1px solid #232c44;
  border-radius: 16px; padding: 28px; display: flex; flex-direction: column; gap: 14px;
}
.card h2 { margin: 0 0 6px; font-size: 17px; color: #9fb0d0; font-weight: 500; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: #9fb0d0; }
input {
  background: #0f1420; border: 1px solid #2c3854; border-radius: 10px;
  padding: 10px 12px; color: #e8ecf5; font: inherit; outline: none;
}
input:focus { border-color: #4c6fff; }
button {
  background: #4c6fff; color: white; border: 0; border-radius: 10px;
  padding: 11px; font: inherit; font-weight: 600; cursor: pointer;
}
button:disabled { opacity: 0.6; }
a { color: #7ea2ff; text-align: center; font-size: 14px; }
.error { color: #ff7b8a; margin: 0; font-size: 13px; }
</style>
