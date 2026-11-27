// Utilidades de generacion de PDF - CONTABIA AI
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
  clienteNombre?: string | null;
  clienteRuc?: string | null;
  clienteDireccion?: string | null;
  clienteTelefono?: string | null;
  numero: string;
  tipo: string;
  fecha: string;
  fechaVencimiento?: string | null;
  validezDias?: number | null;
  condicionPago?: string | null;
  lineas: LineaDocumento[];
  subtotal: number;
  descuento?: number;
  itbms: number;
  recargos?: number;
  total: number;
  notas?: string | null;
  observaciones?: string | null;
}

function fmt(n: number, moneda: string = "USD"): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(n);
}

function tipoLabel(tipo: string): string {
  if (tipo === "factura") return "FACTURA";
  if (tipo === "cotizacion") return "COTIZACION";
  if (tipo === "recibo") return "RECIBO";
  return tipo.toUpperCase();
}

function formatFecha(fecha: string): string {
  // mm/dd/yyyy -> dd/mm/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
    const p = fecha.split("/");
    return p[1].padStart(2, "0") + "/" + p[0].padStart(2, "0") + "/" + p[2];
  }
  // yyyy-mm-dd -> dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const p = fecha.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  return fecha;
}

export function generarFacturaPDF(datos: DatosFacturaPDF): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const AZUL: [number, number, number] = [25, 95, 210];
  const AZUL_CLARO: [number, number, number] = [235, 242, 255];
  const NEGRO: [number, number, number] = [25, 25, 25];
  const GRIS: [number, number, number] = [110, 110, 110];
  const GRIS_CLARO: [number, number, number] = [245, 245, 245];
  const BLANCO: [number, number, number] = [255, 255, 255];
  const margen = 14;
  const anchoDoc = 210;
  const moneda = datos.empresa.moneda || "USD";

  const fechaDoc = formatFecha(datos.fecha);
  const fechaVenc = datos.fechaVencimiento ? formatFecha(datos.fechaVencimiento) : null;

  // Encabezado
  doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
  doc.rect(0, 0, anchoDoc, 32, "F");

  let xTexto = margen;
  if (datos.empresa.logoUrl) {
    try {
      doc.addImage(datos.empresa.logoUrl, "PNG", margen, 3, 24, 24);
      xTexto = margen + 28;
    } catch (_e) {
      // continuar sin logo
    }
  }

  doc.setTextColor(BLANCO[0], BLANCO[1], BLANCO[2]);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  const nombreMostrar = (datos.empresa.nombreComercial && datos.empresa.nombreComercial.trim())
    ? datos.empresa.nombreComercial
    : datos.empresa.nombre;
  doc.text(nombreMostrar, xTexto, 11);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const partes: string[] = [];
  if (datos.empresa.ruc) partes.push("RUC: " + datos.empresa.ruc);
  if (datos.empresa.direccion) partes.push(datos.empresa.direccion);
  if (datos.empresa.telefono) partes.push("Tel: " + datos.empresa.telefono);
  if (datos.empresa.email) partes.push(datos.empresa.email);
  if (datos.empresa.sitioWeb) partes.push(datos.empresa.sitioWeb);
  if (partes.length > 0) doc.text(partes.slice(0, 3).join("   |   "), xTexto, 19);
  if (partes.length > 3) doc.text(partes.slice(3).join("   |   "), xTexto, 24);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(tipoLabel(datos.tipo), anchoDoc - margen, 13, { align: "right" });
  doc.setFontSize(10);
  doc.text("N " + datos.numero, anchoDoc - margen, 22, { align: "right" });

  // Receptor
  let y = 38;
  doc.setFillColor(GRIS_CLARO[0], GRIS_CLARO[1], GRIS_CLARO[2]);
  doc.roundedRect(margen, y, 90, 28, 2, 2, "F");
  doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURAR A / RECEPTOR", margen + 3, y + 5);
  doc.setTextColor(NEGRO[0], NEGRO[1], NEGRO[2]);
  doc.setFontSize(8.5);
  doc.text(datos.clienteNombre || "CONSUMIDOR FINAL", margen + 3, y + 11);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
  if (datos.clienteRuc) doc.text("RUC: " + datos.clienteRuc, margen + 3, y + 17);
  if (datos.clienteDireccion) doc.text(datos.clienteDireccion, margen + 3, y + 22);
  if (datos.clienteTelefono) doc.text("Tel: " + datos.clienteTelefono, margen + 3, y + 27);

  // Datos del documento
  doc.setFillColor(AZUL_CLARO[0], AZUL_CLARO[1], AZUL_CLARO[2]);
  doc.roundedRect(108, y, 88, 28, 2, 2, "F");

  const datosFila: Array<[string, string]> = [["FECHA DE EMISION", fechaDoc]];
  if (fechaVenc) datosFila.push(["VENCIMIENTO", fechaVenc]);
  if (datos.validezDias) datosFila.push(["VALIDO", datos.validezDias + " dias calendario"]);
  if (datos.condicionPago) datosFila.push(["CONDICION DE PAGO", datos.condicionPago]);

  datosFila.forEach(function([lbl, val], i) {
    const fy = y + 7 + i * 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.text(lbl, 111, fy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(NEGRO[0], NEGRO[1], NEGRO[2]);
    doc.text(val, 193, fy, { align: "right" });
  });

  y += 34;

  // Tabla de lineas
  const conCodigo = datos.lineas.some(function(l) { return !!l.codigo; });
  const conGarantia = datos.lineas.some(function(l) { return !!l.garantia; });

  const cabeceras: string[] = [];
  if (conCodigo) cabeceras.push("Codigo");
  cabeceras.push("Descripcion");
  if (conGarantia) cabeceras.push("Garantia");
  cabeceras.push("Cant.", "P. Unit.", "ITBMS", "Total");

  const filasTabla = datos.lineas.map(function(l) {
    const fila: string[] = [];
    if (conCodigo) fila.push(l.codigo || "");
    fila.push(l.descripcion);
    if (conGarantia) fila.push(l.garantia || "");
    fila.push(String(l.cantidad));
    fila.push(fmt(l.precioUnitario, moneda));
    fila.push(l.itbmsPorcentaje + "%");
    fila.push(fmt(l.total, moneda));
    return fila;
  });

  const colStyles: Record<number, object> = {};
  let idx = 0;
  if (conCodigo) { colStyles[idx] = { cellWidth: 22, fontSize: 7 }; idx++; }
  colStyles[idx] = { cellWidth: "auto" }; idx++;
  if (conGarantia) { colStyles[idx] = { cellWidth: 18, halign: "center", fontSize: 7 }; idx++; }
  colStyles[idx] = { cellWidth: 14, halign: "center" }; idx++;
  colStyles[idx] = { cellWidth: 24, halign: "right" }; idx++;
  colStyles[idx] = { cellWidth: 14, halign: "center" }; idx++;
  colStyles[idx] = { cellWidth: 24, halign: "right" }; idx++;

  autoTable(doc, {
    startY: y,
    head: [cabeceras],
    body: filasTabla,
    theme: "grid",
    headStyles: { fillColor: AZUL, textColor: BLANCO, fontStyle: "bold", fontSize: 7.5, cellPadding: 3 },
    bodyStyles: { fontSize: 7.5, textColor: NEGRO, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: GRIS_CLARO },
    columnStyles: colStyles,
    margin: { left: margen, right: margen },
  });

  const tablaFin = (doc as any).lastAutoTable.finalY;
  y = tablaFin + 5;

  // Totales
  const xDer = 130;
  const baseItbms = datos.subtotal - (datos.descuento || 0);

  doc.setFillColor(GRIS_CLARO[0], GRIS_CLARO[1], GRIS_CLARO[2]);
  doc.roundedRect(margen, y, 85, 28, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
  doc.text("DESGLOSE ITBMS", margen + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(NEGRO[0], NEGRO[1], NEGRO[2]);
  doc.text("Monto Base 7%: " + fmt(baseItbms, moneda), margen + 3, y + 13);
  doc.text("ITBMS 7%: " + fmt(datos.itbms, moneda), margen + 3, y + 19);

  const filasTot: Array<[string, number]> = [["Sub-Total:", datos.subtotal]];
  if ((datos.descuento || 0) > 0) filasTot.push(["Descuento:", -(datos.descuento || 0)]);
  filasTot.push(["Total Neto:", datos.subtotal - (datos.descuento || 0)]);
  filasTot.push(["ITBMS:", datos.itbms]);
  if ((datos.recargos || 0) > 0) filasTot.push(["Recargos:", datos.recargos || 0]);

  doc.setFontSize(8);
  filasTot.forEach(function([lbl, val], i) {
    const fy = y + 5 + i * 5.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.text(lbl, xDer + 2, fy);
    doc.setTextColor(NEGRO[0], NEGRO[1], NEGRO[2]);
    doc.text(fmt(Math.abs(val), moneda), anchoDoc - margen, fy, { align: "right" });
  });

  const yTotal = y + filasTot.length * 5.5 + 3;
  doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
  doc.roundedRect(xDer, yTotal, anchoDoc - margen - xDer, 9, 1, 1, "F");
  doc.setTextColor(BLANCO[0], BLANCO[1], BLANCO[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL GENERAL:", xDer + 3, yTotal + 6);
  doc.text(fmt(datos.total, moneda), anchoDoc - margen, yTotal + 6, { align: "right" });

  y = Math.max(y + 32, yTotal + 14);

  // Observaciones
  const obsTexto = datos.observaciones || datos.notas || "";
  if (obsTexto) {
    doc.setFillColor(GRIS_CLARO[0], GRIS_CLARO[1], GRIS_CLARO[2]);
    doc.roundedRect(margen, y, anchoDoc - margen * 2, 14, 2, 2, "F");
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES", margen + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(NEGRO[0], NEGRO[1], NEGRO[2]);
    const lineasObs = doc.splitTextToSize(obsTexto, anchoDoc - margen * 2 - 6) as string[];
    doc.text(lineasObs.slice(0, 2), margen + 3, y + 10);
    y += 18;
  }

  // Datos bancarios
  if (datos.empresa.banco || datos.empresa.yappy) {
    doc.setFillColor(AZUL_CLARO[0], AZUL_CLARO[1], AZUL_CLARO[2]);
    doc.roundedRect(margen, y, anchoDoc - margen * 2, 18, 2, 2, "F");
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACION DE PAGO", margen + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(NEGRO[0], NEGRO[1], NEGRO[2]);
    if (datos.empresa.banco) {
      doc.text("Banco: " + datos.empresa.banco, margen + 3, y + 11);
      if (datos.empresa.numeroCuenta) {
        doc.text("Cuenta: " + datos.empresa.numeroCuenta, margen + 3, y + 16);
      }
    }
    if (datos.empresa.yappy) {
      doc.setFont("helvetica", "bold");
      doc.text("Yappy: @" + datos.empresa.yappy.replace(/^@/, ""), 120, y + 11);
    }
    y += 22;
  }

  // Validez cotizacion
  if (datos.tipo === "cotizacion" && fechaVenc) {
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("* Cotizacion valida hasta el " + fechaVenc + ". Precios sujetos a cambio sin previo aviso.", margen, y);
    y += 5;
    doc.text("* Productos sujetos a disponibilidad de inventario al momento de la orden de compra.", margen, y);
  }

  // Pie
  doc.setDrawColor(AZUL[0], AZUL[1], AZUL[2]);
  doc.setLineWidth(0.5);
  doc.line(margen, 287, anchoDoc - margen, 287);
  doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Documento generado por CONTABIA AI - contabia-ai.vercel.app", anchoDoc / 2, 291, { align: "center" });

  doc.save(tipoLabel(datos.tipo) + "_" + datos.numero + ".pdf");
}

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

  doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(BLANCO[0], BLANCO[1], BLANCO[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text((params.empresa.nombreComercial || params.empresa.nombre), margen, 12);
  doc.setFontSize(11);
  doc.text("RECIBO DE PAGO", 196, 12, { align: "right" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const infoEmp: string[] = [];
  if (params.empresa.ruc) infoEmp.push("RUC: " + params.empresa.ruc);
  if (params.empresa.direccion) infoEmp.push(params.empresa.direccion);
  if (params.empresa.telefono) infoEmp.push(params.empresa.telefono);
  if (infoEmp.length > 0) doc.text(infoEmp.join("   |   "), margen, 20);
  doc.setFontSize(8.5);
  doc.text("Periodo: " + params.periodo, 196, 22, { align: "right" });

  doc.setFillColor(GRIS_CLARO[0], GRIS_CLARO[1], GRIS_CLARO[2]);
  doc.roundedRect(margen, 35, 182, 16, 2, 2, "F");
  doc.setTextColor(NEGRO[0], NEGRO[1], NEGRO[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(params.empleado, margen + 3, 43);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
  const datosEmp: string[] = [];
  if (params.cedula) datosEmp.push("Cedula: " + params.cedula);
  if (params.cargo) datosEmp.push(params.cargo);
  if (datosEmp.length > 0) doc.text(datosEmp.join("   |   "), margen + 3, 48);

  const bodyPlanilla: string[][] = [
    ["INGRESOS", ""],
    ["Salario base", fmt(params.salarioBase)],
  ];
  if (params.horasExtra > 0) {
    bodyPlanilla.push(["Horas extra (" + params.horasExtra + " hrs)", fmt(params.montoHorasExtra)]);
  }
  if (params.otrosIngresos > 0) {
    bodyPlanilla.push(["Otros ingresos", fmt(params.otrosIngresos)]);
  }
  bodyPlanilla.push(["TOTAL INGRESOS", fmt(params.totalIngresos)]);
  bodyPlanilla.push(["", ""]);
  bodyPlanilla.push(["DEDUCCIONES", ""]);
  bodyPlanilla.push(["CSS empleado (9.75%)", "-" + fmt(params.cssEmpleado)]);
  bodyPlanilla.push(["Seguro educativo (1.25%)", "-" + fmt(params.seguroEducativo)]);
  if (params.impuestoRenta > 0) {
    bodyPlanilla.push(["ISR (Impuesto sobre la renta)", "-" + fmt(params.impuestoRenta)]);
  }
  if (params.otrasDeducciones > 0) {
    bodyPlanilla.push(["Otras deducciones", "-" + fmt(params.otrasDeducciones)]);
  }
  bodyPlanilla.push(["TOTAL DEDUCCIONES", "-" + fmt(params.totalDeducciones)]);
  bodyPlanilla.push(["", ""]);
  bodyPlanilla.push(["SALARIO NETO A PAGAR", fmt(params.salarioNeto)]);
  bodyPlanilla.push(["Provision decimo tercer mes (referencia)", fmt(params.decimoTercerMes)]);

  autoTable(doc, {
    startY: 56,
    head: [["CONCEPTO", "MONTO"]],
    body: bodyPlanilla,
    theme: "grid",
    headStyles: { fillColor: AZUL, textColor: BLANCO, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: NEGRO },
    alternateRowStyles: { fillColor: GRIS_CLARO },
    columnStyles: { 1: { halign: "right", cellWidth: 45 } },
    margin: { left: margen, right: margen },
    didParseCell: function(data: any) {
      const texto = data.cell.text[0];
      if (texto === "INGRESOS" || texto === "DEDUCCIONES") {
        data.cell.styles.fillColor = [200, 215, 245];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [25, 95, 210];
      }
      if (texto === "TOTAL INGRESOS" || texto === "TOTAL DEDUCCIONES") {
        data.cell.styles.fontStyle = "bold";
      }
      if (texto === "SALARIO NETO A PAGAR") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = AZUL;
        data.cell.styles.textColor = BLANCO;
        data.cell.styles.fontSize = 9;
      }
    },
  });

  doc.setDrawColor(AZUL[0], AZUL[1], AZUL[2]);
  doc.setLineWidth(0.5);
  doc.line(margen, 287, 196, 287);
  doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
  doc.setFontSize(6.5);
  doc.text("Este recibo es de referencia. Verificar tasas con la CSS y la DGI antes de realizar pagos oficiales.", 105, 291, { align: "center" });

  doc.save("Recibo_" + params.empleado.replace(/[,\s]+/g, "_") + "_" + params.periodo + ".pdf");
}

export function exportarCSV(
  nombre: string,
  cabeceras: string[],
  filas: Array<Array<string | number>>
): void {
  const todas = [cabeceras, ...filas];
  const csv = todas.map(function(f) {
    return f.map(function(v) {
      return '"' + String(v).replace(/"/g, '""') + '"';
    }).join(",");
  }).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre + "_" + new Date().toISOString().split("T")[0] + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}
