import { useState, useEffect } from 'react'

export default function CountdownTimer({ expiresAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const difference = expiry - now
      return difference > 0 ? Math.floor(difference / 1000) : 0
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      
      if (remaining <= 0) {
        clearInterval(timer)
        onExpire()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, onExpire])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isWarning = timeLeft < 60

  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${isWarning ? 'text-red-600' : 'text-amber-700'}`}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}
