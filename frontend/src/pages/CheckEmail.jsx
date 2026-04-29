import { useLocation } from 'react-router-dom'

export default function CheckEmail() {
  const location = useLocation()
  const email = location.state?.email || 'your email'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-900 rounded-xl mb-4">
          <span className="text-white font-bold text-sm">HQ</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl">
            ✉️
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Check your inbox</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            We sent a verification link to{' '}
            <span className="font-semibold text-gray-900">{email}</span>.
            <br />Open it to continue booking — the link expires in 15 minutes.
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-6">Didn't receive it? Check your spam folder.</p>
      </div>
    </div>
  )
}
