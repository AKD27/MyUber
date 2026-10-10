import { useState } from 'react'
import { Button, Icon, Input } from '../../components/ui'

export default function Pagination({ data, page, onChange }) {
  if (!data || data.pages <= 1) return null
  return (
    <div className='mt-4 flex items-center justify-between gap-3 text-sm'>
      <span className='text-slate-500'><b className='text-slate-800'>{data.total.toLocaleString('en-IN')}</b> in total · page {page} of {data.pages}</span>
      <div className='flex gap-2'>
        <Button variant='secondary' size='sm' disabled={page <= 1} onClick={() => onChange(page - 1)}><Icon name='ri-arrow-left-s-line' />Previous</Button>
        <Button variant='secondary' size='sm' disabled={page >= data.pages} onClick={() => onChange(page + 1)}>Next<Icon name='ri-arrow-right-s-line' /></Button>
      </div>
    </div>
  )
}

// A search box that applies when submitted, with a clear button.
export function SearchBox({ onSearch, placeholder = 'Search name, email or phone' }) {
  const [text, setText] = useState('')
  return (
    <form role='search' className='relative mb-4 max-w-md' onSubmit={(e) => { e.preventDefault(); onSearch(text.trim()) }}>
      <Icon name='ri-search-line' className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} className='pl-10 pr-24' />
      <div className='absolute right-1 top-1 flex items-center gap-1'>
        {text && <button type='button' aria-label='Clear search' onClick={() => { setText(''); onSearch('') }} className='flex h-9 w-8 items-center justify-center text-slate-400 hover:text-slate-700'><Icon name='ri-close-circle-fill' /></button>}
        <Button type='submit' size='sm'>Search</Button>
      </div>
    </form>
  )
}
