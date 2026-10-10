import { useEffect, useId, useRef, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import { Icon } from './ui'
import { cx } from '../lib/cx'

// Address field with suggestions, saved places and "use my location". Value: { address, lat?, lng? }.
export default function AddressInput({ value, onChange, placeholder, savedLocations = [], allowCurrentLocation = false, id, icon = 'ri-map-pin-line', iconClass = 'text-slate-400', invalid, plain }) {
  const listId = useId()
  const [text, setText] = useState(value?.address || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const lastPicked = useRef(value?.address || '')
  const root = useRef(null)

  // The list closes on a click outside rather than on blur, so it survives the window losing focus.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    const address = value?.address || ''
    if (address !== text) {
      // A value set from outside (a saved place, a form reset) is treated as already chosen.
      lastPicked.current = address
      setText(address)
    }
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
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [text])

  const pick = async (place) => {
    lastPicked.current = place.address
    setText(place.address)
    setSuggestions([])
    setOpen(false)
    setActive(-1)
    setNote('')
    onChange(place)

    // Some providers suggest names only; look the coordinates up so the map can show the place.
    if (!Number.isFinite(place.lat)) {
      try {
        const { data } = await api.get('/maps/geocode', { params: { address: place.address } })
        if (lastPicked.current === place.address) onChange({ address: place.address, lat: data.lat, lng: data.lng })
      } catch {
        // The server geocodes the address again when the form is submitted.
      }
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return setNote('Your browser does not share location. Type the address instead.')
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
      setNote('Location permission is off. Type the address instead.')
    }, { timeout: 10000 })
  }

  const saved = open && !text ? savedLocations : []
  const options = [
    ...saved.map((s) => ({ key: s._id, icon: 'ri-bookmark-fill', iconClass: 'text-brand-600', title: s.label, text: s.place.address, place: { address: s.place.address, lat: s.place.location.coordinates[1], lng: s.place.location.coordinates[0] } })),
    ...suggestions.map((s) => {
      const [title, ...rest] = s.label.split(', ')
      return { key: s.label, icon: 'ri-map-pin-line', iconClass: 'text-slate-400', title, text: rest.join(', '), place: { address: s.label, lat: s.lat, lng: s.lng } }
    }),
  ]
  const expanded = open && options.length > 0

  const onKeyDown = (event) => {
    if (!expanded) {
      if (event.key === 'ArrowDown') setOpen(true)
      return
    }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => (i + 1) % options.length) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => (i <= 0 ? options.length - 1 : i - 1)) }
    if (event.key === 'Enter' && active >= 0) { event.preventDefault(); pick(options[active].place) }
    if (event.key === 'Escape' || event.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={root} className='relative'>
      <div className={plain
        ? 'flex h-[52px] items-center gap-3.5 pl-4 pr-1.5'
        : cx('flex h-12 items-center gap-2.5 rounded-lg border-2 bg-slate-100 pl-3.5 pr-1 transition focus-within:border-slate-900 focus-within:bg-white', invalid ? 'border-red-500' : 'border-transparent')}>
        <Icon name={icon} className={cx('text-lg', iconClass)} />
        <input
          id={id}
          value={text}
          placeholder={placeholder}
          autoComplete='off'
          role='combobox'
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete='list'
          aria-invalid={invalid || undefined}
          className='h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-500 focus-visible:ring-0'
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setActive(-1)
            // Typed text without a picked suggestion is geocoded by the server.
            onChange(e.target.value ? { address: e.target.value } : null)
          }}
        />
        {text && (
          <button type='button' aria-label='Clear' onMouseDown={(e) => e.preventDefault()} onClick={() => { lastPicked.current = ''; setText(''); onChange(null) }}
            className='flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700'>
            <Icon name='ri-close-circle-fill' />
          </button>
        )}
        {allowCurrentLocation && (
          <button type='button' onClick={useMyLocation} disabled={busy} title='Use my current location' aria-label='Use my current location'
            className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg text-slate-900 shadow-sm hover:bg-slate-50'>
            <Icon name={busy ? 'ri-loader-4-line animate-spin' : 'ri-focus-3-line'} />
          </button>
        )}
      </div>
      {note && <p className='mt-1.5 text-xs font-medium text-amber-700'>{note}</p>}
      {expanded && (
        <ul id={listId} role='listbox' className='absolute left-0 z-[600] mt-2 max-h-72 w-full animate-pop-in overflow-y-auto rounded-xl bg-white py-1.5 shadow-lift'>
          {options.map((option, index) => (
            <li key={option.key} role='option' aria-selected={index === active}>
              <button type='button' tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => pick(option.place)}
                className={cx('flex w-full items-start gap-3 px-3.5 py-2.5 text-left', index === active && 'bg-slate-50')}>
                <span className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100'><Icon name={option.icon} className={option.iconClass} /></span>
                <span className='min-w-0'>
                  <span className='block truncate text-sm font-semibold text-slate-900'>{option.title}</span>
                  {option.text && <span className='block truncate text-xs text-slate-500'>{option.text}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
