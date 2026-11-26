/**
 * Utilidades de generación de PDF — CONTABIA AI
 * Usa jspdf para generar documentos descargables en el cliente.
 * No requiere servidor ni servicios externos.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface EmpresaInfo {
  nombre: string;
  nombreComercial?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  pais?: string;
  moneda?: string;
}

export interface LineaDocumento {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  itbmsPorcentaje: number;
  subtotal: number;
  itbmsMonto: number;
  total: number;
}

export interface DatosFacturaPDF {
  empresa: EmpresaInfo;
  cliente?: string | null;
  numero: string;
  tipo: string;
  fecha: string;
  fechaVencimiento?: string | null;
  lineas: LineaDocumento[];
  subtotal: number;
  itbms: number;
  total: number;
  notas?: string | null;
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function tipoEtiqueta(tipo: string): string {
  const mapa: Record<string, string> = { factura: "FACTURA", cotizacion: "COTIZACIÓN", recibo: "RECIBO" };
  return mapa[tipo] ?? tipo.toUpperCase();
}

/**
 * Genera y descarga un PDF de factura, cotización o recibo.
 */
export function generarFacturaPDF(datos: DatosFacturaPDF): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const azul = [30, 100, 220];
  const negro = [30, 30, 30];
  const gris = [120, 120, 120];
  const grisClaro = [240, 240, 240];
  const margen = 15;
  const ancho = 180;

  // ── Encabezado ──────────────────────────────────────────────────────────
  doc.setFillColor(azul[0], azul[1], azul[2]);
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(datos.empresa.nombreComercial ?? datos.empresa.nombre, margen, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const infoEmpresa = [
    datos.empresa.ruc ? `RUC: ${datos.empresa.ruc}` : null,
    datos.empresa.direccion,
    datos.empresa.telefono,
    datos.empresa.email,
  ].filter(Boolean).join("  |  ");
  doc.text(infoEmpresa, margen, 20);

  // Tipo de documento (derecha)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(tipoEtiqueta(datos.tipo), 210 - margen, 12, { align: "right" });

  // ── Datos del documento ──────────────────────────────────────────────────
  doc.setTextColor(negro[0], negro[1], negro[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  let y = 36;
  const col2 = 110;

  doc.setFont("helvetica", "bold");
  doc.text(`N°: ${datos.numero}`, margen, y);
  doc.text(`Fecha: ${datos.fecha}`, col2, y);
  y += 6;
  if (datos.fechaVencimiento) {
    doc.text(`Vencimiento: ${datos.fechaVencimiento}`, col2, y);
  }
  if (datos.cliente) {
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: `, margen, y);
    doc.setFont("helvetica", "bold");
    doc.text(datos.cliente, margen + 18, y);
    y += 6;
  }

  y += 4;

  // ── Tabla de líneas ──────────────────────────────────────────────────────
  const filas = datos.lineas.map(l => [
    l.descripcion,
    String(l.cantidad),
    formatUSD(l.precioUnitario),
    `${l.itbmsPorcentaje}%`,
    formatUSD(l.subtotal),
    formatUSD(l.itbmsMonto),
    formatUSD(l.total),
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [["Descripción", "Cant.", "P. Unit.", "ITBMS %", "Subtotal", "ITBMS", "Total"]],
    body: filas,
    theme: "striped",
    headStyles: { fillColor: azul, textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: negro },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 20, halign: "right" },
    },
    margin: { left: margen, right: margen },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // ── Totales ──────────────────────────────────────────────────────────────
  const xTot = 140;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.text("Subtotal:", xTot, finalY);
  doc.text(formatUSD(datos.subtotal), 210 - margen, finalY, { align: "right" });

  doc.text("ITBMS:", xTot, finalY + 6);
  doc.text(formatUSD(datos.itbms), 210 - margen, finalY + 6, { align: "right" });

  doc.setFillColor(azul[0], azul[1], azul[2]);
  doc.rect(xTot - 2, finalY + 10, 70, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", xTot, finalY + 16);
  doc.text(formatUSD(datos.total), 210 - margen, finalY + 16, { align: "right" });

  // ── Notas ────────────────────────────────────────────────────────────────
  if (datos.notas) {
    doc.setTextColor(gris[0], gris[1], gris[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Notas: ${datos.notas}`, margen, finalY + 26);
  }

  // ── Pie de página ────────────────────────────────────────────────────────
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Generado por CONTABIA AI — contabia-ai.vercel.app", 105, 290, { align: "center" });

  doc.save(`${tipoEtiqueta(datos.tipo)}_${datos.numero}_${datos.fecha}.pdf`);
}

/**
 * Genera y descarga un recibo de pago de planilla para un empleado.
 */
export function generarReciboPlanillaPDF(params: {
  empresa: EmpresaInfo;
  empleado: string;
  periodo: string;
  salarioBase: number;
  horasExtra: number;
  montoHorasExtra: number;
  otrosIngresos: number;
  totalIngresos: number;
  cssEmpleado: number;
  seguroEducativo: number;
  impuestoRenta: number;
  otrasDeducciones: number;
  totalDeducciones: number;
  salarioNeto: number;
  decimoTercerMes: number;
}): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const azul = [30, 100, 220];
  const negro = [30, 30, 30];
  const gris = [120, 120, 120];
  const margen = 15;

  // Encabezado
  doc.setFillColor(azul[0], azul[1], azul[2]);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(params.empresa.nombreComercial ?? params.empresa.nombre, margen, 12);
  doc.setFontSize(10);
  doc.text("RECIBO DE PAGO DE PLANILLA", 210 - margen, 12, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  if (params.empresa.ruc) doc.text(`RUC: ${params.empresa.ruc}`, margen, 20);

  // Datos del empleado
  doc.setTextColor(negro[0], negro[1], negro[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Empleado: ${params.empleado}`, margen, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Período: ${params.periodo}`, margen, 43);

  // Tabla de ingresos y deducciones
  (doc as any).autoTable({
    startY: 50,
    head: [["Concepto", "Monto"]],
    body: [
      ["Salario base", formatUSD(params.salarioBase)],
      ...(params.horasExtra > 0 ? [[`Horas extra (${params.horasExtra}h)`, formatUSD(params.montoHorasExtra)]] : []),
      ...(params.otrosIngresos > 0 ? [["Otros ingresos", formatUSD(params.otrosIngresos)]] : []),
      ["TOTAL INGRESOS", formatUSD(params.totalIngresos)],
      ["", ""],
      [`CSS empleado (9.75%)`, `-${formatUSD(params.cssEmpleado)}`],
      [`Seguro educativo (1.25%)`, `-${formatUSD(params.seguroEducativo)}`],
      ...(params.impuestoRenta > 0 ? [[`ISR`, `-${formatUSD(params.impuestoRenta)}`]] : []),
      ...(params.otrasDeducciones > 0 ? [["Otras deducciones", `-${formatUSD(params.otrasDeducciones)}`]] : []),
      ["TOTAL DEDUCCIONES", `-${formatUSD(params.totalDeducciones)}`],
      ["", ""],
      ["SALARIO NETO A PAGAR", formatUSD(params.salarioNeto)],
      ["Provisión décimo tercer mes", formatUSD(params.decimoTercerMes)],
    ],
    theme: "striped",
    headStyles: { fillColor: azul, textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontSize: 9, textColor: negro },
    columnStyles: { 1: { halign: "right", cellWidth: 50 } },
    margin: { left: margen, right: margen },
    didParseCell: (data: any) => {
      if (["TOTAL INGRESOS", "TOTAL DEDUCCIONES", "SALARIO NETO A PAGAR"].includes(data.cell.text[0])) {
        data.cell.styles.fontStyle = "bold";
        if (data.cell.text[0] === "SALARIO NETO A PAGAR") {
          data.cell.styles.fillColor = azul;
          data.cell.styles.textColor = [255, 255, 255];
        }
      }
    },
  });

  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.setFontSize(7);
  doc.text("⚠ Este recibo es de referencia. Verificar con la CSS y la DGI antes de realizar pagos oficiales.", 105, 285, { align: "center" });
  doc.text("Generado por CONTABIA AI", 105, 290, { align: "center" });

  doc.save(`Recibo_${params.empleado.replace(/,\s*/g, "_")}_${params.periodo}.pdf`);
}

/**
 * Exporta una lista de datos a CSV y la descarga.
 */
export function exportarCSV(nombre: string, cabeceras: string[], filas: (string | number)[][]): void {
  const todas = [cabeceras, ...filas];
  const csv = todas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
