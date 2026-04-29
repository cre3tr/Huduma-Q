const serviceLabels = {
  new_id: "New ID Application",
  replace_id: "Replace Lost ID",
  collect_id: "Collect ID"
}

export default function AppointmentRow({ appointment, onVerify, showVerifyButton, loading }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="px-5 py-3.5">
        <span className="text-sm font-mono font-medium text-gray-900">{appointment.time}</span>
      </td>
      <td className="px-5 py-3.5">
        <p className="text-sm font-medium text-gray-900">{appointment.firstName} {appointment.lastName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{appointment.idNumber} · {appointment.phone}</p>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-gray-600">{serviceLabels[appointment.service] || appointment.service}</span>
      </td>
      {showVerifyButton ? (
        <td className="px-5 py-3.5 text-right">
          <button
            onClick={() => onVerify(appointment.id)}
            disabled={loading}
            className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Verify Arrival'}
          </button>
        </td>
      ) : (
        <td className="px-5 py-3.5 text-right">
          {appointment.status === 'resolved' && (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold tracking-wider">
              {appointment.appointmentCode}
            </span>
          )}
          {appointment.status === 'missed' && (
            <span className="inline-flex items-center bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg text-xs font-medium">
              Missed
            </span>
          )}
        </td>
      )}
    </tr>
  )
}
