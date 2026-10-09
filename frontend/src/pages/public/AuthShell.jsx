import { Logo } from '../../components/Layout'

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className='flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10'>
      <Logo />
      <div className='mt-8 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6'>
        <h1 className='text-xl font-bold'>{title}</h1>
        {subtitle && <p className='mt-1 text-sm text-gray-500'>{subtitle}</p>}
        <div className='mt-5'>{children}</div>
      </div>
    </div>
  )
}
