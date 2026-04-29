export function generateICS(appointment) {
  const [year, month, day] = appointment.date.split('-')
  const [hour, minute] = appointment.time.split(':')
  
  const startDate = new Date(year, month - 1, day, hour, minute)
  const endDate = new Date(startDate.getTime() + (appointment.duration * 60000))

  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const dtStart = formatDate(startDate)
  const dtEnd = formatDate(endDate)

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HudumaQ//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Huduma Centre - ${appointment.service}`,
    `LOCATION:${appointment.centreLocation}`,
    `DESCRIPTION:Appointment for ${appointment.firstName} ${appointment.lastName} (ID: ${appointment.idNumber})`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'hudumaq-appointment.ics'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
