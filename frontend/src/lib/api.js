import axios from 'axios'

export const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

// The login token lives in an HTTP-only cookie, so every request must send credentials.
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

// A readable message from any failed request.
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?'
  return fallback
}
