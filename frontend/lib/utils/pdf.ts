/**
 * Utilidades de generación de PDF — CONTABIA AI
 * Genera documentos profesionales descargables en el cliente.
 * Inspirado en el formato estándar de cotizaciones y facturas de Panamá.
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
  sitioWeb?: string | null;
  pais?: string;
  moneda?: string;
  logoUrl?: string | null;
  // Datos bancarios para el pie de página
  banco?: string | null;
  numeroCuenta?: string | null;
  yappy?: string | null;
}

export interface LineaDocumento {
  codigo?: string | null;
  descripcion: string;
  garantia?: string | null;
  cantidad: number;
  precioUnitario: number;
  itbmsPorcentaje: number;
  subtotal: number;
  itbmsMonto: number;
  total: number;
}

export interface DatosFacturaPDF {
  empresa: EmpresaInfo;
  // Receptor
  clienteNombre?: string | null;
  clienteRuc?: string | null;
  clienteDireccion?: string | null;
  clienteTelefono?: string | null;
  // Documento
  numero: string;
  tipo: string;
  fecha: string;
  fechaVencimiento?: string | null;
  validezDias?: number | null;
  condicionPago?: string | null;
  // Líneas
  lineas: LineaDocumento[];
  // Totales
  subtotal: number;
  descuento?: number;
  itbms: number;
  recargos?: number;
  total: number;
  // Extras
  notas?: string | null;
  observaciones?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, moneda = "USD"): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency", currency: moneda, minimumFractionDigits: 2,
  }).format(n);
}

function tipoEtiqueta(tipo: string): string {
  const mapa: Record<string, string> = {
    factura: "FACTURA", cotizacion: "COTIZACIÓN", recibo: "RECIBO",
  };
  return mapa[tipo] ?? tipo.toUpperCase();
}

function wrap(doc: jsPDF, texto: string, x: number, maxAncho: number): string[] {
  return doc.splitTextToSize(texto, maxAncho) as string[];
}

// ── Generador principal ────────────────────────────────────────────────────

/**
 * Genera y descarga un PDF profesional de factura, cotización o recibo.
 * Incluye logo, datos bancarios, SKU, garantía, desglose ITBMS y condiciones.
 */
export function generarFacturaPDF(datos: DatosFacturaPDF): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const AZUL: [number, number, number]  = [25, 95, 210];
  const AZUL_CLARO: [number, number, number] = [235, 242, 255];
  const NEGRO: [number, number, number] = [25, 25, 25];
  const GRIS: [number, number, number]  = [110, 110, 110];
  const GRIS_CLARO: [number, number, number] = [245, 245, 245];
  const BLANCO: [number, number, number] = [255, 255, 255];
  const margen = 14;
  const anchoDoc = 210;
  const moneda = datos.empresa.moneda ?? "USD";

  // ── 1. Banda de encabezado ──────────────────────────────────────────────
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, anchoDoc, 32, "F");

  // Nombre de la empresa (izquierda)
  doc.setTextColor(...BLANCO);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  const nombreMostrar = datos.empresa.nombreComercial?.trim()
    ? datos.empresa.nombreComercial
    : datos.empresa.nombre;
  doc.text(nombreMostrar, margen, 11);

  // Info de la empresa (segunda línea)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const partes: string[] = [];
  if (datos.empresa.ruc) partes.push(`RUC: ${datos.empresa.ruc}`);
  if (datos.empresa.direccion) partes.push(datos.empresa.direccion);
  if (datos.empresa.telefono) partes.push(`Tel: ${datos.empresa.telefono}`);
  if (datos.empresa.email) partes.push(datos.empresa.email);
  if (datos.empresa.sitioWeb) partes.push(datos.empresa.sitioWeb);
  const linea1 = partes.slice(0, 3).join("   ·   ");
  const linea2 = partes.slice(3).join("   ·   ");
  doc.text(linea1, margen, 19);
  if (linea2) doc.text(linea2, margen, 24);

  // Tipo de documento (derecha, grande)
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(tipoEtiqueta(datos.tipo), anchoDoc - margen, 13, { align: "right" });
  doc.setFontSize(10);
  doc.text(`N° ${datos.numero}`, anchoDoc - margen, 22, { align: "right" });

  // ── 2. Bloque receptor + datos del documento ───────────────────────────
  let y = 38;

  // Caja izquierda: receptor
  doc.setFillColor(...GRIS_CLARO);
  doc.roundedRect(margen, y, 90, 28, 2, 2, "F");
  doc.setTextColor(...GRIS);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURAR A / RECEPTOR", margen + 3, y + 5);
  doc.setTextColor(...NEGRO);
  doc.setFontSize(8.5);
  doc.text(datos.clienteNombre ?? "CONSUMIDOR FINAL", margen + 3, y + 11);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS);
  if (datos.clienteRuc) doc.text(`RUC: ${datos.clienteRuc}`, margen + 3, y + 17);
  if (datos.clienteDireccion) doc.text(datos.clienteDireccion, margen + 3, y + 22);
  if (datos.clienteTelefono) doc.text(`Tel: ${datos.clienteTelefono}`, margen + 3, y + 27);

  // Caja derecha: datos del documento
  doc.setFillColor(...AZUL_CLARO);
  doc.roundedRect(108, y, 88, 28, 2, 2, "F");
  doc.setTextColor(...GRIS);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  const filasDatos: [string, string][] = [
    ["FECHA DE EMISIÓN", datos.fecha],
  ];
  if (datos.fechaVencimiento) filasDatos.push(["VENCIMIENTO", datos.fechaVencimiento]);
  if (datos.validezDias) filasDatos.push(["VÁLIDO", `${datos.validezDias} días calendario`]);
  if (datos.condicionPago) filasDatos.push(["CONDICIÓN DE PAGO", datos.condicionPago]);

  filasDatos.forEach(([lbl, val], i) => {
    const fy = y + 7 + i * 6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS);
    doc.text(lbl, 111, fy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NEGRO);
    doc.text(val, 193, fy, { align: "right" });
  });

  y += 34;

  // ── 3. Tabla de productos/servicios ────────────────────────────────────
  const conCodigo = datos.lineas.some(l => l.codigo);
  const conGarantia = datos.lineas.some(l => l.garantia);

  const cabeceras: string[] = [];
  if (conCodigo) cabeceras.push("Código");
  cabeceras.push("Descripción");
  if (conGarantia) cabeceras.push("Garantía");
  cabeceras.push("Cant.", "P. Unit.", "ITBMS", "Total");

  const filasTabla = datos.lineas.map(l => {
    const fila: string[] = [];
    if (conCodigo) fila.push(l.codigo ?? "");
    fila.push(l.descripcion);
    if (conGarantia) fila.push(l.garantia ?? "");
    fila.push(
      String(l.cantidad),
      fmt(l.precioUnitario, moneda),
      `${l.itbmsPorcentaje}%`,
      fmt(l.total, moneda),
    );
    return fila;
  });

  // Anchos de columnas dinámicos
  const colStyles: Record<number, object> = {};
  let idx = 0;
  if (conCodigo) { colStyles[idx] = { cellWidth: 22, fontSize: 7 }; idx++; }
  colStyles[idx] = { cellWidth: "auto" }; idx++; // descripción
  if (conGarantia) { colStyles[idx] = { cellWidth: 18, halign: "center", fontSize: 7 }; idx++; }
  colStyles[idx] = { cellWidth: 12, halign: "center" }; idx++;
  colStyles[idx] = { cellWidth: 22, halign: "right" }; idx++;
  colStyles[idx] = { cellWidth: 14, halign: "center" }; idx++;
  colStyles[idx] = { cellWidth: 24, halign: "right" }; idx++;

  autoTable(doc, {
    startY: y,
    head: [cabeceras],
    body: filasTabla,
    theme: "grid",
    headStyles: {
      fillColor: AZUL,
      textColor: BLANCO,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: NEGRO,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: GRIS_CLARO },
    columnStyles: colStyles,
    margin: { left: margen, right: margen },
  });

  const tablaFin = (doc as any).lastAutoTable.finalY;
  y = tablaFin + 5;

  // ── 4. Bloque de totales ────────────────────────────────────────────────
  const xIzq = margen;
  const xDer = 130;
  const anchoTot = anchoDoc - margen - xDer;

  // Desglose ITBMS (izquierda)
  doc.setFillColor(...GRIS_CLARO);
  doc.roundedRect(xIzq, y, 85, 28, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRIS);
  doc.text("DESGLOSE ITBMS", xIzq + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...NEGRO);
  const baseItbms = datos.subtotal - (datos.descuento ?? 0);
  doc.text(`Monto Base 7%: ${fmt(baseItbms, moneda)}`, xIzq + 3, y + 13);
  doc.text(`ITBMS 7%: ${fmt(datos.itbms, moneda)}`, xIzq + 3, y + 19);

  // Totales (derecha)
  const filasTotales: [string, number][] = [
    ["Sub-Total:", datos.subtotal],
  ];
  if ((datos.descuento ?? 0) > 0) filasTotales.push(["Descuento:", -(datos.descuento ?? 0)]);
  filasTotales.push(["Total Neto:", datos.subtotal - (datos.descuento ?? 0)]);
  filasTotales.push(["ITBMS:", datos.itbms]);
  if ((datos.recargos ?? 0) > 0) filasTotales.push(["Recargos:", datos.recargos ?? 0]);

  doc.setFontSize(8);
  filasTotales.forEach(([lbl, val], i) => {
    const fy = y + 5 + i * 5.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS);
    doc.text(lbl, xDer + 2, fy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NEGRO);
    doc.text(fmt(Math.abs(val), moneda), anchoDoc - margen, fy, { align: "right" });
  });

  // Banda total general
  const yTotal = y + filasTotales.length * 5.5 + 3;
  doc.setFillColor(...AZUL);
  doc.roundedRect(xDer, yTotal, anchoDoc - margen - xDer, 9, 1, 1, "F");
  doc.setTextColor(...BLANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL GENERAL:", xDer + 3, yTotal + 6);
  doc.text(fmt(datos.total, moneda), anchoDoc - margen, yTotal + 6, { align: "right" });

  y = Math.max(y + 32, yTotal + 14);

  // ── 5. Observaciones y condiciones ────────────────────────────────────
  if (datos.observaciones || datos.notas) {
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(margen, y, anchoDoc - margen * 2, 14, 2, 2, "F");
    doc.setTextColor(...GRIS);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES", margen + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NEGRO);
    const obsTexto = datos.observaciones ?? datos.notas ?? "";
    const obsLineas = wrap(doc, obsTexto, margen + 3, anchoDoc - margen * 2 - 6);
    doc.text(obsLineas.slice(0, 2), margen + 3, y + 10);
    y += 18;
  }

  // ── 6. Datos bancarios / Yappy ─────────────────────────────────────────
  if (datos.empresa.banco || datos.empresa.yappy) {
    doc.setFillColor(...AZUL_CLARO);
    doc.roundedRect(margen, y, anchoDoc - margen * 2, 18, 2, 2, "F");
    doc.setTextColor(...GRIS);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DE PAGO", margen + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NEGRO);
    if (datos.empresa.banco) {
      doc.text(`Banco: ${datos.empresa.banco}`, margen + 3, y + 11);
      if (datos.empresa.numeroCuenta)
        doc.text(`Cuenta: ${datos.empresa.numeroCuenta}`, margen + 3, y + 16);
    }
    if (datos.empresa.yappy) {
      doc.setFont("helvetica", "bold");
      doc.text(`Yappy: ${datos.empresa.yappy}`, 120, y + 11);
    }
    y += 22;
  }

  // ── 7. Validez (cotizaciones) ─────────────────────────────────────────
  if (datos.tipo === "cotizacion" && datos.fechaVencimiento) {
    doc.setTextColor(...GRIS);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(
      `* Esta cotización es válida hasta el ${datos.fechaVencimiento}. Precios sujetos a cambio sin previo aviso una vez vencida.`,
      margen, y
    );
    y += 5;
    doc.text("* Productos sujetos a disponibilidad de inventario al momento de la orden de compra.", margen, y);
    y += 5;
  }

  // ── 8. Pie de página ──────────────────────────────────────────────────
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.5);
  doc.line(margen, 287, anchoDoc - margen, 287);
  doc.setTextColor(...GRIS);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Documento generado por CONTABIA AI — contabia-ai.vercel.app`,
    anchoDoc / 2, 291, { align: "center" }
  );

  doc.save(`${tipoEtiqueta(datos.tipo)}_${datos.numero}.pdf`);
}

// ── Recibo de planilla ────────────────────────────────────────────────────

export function generarReciboPlanillaPDF(params: {
  empresa: EmpresaInfo;
  empleado: string;
  cedula?: string;
  cargo?: string;
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
  const AZUL: [number, number, number] = [25, 95, 210];
  const NEGRO: [number, number, number] = [25, 25, 25];
  const GRIS: [number, number, number] = [110, 110, 110];
  const GRIS_CLARO: [number, number, number] = [245, 245, 245];
  const BLANCO: [number, number, number] = [255, 255, 255];
  const margen = 14;

  // Encabezado
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(params.empresa.nombreComercial ?? params.empresa.nombre, margen, 12);
  doc.setFontSize(11);
  doc.text("RECIBO DE PAGO", 196, 12, { align: "right" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const infoEmp = [
    params.empresa.ruc ? `RUC: ${params.empresa.ruc}` : null,
    params.empresa.direccion,
    params.empresa.telefono,
  ].filter(Boolean).join("   ·   ");
  doc.text(infoEmp, margen, 20);
  doc.setFontSize(8.5);
  doc.text(`Período: ${params.periodo}`, 196, 22, { align: "right" });

  // Datos del empleado
  doc.setFillColor(...GRIS_CLARO);
  doc.roundedRect(margen, 35, 182, 16, 2, 2, "F");
  doc.setTextColor(...NEGRO);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(params.empleado, margen + 3, 43);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  const datosEmpleado = [
    params.cedula ? `Cédula: ${params.cedula}` : null,
    params.cargo ?? null,
  ].filter(Boolean).join("   ·   ");
  if (datosEmpleado) doc.text(datosEmpleado, margen + 3, 48);

  // Tabla
  autoTable(doc, {
    startY: 56,
    head: [["CONCEPTO", "MONTO"]],
    body: [
      ["INGRESOS", ""],
      ["Salario base", fmt(params.salarioBase)],
      ...(params.horasExtra > 0 ? [[`Horas extra (${params.horasExtra} hrs)`, fmt(params.montoHorasExtra)]] : []),
      ...(params.otrosIngresos > 0 ? [["Otros ingresos", fmt(params.otrosIngresos)]] : []),
      ["TOTAL INGRESOS", fmt(params.totalIngresos)],
      ["", ""],
      ["DEDUCCIONES", ""],
      [`CSS empleado (9.75%)`, `-${fmt(params.cssEmpleado)}`],
      [`Seguro educativo (1.25%)`, `-${fmt(params.seguroEducativo)}`],
      ...(params.impuestoRenta > 0 ? [["ISR (Impuesto sobre la renta)", `-${fmt(params.impuestoRenta)}`]] : []),
      ...(params.otrasDeducciones > 0 ? [["Otras deducciones", `-${fmt(params.otrasDeducciones)}`]] : []),
      ["TOTAL DEDUCCIONES", `-${fmt(params.totalDeducciones)}`],
      ["", ""],
      ["SALARIO NETO A PAGAR", fmt(params.salarioNeto)],
      ["Provisión décimo tercer mes (referencia)", fmt(params.decimoTercerMes)],
    ],
    theme: "grid",
    headStyles: { fillColor: AZUL, textColor: BLANCO, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: NEGRO },
    alternateRowStyles: { fillColor: GRIS_CLARO },
    columnStyles: { 1: { halign: "right", cellWidth: 45 } },
    margin: { left: margen, right: margen },
    didParseCell: (data: any) => {
      const texto = data.cell.text[0];
      if (["INGRESOS", "DEDUCCIONES"].includes(texto)) {
        data.cell.styles.fillColor = [200, 215, 245];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [25, 95, 210];
      }
      if (["TOTAL INGRESOS", "TOTAL DEDUCCIONES"].includes(texto)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = GRIS_CLARO;
      }
      if (texto === "SALARIO NETO A PAGAR") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = AZUL;
        data.cell.styles.textColor = BLANCO;
        data.cell.styles.fontSize = 9;
      }
    },
  });

  // Pie
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.5);
  doc.line(margen, 287, 196, 287);
  doc.setTextColor(...GRIS);
  doc.setFontSize(6.5);
  doc.text(
    "⚠ Este recibo es de referencia. Verificar tasas con la CSS y la DGI antes de realizar pagos oficiales.",
    105, 291, { align: "center" }
  );

  doc.save(`Recibo_${params.empleado.replace(/[,\s]+/g, "_")}_${params.periodo}.pdf`);
}

// ── Exportar CSV ──────────────────────────────────────────────────────────

export function exportarCSV(
  nombre: string,
  cabeceras: string[],
  filas: (string | number)[][]
): void {
  const todas = [cabeceras, ...filas];
  const csv = todas
    .map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
