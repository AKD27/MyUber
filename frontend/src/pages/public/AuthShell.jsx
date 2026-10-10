import { forwardRef, useState } from 'react'
import { Logo } from '../../components/Layout'
import { Icon, Input } from '../../components/ui'

const POINTS = [
  ['ri-shield-check-fill', 'Verified drivers', 'Every driver’s profile and licence is reviewed by our team.'],
  ['ri-key-2-fill', 'OTP at start and end', 'Your trip only starts and ends with your one-time code.'],
  ['ri-map-pin-time-fill', 'Live tracking & SOS', 'Follow your driver on the map and share the trip with family.'],
]

// Two columns on desktop: the brand panel on the left, the form on the right.
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className='grid min-h-dvh bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'>
      <aside className='relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between'>
        <div aria-hidden='true' className='absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl' />
        <div aria-hidden='true' className='absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand-700/20 blur-3xl' />
        <div className='relative'><Logo light /></div>
        <div className='relative'>
          <p className='text-4xl font-extrabold leading-[1.15] tracking-tight'>You have the car.<br /><span className='text-brand-400'>We have the driver.</span></p>
          <ul className='mt-10 space-y-6'>
            {POINTS.map(([icon, heading, text]) => (
              <li key={heading} className='flex gap-4'>
                <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl text-brand-400'><Icon name={icon} /></span>
                <span><span className='block font-bold'>{heading}</span><span className='block text-sm text-slate-400'>{text}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className='relative text-xs text-slate-500'>© {new Date().getFullYear()} Driver on Demand</p>
      </aside>

      <main className='flex flex-col items-center px-5 py-8 sm:justify-center sm:py-12'>
        <div className='w-full max-w-[420px]'>
          <div className='mb-8 lg:hidden'><Logo /></div>
          <h1 className='text-[28px] font-extrabold tracking-tight text-slate-900'>{title}</h1>
          {subtitle && <p className='mt-1.5 text-sm text-slate-500'>{subtitle}</p>}
          <div className='mt-7'>{children}</div>
        </div>
      </main>
    </div>
  )
}

// A password field with a show/hide button.
export const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <span className='relative block'>
      <Input ref={ref} {...props} type={visible ? 'text' : 'password'} className='pr-11' />
      <button type='button' onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}
        className='absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-lg text-slate-400 hover:text-slate-700'>
        <Icon name={visible ? 'ri-eye-off-line' : 'ri-eye-line'} />
      </button>
    </span>
  )
})
