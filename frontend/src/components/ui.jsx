import { forwardRef } from 'react'
import { STATUS, VERIFICATION } from '../lib/constants'

import { cx } from '../lib/cx'

const BUTTON_STYLES = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 disabled:bg-teal-700/50',
  dark: 'bg-gray-900 text-white hover:bg-black disabled:bg-gray-900/50',
  secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 disabled:text-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
  ghost: 'text-gray-700 hover:bg-gray-100',
}

export function Button({ variant = 'primary', loading, className, children, ...props }) {
  return (
    <button
      type='button'
      {...props}
      disabled={props.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed', BUTTON_STYLES[variant], className)}
    >
      {loading && <i aria-hidden='true' className='ri-loader-4-line animate-spin' />}
      {children}
    </button>
  )
}

export function Field({ label, error, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className='mb-1 block text-sm font-medium text-gray-700'>{label}</span>}
      {children}
      {hint && !error && <span className='mt-1 block text-xs text-gray-500'>{hint}</span>}
      {error && <span className='mt-1 block text-xs text-red-600'>{error}</span>}
    </label>
  )
}

const inputBase = 'rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:bg-gray-100'

// Full width unless the caller sets a width (w-full would otherwise win over it in Tailwind's CSS order).
const inputClass = (className) => cx(inputBase, !/(^|\s)w-/.test(className || '') && 'w-full', className)

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} {...props} className={inputClass(className)} />
})

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return <select ref={ref} {...props} className={inputClass(className)}>{children}</select>
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} {...props} className={inputClass(cx('min-h-20', className))} />
})

export function Card({ className, children, ...props }) {
  return <div {...props} className={cx('rounded-xl border border-gray-200 bg-white p-4 sm:p-5', className)}>{children}</div>
}

const TONES = {
  amber: 'bg-amber-100 text-amber-800',
  teal: 'bg-teal-100 text-teal-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-700',
}

export function Badge({ tone = 'gray', children, className }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone], className)}>{children}</span>
}

export const StatusBadge = ({ status }) => <Badge tone={STATUS[status]?.tone}>{STATUS[status]?.label || status}</Badge>

export const VerificationBadge = ({ status }) => (
  <Badge tone={VERIFICATION[status]?.tone}>
    {status === 'verified' && <i aria-hidden='true' className='ri-shield-check-fill' />}
    {VERIFICATION[status]?.label || status}
  </Badge>
)

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className='flex items-center justify-center gap-2 py-10 text-sm text-gray-500'>
      <i aria-hidden='true' className='ri-loader-4-line animate-spin text-lg' /> {label}
    </div>
  )
}

export function EmptyState({ icon = 'ri-inbox-line', title, children }) {
  return (
    <div className='flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center'>
      <i aria-hidden='true' className={cx(icon, 'text-3xl text-gray-400')} />
      <p className='font-semibold text-gray-800'>{title}</p>
      {children && <div className='text-sm text-gray-500'>{children}</div>}
    </div>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return <p className='rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'>{children}</p>
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className='mb-5 flex flex-wrap items-end justify-between gap-3'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>{title}</h1>
        {subtitle && <p className='mt-1 text-sm text-gray-500'>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stars({ value = 0, count, size = 'text-sm' }) {
  return (
    <span className={cx('inline-flex items-center gap-1', size)}>
      <i aria-hidden='true' className='ri-star-fill text-amber-500' />
      <span className='font-semibold'>{value ? value.toFixed(1) : 'New'}</span>
      {count !== undefined && count > 0 && <span className='text-gray-500'>({count})</span>}
    </span>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className='mb-4 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1'>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type='button'
          onClick={() => onChange(tab.value)}
          className={cx('whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium', value === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className='fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 sm:items-center' onClick={onClose}>
      <div className='max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl' onClick={(e) => e.stopPropagation()}>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-bold'>{title}</h2>
          <button type='button' aria-label='Close' onClick={onClose} className='rounded-full p-1 hover:bg-gray-100'><i aria-hidden='true' className='ri-close-line text-xl' /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

