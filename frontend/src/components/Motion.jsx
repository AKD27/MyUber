import { Icon } from './ui'
import { cx } from '../lib/cx'

// Rings spreading out from a centre, for "looking for…" states.
export function Radar({ icon = 'ri-steering-2-fill', className }) {
  return (
    <span aria-hidden='true' className={cx('relative flex h-24 w-24 items-center justify-center', className)}>
      <span className='radar-ring absolute inset-0 rounded-full border-2 border-brand-400' />
      <span className='radar-ring absolute inset-0 rounded-full border-2 border-brand-400 [animation-delay:0.8s]' />
      <span className='radar-ring absolute inset-0 rounded-full border-2 border-brand-400 [animation-delay:1.6s]' />
      <span className='relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lift'><Icon name={icon} /></span>
    </span>
  )
}

// A tick that draws itself, for "done" moments.
export function SuccessCheck({ className = 'h-7 w-7' }) {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' className={className}>
      <circle cx='16' cy='16' r='13' className='draw-circle' />
      <path d='M10 16.5l4.2 4.2L22.5 12' className='draw-check' />
    </svg>
  )
}

// A ring that empties as time runs out; `fraction` is the share of time left (1 → 0).
export function CountdownRing({ fraction, className = 'h-5 w-5' }) {
  const length = 2 * Math.PI * 9
  return (
    <svg aria-hidden='true' viewBox='0 0 24 24' className={cx('-rotate-90', className)}>
      <circle cx='12' cy='12' r='9' fill='none' stroke='currentColor' strokeOpacity='0.25' strokeWidth='3' />
      <circle cx='12' cy='12' r='9' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round'
        strokeDasharray={length} strokeDashoffset={length * (1 - Math.max(0, Math.min(1, fraction)))} className='transition-[stroke-dashoffset] duration-1000 ease-linear' />
    </svg>
  )
}
