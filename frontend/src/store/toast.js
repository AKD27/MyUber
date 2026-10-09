import { create } from 'zustand'

let nextId = 1

export const useToasts = create((set) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), 5000)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message, tone) => useToasts.getState().push(message, tone)
