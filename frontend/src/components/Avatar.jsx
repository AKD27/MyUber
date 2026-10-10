import { cx } from '../lib/cx'

// A person's photo, or their initials when there is none.
export default function Avatar({ person, size = 'h-12 w-12', className }) {
  const initials = `${person?.fullname?.firstname?.[0] || '?'}${person?.fullname?.lastname?.[0] || ''}`.toUpperCase()

  if (person?.profilePhotoUrl) {
    return <img src={person.profilePhotoUrl} alt='' className={cx(size, 'shrink-0 rounded-full bg-slate-100 object-cover ring-2 ring-white', className)} />
  }
  return (
    <span aria-hidden='true' className={cx(size, 'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-[0.95em] font-bold text-brand-900 ring-2 ring-white', className)}>
      {initials}
    </span>
  )
}
