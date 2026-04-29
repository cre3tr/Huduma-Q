export default function AppointmentRow({ appointment, onVerify, showVerifyButton, loading }) {
  const serviceLabels = {
    new_id: "New ID Application",
    replace_id: "Replace Lost ID",
    collect_id: "Collect ID"
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="p-3 text-sm">{appointment.time}</td>
      <td className="p-3 text-sm">
        <div className="font-medium">{appointment.firstName} {appointment.lastName}</div>
        <div className="text-gray-500 text-xs">{appointment.idNumber} • {appointment.phone}</div>
      </td>
      <td className="p-3 text-sm text-gray-700">{serviceLabels[appointment.service] || appointment.service}</td>
      {showVerifyButton ? (
        <td className="p-3 text-right">
          <button 
            onClick={() => onVerify(appointment.id)}
            disabled={loading}
            className="bg-black text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50"
          >
            Verify Arrival
          </button>
        </td>
      ) : (
        <td className="p-3 text-right text-sm">
          {appointment.status === 'resolved' && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium text-xs uppercase tracking-wider">
              {appointment.appointmentCode}
            </span>
          )}
          {appointment.status === 'missed' && (
            <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded font-medium text-xs uppercase tracking-wider">
              Missed
            </span>
          )}
        </td>
      )}
    </tr>
  )
}
