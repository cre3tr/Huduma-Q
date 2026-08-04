import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, auth } from '../lib/firebase'
import { signOutStaff } from '../lib/auth'
import AppointmentRow from '../components/AppointmentRow'

export default function StaffPending() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loadingIds, setLoadingIds] = useState(new Set())
  const [rowErrors, setRowErrors] = useState({})
  const [streamError, setStreamError] = useState(false)

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(u => {
      if (!u) navigate('/staff')
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
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    }, (err) => {
      console.error('Snapshot error:', err)
      setStreamError(true)
    })

    return () => { unsubscribeAuth(); unsubscribeData() }
  }, [navigate])

  const handleVerify = async (appointmentId) => {
    setLoadingIds(prev => new Set(prev).add(appointmentId))
    setRowErrors(prev => ({ ...prev, [appointmentId]: null }))
    try {
      const verifyArrival = httpsCallable(functions, 'verify_arrival')
      await verifyArrival({ appointmentId })
    } catch (err) {
      console.error(err)
      setRowErrors(prev => ({ ...prev, [appointmentId]: 'Verification failed — try again.' }))
    } finally {
      setLoadingIds(prev => { const n = new Set(prev); n.delete(appointmentId); return n })
    }
  }

  const handleSignOut = async () => {
    await signOutStaff()
    navigate('/staff')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">HQ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">HudumaQ</span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500">Pending Intakes</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/staff/resolved" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
              View Resolved
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-4">
        {streamError && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            Could not connect to appointment stream. Check your connection and refresh.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {appointments.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">No pending appointments for today.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Time</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Citizen</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Service</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(app => (
                  <AppointmentRow
                    key={app.id}
                    appointment={app}
                    showVerifyButton
                    loading={loadingIds.has(app.id)}
                    onVerify={handleVerify}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {Object.entries(rowErrors).map(([id, msg]) => msg && (
          <div key={id} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {msg}
          </div>
        ))}
      </main>
    </div>
  )
}