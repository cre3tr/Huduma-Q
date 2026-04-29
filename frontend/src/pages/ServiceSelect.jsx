import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import { useBooking } from '../context/BookingContext'
import { getCitizenAppointments } from '../lib/appointments'
import ServiceCard from '../components/ServiceCard'
import SlotGrid from '../components/SlotGrid'

const SERVICES = [
  { id: 'new_id', title: 'New ID Application', duration: 20, requirements: ['Original birth certificate', '2 passport photos', 'KES 300 fee'] },
  { id: 'replace_id', title: 'Replace Lost ID', duration: 10, requirements: ['Affidavit of loss', '2 passport photos', 'KES 300 fee'] },
  { id: 'collect_id', title: 'Collect ID', duration: 5, requirements: ['Original collection slip'] },
]

export default function ServiceSelect() {
  const navigate = useNavigate()
  const { citizen, sessionToken, selectedService, setSelectedService, setHeldSlot } = useBooking()

  const todayStr = new Date().toISOString().split('T')[0]
  const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1)
  const tomorrowStr = tmrw.toISOString().split('T')[0]

  const [date, setDate] = useState(todayStr)
  const [existingAppointments, setExistingAppointments] = useState([])
  const [holding, setHolding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!citizen) { navigate('/'); return }
    getCitizenAppointments(citizen.email).then(setExistingAppointments)
  }, [citizen, navigate])

  const handleSlotSelect = async (slot) => {
    setHolding(true)
    setError('')
    try {
      const holdSlot = httpsCallable(functions, 'hold_slot')
      const result = await holdSlot({ slotId: slot.id, sessionToken })
      setHeldSlot({ slotId: slot.id, date: slot.date, time: slot.time, duration: slot.duration, heldUntil: result.data.heldUntil, service: selectedService })
      navigate('/review')
    } catch (err) {
      console.error(err)
      if (err?.message === 'Slot time has already passed.') {
        setError('Slot hold unavailable — you cannot book a past time slot.')
      } else {
        setError('Slot hold unavailable — please try again shortly.')
      }
    } finally {
      setHolding(false)
    }
  }

  if (!citizen) return null
  const selectedServiceData = SERVICES.find(s => s.id === selectedService)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">HQ</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">HudumaQ</span>
          <span className="text-gray-300 text-sm">·</span>
          <span className="text-sm text-gray-500">Select a service</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
          You have 5 minutes to complete your booking once a slot is selected.
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Choose a service</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SERVICES.map(service => (
              <ServiceCard
                key={service.id}
                service={service.id}
                title={service.title}
                duration={service.duration}
                requirements={service.requirements}
                selected={selectedService === service.id}
                citizen={selectedService === service.id ? citizen : null}
                onSelect={(id) => { setSelectedService(id); setError('') }}
              />
            ))}
          </div>
        </div>

        {selectedServiceData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Available slots</p>
              <div className="flex bg-gray-50 border border-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => { setDate(todayStr); setError('') }}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${date === todayStr ? 'bg-white shadow-sm border border-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => { setDate(tomorrowStr); setError('') }}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${date === tomorrowStr ? 'bg-white shadow-sm border border-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            <SlotGrid
              date={date}
              service={selectedServiceData.id}
              existingAppointments={existingAppointments}
              onSlotSelect={handleSlotSelect}
            />

            {holding && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Holding slot…
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
