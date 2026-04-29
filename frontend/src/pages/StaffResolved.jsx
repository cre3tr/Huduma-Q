import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { signOutStaff } from '../lib/auth'
import AppointmentRow from '../components/AppointmentRow'

export default function StaffResolved() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchResolved = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const q = query(
        collection(db, 'appointments'),
        where('date', '==', today),
        where('status', 'in', ['resolved', 'missed'])
      )
      const snapshot = await getDocs(q)
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      apps.sort((a, b) => a.time.localeCompare(b.time))
      setAppointments(apps)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      if (!u) navigate('/staff')
      else fetchResolved()
    })
    return () => unsub()
  }, [navigate])

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
              <span className="text-sm text-gray-500">Resolved & Missed</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchResolved}
              disabled={loading}
              className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors disabled:opacity-40"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link to="/staff/pending" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
              Pending
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

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {appointments.length === 0 && !loading ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">No resolved or missed appointments today.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Time</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Citizen</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Service</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(app => (
                  <AppointmentRow key={app.id} appointment={app} showVerifyButton={false} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
