import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, auth } from '../lib/firebase'
import AppointmentRow from '../components/AppointmentRow'

export default function StaffPending() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loadingIds, setLoadingIds] = useState(new Set())
  const [error, setError] = useState({})
  const [streamError, setStreamError] = useState(false)

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (!user) navigate('/staff')
    })
    
    const today = new Date().toISOString().split('T')[0]
    
    const q = query(
      collection(db, 'appointments'),
      where('date', '==', today),
      where('status', '==', 'pending'),
      orderBy('time', 'asc')
    )

    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setStreamError(false)
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setAppointments(apps)
    }, (err) => {
      console.error('Snapshot error:', err)
      setStreamError(true)
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeData) unsubscribeData()
    }
  }, [navigate])

  const handleVerify = async (appointmentId) => {
    setLoadingIds(prev => new Set(prev).add(appointmentId))
    setError(prev => ({ ...prev, [appointmentId]: null }))
    
    try {
      const verifyArrival = httpsCallable(functions, 'verify_arrival')
      await verifyArrival({ appointmentId })
    } catch (err) {
      console.error(err)
      setError(prev => ({ ...prev, [appointmentId]: 'Failed to verify. Try again.' }))
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(appointmentId)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs">
            HQ
          </div>
          <h1 className="font-semibold text-lg">Today's Pending Intakes</h1>
        </div>
        <div className="flex gap-4">
          <Link to="/staff/resolved" className="text-sm font-medium text-gray-500 hover:text-black">
            View Resolved
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {streamError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm border border-red-100">
            Could not connect to appointment stream. Check your connection and refresh.
          </div>
        )}
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending appointments for today.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Citizen</th>
                  <th className="p-3 font-medium">Service</th>
                  <th className="p-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(app => (
                  <AppointmentRow 
                    key={app.id} 
                    appointment={app} 
                    showVerifyButton={true}
                    loading={loadingIds.has(app.id)}
                    onVerify={handleVerify}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
        {Object.entries(error).map(([id, msg]) => msg && (
          <div key={id} className="mt-4 p-3 bg-red-50 text-red-600 rounded text-sm border border-red-100">
            Error on {id}: {msg}
          </div>
        ))}
      </main>
    </div>
  )
}
