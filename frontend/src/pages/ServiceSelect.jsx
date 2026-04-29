import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import { useBooking } from '../context/BookingContext'
import { getCitizenAppointments } from '../lib/appointments'
import ServiceCard from '../components/ServiceCard'
import SlotGrid from '../components/SlotGrid'

const SERVICES = [
  {
    id: 'new_id',
    title: 'New ID Application',
    duration: 20,
    requirements: ['Original birth certificate', '2 passport photos', 'KES 300 fee']
  },
  {
    id: 'replace_id',
    title: 'Replace Lost ID',
    duration: 10,
    requirements: ['Affidavit of loss', '2 passport photos', 'KES 300 fee']
  },
  {
    id: 'collect_id',
    title: 'Collect ID',
    duration: 5,
    requirements: ['Original collection slip']
  }
]

export default function ServiceSelect() {
  const navigate = useNavigate()
  const { citizen, sessionToken, selectedService, setSelectedService, setHeldSlot } = useBooking()
  
  const todayStr = new Date().toISOString().split('T')[0]
  const tmrwDate = new Date()
  tmrwDate.setDate(tmrwDate.getDate() + 1)
  const tomorrowStr = tmrwDate.toISOString().split('T')[0]

  const [date, setDate] = useState(todayStr)
  const [existingAppointments, setExistingAppointments] = useState([])
  const [holding, setHolding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!citizen) {
      navigate('/')
      return
    }
    
    async function fetchExisting() {
      const apps = await getCitizenAppointments(citizen.email)
      setExistingAppointments(apps)
    }
    fetchExisting()
  }, [citizen, navigate])

  const handleServiceSelect = (serviceId) => {
    setSelectedService(serviceId)
    setError('')
  }

  const handleDateToggle = (newDate) => {
    setDate(newDate)
    setError('')
  }

  const handleSlotSelect = async (slot) => {
    setHolding(true)
    setError('')
    try {
      const holdSlot = httpsCallable(functions, 'hold_slot')
      const result = await holdSlot({
        slotId: slot.id,
        sessionToken
      })
      
      setHeldSlot({
        slotId: slot.id,
        date: slot.date,
        time: slot.time,
        duration: slot.duration,
        heldUntil: result.data.heldUntil,
        service: selectedService
      })
      
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
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Select a Service</h1>
        
        <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm font-medium border border-blue-100">
          Notice: You have 5 minutes to complete your booking once a slot is selected.
        </div>

        {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded border border-red-100">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SERVICES.map(service => (
            <ServiceCard
              key={service.id}
              service={service.id}
              title={service.title}
              duration={service.duration}
              requirements={service.requirements}
              selected={selectedService === service.id}
              citizen={selectedService === service.id ? citizen : null}
              onSelect={handleServiceSelect}
            />
          ))}
        </div>

        {selectedServiceData && (
          <div className="bg-white p-6 rounded shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-lg font-medium">Available Slots</h2>
              
              <div className="flex bg-gray-100 p-1 rounded">
                <button 
                  onClick={() => handleDateToggle(todayStr)}
                  className={`px-4 py-1.5 text-sm rounded transition-colors ${date === todayStr ? 'bg-white shadow-sm border border-gray-200 font-medium text-black' : 'text-gray-500 hover:text-black'}`}
                >
                  Today
                </button>
                <button 
                  onClick={() => handleDateToggle(tomorrowStr)}
                  className={`px-4 py-1.5 text-sm rounded transition-colors ${date === tomorrowStr ? 'bg-white shadow-sm border border-gray-200 font-medium text-black' : 'text-gray-500 hover:text-black'}`}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            <SlotGrid
              date={date}
              service={selectedServiceData.id}
              slotDuration={selectedServiceData.duration}
              existingAppointments={existingAppointments}
              onSlotSelect={handleSlotSelect}
            />
            
            {holding && <div className="mt-4 text-center text-sm text-gray-500 animate-pulse">Holding slot...</div>}
          </div>
        )}
      </div>
    </div>
  )
}
