import { Button } from '../../components/ui'

export default function Pagination({ data, page, onChange }) {
  if (!data || data.pages <= 1) return null
  return (
    <div className='mt-4 flex items-center justify-between text-sm'>
      <span className='text-gray-600'>{data.total} total · page {page} of {data.pages}</span>
      <div className='flex gap-2'>
        <Button variant='secondary' disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
        <Button variant='secondary' disabled={page >= data.pages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
