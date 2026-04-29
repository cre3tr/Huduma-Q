import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
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

export async function getAppointment(appointmentId) {
  try {
    const docRef = doc(db, 'appointments', appointmentId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  } catch (error) {
    console.error('getAppointment error:', error)
    return null
  }
}
