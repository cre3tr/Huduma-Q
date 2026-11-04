import { createContext, useContext } from 'react'

// Kept apart from BookingProvider so the provider file exports only a
// component, which React Fast Refresh needs to hot-reload it.
export const BookingContext = createContext()

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}
