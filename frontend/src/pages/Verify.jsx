import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useBooking } from '../context/BookingContext'

export default function Verify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setCitizen, setSessionToken } = useBooking()
  const [status, setStatus] = useState('Verifying your session...')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      navigate('/')
      return
    }

    async function verifyToken() {
      try {
        const docRef = doc(db, 'sessions', token)
        const docSnap = await getDoc(docRef)
        
        if (!docSnap.exists()) {
          navigate('/expired')
          return
        }

        const data = docSnap.data()
        const now = new Date()
        
        if (data.used === true || (data.expiresAt && data.expiresAt.toDate() < now)) {
          navigate('/expired')
          return
        }

        setCitizen({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          idNumber: data.idNumber,
          phone: data.phone
        })
        setSessionToken(token)
        navigate('/book')
        
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('error')
      }
    }

    verifyToken()
  }, [searchParams, navigate, setCitizen, setSessionToken])

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Something went wrong verifying your link.</p>
          <a href="/" className="underline text-sm text-gray-600">Return to home page</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-gray-500 animate-pulse">Verifying your session...</p>
    </div>
  )
}
