import { createContext, useContext, useState } from 'react'

const BookingContext = createContext()

export function BookingProvider({ children }) {
  const [citizen, setCitizen] = useState(null)
  const [sessionToken, setSessionToken] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [heldSlot, setHeldSlot] = useState(null)
  const [confirmedAppointment, setConfirmedAppointment] = useState(null)

  const value = {
    citizen,
    setCitizen,
    sessionToken,
    setSessionToken,
    selectedService,
    setSelectedService,
    heldSlot,
    setHeldSlot,
    confirmedAppointment,
    setConfirmedAppointment
  }

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}
