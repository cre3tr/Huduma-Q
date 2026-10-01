import { useState, useEffect } from 'react'

const secondsLeft = (expiresAt, now) => {
  const difference = new Date(expiresAt).getTime() - now
  return difference > 0 ? Math.floor(difference / 1000) : 0
}

export default function CountdownTimer({ expiresAt, onExpire }) {
  const [now, setNow] = useState(() => Date.now())
  const timeLeft = secondsLeft(expiresAt, now)

  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now()
      setNow(t)

      if (secondsLeft(expiresAt, t) <= 0) {
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
