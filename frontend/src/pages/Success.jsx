import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useBooking } from '../context/BookingContext'
import { generatePDF } from '../lib/pdf'
import { generateICS } from '../lib/ics'

const serviceLabels = {
  new_id: "New ID Application",
  replace_id: "Replace Lost ID",
  collect_id: "Collect ID"
}

const LOGOUT_SECS = 25

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-baseline py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right ml-4">{value}</span>
    </div>
  )
}

export default function Success() {
  const navigate = useNavigate()
  const { confirmedAppointment, resetBooking } = useBooking()
  const [secondsLeft, setSecondsLeft] = useState(LOGOUT_SECS)

  useEffect(() => {
    if (!confirmedAppointment) { navigate('/'); return }
  }, [confirmedAppointment, navigate])

  useEffect(() => {
    let s = LOGOUT_SECS
    const id = setInterval(() => {
      s--
      setSecondsLeft(s)
      if (s <= 0) { clearInterval(id); resetBooking(); navigate('/') }
    }, 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!confirmedAppointment) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-xl mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Booking confirmed</h1>
          <p className="text-sm text-gray-500 mt-1.5">Check your email for a confirmation receipt.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Appointment details</p>
            <div>
              <Row label="Service" value={serviceLabels[confirmedAppointment.service] || confirmedAppointment.service} />
              <Row label="Date" value={confirmedAppointment.date} />
              <Row label="Time" value={confirmedAppointment.time} />
              <Row label="Location" value={confirmedAppointment.centreLocation} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => generatePDF(confirmedAppointment)}
              className="bg-gray-900 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
            >
              Download PDF
            </button>
            <button
              onClick={() => generateICS(confirmedAppointment)}
              className="border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Add to Calendar
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            This page closes in {secondsLeft}s
          </p>
        </div>
      </div>
    </div>
  )
}
