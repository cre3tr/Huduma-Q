import { Link } from 'react-router-dom'

export default function ExpiredLink() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow-sm border border-gray-200 text-center">
        <h1 className="text-2xl font-semibold mb-4 text-red-600">Link Expired</h1>
        <p className="text-gray-600 mb-6">
          This link has expired. Please return to the home page to start again.
        </p>
        <Link to="/" className="inline-block bg-black text-white px-6 py-2 rounded font-medium">
          Start Over
        </Link>
      </div>
    </div>
  )
}
