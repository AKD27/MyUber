import { useEffect, useRef, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import { Input } from './ui'
import { cx } from '../lib/cx'

// Address field with suggestions and "use my location". Value: { address, lat?, lng? }.
export default function AddressInput({ value, onChange, placeholder, savedLocations = [], allowCurrentLocation = false, id }) {
  const [text, setText] = useState(value?.address || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const lastPicked = useRef(value?.address || '')

  useEffect(() => {
    if (value?.address !== undefined && value.address !== text) setText(value.address)
    // Only follow outside changes to the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.address])

  useEffect(() => {
    const query = text.trim()
    if (query.length < 3 || query === lastPicked.current) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/maps/suggestions', { params: { input: query } })
        if (!cancelled) setSuggestions(data)
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [text])

  const pick = (place) => {
    lastPicked.current = place.address
    setText(place.address)
    setSuggestions([])
    setOpen(false)
    setNote('')
    onChange(place)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return setNote('Your browser does not share location')
    setBusy(true)
    setNote('')
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude: lat, longitude: lng } = position.coords
      try {
        const { data } = await api.get('/maps/reverse', { params: { lat, lng } })
        pick({ address: data.address, lat, lng })
      } catch (error) {
        setNote(errorMessage(error))
      } finally {
        setBusy(false)
      }
    }, () => {
      setBusy(false)
      setNote('Location permission denied. Type the address instead.')
    }, { timeout: 10000 })
  }

  const showSaved = open && !text && savedLocations.length > 0

  return (
    <div className='relative'>
      <div className='flex gap-2'>
        <Input
          id={id}
          value={text}
          placeholder={placeholder}
          autoComplete='off'
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            // Typed text without a picked suggestion is geocoded by the server.
            onChange(e.target.value ? { address: e.target.value } : null)
          }}
        />
        {allowCurrentLocation && (
          <button type='button' onClick={useMyLocation} title='Use my current location' aria-label='Use my current location'
            className='shrink-0 rounded-lg border border-gray-300 bg-white px-3 text-teal-700 hover:bg-teal-50'>
            <i aria-hidden='true' className={busy ? 'ri-loader-4-line animate-spin' : 'ri-focus-3-line'} />
          </button>
        )}
      </div>
      {note && <p className='mt-1 text-xs text-amber-700'>{note}</p>}
      {open && (suggestions.length > 0 || showSaved) && (
        <ul className='absolute z-[600] mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
          {showSaved && savedLocations.map((saved) => (
            <li key={saved._id}>
              <button type='button' onMouseDown={(e) => e.preventDefault()} className='flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50'
                onClick={() => pick({ address: saved.place.address, lat: saved.place.location.coordinates[1], lng: saved.place.location.coordinates[0] })}>
                <i aria-hidden='true' className='ri-bookmark-fill mt-0.5 text-teal-700' /><span><b>{saved.label}</b> · {saved.place.address}</span>
              </button>
            </li>
          ))}
          {suggestions.map((s) => (
            <li key={s.label}>
              <button type='button' onMouseDown={(e) => e.preventDefault()} className={cx('flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50')}
                onClick={() => pick({ address: s.label, lat: s.lat, lng: s.lng })}>
                <i aria-hidden='true' className='ri-map-pin-line mt-0.5 text-gray-400' />{s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
