import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

export default function Landing() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', idNumber: '', phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}))

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
      setError('Verification service temporarily unavailable. Please try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-semibold mb-6">Book Huduma Service</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ID Number</label>
            <input type="text" name="idNumber" required value={formData.idNumber} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          
          {error && <div className="text-red-600 text-sm p-2 bg-red-50 rounded">{error}</div>}
          
          <button disabled={loading} type="submit" className="w-full bg-black text-white p-2 rounded font-medium disabled:opacity-50">
            {loading ? 'Sending...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
