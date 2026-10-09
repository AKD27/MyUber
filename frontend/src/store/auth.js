import { create } from 'zustand'
import { api } from '../lib/api'
import { socket } from '../lib/socket'

// Who is logged in. 'loading' until the first /auth/me check finishes.
export const useAuth = create((set) => ({
  status: 'loading',
  role: null,
  account: null,

  load: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ status: 'authenticated', role: data.role, account: data.account })
      socket.connect()
    } catch {
      set({ status: 'guest', role: null, account: null })
    }
  },

  setSession: ({ role, account }) => {
    set({ status: 'authenticated', role, account })
    // Reconnect so the socket is authenticated with the new login cookie.
    socket.disconnect().connect()
  },

  setAccount: (account) => set({ account }),

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      socket.disconnect()
      set({ status: 'guest', role: null, account: null })
    }
  },
}))

// Where each role starts. Drivers who have not completed onboarding start on their profile.
export const homeFor = (role, account) => {
  if (role === 'driver' && account?.verification?.status === 'pending') return '/driver/profile'
  return { customer: '/book', driver: '/driver', admin: '/admin' }[role] || '/'
}
