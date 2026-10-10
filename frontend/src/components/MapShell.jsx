import { useState } from 'react'
import { cx } from '../lib/cx'

// A map-first screen: the map fills the page and the content rides on top of it —
// a bottom sheet on phones (tap the handle to shrink or grow it), a side panel on desktop.
export default function MapShell({ map, children }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className='fixed inset-x-0 bottom-16 top-16 lg:bottom-0'>
      <div className='absolute inset-0'>{map}</div>

      <section className={cx(
        'animate-panel absolute inset-x-0 bottom-0 z-[450] flex flex-col rounded-t-[28px] bg-white shadow-sheet transition-[max-height] duration-300 ease-out',
        'lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-4 lg:max-h-none lg:w-[440px] lg:rounded-[28px] lg:shadow-lift',
        expanded ? 'max-h-[62%]' : 'max-h-[30%]',
      )}>
        <button type='button' onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label={expanded ? 'Show more of the map' : 'Show more details'}
          className='flex w-full shrink-0 justify-center pb-2 pt-2.5 lg:hidden'>
          <span className='h-1.5 w-11 rounded-full bg-slate-300' />
        </button>
        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 lg:p-5'>{children}</div>
      </section>
    </div>
  )
}
