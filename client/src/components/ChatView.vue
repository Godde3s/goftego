<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { store, t, loadChannels, openChannel, sendMessage, sendTyping } from '../store.js'

const draft = ref('')
const listEl = ref(null)
const showNew = ref(false)
const newName = ref('')

onMounted(loadChannels)

watch(() => store.messages.length, async () => {
  await nextTick()
  listEl.value?.scrollTo({ top: listEl.value.scrollHeight })
})

async function send() {
  const body = draft.value.trim()
  if (!body || !store.currentChannel) return
  sendMessage(body)
  draft.value = ''
}

async function createChannel() {
  const { api } = await import('../api.js')
  const res = await api('/api/channels', {
    method: 'POST', body: JSON.stringify({ name: newName.value }),
  })
  store.channels.push(res.channel)
  newName.value = ''
  showNew.value = false
  openChannel(res.channel)
}

function fmt(ts) {
  return new Date(ts * 1000).toLocaleTimeString(store.lang === 'fa' ? 'fa-IR' : 'en',
    { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="chat-layout">
    <aside class="sidebar">
      <div class="side-head">
        <strong>{{ t().channels }}</strong>
        <button class="pill" @click="showNew = !showNew">＋</button>
      </div>
      <form v-if="showNew" class="new-ch" @submit.prevent="createChannel">
        <input v-model="newName" :placeholder="t().newChannel" required minlength="2" />
      </form>
      <button v-for="ch in store.channels" :key="ch.id"
              class="channel" :class="{ active: store.currentChannel?.id === ch.id }"
              @click="openChannel(ch)">
        <span class="hash">#</span> {{ ch.name }}
      </button>
    </aside>

    <section class="chat">
      <template v-if="store.currentChannel">
        <div class="messages" ref="listEl">
          <div v-for="m in store.messages" :key="m.id" class="row">
            <span class="avatar">{{ m.username.slice(0, 2).toUpperCase() }}</span>
            <div class="bubble" :class="{ mine: m.user_id === store.user.id }">
              <div class="meta"><b>{{ m.username }}</b> · {{ fmt(m.created_at) }}</div>
              <div class="body">{{ m.body }}</div>
            </div>
          </div>
        </div>
        <p v-if="store.typing" class="typing">✍ {{ store.typing }} {{ t().typing }}</p>
        <form class="composer" @submit.prevent="send">
          <input v-model="draft" :placeholder="t().message" @input="sendTyping" />
          <button type="submit">{{ t().send }}</button>
        </form>
      </template>
      <div v-else class="placeholder">
        <p>← {{ t().channels }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chat-layout { display: flex; height: 100%; }
.sidebar {
  width: 240px; background: #131a2b; border-inline-end: 1px solid #232c44;
  padding: 14px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto;
}
.side-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.pill {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid #2c3854;
  background: transparent; color: #9fb0d0; cursor: pointer;
}
.new-ch input { width: 100%; margin-bottom: 8px; }
.channel {
  text-align: start; background: transparent; border: 0; color: #9fb0d0;
  padding: 9px 12px; border-radius: 10px; cursor: pointer; font: inherit;
}
.channel:hover { background: #1b2440; }
.channel.active { background: #22305c; color: #fff; }
.hash { color: #4c6fff; font-weight: 700; }
.chat { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.messages { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; gap: 10px; align-items: flex-end; }
.avatar {
  width: 34px; height: 34px; border-radius: 10px; background: #22305c;
  display: grid; place-items: center; font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.bubble {
  background: #1b2440; border-radius: 14px; padding: 9px 13px; max-width: 72%;
}
.bubble.mine { background: #274089; }
.meta { font-size: 12px; color: #8494b8; margin-bottom: 3px; }
.body { word-wrap: break-word; white-space: pre-wrap; }
.typing { margin: 0 18px; font-size: 12px; color: #8494b8; height: 16px; }
.composer { display: flex; gap: 10px; padding: 14px 18px; border-top: 1px solid #232c44; }
.composer input {
  flex: 1; background: #1b2440; border: 1px solid #2c3854; color: #e8ecf5;
  border-radius: 12px; padding: 12px 14px; font: inherit; outline: none;
}
.composer input:focus { border-color: #4c6fff; }
.composer button {
  background: #4c6fff; border: 0; color: #fff; border-radius: 12px;
  padding: 0 22px; font: inherit; font-weight: 600; cursor: pointer;
}
.placeholder { flex: 1; display: grid; place-items: center; color: #8494b8; }
@media (max-width: 640px) { .sidebar { width: 90px; } .sidebar .channel { font-size: 12px; } }
</style>
