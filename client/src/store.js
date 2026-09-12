/** Tiny reactive store — no state library needed for this scale. */
import { reactive } from 'vue'
import { api, setToken } from './api.js'

export const store = reactive({
  user: null,
  lang: localStorage.getItem('goftego-lang') || 'fa',
  channels: [],
  currentChannel: null,
  messages: [],
  typing: '',
  socket: null,
})

export const t = () => STRINGS[store.lang]

export function setLang(lang) {
  store.lang = lang
  localStorage.setItem('goftego-lang', lang)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'
}

export const STRINGS = {
  fa: {
    title: 'گفتگو', login: 'ورود', register: 'ثبت‌نام', username: 'نام کاربری',
    password: 'گذرواژه', logout: 'خروج', channels: 'کانال‌ها', newChannel: 'کانال جدید',
    send: 'ارسال', message: 'پیام…', members: 'آنلاین', typing: 'در حال نوشتن…',
    welcome: 'به گفتگو خوش آمدید — چت سلف‌هاست، ساده و آزاد',
  },
  en: {
    title: 'Goftego', login: 'Log in', register: 'Sign up', username: 'Username',
    password: 'Password', logout: 'Log out', channels: 'Channels', newChannel: 'New channel',
    send: 'Send', message: 'Type a message…', members: 'Online', typing: 'is typing…',
    welcome: 'Welcome to Goftego — self-hosted, simple, free',
  },
}

export async function login(username, password) {
  const res = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  setToken(res.token)
  store.user = res.user
  await connectRealtime()
}

export async function register(username, password) {
  const res = await api('/api/register', { method: 'POST', body: JSON.stringify({ username, password }) })
  setToken(res.token)
  store.user = res.user
  await connectRealtime()
}

export function logout() {
  localStorage.removeItem('goftego-token')
  store.user = null
  store.socket?.close()
}

export async function loadChannels() {
  const res = await api('/api/channels')
  store.channels = res.channels
}

export async function openChannel(channel) {
  store.currentChannel = channel
  const res = await api(`/api/channels/${channel.id}/messages`)
  store.messages = res.messages
  store.socket?.send(JSON.stringify({ type: 'join', channel: channel.id }))
}

export function sendMessage(body) {
  store.socket?.send(JSON.stringify({
    type: 'post', channel: store.currentChannel.id, body,
  }))
}

export function sendTyping() {
  store.socket?.send(JSON.stringify({ type: 'typing', channel: store.currentChannel.id }))
}

export async function connectRealtime() {
  const token = localStorage.getItem('goftego-token')
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  store.socket = new WebSocket(`${proto}://${location.host}/ws?token=${token}`)

  store.socket.onmessage = (ev) => {
    const frame = JSON.parse(ev.data)
    if (frame.type === 'message' && frame.message.channel_id === store.currentChannel?.id) {
      store.messages.push(frame.message)
    } else if (frame.type === 'typing') {
      store.typing = frame.user
      setTimeout(() => (store.typing = ''), 2500)
    }
  }
  store.socket.onopen = () => {
    if (store.currentChannel) {
      store.socket.send(JSON.stringify({ type: 'join', channel: store.currentChannel.id }))
    }
  }
}
