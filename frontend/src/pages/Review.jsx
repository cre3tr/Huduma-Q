import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import { useBooking } from '../context/BookingContext'
import CountdownTimer from '../components/CountdownTimer'

const serviceLabels = {
  new_id: "New ID Application",
  replace_id: "Replace Lost ID",
  collect_id: "Collect ID"
}

export default function Review() {
  const navigate = useNavigate()
  const { citizen, heldSlot, sessionToken, setConfirmedAppointment, setHeldSlot } = useBooking()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExpire = useCallback(() => {
    setHeldSlot(null)
    navigate('/', { state: { expired: true } })
  }, [setHeldSlot, navigate])

  if (!citizen || !heldSlot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Missing booking details.</p>
          <button onClick={() => navigate('/')} className="underline">Start over</button>
        </div>
      </div>
    )
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      const confirmBooking = httpsCallable(functions, 'confirm_booking')
      const result = await confirmBooking({
        slotId: heldSlot.slotId,
        sessionToken
      })
      
      setConfirmedAppointment({
        appointmentId: result.data.appointmentId,
        service: heldSlot.service,
        date: heldSlot.date,
        time: heldSlot.time,
        duration: heldSlot.duration,
        centreLocation: "Huduma Centre Nairobi CBD",
        ...citizen
      })
      setHeldSlot(null)
      navigate('/success')
    } catch (err) {
      console.error(err)
      setError('Booking confirmation unavailable — please try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-semibold mb-6">Review Booking</h1>
        
        <div className="space-y-6 mb-8">
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Citizen Details</h2>
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <p><span className="font-medium">Name:</span> {citizen.firstName} {citizen.lastName}</p>
              <p><span className="font-medium">ID Number:</span> {citizen.idNumber}</p>
              <p><span className="font-medium">Phone:</span> {citizen.phone}</p>
            </div>
          </div>
          
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Appointment Details</h2>
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <p><span className="font-medium">Service:</span> {serviceLabels[heldSlot.service] || heldSlot.service}</p>
              <p><span className="font-medium">Date:</span> {heldSlot.date}</p>
              <p><span className="font-medium">Time:</span> {heldSlot.time}</p>
              <p><span className="font-medium">Location:</span> Huduma Centre Nairobi CBD</p>
            </div>
          </div>
        </div>

        {heldSlot?.heldUntil && (
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <span className="text-sm text-gray-500">Time remaining to confirm</span>
            <CountdownTimer expiresAt={heldSlot.heldUntil} onExpire={handleExpire} />
          </div>
        )}

        {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded mb-4">{error}</div>}

        <button
          onClick={handleConfirm} 
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded font-medium disabled:opacity-50"
        >
          {loading ? 'Confirming...' : 'Confirm Appointment'}
        </button>
      </div>
    </div>
  )
}
