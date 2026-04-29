import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
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
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (!user) navigate('/staff')
      else fetchResolved()
    })
    return () => unsubscribeAuth()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs">
            HQ
          </div>
          <h1 className="font-semibold text-lg">Resolved & Missed</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchResolved} 
            disabled={loading}
            className="text-sm font-medium bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/staff/pending" className="text-sm font-medium text-gray-500 hover:text-black">
            Back to Pending
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          {appointments.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500">No resolved or missed appointments today.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Citizen</th>
                  <th className="p-3 font-medium">Service</th>
                  <th className="p-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(app => (
                  <AppointmentRow 
                    key={app.id} 
                    appointment={app} 
                    showVerifyButton={false}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
