import { Link } from 'react-router'

export default function ExpiredLink() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl">
            ⏱
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Link expired</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            This verification link has expired or already been used. Please start a new booking.
          </p>
          <Link
            to="/"
            className="inline-block w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            Start over
          </Link>
        </div>
      </div>
    </div>
  )
}
