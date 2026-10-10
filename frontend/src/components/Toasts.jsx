import { useToasts } from '../store/toast'
import { Icon } from './ui'

const TONE = {
  info: { icon: 'ri-notification-3-fill', color: 'text-blue-400' },
  success: { icon: 'ri-checkbox-circle-fill', color: 'text-brand-400' },
  error: { icon: 'ri-error-warning-fill', color: 'text-red-400' },
}

export default function Toasts() {
  const { toasts, dismiss } = useToasts()

  return (
    <div aria-live='polite' className='pointer-events-none fixed inset-x-0 top-3 z-[2000] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6'>
      {toasts.map((t) => {
        const tone = TONE[t.tone] || TONE.info
        return (
          <div key={t.id} role='status' className='pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-medium text-white shadow-lift'>
            <Icon name={tone.icon} className={`mt-px text-lg ${tone.color}`} />
            <p className='flex-1 leading-snug'>{t.message}</p>
            <button type='button' aria-label='Dismiss' onClick={() => dismiss(t.id)} className='-mr-1 rounded-full p-0.5 text-slate-400 hover:text-white'><Icon name='ri-close-line' className='text-lg' /></button>
          </div>
        )
      })}
    </div>
  )
}
