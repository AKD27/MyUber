import { useToasts } from '../store/toast'

const TONE = { info: 'bg-gray-900', success: 'bg-green-700', error: 'bg-red-600' }

export default function Toasts() {
  const { toasts, dismiss } = useToasts()

  return (
    <div className='pointer-events-none fixed inset-x-0 top-3 z-[2000] flex flex-col items-center gap-2 px-4'>
      {toasts.map((t) => (
        <div key={t.id} role='status' className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${TONE[t.tone] || TONE.info}`}>
          <p className='flex-1'>{t.message}</p>
          <button type='button' aria-label='Dismiss' onClick={() => dismiss(t.id)}><i aria-hidden='true' className='ri-close-line' /></button>
        </div>
      ))}
    </div>
  )
}
