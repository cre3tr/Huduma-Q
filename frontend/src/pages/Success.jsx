import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import { generatePDF } from '../lib/pdf'
import { generateICS } from '../lib/ics'

const serviceLabels = {
  new_id: "New ID Application",
  replace_id: "Replace Lost ID",
  collect_id: "Collect ID"
}

export default function Success() {
  const navigate = useNavigate()
  const { confirmedAppointment } = useBooking()

  useEffect(() => {
    if (!confirmedAppointment) {
      navigate('/')
    }
  }, [confirmedAppointment, navigate])

  if (!confirmedAppointment) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow-sm border border-gray-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">✓</div>
          <h1 className="text-2xl font-semibold">Booking Confirmed</h1>
          <p className="text-gray-600 mt-2">Your appointment has been scheduled.</p>
        </div>

        <div className="bg-gray-50 p-4 rounded mb-6 space-y-2 text-sm border border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500">Service</span>
            <span className="font-medium text-right">{serviceLabels[confirmedAppointment.service] || confirmedAppointment.service}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-medium">{confirmedAppointment.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span className="font-medium">{confirmedAppointment.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Location</span>
            <span className="font-medium text-right">{confirmedAppointment.centreLocation}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => generatePDF(confirmedAppointment)}
            className="w-full bg-black text-white p-2 rounded font-medium hover:bg-gray-800 transition-colors"
          >
            Download Appointment Slip (PDF)
          </button>
          <button 
            onClick={() => generateICS(confirmedAppointment)}
            className="w-full bg-white border border-gray-300 text-black p-2 rounded font-medium hover:bg-gray-50 transition-colors"
          >
            Add to Calendar
          </button>
        </div>
      </div>
    </div>
  )
}
