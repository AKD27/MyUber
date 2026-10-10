import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Logo } from '../../components/Layout'
import { buttonClass, Icon } from '../../components/ui'
import { BOOKING_TYPES } from '../../lib/constants'
import { shortDate } from '../../lib/format'

const TRUST_BADGES = [
  ['ri-shield-check-fill', 'Verified drivers'],
  ['ri-map-pin-time-fill', 'Live tracking'],
  ['ri-key-2-fill', 'OTP start & end'],
  ['ri-alarm-warning-fill', 'SOS in one tap'],
]

const WHY = [
  [ComfortCard, 'The comfort of your own car', 'Your seats, your music, your luggage space. You just don’t have to drive — for an hour or for a week.'],
  [PriceCard, 'A price you see before you book', 'Every driver shows their rate and your total up front. No booking fee, and you pay only when the trip ends.'],
  [VerifiedCard, 'Drivers we have checked', 'Each driver’s licence and profile is reviewed by our team before they can accept a single booking.'],
]

const STEPS = [
  ['ri-map-pin-line', 'Tell us where and when', 'Pickup, trip type, date and how long you need a driver.'],
  ['ri-user-search-line', 'Choose your driver', 'Compare ratings, experience, languages and price.'],
  ['ri-key-2-line', 'Start with your OTP', 'The driver comes to you; the trip starts with your one-time code.'],
  ['ri-star-smile-line', 'Pay and rate', 'Pay the agreed amount when the trip ends and rate your driver.'],
]

const FOR_CUSTOMERS = [
  ['ri-eye-line', 'You always know who is coming', 'Name, photo, rating, experience and reviews before you book.'],
  ['ri-map-pin-time-line', 'You are never out of sight', 'Follow the driver on the map and share a live link with family.'],
  ['ri-customer-service-2-line', 'You are heard', 'Report an issue from any booking and our team replies in the app.'],
  ['ri-close-circle-line', 'You are not locked in', 'Cancel free of charge any time before the trip starts.'],
]

const FOR_DRIVERS = [
  ['ri-money-rupee-circle-line', 'They set their own rates', 'Hourly, full-day and outstation prices are chosen by the driver.'],
  ['ri-time-line', 'They choose their hours', 'Working days and times are theirs to decide.'],
  ['ri-line-chart-line', 'They see every rupee', 'Each trip shows what was collected, the platform fee and what they keep.'],
  ['ri-shield-user-line', 'They are protected too', 'Drivers rate customers, can raise SOS and can report a problem.'],
]

const SAFETY = [
  ['ri-shield-check-fill', 'Verified before the first trip', 'Licence details and profile are reviewed by our team. Unverified drivers never appear in search.'],
  ['ri-key-2-fill', 'Your OTP starts and ends the trip', 'A trip cannot begin or finish without the code shown only in your app.'],
  ['ri-share-forward-fill', 'Share your trip live', 'Send a link so family or friends can follow the journey on a map.'],
  ['ri-alarm-warning-fill', 'SOS, always one tap away', 'Call 112, call your emergency contact and alert our safety team from the trip screen.'],
]

const COMPARE = [
  ['The car', 'Your own car, the way you like it', 'Whichever car arrives'],
  ['The driver', 'Chosen by you from ratings and reviews', 'Assigned automatically'],
  ['The time', 'Stays with you for the whole booking', 'Leaves after the drop'],
  ['The price', 'Agreed before you book, by the hour or day', 'Depends on distance and demand'],
  ['Long trips', 'One driver for the whole journey, even for days', 'A new booking for every leg'],
]

const FAQ = [
  ['How is the price decided?', 'Each driver sets an hourly rate, a full-day rate (8 hours) and an outstation per-day rate. When you search, you see every available driver’s total for your exact booking before you choose.'],
  ['How do I pay?', 'You pay the driver in cash when the trip ends. There is no booking fee and nothing to pay in advance.'],
  ['Can I cancel?', 'Yes. You can cancel free of charge any time before the trip starts, from the booking screen.'],
  ['What are the start and end OTPs?', 'Your app shows a 4-digit start code once a driver accepts, and an end code during the trip. The driver needs each code from you to start and to end the trip, so nobody can do either without you.'],
  ['What if my trip runs longer than booked?', 'Hourly bookings have a 15-minute grace period. After that, each extra hour started is charged at the driver’s hourly rate, and the new total is shown in your app.'],
  ['How are drivers verified?', 'Drivers submit their licence, address and emergency-contact details. Our team reviews every profile, and only verified drivers appear in search or can accept bookings.'],
]

// A small street map drawn in greys with the route in black, as in the app.
function MiniMap({ className }) {
  return (
    <svg aria-hidden='true' viewBox='0 0 300 240' preserveAspectRatio='xMidYMid slice' className={className}>
      <rect width='300' height='240' fill='#ececec' />
      <g fill='none' stroke='#ffffff' strokeLinecap='round'>
        <path d='M-10 60 H310 M-10 150 H310 M70 -10 V250 M190 -10 V250' strokeWidth='12' />
        <path d='M-10 105 H310 M-10 200 H310 M130 -10 V250 M250 -10 V250 M-10 240 L150 105 L310 20' strokeWidth='6' />
      </g>
      <rect x='86' y='72' width='34' height='24' rx='3' fill='#dedede' /><rect x='204' y='118' width='36' height='24' rx='3' fill='#dedede' /><rect x='20' y='162' width='40' height='28' rx='3' fill='#d9e4d6' />
      <path d='M70 200 V150 H190 V60 H250' fill='none' stroke='#0a0a0a' strokeWidth='5' strokeLinecap='round' strokeLinejoin='round' />
      <circle cx='70' cy='200' r='9' fill='#0a0a0a' stroke='#fff' strokeWidth='4' />
      <rect x='242' y='52' width='16' height='16' rx='3' fill='#0a0a0a' stroke='#fff' strokeWidth='4' />
      <g transform='translate(190 112)'><circle r='13' fill='#2563eb' stroke='#fff' strokeWidth='4' /><path d='M0 -6l5 11-5-2.5-5 2.5z' fill='#fff' /></g>
    </svg>
  )
}

function Face({ initials, className = '' }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white ${className}`}>{initials}</span>
}

// The hero visual: the live-trip screen of the app inside a phone.
function PhoneMock() {
  return (
    <div className='relative mx-auto w-[290px] sm:w-[310px]'>
      <div className='overflow-hidden rounded-[2.6rem] border-[9px] border-slate-800 bg-white text-slate-950 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.7)]'>
        <div className='relative'>
          <MiniMap className='h-60 w-full' />
          <span className='absolute left-1/2 top-2.5 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-950' />
          <span className='absolute bottom-3 left-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold shadow-md'>2.4 km away</span>
        </div>
        <div className='-mt-4 space-y-3.5 rounded-t-2xl bg-white p-4 pb-5'>
          <span className='mx-auto block h-1 w-9 rounded-full bg-slate-200' />
          <div>
            <p className='text-[17px] font-bold leading-tight'>Raj is on the way</p>
            <p className='text-[13px] text-slate-500'>Arriving in about 8 min</p>
          </div>
          <div className='flex items-center gap-3 border-y border-slate-100 py-3'>
            <Face initials='RK' className='h-11 w-11 text-sm' />
            <div className='min-w-0 flex-1'>
              <p className='flex items-center gap-1 text-sm font-semibold'>Raj Kumar <Icon name='ri-verified-badge-fill' className='text-brand-600' /></p>
              <p className='text-xs text-slate-500'>★ 4.8 · 8 yrs · Hindi, English</p>
            </div>
            <span className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-100'><Icon name='ri-phone-fill' /></span>
          </div>
          <div className='flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-3'>
            <div><p className='text-[11px] font-semibold uppercase tracking-wider text-slate-500'>Start OTP</p><p className='text-xs text-slate-500'>Tell your driver at pickup</p></div>
            <div className='flex gap-1'>{['4', '8', '2', '1'].map((d) => <span key={d} className='flex h-9 w-7 items-center justify-center rounded-md bg-white text-base font-bold shadow-sm'>{d}</span>)}</div>
          </div>
          <div className='grid grid-cols-2 gap-2 text-[13px] font-semibold'>
            <span className='flex h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-100'><Icon name='ri-share-forward-line' />Share trip</span>
            <span className='flex h-10 items-center justify-center gap-1.5 rounded-lg bg-red-50 text-red-700'><Icon name='ri-alarm-warning-fill' />SOS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Interface pieces shown in the "why" cards.
function ComfortCard() {
  return (
    <div className='w-full max-w-[260px] rounded-2xl bg-white p-4 shadow-lift'>
      <p className='text-[11px] font-semibold uppercase tracking-wider text-slate-500'>Your trip</p>
      <p className='mt-1 text-[15px] font-bold'>Outstation · Round trip · 3 days</p>
      <div className='mt-3 flex items-center gap-3 rounded-xl bg-slate-100 p-3'>
        <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg shadow-sm'><Icon name='ri-car-line' /></span>
        <div><p className='text-sm font-semibold'>Toyota Fortuner</p><p className='text-xs text-slate-500'>Your car · Manual</p></div>
      </div>
      <div className='mt-2 flex items-center gap-3 rounded-xl bg-slate-100 p-3'>
        <Face initials='RK' className='h-10 w-10 text-xs' />
        <div><p className='text-sm font-semibold'>Raj drives</p><p className='text-xs text-slate-500'>You sit back</p></div>
      </div>
    </div>
  )
}

function PriceCard() {
  return (
    <div className='w-full max-w-[260px] rounded-2xl bg-white p-4 shadow-lift'>
      <p className='text-[11px] font-semibold uppercase tracking-wider text-slate-500'>Price before you book</p>
      <dl className='mt-3 space-y-2 text-sm text-slate-600'>
        <div className='flex justify-between'><dt>Rate</dt><dd>₹150/hour</dd></div>
        <div className='flex justify-between'><dt>4 hours</dt><dd>₹600</dd></div>
        <div className='flex justify-between'><dt>Booking fee</dt><dd className='font-semibold text-emerald-700'>₹0</dd></div>
        <div className='flex items-baseline justify-between border-t border-dashed border-slate-200 pt-2.5 text-slate-950'><dt className='font-semibold'>Total</dt><dd className='text-2xl font-bold'>₹600</dd></div>
      </dl>
      <p className='mt-2 text-xs text-slate-500'>Pay the driver when the trip ends</p>
    </div>
  )
}

function VerifiedCard() {
  return (
    <div className='w-full max-w-[260px] rounded-2xl bg-white p-4 shadow-lift'>
      <div className='flex items-center gap-3'>
        <Face initials='IK' className='h-12 w-12 text-sm' />
        <div>
          <p className='flex items-center gap-1 text-[15px] font-bold'>Imran Khan <Icon name='ri-verified-badge-fill' className='text-brand-600' /></p>
          <p className='text-xs text-slate-500'>★ 4.9 · 12 yrs experience</p>
        </div>
      </div>
      <ul className='mt-3 space-y-2 text-sm'>
        {['Driving licence checked', 'Profile reviewed by our team', 'Rated by customers'].map((line) => (
          <li key={line} className='flex items-center gap-2'><span className='flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white'><Icon name='ri-check-line' /></span>{line}</li>
        ))}
      </ul>
    </div>
  )
}

const number = (value) => value.toLocaleString('en-IN')

const ICON_TONES = {
  // Solid black: the main treatment on light sections.
  brand: 'bg-slate-950 text-white',
    dark: 'bg-slate-950 text-white',
  // Light grey: for small icons inside lists on white.
  soft: 'bg-slate-100 text-slate-950',
  // Frosted: for dark backgrounds.
  glass: 'bg-white/10 text-white ring-1 ring-inset ring-white/10',
}

const ICON_SIZES = {
  sm: 'h-9 w-9 rounded-xl text-lg',
  md: 'h-11 w-11 rounded-xl text-[22px]',
  lg: 'h-12 w-12 rounded-xl text-2xl',
  xl: 'h-14 w-14 rounded-2xl text-[28px]',
}

// An icon on a tile. Inside a `group`, it lifts and tilts slightly when the card is hovered.
function FeatureIcon({ name, tone = 'brand', size = 'lg', className = '' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center transition-transform duration-300 ${ICON_SIZES[size]} ${ICON_TONES[tone]} ${className}`}>
      <Icon name={name} />
    </span>
  )
}

function SectionHeading({ eyebrow, title, text, light }) {
  return (
    <div className='max-w-2xl'>
      <p className={`text-[13px] font-semibold uppercase tracking-[0.14em] ${light ? 'text-slate-400' : 'text-slate-500'}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-[32px] font-extrabold leading-[1.1] sm:text-[44px] ${light ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      {text && <p className={`mt-3 text-base leading-relaxed ${light ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p>}
    </div>
  )
}

// A drawn city map with a route, behind the hero: the product is about getting somewhere.
function MapBackdrop() {
  return (
    <svg aria-hidden='true' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid slice' className='absolute inset-0 h-full w-full opacity-60'>
      <g fill='none' stroke='#262626' strokeWidth='14' strokeLinecap='round'>
        <path d='M-20 120 H820 M-20 300 H820 M-20 470 H820 M120 -20 V620 M330 -20 V620 M560 -20 V620 M720 -20 V620' />
        <path d='M-20 560 L300 300 L560 180 L820 40' strokeWidth='22' />
      </g>
      <g fill='none' stroke='#1f1f1f' strokeWidth='5'>
        <path d='M-20 210 H820 M-20 385 H820 M225 -20 V620 M445 -20 V620 M640 -20 V620' />
      </g>
      <path d='M120 470 H330 V300 L560 180 H720' fill='none' stroke='#ffffff' strokeWidth='6' strokeLinecap='round' strokeLinejoin='round' className='hero-route' />
      <circle r='9' fill='#2563eb' stroke='#ffffff' strokeWidth='4'>
        <animateMotion dur='7s' begin='2.6s' repeatCount='indefinite' path='M120 470 H330 V300 L560 180 H720' />
      </circle>
      <circle cx='120' cy='470' r='12' fill='#ffffff' stroke='#0a0a0a' strokeWidth='5' />
      <rect x='708' y='168' width='24' height='24' rx='5' fill='#ffffff' stroke='#0a0a0a' strokeWidth='5' />
    </svg>
  )
}

// What the platform has really done so far. Each figure appears only once it is worth showing,
// so a brand-new launch does not display zeros.
function LiveNumbers({ overview }) {
  const figures = [
    overview?.verifiedDrivers >= 10 && [number(overview.verifiedDrivers), 'Verified drivers'],
    overview?.completedTrips >= 50 && [number(overview.completedTrips), 'Trips completed'],
    overview?.rating.count >= 20 && [`${overview.rating.average.toFixed(1)} ★`, `Average rating from ${number(overview.rating.count)} reviews`],
  ].filter(Boolean)

  if (figures.length === 0) return null

  return (
    <section className='border-b border-slate-100 bg-white'>
      <div className='mx-auto flex max-w-6xl flex-wrap justify-around gap-8 px-4 py-10 text-center'>
        {figures.map(([value, label]) => (
          <div key={label}>
            <p className='tabular text-4xl font-extrabold text-slate-900'>{value}</p>
            <p className='mt-1 text-sm text-slate-500'>{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function PromiseList({ title, icon, items, dark }) {
  return (
    <div className={`rounded-2xl p-6 sm:p-8 ${dark ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white'}`}>
      <p className='flex items-center gap-3 text-xl font-extrabold'>
        <FeatureIcon name={icon} tone={dark ? 'glass' : 'brand'} size='md' />
        {title}
      </p>
      <ul className='mt-6 space-y-5'>
        {items.map(([itemIcon, heading, text]) => (
          <li key={heading} className='group flex items-start gap-3.5'>
            <FeatureIcon name={itemIcon} tone={dark ? 'glass' : 'soft'} size='sm' />
            <span>
              <span className='block font-bold'>{heading}</span>
              <span className={`block text-sm leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Landing() {
  const { data: overview } = useQuery({
    queryKey: ['public-overview'],
    queryFn: () => api.get('/public/overview').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const reviews = overview?.reviews || []

  return (
    <div className='min-h-dvh bg-white'>
      {/* ---------- Hero ---------- */}
      <div className='relative overflow-hidden bg-slate-950 text-white'>
        <MapBackdrop />
        <div aria-hidden='true' className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40' />
        <header className='relative mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-2 px-4'>
          <Logo light />
          <nav className='flex items-center gap-1 text-sm'>
            <a href='#how' className='rounded-full px-3 py-2 font-semibold text-slate-300 hover:bg-white/10 max-md:hidden'>How it works</a>
            <a href='#safety' className='rounded-full px-3 py-2 font-semibold text-slate-300 hover:bg-white/10 max-md:hidden'>Safety</a>
            <a href='#faq' className='rounded-full px-3 py-2 font-semibold text-slate-300 hover:bg-white/10 max-md:hidden'>FAQ</a>
            <Link to='/login' className='whitespace-nowrap rounded-full px-3 py-2 font-semibold text-slate-200 hover:bg-white/10 sm:px-4'>Log in</Link>
            <Link to='/register' className='whitespace-nowrap rounded-full bg-white px-3 py-2 font-semibold text-slate-900 hover:bg-slate-100 sm:px-4'>Sign up</Link>
          </nav>
        </header>

        <section className='relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 lg:grid-cols-2 lg:pb-24 lg:pt-14'>
          <div className='animate-enter'>
            <h1 className='text-[40px] font-extrabold leading-[1.05] sm:text-[56px] xl:text-[68px]'>You have the car.<br /><span className='text-slate-400'>We have the driver.</span></h1>
            <p className='mt-5 max-w-lg text-lg leading-relaxed text-slate-300'>Hire a trusted, verified driver to drive <b className='font-semibold text-white'>your own car</b> — for a few hours, a full day, an outstation trip or several days.</p>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Link to='/register' className={buttonClass({ size: 'lg', className: '!bg-white !text-slate-950 hover:!bg-slate-200' })}>Hire a driver <Icon name='ri-arrow-right-line' /></Link>
              <Link to='/register?as=driver' className={buttonClass({ size: 'lg', className: '!bg-white/10 ring-1 ring-inset ring-white/15 hover:!bg-white/15' })}>Drive with us</Link>
            </div>
            <ul className='mt-9 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 text-sm font-semibold text-slate-200'>
              {TRUST_BADGES.map(([icon, label]) => (
                <li key={label} className='flex items-center gap-3'><FeatureIcon name={icon} tone='glass' size='sm' />{label}</li>
              ))}
            </ul>
          </div>
          <PhoneMock />
        </section>
      </div>

      <LiveNumbers overview={overview} />

      {/* ---------- Why us ---------- */}
      <section className='mx-auto max-w-6xl px-4 py-16 md:py-24'>
        <SectionHeading eyebrow='Why Driver on Demand' title='Your car. Your plans. Someone you trust at the wheel.' text='Tired after a long day, travelling overnight with family, or simply would rather not drive — keep the comfort of your own car and hand over only the driving.' />
        <div className='stagger mt-10 grid gap-5 md:grid-cols-3'>
          {WHY.map(([Scene, title, text]) => (
            <div key={title} className='group overflow-hidden rounded-2xl border border-slate-200 bg-white'>
              <div className='flex h-64 items-center justify-center bg-slate-100 p-6 transition-colors duration-300 group-hover:bg-slate-200/70'><Scene /></div>
              <div className='p-6'>
                <p className='text-lg font-extrabold text-slate-900'>{title}</p>
                <p className='mt-2 text-sm leading-relaxed text-slate-600'>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section className='border-y border-slate-100 bg-slate-50'>
        <div className='mx-auto max-w-6xl px-4 py-16 md:py-20'>
          <SectionHeading eyebrow='Every kind of trip' title='One driver, for as long as you need' />
          <div className='stagger mt-8 grid grid-cols-2 gap-3 md:grid-cols-3'>
            {Object.entries(BOOKING_TYPES).map(([key, type]) => (
              <div key={key} className='group rounded-2xl border border-slate-200 bg-white p-5 transition-colors duration-200 hover:border-slate-950'>
                <FeatureIcon name={type.icon} tone='dark' />
                <p className='mt-4 font-bold text-slate-900'>{type.label}</p>
                <p className='mt-0.5 text-sm text-slate-500'>{type.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id='how' className='mx-auto max-w-6xl scroll-mt-6 px-4 py-16 md:py-24'>
        <SectionHeading eyebrow='How it works' title='Booked in a minute' />
        <ol className='relative mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4'>
          <span aria-hidden='true' className='absolute left-6 right-6 top-7 hidden h-0.5 bg-slate-200 lg:block' />
          {STEPS.map(([icon, title, text], index) => (
            <li key={title} className='group relative'>
              <span className='relative inline-flex rounded-2xl ring-8 ring-white'>
                <FeatureIcon name={icon} />
                <span className='absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white ring-2 ring-white'>{index + 1}</span>
              </span>
              <p className='mt-5 text-xs font-bold uppercase tracking-widest text-slate-400'>Step {index + 1}</p>
              <p className='mt-1 text-lg font-bold text-slate-900'>{title}</p>
              <p className='mt-1 text-sm leading-relaxed text-slate-600'>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- How we treat people ---------- */}
      <section className='bg-slate-50'>
        <div className='mx-auto max-w-6xl px-4 py-16 md:py-24'>
          <SectionHeading eyebrow='How we treat people' title='Fair to the people who ride. Fair to the people who drive.' text='A driver who is treated well takes better care of you and your car. So the platform is built to be honest with both sides.' />
          <div className='mt-10 grid gap-5 lg:grid-cols-2'>
            <PromiseList title='For customers' icon='ri-user-heart-fill' items={FOR_CUSTOMERS} />
            <PromiseList title='For drivers' icon='ri-steering-2-fill' items={FOR_DRIVERS} dark />
          </div>
        </div>
      </section>

      {/* ---------- Safety ---------- */}
      <section id='safety' className='mx-auto max-w-6xl scroll-mt-6 px-4 py-16 md:py-24'>
        <SectionHeading eyebrow='Safety first' title='Your car and your family are in careful hands' text='Safety is not an add-on here. It is in every step of a booking.' />
        <div className='stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {SAFETY.map(([icon, title, text]) => (
            <div key={title} className='group rounded-2xl bg-slate-100 p-6'>
              <FeatureIcon name={icon} />
              <p className='mt-4 font-bold text-slate-900'>{title}</p>
              <p className='mt-1 text-sm leading-relaxed text-slate-600'>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Compared with a cab ---------- */}
      <section className='bg-slate-950 text-white'>
        <div className='mx-auto max-w-6xl px-4 py-16 md:py-24'>
          <SectionHeading light eyebrow='What makes it different' title='Not a cab. Your car, with a driver.' />
          <div className='mt-10 overflow-hidden rounded-3xl ring-1 ring-white/10'>
            <div className='grid grid-cols-[1fr_1.3fr_1.3fr] bg-white/5 text-xs font-bold uppercase tracking-wider text-slate-400 max-sm:hidden'>
              <span className='p-4' /><span className='p-4 text-white'>Driver on Demand</span><span className='p-4'>Booking a cab</span>
            </div>
            {COMPARE.map(([topic, ours, theirs]) => (
              <div key={topic} className='grid gap-1 border-t border-white/10 p-4 sm:grid-cols-[1fr_1.3fr_1.3fr] sm:gap-0 sm:p-0'>
                <span className='text-sm font-bold text-slate-300 sm:p-4'>{topic}</span>
                <span className='flex items-start gap-2 font-semibold sm:p-4'><span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white'><Icon name='ri-check-line' /></span>{ours}</span>
                <span className='flex items-start gap-2 text-slate-400 sm:p-4'><Icon name='ri-subtract-line' className='mt-0.5' />{theirs}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Real reviews (only once customers have written some) ---------- */}
      {reviews.length >= 3 && (
        <section className='mx-auto max-w-6xl px-4 py-16 md:py-24'>
          <SectionHeading eyebrow='In their words' title='What customers say after their trips' />
          <div className='stagger mt-10 grid gap-4 md:grid-cols-3'>
            {reviews.slice(0, 6).map((review) => (
              <figure key={review._id} className='rounded-3xl bg-slate-50 p-6'>
                <p className='text-amber-400' aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, i) => <Icon key={i} name='ri-star-fill' />)}</p>
                <blockquote className='mt-3 leading-relaxed text-slate-700'>“{review.comment}”</blockquote>
                <figcaption className='mt-4 text-sm text-slate-500'><b className='text-slate-900'>{review.customerName || 'A customer'}</b>{review.driverName && ` · driven by ${review.driverName}`} · {shortDate(review.createdAt)}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      <section id='faq' className='scroll-mt-6 border-t border-slate-100 bg-slate-50'>
        <div className='mx-auto max-w-3xl px-4 py-16 md:py-24'>
          <SectionHeading eyebrow='Questions' title='Good to know before you book' />
          <div className='mt-8 space-y-3'>
            {FAQ.map(([question, answer]) => (
              <details key={question} className='group rounded-2xl bg-white ring-1 ring-slate-200 open:shadow-card'>
                <summary className='flex list-none items-center justify-between gap-4 p-5 font-bold text-slate-900 [&::-webkit-details-marker]:hidden'>
                  {question}
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 transition duration-200 group-open:rotate-45 group-open:bg-slate-900 group-open:text-white'><Icon name='ri-add-line' /></span>
                </summary>
                <p className='px-5 pb-5 text-sm leading-relaxed text-slate-600'>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Closing calls to action ---------- */}
      <section className='mx-auto grid max-w-6xl gap-5 px-4 py-16 md:grid-cols-2'>
        <div className='group relative overflow-hidden rounded-2xl bg-slate-100 p-8 text-slate-950 sm:p-10'>
          <FeatureIcon name='ri-user-heart-fill' size='xl' />
          <h2 className='mt-4 text-2xl font-extrabold'>Need a driver?</h2>
          <p className='mt-2 max-w-sm text-slate-600'>Create a free account, tell us about your trip and choose from verified drivers near you.</p>
          <Link to='/register' className={buttonClass({ size: 'lg', className: 'mt-6' })}>Hire a driver <Icon name='ri-arrow-right-line' /></Link>
        </div>
        <div className='group relative overflow-hidden rounded-2xl bg-slate-950 p-8 text-white sm:p-10'>
          <FeatureIcon name='ri-steering-2-fill' tone='glass' size='xl' />
          <h2 className='mt-4 text-2xl font-extrabold'>Are you a professional driver?</h2>
          <p className='mt-2 max-w-sm text-slate-300'>Set your own rates and working hours, and get bookings from customers near you.</p>
          <Link to='/register?as=driver' className={buttonClass({ size: 'lg', className: 'mt-6 !bg-white !text-slate-950 hover:!bg-slate-200' })}>Become a driver <Icon name='ri-arrow-right-line' /></Link>
        </div>
      </section>

      <footer className='border-t border-slate-100'>
        <div className='mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4'>
          <div>
            <Logo />
            <p className='mt-3 max-w-xs text-sm leading-relaxed text-slate-500'>Verified drivers for your own car, by the hour, the day or the journey.</p>
          </div>
          {[
            ['Customers', [['Hire a driver', '/register'], ['Log in', '/login']]],
            ['Drivers', [['Become a driver', '/register?as=driver'], ['Driver log in', '/login?as=driver']]],
          ].map(([heading, links]) => (
            <div key={heading}>
              <p className='text-sm font-bold text-slate-900'>{heading}</p>
              <ul className='mt-3 space-y-2 text-sm text-slate-600'>
                {links.map(([label, to]) => <li key={label}><Link to={to} className='hover:text-slate-950 hover:underline'>{label}</Link></li>)}
              </ul>
            </div>
          ))}
          <div>
            <p className='text-sm font-bold text-slate-900'>Learn more</p>
            <ul className='mt-3 space-y-2 text-sm text-slate-600'>
              <li><a href='#how' className='hover:text-slate-950 hover:underline'>How it works</a></li>
              <li><a href='#safety' className='hover:text-slate-950 hover:underline'>Safety</a></li>
              <li><a href='#faq' className='hover:text-slate-950 hover:underline'>Questions</a></li>
            </ul>
          </div>
        </div>
        <p className='border-t border-slate-100 py-6 text-center text-sm text-slate-500'>© {new Date().getFullYear()} Driver on Demand. All rights reserved.</p>
      </footer>
    </div>
  )
}
