import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, errorMessage } from '../lib/api'
import { EMERGENCY_NUMBER, SUPPORT_PHONE } from '../lib/constants'
import { useAuth } from '../store/auth'
import { toast } from '../store/toast'
import { Button, ErrorNote, Icon, Modal, Note } from './ui'

const currentPosition = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve({})
  navigator.geolocation.getCurrentPosition(
    (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
    () => resolve({}),
    { timeout: 5000, maximumAge: 60 * 1000 },
  )
})

// Copies or shares the public link to follow this trip live.
export function useShareTrip(bookingId) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/bookings/${bookingId}/share`)
      const text = 'Follow my trip live on Driver on Demand'

      if (navigator.share) {
        try {
          await navigator.share({ title: 'My trip', text, url: data.url })
          return 'shared'
        } catch (error) {
          // The share sheet was closed: nothing to do. Anything else falls back to copying.
          if (error.name === 'AbortError') return 'cancelled'
        }
      }

      await navigator.clipboard.writeText(data.url)
      return 'copied'
    },
    onSuccess: (result) => { if (result === 'copied') toast('Trip link copied. Send it to someone you trust.', 'success') },
    onError: (error) => toast(errorMessage(error, 'Could not create the trip link'), 'error'),
  })
}

function Action({ icon, tone, title, text, ...props }) {
  const Tag = props.href ? 'a' : 'button'
  return (
    <Tag {...(props.href ? {} : { type: 'button' })} {...props}
      className='flex w-full items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60'>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${tone}`}><Icon name={icon} /></span>
      <span className='min-w-0 flex-1'>
        <span className='block text-sm font-bold text-slate-900'>{title}</span>
        <span className='block text-xs text-slate-500'>{text}</span>
      </span>
      <Icon name='ri-arrow-right-s-line' className='text-xl text-slate-300' />
    </Tag>
  )
}

// Emergency options during a booking: call for help, alert the platform, share the trip.
export default function SafetySheet({ open, onClose, bookingId, canShare }) {
  const { account, role } = useAuth()
  const [alerted, setAlerted] = useState(false)
  const share = useShareTrip(bookingId)
  const contact = account?.emergencyContact

  const sos = useMutation({
    mutationFn: async () => api.post(`/bookings/${bookingId}/sos`, await currentPosition()),
    onSuccess: () => setAlerted(true),
  })

  return (
    <Modal open={open} onClose={onClose} title='Safety'>
      <div className='space-y-3'>
        <a href={`tel:${EMERGENCY_NUMBER}`} className='flex items-center gap-3.5 rounded-2xl bg-red-600 p-4 text-white shadow-sm transition-colors hover:bg-red-700'>
          <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl'><Icon name='ri-alarm-warning-fill' /></span>
          <span className='flex-1'>
            <span className='block text-base font-extrabold'>Call {EMERGENCY_NUMBER}</span>
            <span className='block text-xs text-red-100'>Police, ambulance and fire — the national emergency number</span>
          </span>
          <Icon name='ri-phone-fill' className='text-xl' />
        </a>

        {alerted ? (
          <Note tone='brand' icon='ri-shield-check-fill'>
            <b>Our safety team has been alerted</b> and has the details of this booking. If you are in danger, call {EMERGENCY_NUMBER} now.
          </Note>
        ) : (
          <Action icon='ri-shield-user-fill' tone='bg-amber-50 text-amber-700' title='Alert our safety team' text='Sends this booking and your location to support right now'
            disabled={sos.isPending} onClick={() => sos.mutate()} />
        )}
        <ErrorNote>{sos.error && errorMessage(sos.error)}</ErrorNote>

        {contact?.phone ? (
          <Action href={`tel:${contact.phone}`} icon='ri-contacts-fill' tone='bg-blue-50 text-blue-700' title={`Call ${contact.name}`} text={`Your emergency contact · ${contact.phone}`} />
        ) : (
          <Note icon='ri-contacts-line'>
            Add an emergency contact to call them from here.{' '}
            <Link to={role === 'driver' ? '/driver/profile' : '/profile'} onClick={onClose} className='font-semibold text-brand-700 underline-offset-2 hover:underline'>Add contact</Link>
          </Note>
        )}

        {canShare && (
          <Action icon='ri-share-forward-fill' tone='bg-brand-50 text-brand-700' title='Share live trip' text='Send a link so family or friends can follow this trip'
            disabled={share.isPending} onClick={() => share.mutate()} />
        )}

        {SUPPORT_PHONE && (
          <Action href={`tel:${SUPPORT_PHONE}`} icon='ri-customer-service-2-fill' tone='bg-slate-100 text-slate-700' title='Call support' text={SUPPORT_PHONE} />
        )}

        <Button variant='secondary' className='w-full' onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
