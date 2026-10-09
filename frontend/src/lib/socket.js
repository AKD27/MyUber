import { io } from 'socket.io-client'
import { API_URL } from './api'

// Connected after login; the server authenticates the socket from the login cookie.
export const socket = io(API_URL, {
  withCredentials: true,
  autoConnect: false,
})
