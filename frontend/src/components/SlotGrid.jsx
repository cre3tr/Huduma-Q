import { useEffect, useState } from 'react'
import { fetchSlots, isAvailable } from '../lib/slots'

export default function SlotGrid({ date, service, existingAppointments, onSlotSelect }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    async function loadSlots() {
      setLoading(true)
      setFetchError(false)
      try {
        const data = await fetchSlots(date, service)
        setSlots(data.sort((a, b) => a.time.localeCompare(b.time)))
      } catch {
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    }
    loadSlots()
  }, [date, service])

  const isPast = (slotTime) => new Date(`${date}T${slotTime}`) <= new Date()

  const isWithinTwoHours = (slotTime) => {
    const slotDateObj = new Date(`${date}T${slotTime}`)
    return existingAppointments.some(app => {
      if (app.date !== date) return false
      const appDateObj = new Date(`${app.date}T${app.time}`)
      return Math.abs(slotDateObj - appDateObj) < 2 * 60 * 60 * 1000
    })
  }

  if (loading) return <div className="py-10 text-center text-sm text-gray-400 animate-pulse">Loading slots…</div>
  if (fetchError) return <div className="py-10 text-center text-sm text-red-500">Could not load slots — refresh and try again.</div>
  if (slots.length === 0) return <div className="py-10 text-center text-sm text-gray-400">No slots available for this date.</div>

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
      {slots.map(slot => {
        const available = isAvailable(slot)
        const conflict = isWithinTwoHours(slot.time)
        const past = isPast(slot.time)
        const selectable = available && !conflict && !past

        return (
          <button
            key={slot.id}
            disabled={!selectable}
            onClick={() => onSlotSelect(slot)}
            className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${
              selectable
                ? 'bg-white border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:shadow-sm'
                : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            {slot.time}
          </button>
        )
      })}
    </div>
  )
}
