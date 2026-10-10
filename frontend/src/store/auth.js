import { create } from 'zustand'
import { api } from '../lib/api'
import { socket } from '../lib/socket'
import { queryClient } from '../lib/queryClient'

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
    // Nothing loaded for a previous account may be shown to this one.
    queryClient.clear()
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
      queryClient.clear()
    }
  },
}))

// Where each role starts. Drivers who have not completed onboarding start on their profile.
export const homeFor = (role, account) => {
  if (role === 'driver' && account?.verification?.status === 'pending') return '/driver/profile'
  return { customer: '/book', driver: '/driver', admin: '/admin' }[role] || '/'
}

// A session that expired (or an account that was suspended) while the app is open: back to the login page.
api.interceptors.response.use((response) => response, (error) => {
  const status = error.response?.status
  const fromAuthRoute = error.config?.url?.startsWith('/auth/')

  if ((status === 401 || status === 403) && !fromAuthRoute && useAuth.getState().status === 'authenticated') {
    // Only the session check decides; a 403 for one forbidden action must not log anyone out.
    useAuth.getState().load()
  }

  return Promise.reject(error)
})
