import { z } from 'zod'

export const email = z.string().trim().email('Enter a valid email')
export const phone = z.string().trim().regex(/^\+?[0-9 ]{10,15}$/, 'Enter a valid phone number')
export const password = z.string().min(8, 'Password must be at least 8 characters')

export const registerSchema = z.object({
  firstname: z.string().trim().min(2, 'Enter your first name'),
  lastname: z.string().trim().optional(),
  email,
  phone,
  password,
})
