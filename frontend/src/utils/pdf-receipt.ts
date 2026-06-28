import { jsPDF } from 'jspdf';

export async function downloadPaymentReceipt(payment: any, member: any, planName: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 140] // Standard 80mm thermal receipt size
  });

  // Brand Name (centered)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(250, 47, 42); // Golden Gym Brand Red
  doc.text('GOLDEN GYM', 40, 12, { align: 'center' });
  
  // Real location store info (centered)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Madero 196, Centro, 76000', 40, 17, { align: 'center' });
  doc.text('Santiago de Querétaro, Qro.', 40, 21, { align: 'center' });
  doc.text('Tel: 446-117-7918', 40, 25, { align: 'center' });
  
  // Divider
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(8, 29, 72, 29);
  
  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text('COMPROBANTE DE PAGO', 40, 34, { align: 'center' });
  
  // Receipt particulars
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Folio Ref: ${payment.referenceNumber}`, 8, 42);
  
  const dateObj = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
  const paymentDateStr = dateObj.toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
  doc.text(`Fecha: ${paymentDateStr}`, 8, 47);
  
  // Client details
  doc.setFont('Helvetica', 'bold');
  doc.text('Socio:', 8, 55);
  doc.setFont('Helvetica', 'normal');
  doc.text(`${member.firstName} ${member.lastName}`, 8, 60);
  doc.text(`Folio Socio: ${member.memberNumber || 'N/A'}`, 8, 65);
  
  // Divider
  doc.line(8, 70, 72, 70);
  
  // Concept Details header
  doc.setFont('Helvetica', 'bold');
  doc.text('Concepto', 8, 75);
  doc.text('Total', 72, 75, { align: 'right' });
  
  // Concept Item details
  doc.setFont('Helvetica', 'normal');
  doc.text(planName || 'Suscripción de Plan', 8, 82);
  const amountVal = payment.amount / 100;
  const amountStr = `$${amountVal.toFixed(2)} MXN`;
  doc.setFont('Helvetica', 'bold');
  doc.text(amountStr, 72, 82, { align: 'right' });
  
  // Divider
  doc.line(8, 88, 72, 88);
  
  // Payment Info
  doc.setFont('Helvetica', 'normal');
  doc.text(`Forma de Pago: ${payment.paymentMethodName || 'Efectivo'}`, 8, 94);
  doc.text('Estado de Transacción: APROBADO', 8, 99);
  doc.text(`Cajero: ${payment.processedByName || 'Administrador'}`, 8, 104);
  
  // Footer
  doc.setDrawColor(210, 210, 210);
  doc.line(8, 110, 72, 110);
  
  doc.setFont('Helvetica', 'oblique');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  doc.text('¡Gracias por su preferencia!', 40, 116, { align: 'center' });
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Conserve este ticket para cualquier aclaración.', 40, 121, { align: 'center' });
  doc.text('Golden Gym - Fuerza y Disciplina', 40, 125, { align: 'center' });
  
  // Download Action
  doc.save(`Recibo_${payment.referenceNumber}.pdf`);
}
