import { Link } from 'react-router-dom'
import { Logo } from '../../components/Layout'
import { BOOKING_TYPES } from '../../lib/constants'

export default function Landing() {
  return (
    <div className='min-h-screen bg-white'>
      <header className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
        <Logo />
        <nav className='flex items-center gap-2 text-sm'>
          <Link to='/login' className='rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100'>Log in</Link>
          <Link to='/register' className='rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800'>Sign up</Link>
        </nav>
      </header>

      <section className='mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-20'>
        <div>
          <p className='mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800'>
            <i aria-hidden='true' className='ri-shield-check-fill' /> Verified professional drivers
          </p>
          <h1 className='text-4xl font-extrabold leading-tight text-gray-900 md:text-5xl'>You have the car.<br />We have the driver.</h1>
          <p className='mt-4 text-lg text-gray-600'>Hire a trusted driver to drive <b>your own car</b> — for a few hours, a full day, an outstation trip or several days.</p>
          <div className='mt-6 flex flex-wrap gap-3'>
            <Link to='/register' className='rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-black'>Hire a driver</Link>
            <Link to='/register?as=driver' className='rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-900 hover:bg-gray-50'>Drive with us</Link>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {Object.entries(BOOKING_TYPES).map(([key, type]) => (
            <div key={key} className='rounded-xl border border-gray-200 p-4'>
              <i aria-hidden='true' className={`${type.icon} text-2xl text-teal-700`} />
              <p className='mt-2 font-semibold'>{type.label}</p>
              <p className='text-sm text-gray-500'>{type.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className='border-t border-gray-100 bg-gray-50'>
        <div className='mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-4'>
          {[
            ['ri-map-pin-line', 'Tell us where and when', 'Pickup, trip type, date and duration.'],
            ['ri-user-search-line', 'Choose your driver', 'Compare ratings, experience, languages and price.'],
            ['ri-key-2-line', 'Driver comes to you', 'Start the trip with a one-time code.'],
            ['ri-money-rupee-circle-line', 'Pay and rate', 'Pay the agreed amount and rate your driver.'],
          ].map(([icon, title, text]) => (
            <div key={title}>
              <i aria-hidden='true' className={`${icon} text-2xl text-teal-700`} />
              <p className='mt-2 font-semibold'>{title}</p>
              <p className='text-sm text-gray-600'>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
