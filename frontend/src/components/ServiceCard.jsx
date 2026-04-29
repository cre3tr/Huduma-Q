export default function ServiceCard({ service, title, duration, requirements, selected, onSelect, citizen }) {
  return (
    <div 
      onClick={() => !selected && onSelect(service)}
      className={`border rounded p-4 transition-all ${
        selected 
          ? 'border-black bg-white ring-1 ring-black' 
          : 'border-gray-200 bg-gray-50 hover:bg-white cursor-pointer'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-lg">{title}</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{duration} min</span>
      </div>
      
      {selected && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Requirements</h4>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
            {requirements.map((req, i) => <li key={i}>{req}</li>)}
          </ul>
          
          {citizen && (
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1 border border-gray-100">
              <p><span className="font-medium">Applicant:</span> {citizen.firstName} {citizen.lastName}</p>
              <p><span className="font-medium">ID Number:</span> {citizen.idNumber}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
