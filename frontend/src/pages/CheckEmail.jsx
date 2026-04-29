import { useLocation } from 'react-router-dom'

export default function CheckEmail() {
  const location = useLocation()
  const email = location.state?.email || 'your email'

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow-sm border border-gray-200 text-center">
        <h1 className="text-2xl font-semibold mb-4">Check your inbox</h1>
        <p className="text-gray-600">
          We sent a verification link to <span className="font-medium text-black">{email}</span>. 
          It expires in 15 minutes.
        </p>
      </div>
    </div>
  )
}
