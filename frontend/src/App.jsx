import { BrowserRouter, Routes, Route } from 'react-router'

import Landing from './pages/Landing'
import CheckEmail from './pages/CheckEmail'
import Verify from './pages/Verify'
import ServiceSelect from './pages/ServiceSelect'
import Review from './pages/Review'
import Success from './pages/Success'
import ExpiredLink from './pages/ExpiredLink'

import StaffLogin from './pages/StaffLogin'
import StaffPending from './pages/StaffPending'
import StaffResolved from './pages/StaffResolved'

function DemoBanner() {
  return (
    <div role="note" className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs sm:text-sm px-4 py-2 text-center">
      <strong>Demo only.</strong> HudumaQ is not a government service and is not affiliated with Huduma Kenya or the Government of Kenya. It was built as a demo for a hackathon. Bookings made here are not real appointments.
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/verify" element={<Verify />} />
        
        <Route path="/book" element={<ServiceSelect />} />
        <Route path="/review" element={<Review />} />
        <Route path="/success" element={<Success />} />
        
        <Route path="/expired" element={<ExpiredLink />} />
        
        {/* Staff Routes */}
        <Route path="/staff" element={<StaffLogin />} />
        <Route path="/staff/pending" element={<StaffPending />} />
        <Route path="/staff/resolved" element={<StaffResolved />} />
      </Routes>
    </BrowserRouter>
  )
}
