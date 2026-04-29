import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from './firebase'

export async function fetchSlots(date, service) {
  try {
    const q = query(
      collection(db, 'slots'),
      where('date', '==', date),
      where('service', '==', service)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('fetchSlots error:', error)
    return []
  }
}

export function isAvailable(slot) {
  if (slot.status === 'available') return true
  if (slot.status === 'held') {
    const now = new Date()
    if (slot.heldUntil && slot.heldUntil.toDate() < now) return true
  }
  return false
}
