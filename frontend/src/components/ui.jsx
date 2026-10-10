import { forwardRef, useEffect, useId, useRef } from 'react'
import { STATUS, VERIFICATION } from '../lib/constants'
import { ICONS, SOLID, FALLBACK_ICON } from '../lib/icons'
import { cx } from '../lib/cx'

// An icon sized by the surrounding text (use text-* classes). `name` is an icon key such as
// 'ri-search-line'; anything after a space is treated as extra classes ('ri-loader-4-line animate-spin').
export function Icon({ name = '', className }) {
  const [id, ...extra] = name.split(' ')
  const Glyph = ICONS[id.replace(/^ri-/, '').replace(/-(line|fill)$/, '')] || FALLBACK_ICON
  return (
    <Glyph aria-hidden='true' size='1em' strokeWidth={id.endsWith('-fill') ? 2.25 : 1.75} fill={SOLID.has(id) ? 'currentColor' : 'none'}
      className={cx('inline-block shrink-0 align-[-0.125em]', extra.join(' '), className)} />
  )
}

const BUTTON_STYLES = {
  primary: 'bg-slate-950 text-white hover:bg-slate-800 active:bg-black disabled:bg-slate-300 disabled:text-white',
  // The main action on a screen: solid black, like `primary`. Kept as its own name so one change can re-colour every main action.
  brand: 'bg-slate-950 text-white hover:bg-slate-800 active:bg-black disabled:bg-slate-300',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 disabled:text-slate-400',
  soft: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-red-600/40',
  'danger-soft': 'bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 disabled:opacity-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50',
}

const BUTTON_SIZES = {
  sm: 'h-9 gap-1.5 rounded-lg px-3.5 text-[13px]',
  md: 'h-11 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-[52px] gap-2 rounded-lg px-6 text-base',
}

export const buttonClass = ({ variant = 'primary', size = 'md', className } = {}) =>
  cx('inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100', BUTTON_SIZES[size], BUTTON_STYLES[variant], className)

export function Button({ variant, size, loading, className, children, ...props }) {
  return (
    <button type='button' {...props} disabled={props.disabled || loading} aria-busy={loading || undefined} className={buttonClass({ variant, size, className })}>
      {loading && <Icon name='ri-loader-4-line' className='animate-spin text-base' />}
      {children}
    </button>
  )
}

export function IconButton({ icon, label, className, ...props }) {
  return (
    <button type='button' aria-label={label} title={label} {...props}
      className={cx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900', className)}>
      <Icon name={icon} />
    </button>
  )
}

// `group` is for a set of controls (tick boxes, pills) that each carry their own label.
export function Field({ label, error, hint, children, className, optional, group }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag {...(group ? { role: 'group', 'aria-label': label } : {})} className={cx('block', className)}>
      {label && (
        <span className='mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-slate-600'>
          {label}
          {optional && <span className='font-normal text-slate-400'>Optional</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className='mt-1.5 block text-xs text-slate-500'>{hint}</span>}
      {error && <span role='alert' className='mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600'><Icon name='ri-error-warning-fill' />{error}</span>}
    </Tag>
  )
}

// Filled fields that turn white with a black outline when focused.
const inputBase = 'h-12 rounded-lg border-2 border-transparent bg-slate-100 px-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-500 hover:bg-slate-200/70 focus:border-slate-900 focus:bg-white focus-visible:ring-0 disabled:text-slate-500 aria-[invalid=true]:border-red-500'

// Full width unless the caller sets a width (w-full would otherwise win over it in Tailwind's CSS order).
const inputClass = (className) => cx(inputBase, !/(^|\s)w-/.test(className || '') && 'w-full', className)

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} {...props} className={inputClass(className)} />
})

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return <select ref={ref} {...props} className={inputClass(cx('cursor-pointer pr-8', className))}>{children}</select>
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} {...props} className={inputClass(cx('h-auto min-h-24 py-2.5 leading-relaxed', className))} />
})

export function Card({ className, children, padded = true, ...props }) {
  return <div {...props} className={cx('rounded-2xl border border-slate-200 bg-white transition-shadow duration-200', padded && 'p-4 sm:p-5', className)}>{children}</div>
}

export function SectionTitle({ children, action, className }) {
  return (
    <div className={cx('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className='text-[15px] font-bold text-slate-900'>{children}</h2>
      {action}
    </div>
  )
}

const TONES = {
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  brand: 'bg-brand-50 text-brand-800 ring-brand-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const DOTS = { amber: 'bg-amber-500', brand: 'bg-brand-500', blue: 'bg-blue-500', green: 'bg-emerald-500', red: 'bg-red-500', gray: 'bg-slate-400' }

export function Badge({ tone = 'gray', dot, children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', TONES[tone] || TONES.gray, className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', DOTS[tone] || DOTS.gray)} />}
      {children}
    </span>
  )
}

export const StatusBadge = ({ status }) => <Badge dot tone={STATUS[status]?.tone}>{STATUS[status]?.label || status}</Badge>

export const VerificationBadge = ({ status }) => (
  <Badge tone={VERIFICATION[status]?.tone}>
    {status === 'verified' && <Icon name='ri-shield-check-fill' />}
    {VERIFICATION[status]?.label || status}
  </Badge>
)

export function Spinner({ label = 'Loading…', className }) {
  return (
    <div role='status' className={cx('flex items-center justify-center gap-2 py-12 text-sm text-slate-500', className)}>
      <Icon name='ri-loader-4-line' className='animate-spin text-xl text-brand-600' /> {label}
    </div>
  )
}

export function Skeleton({ className }) {
  return <div aria-hidden='true' className={cx('shimmer rounded-xl', className)} />
}

// Placeholder cards while a list loads.
export function ListSkeleton({ count = 3 }) {
  return (
    <div className='stagger space-y-3' role='status' aria-label='Loading'>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className='flex gap-3'>
          <Skeleton className='h-12 w-12 rounded-full' />
          <div className='flex-1 space-y-2'><Skeleton className='h-4 w-2/5' /><Skeleton className='h-3 w-4/5' /><Skeleton className='h-3 w-3/5' /></div>
        </Card>
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'ri-inbox-line', title, children, action, visual }) {
  return (
    <div className='animate-enter flex flex-col items-center rounded-2xl bg-slate-50 px-6 py-12 text-center'>
      {visual || (
        <span className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-900'>
          <Icon name={icon} />
        </span>
      )}
      <p className='font-bold text-slate-900'>{title}</p>
      {children && <div className='mt-1 max-w-sm text-sm text-slate-500'>{children}</div>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}

export function ErrorNote({ children, className }) {
  if (!children) return null
  return (
    <p role='alert' className={cx('flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/10', className)}>
      <Icon name='ri-error-warning-fill' className='mt-px text-base' /><span>{children}</span>
    </p>
  )
}

const NOTE_TONES = {
  amber: 'bg-amber-50 text-amber-900 ring-amber-600/15',
  blue: 'bg-blue-50 text-blue-900 ring-blue-600/15',
  brand: 'bg-brand-50 text-brand-900 ring-brand-600/15',
  gray: 'bg-slate-100 text-slate-700 ring-slate-500/10',
  red: 'bg-red-50 text-red-800 ring-red-600/15',
}

export function Note({ tone = 'gray', icon = 'ri-information-fill', children, className }) {
  return (
    <div className={cx('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm ring-1 ring-inset', NOTE_TONES[tone], className)}>
      <Icon name={icon} className='mt-px text-base' /><div className='min-w-0 flex-1'>{children}</div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action, back }) {
  return (
    <div className='mb-6 flex flex-wrap items-end justify-between gap-3'>
      <div className='min-w-0'>
        {back}
        <h1 className='text-[28px] font-extrabold leading-tight text-slate-950 sm:text-[32px]'>{title}</h1>
        {subtitle && <p className='mt-1 text-sm text-slate-500'>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stars({ value = 0, count, size = 'text-sm' }) {
  return (
    <span className={cx('inline-flex items-center gap-1', size)}>
      <Icon name='ri-star-fill' className='text-amber-400' />
      <span className='font-bold text-slate-900'>{value ? value.toFixed(1) : 'New'}</span>
      {count !== undefined && count > 0 && <span className='font-normal text-slate-500'>({count})</span>}
    </span>
  )
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role='tablist' className={cx('scrollbar-none mb-5 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1', className)}>
      {tabs.map((tab) => (
        <button key={tab.value} type='button' role='tab' aria-selected={value === tab.value} onClick={() => onChange(tab.value)}
          className={cx('flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-semibold transition',
            value === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900', 'duration-200 active:scale-[0.97]')}>
          {tab.icon && <Icon name={tab.icon} />}
          {tab.label}
          {tab.count > 0 && <span className='rounded-full bg-brand-600 px-1.5 text-[11px] leading-[18px] text-white'>{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type='button' role='switch' aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40', checked ? 'bg-emerald-500' : 'bg-slate-300')}>
      <span className={cx('absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  )
}

// A selectable pill, for filters and multi-choice options.
export function Chip({ selected, onClick, icon, children, className }) {
  return (
    <button type='button' aria-pressed={selected} onClick={onClick}
      className={cx('inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition',
        selected ? 'bg-slate-950 text-white ring-slate-950' : 'bg-slate-100 text-slate-800 ring-transparent hover:bg-slate-200', className)}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}

export function StatTile({ icon, label, value, hint, tone = 'slate', className }) {
  // One quiet style for every tile; only red is kept, for things that need attention.
  const tones = { red: 'bg-red-50 text-red-700' }
  return (
    <Card className={cx('h-full', className)}>
      <div className='flex items-start justify-between gap-2'>
        <p className='text-[13px] font-medium text-slate-500'>{label}</p>
        {icon && <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg', tones[tone] || 'bg-slate-100 text-slate-700')}><Icon name={icon} /></span>}
      </div>
      <p className='tabular mt-1 text-2xl font-extrabold tracking-tight text-slate-900'>{value}</p>
      {hint && <p className='mt-0.5 text-xs text-slate-500'>{hint}</p>}
    </Card>
  )
}

// A dialog: bottom sheet on phones, centred on larger screens. Closes on Escape or a click outside.
export function Modal({ open, onClose, title, children, size = 'md' }) {
  const titleId = useId()
  const panel = useRef(null)
  // Callers pass a new onClose on every render; the effect must only run when the dialog opens or closes.
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const onKey = (event) => { if (event.key === 'Escape') close.current() }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panel.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className='fixed inset-0 z-[1000] flex animate-fade-in items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4' onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panel} role='dialog' aria-modal='true' aria-labelledby={titleId} tabIndex={-1}
        className={cx('flex max-h-[92dvh] w-full animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift outline-none sm:rounded-3xl', size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5'>
          <h2 id={titleId} className='text-lg font-bold text-slate-900'>{title}</h2>
          <IconButton icon='ri-close-line' label='Close' onClick={onClose} className='-mr-2' />
        </div>
        <div className='overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5'>{children}</div>
      </div>
    </div>
  )
}

// Label and value pairs in read-only detail panels.
export function Detail({ label, children }) {
  return (
    <div className='min-w-0'>
      <p className='text-xs font-medium text-slate-500'>{label}</p>
      <div className='mt-0.5 break-words text-sm font-medium text-slate-900'>{children || <span className='font-normal text-slate-400'>Not provided</span>}</div>
    </div>
  )
}

export function Table({ head, children }) {
  return (
    <div className='overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-card'>
      <table className='w-full min-w-[640px] text-left text-sm'>
        <thead className='border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500'>
          <tr>{head.map((label, i) => <th key={label || i} scope='col' className='whitespace-nowrap px-4 py-3'>{label}</th>)}</tr>
        </thead>
        <tbody className='divide-y divide-slate-100'>{children}</tbody>
      </table>
    </div>
  )
}
