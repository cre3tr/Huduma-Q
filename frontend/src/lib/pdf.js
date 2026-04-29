import { jsPDF } from 'jspdf'

const serviceLabels = {
  new_id: "New ID Application",
  replace_id: "Replace Lost ID",
  collect_id: "Collect ID"
}

export function generatePDF(appointment) {
  const doc = new jsPDF()
  
  doc.setFontSize(22)
  doc.text('HudumaQ Appointment', 20, 30)
  
  doc.setFontSize(12)
  doc.text(`Name: ${appointment.firstName} ${appointment.lastName}`, 20, 50)
  doc.text(`ID Number: ${appointment.idNumber}`, 20, 60)
  doc.text(`Service: ${serviceLabels[appointment.service] || appointment.service}`, 20, 70)
  doc.text(`Date: ${appointment.date}`, 20, 80)
  doc.text(`Time: ${appointment.time}`, 20, 90)
  doc.text(`Location: ${appointment.centreLocation}`, 20, 100)
  
  doc.save('hudumaq-appointment.pdf')
}
