import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useBooking } from '../context/BookingContext'

export default function Verify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setCitizen, setSessionToken } = useBooking()
  const [error, setError] = useState(false)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) { navigate('/'); return }

    async function verifyToken() {
      try {
        const docRef = doc(db, 'sessions', token)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) { navigate('/expired'); return }

        const data = docSnap.data()
        if (data.used === true || (data.expiresAt && data.expiresAt.toDate() < new Date())) {
          navigate('/expired')
          return
        }

        setCitizen({ firstName: data.firstName, lastName: data.lastName, email: data.email, idNumber: data.idNumber, phone: data.phone })
        setSessionToken(token)
        navigate('/book')
      } catch {
        setError(true)
      }
    }

    verifyToken()
  }, [searchParams, navigate, setCitizen, setSessionToken])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-900 font-medium mb-2">Verification failed</p>
          <p className="text-sm text-gray-500 mb-6">Something went wrong verifying your link.</p>
          <a href="/" className="text-sm font-medium text-gray-900 underline underline-offset-4">Return to home</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Verifying your session…</p>
      </div>
    </div>
  )
}
