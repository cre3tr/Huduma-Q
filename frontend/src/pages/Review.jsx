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

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-baseline py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right ml-4">{value}</span>
    </div>
  )
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">Missing booking details.</p>
          <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-900 underline underline-offset-4">Start over</button>
        </div>
      </div>
    )
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      const confirmBooking = httpsCallable(functions, 'confirm_booking')
      const result = await confirmBooking({ slotId: heldSlot.slotId, sessionToken })
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
      setError('Booking confirmation failed — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-900 rounded-xl mb-4">
            <span className="text-white font-bold text-sm">HQ</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review your booking</h1>
          <p className="text-sm text-gray-500 mt-1.5">Confirm everything looks correct before submitting.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Citizen</p>
            <div>
              <Row label="Name" value={`${citizen.firstName} ${citizen.lastName}`} />
              <Row label="ID Number" value={citizen.idNumber} />
              <Row label="Phone" value={citizen.phone} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Appointment</p>
            <div>
              <Row label="Service" value={serviceLabels[heldSlot.service] || heldSlot.service} />
              <Row label="Date" value={heldSlot.date} />
              <Row label="Time" value={heldSlot.time} />
              <Row label="Location" value="Huduma Centre Nairobi CBD" />
            </div>
          </div>

          {heldSlot?.heldUntil && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <span className="text-xs font-medium text-amber-700">Slot reserved for</span>
              <CountdownTimer expiresAt={heldSlot.heldUntil} onExpire={handleExpire} />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {loading ? 'Confirming…' : 'Confirm Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}
