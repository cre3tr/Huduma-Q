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

export default function App() {
  return (
    <BrowserRouter>
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
