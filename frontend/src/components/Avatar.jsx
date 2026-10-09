// A person's photo, or their initials when there is none.
export default function Avatar({ person, size = 'h-12 w-12' }) {
  if (person.profilePhotoUrl) {
    return <img src={person.profilePhotoUrl} alt='' className={`${size} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800`}>
      {person.fullname.firstname[0]}{person.fullname.lastname?.[0] || ''}
    </span>
  )
}
