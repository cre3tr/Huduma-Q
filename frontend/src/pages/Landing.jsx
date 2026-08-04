import { useState } from 'react'
import { useNavigate } from 'react-router'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition'
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5'

export default function Landing() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', idNumber: '', phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{8}$/.test(formData.idNumber)) {
      setError('ID Number must be exactly 8 digits.')
      return
    }
    setLoading(true)
    try {
      const sendVerification = httpsCallable(functions, 'send_verification_email')
      await sendVerification(formData)
      navigate('/check-email', { state: { email: formData.email } })
    } catch (err) {
      console.error(err)
      setError('Could not send verification email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-900 rounded-xl mb-4">
            <span className="text-white font-bold text-sm">HQ</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Book your appointment</h1>
          <p className="text-sm text-gray-500 mt-1.5">Huduma Centre Nairobi CBD — ID Services</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name</label>
                <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email address</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} className={inputCls} placeholder="you@email.com" />
            </div>
            <div>
              <label className={labelCls}>National ID Number</label>
              <input type="text" name="idNumber" required value={formData.idNumber} onChange={handleChange} className={inputCls} placeholder="8 digits" maxLength={8} />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className={inputCls} placeholder="+254 7XX XXX XXX" />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-40 mt-2"
            >
              {loading ? 'Sending verification…' : 'Continue'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          A magic link will be sent to your email to verify your identity.
        </p>
      </div>
    </div>
  )
}