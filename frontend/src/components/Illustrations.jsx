// Drawn scenes for the public pages. They are placeholders for the company's own photography:
// swap any of them for an <img> of real drivers and customers when those photos exist.

// A family car on the road with a driver at the wheel and a passenger relaxing behind.
export function CarScene({ className }) {
  return (
    <svg viewBox='0 0 480 320' className={className} role='img' aria-label='A driver driving a customer in the customer’s own car'>
      <defs>
        <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stopColor='#dbeafe' /><stop offset='1' stopColor='#f8fafc' /></linearGradient>
        <linearGradient id='body' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stopColor='#1e293b' /><stop offset='1' stopColor='#0f172a' /></linearGradient>
      </defs>
      <rect width='480' height='320' rx='28' fill='url(#sky)' />
      <circle cx='392' cy='70' r='30' fill='#fde68a' />
      <path d='M0 214 Q90 150 170 196 T330 176 T480 204 V320 H0Z' fill='#bfdbfe' opacity='0.7' />
      <g fill='#93c5fd' opacity='0.8'>
        <rect x='40' y='150' width='34' height='70' rx='4' /><rect x='82' y='126' width='42' height='94' rx='4' /><rect x='350' y='140' width='38' height='80' rx='4' /><rect x='396' y='160' width='44' height='60' rx='4' />
      </g>
      <rect y='236' width='480' height='84' fill='#334155' />
      <g className='road-dashes' stroke='#e2e8f0' strokeWidth='5' strokeDasharray='34 26' strokeLinecap='round'><path d='M-60 280 H560' /></g>

      <g className='car-bob'>
        <path d='M96 214 Q104 160 172 152 L276 150 Q322 152 350 190 L392 198 Q412 204 412 224 V240 H84 V232 Q84 218 96 214Z' fill='url(#body)' />
        <path d='M176 164 L228 162 V196 H148 Q156 170 176 164Z' fill='#e0f2fe' />
        <path d='M238 162 L274 161 Q304 164 326 196 H238Z' fill='#e0f2fe' />
        {/* The driver in front, the owner behind */}
        <circle cx='286' cy='178' r='11' fill='#fbbf24' /><path d='M270 196 Q286 184 302 196Z' fill='#2563eb' />
        <circle cx='196' cy='180' r='10' fill='#f9a8d4' /><path d='M182 196 Q196 186 210 196Z' fill='#64748b' />
        <rect x='232' y='160' width='6' height='38' fill='#0f172a' />
        <rect x='392' y='206' width='18' height='8' rx='4' fill='#fde68a' />
        <rect x='86' y='210' width='12' height='8' rx='4' fill='#f87171' />
        <g>
          <circle cx='156' cy='240' r='26' fill='#0f172a' /><circle cx='156' cy='240' r='12' fill='#94a3b8' />
          <circle cx='340' cy='240' r='26' fill='#0f172a' /><circle cx='340' cy='240' r='12' fill='#94a3b8' />
        </g>
      </g>

      <g transform='translate(300 60)'>
        <rect width='132' height='44' rx='22' fill='#ffffff' /><circle cx='22' cy='22' r='12' fill='#10b981' />
        <path d='M16 22l4 4 8-9' fill='none' stroke='#fff' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
        <text x='42' y='27' fontSize='13' fontWeight='700' fill='#0f172a' fontFamily='inherit'>Verified driver</text>
      </g>
    </svg>
  )
}

// A fare card: the price is known before booking.
export function PriceScene({ className }) {
  return (
    <svg viewBox='0 0 240 180' className={className} aria-hidden='true'>
      <rect width='240' height='180' rx='24' fill='#fef3c7' />
      <rect x='52' y='26' width='136' height='128' rx='16' fill='#ffffff' />
      <rect x='70' y='46' width='64' height='10' rx='5' fill='#cbd5e1' /><rect x='70' y='68' width='100' height='8' rx='4' fill='#e2e8f0' /><rect x='70' y='86' width='84' height='8' rx='4' fill='#e2e8f0' />
      <path d='M70 108 H170' stroke='#cbd5e1' strokeWidth='2' strokeDasharray='5 5' />
      <text x='70' y='138' fontSize='22' fontWeight='800' fill='#0f172a' fontFamily='inherit'>₹600</text>
      <circle cx='176' cy='42' r='20' fill='#f59e0b' /><text x='176' y='50' fontSize='22' fontWeight='800' fill='#ffffff' textAnchor='middle' fontFamily='inherit'>₹</text>
    </svg>
  )
}

// An identity card with a shield: every driver is checked.
export function VerifiedScene({ className }) {
  return (
    <svg viewBox='0 0 240 180' className={className} aria-hidden='true'>
      <rect width='240' height='180' rx='24' fill='#d1fae5' />
      <rect x='36' y='44' width='150' height='96' rx='14' fill='#ffffff' />
      <circle cx='74' cy='84' r='20' fill='#bfdbfe' /><circle cx='74' cy='78' r='8' fill='#2563eb' /><path d='M58 98 Q74 84 90 98Z' fill='#2563eb' />
      <rect x='106' y='68' width='62' height='9' rx='4.5' fill='#cbd5e1' /><rect x='106' y='86' width='46' height='8' rx='4' fill='#e2e8f0' /><rect x='54' y='116' width='114' height='8' rx='4' fill='#e2e8f0' />
      <path d='M186 96 l26 -10 26 10 v22 q0 24 -26 34 q-26 -10 -26 -34z' fill='#10b981' transform='translate(-22 -6)' />
      <path d='M178 112l9 9 16-18' fill='none' stroke='#ffffff' strokeWidth='5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

// A seat in your own car: comfort without driving.
export function ComfortScene({ className }) {
  return (
    <svg viewBox='0 0 240 180' className={className} aria-hidden='true'>
      <rect width='240' height='180' rx='24' fill='#dbeafe' />
      <path d='M40 128 Q46 84 92 78 L150 76 Q182 78 198 108 L214 112 Q224 116 224 128 V138 H32 V134 Q32 130 40 128Z' fill='#1e293b' />
      <path d='M96 88 L124 87 V110 H78 Q84 92 96 88Z' fill='#eff6ff' /><path d='M132 87 L150 86 Q170 88 184 110 H132Z' fill='#eff6ff' />
      <circle cx='78' cy='138' r='16' fill='#0f172a' /><circle cx='78' cy='138' r='7' fill='#94a3b8' /><circle cx='178' cy='138' r='16' fill='#0f172a' /><circle cx='178' cy='138' r='7' fill='#94a3b8' />
      <path d='M150 52 q8 -14 16 0 q8 -14 16 0 q0 12 -16 22 q-16 -10 -16 -22z' fill='#f43f5e' />
    </svg>
  )
}
