import { jsPDF } from 'jspdf';

export async function downloadPaymentReceipt(payment: any, member: any, planName: string, beneficiaries?: string[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 140] // Standard 80mm thermal receipt size
  });

  // Load and Add Logo Image on the left
  try {
    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = '/nobg_logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load logo'));
    });
    doc.addImage(logoImg, 'PNG', 6, 6, 16, 16);
  } catch (err) {
    console.warn('Could not load logo image for PDF:', err);
  }

  // Brand Name (left of header text, right of logo)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(250, 47, 42); // Golden Gym Brand Red
  doc.text('GOLDEN CORPS GYM', 25, 11);
  
  // Real location store info (left-aligned next to logo)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text('Madero 196, Centro, 76000', 25, 15);
  doc.text('Santiago de Querétaro, Qro.', 25, 19);
  doc.text('Tel: 446-117-7918', 25, 23);
  
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
  doc.text('Socio:', 8, 54);
  doc.setFont('Helvetica', 'normal');
  const payerName = payment.memberName || `${member.firstName} ${member.lastName}`;
  const payerNumber = payment.memberNumber || member.memberNumber || 'N/A';
  doc.text(payerName, 8, 58);
  doc.text(`Folio Socio: ${payerNumber}`, 8, 62);

  let currentY = 62;
  const bens = payment.beneficiaries || beneficiaries;
  if (bens && bens.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.text('Beneficiarios:', 8, 66);
    doc.setFont('Helvetica', 'normal');
    doc.text(bens.join(', '), 8, 70);
    currentY = 70;
  }
  
  // Divider
  let dividerY = currentY + 4;
  doc.line(8, dividerY, 72, dividerY);
  
  // Concept Details header
  doc.setFont('Helvetica', 'bold');
  doc.text('Concepto', 8, dividerY + 5);
  doc.text('Total', 72, dividerY + 5, { align: 'right' });
  
  // Concept Item details
  doc.setFont('Helvetica', 'normal');
  doc.text(planName || 'Suscripción de Plan', 8, dividerY + 11);
  
  const discountVal = (payment.discount || 0) / 100;
  const amountVal = payment.amount / 100;
  
  let currentOffset = dividerY + 11;
  
  if (discountVal > 0) {
    const originalVal = amountVal + discountVal;
    doc.setFont('Helvetica', 'normal');
    doc.text(`$${originalVal.toFixed(2)} MXN`, 72, currentOffset, { align: 'right' });
    
    currentOffset += 5;
    doc.setFont('Helvetica', 'normal');
    doc.text('Descuento aplicado:', 8, currentOffset);
    doc.setTextColor(250, 47, 42); // Red for discount
    doc.text(`-$${discountVal.toFixed(2)} MXN`, 72, currentOffset, { align: 'right' });
    doc.setTextColor(40, 40, 40); // Reset color
  } else {
    doc.setFont('Helvetica', 'bold');
    doc.text(`$${amountVal.toFixed(2)} MXN`, 72, currentOffset, { align: 'right' });
  }
  
  currentOffset += 5;
  doc.line(8, currentOffset, 72, currentOffset);
  
  currentOffset += 5;
  doc.setFont('Helvetica', 'bold');
  doc.text('Total Neto Pagado:', 8, currentOffset);
  doc.text(`$${amountVal.toFixed(2)} MXN`, 72, currentOffset, { align: 'right' });
  
  currentOffset += 4;
  doc.line(8, currentOffset, 72, currentOffset);
  
  // Payment Info
  doc.setFont('Helvetica', 'normal');
  doc.text(`Forma de Pago: ${payment.paymentMethodName || 'Efectivo'}`, 8, currentOffset + 6);
  doc.text('Estado de Transacción: APROBADO', 8, currentOffset + 11);
  doc.text(`Cajero: ${payment.processedByName || 'Administrador'}`, 8, currentOffset + 16);
  
  // Footer
  doc.setDrawColor(210, 210, 210);
  doc.line(8, currentOffset + 22, 72, currentOffset + 22);
  
  doc.setFont('Helvetica', 'oblique');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  doc.text('¡Gracias por su preferencia!', 40, currentOffset + 27, { align: 'center' });
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Conserve este ticket para cualquier aclaración.', 40, currentOffset + 32, { align: 'center' });
  doc.text('Golden Corps Gym - Fuerza, Disciplina y Constancia', 40, currentOffset + 36, { align: 'center' });
  
  // Download Action
  doc.save(`Recibo_${payment.referenceNumber}.pdf`);
}
