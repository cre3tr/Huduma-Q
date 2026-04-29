import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from './firebase'

export async function getCitizenAppointments(email) {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('email', '==', email),
      where('status', 'in', ['pending', 'resolved'])
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('getCitizenAppointments error:', error)
    return []
  }
}

// getAppointment(appointmentId) removed — exported but never imported.
// Re-add if a citizen appointment history view is built post-launch.
// CLEANUP-1: appointments.js — 2026-04-29