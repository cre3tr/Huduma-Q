export default function ServiceCard({ service, title, duration, requirements, selected, onSelect, citizen }) {
  return (
    <div
      onClick={() => !selected && onSelect(service)}
      className={`rounded-2xl border p-5 transition-all cursor-pointer ${
        selected
          ? 'border-gray-900 bg-white ring-1 ring-gray-900 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{title}</h3>
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg ml-2 shrink-0">
          {duration} min
        </span>
      </div>

      {selected && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Requirements</p>
            <ul className="space-y-1">
              {requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-gray-300 mt-0.5">—</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {citizen && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-0.5">
              <p className="text-xs text-gray-900 font-medium">{citizen.firstName} {citizen.lastName}</p>
              <p className="text-xs text-gray-400">ID: {citizen.idNumber}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
