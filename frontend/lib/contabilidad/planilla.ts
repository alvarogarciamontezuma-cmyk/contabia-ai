/**
 * Motor de cálculo de planilla — República de Panamá
 * Fase D — CONTABIA AI
 *
 * ⚠ ADVERTENCIA LEGAL:
 * Los cálculos de este módulo son de referencia.
 * Deben validarse con un profesional de recursos humanos
 * o abogado laboral antes de usarlos para pagos reales.
 * Las tasas y reglas deben verificarse con la CSS y el MITRADEL.
 *
 * Tasas de referencia (verificar vigencia):
 * - CSS empleado: 9.75% del salario bruto
 * - CSS patronal: 12.25% del salario bruto
 * - Seguro educativo empleado: 1.25%
 * - Seguro educativo patronal: 1.50%
 * - Décimo tercer mes: 1/12 del salario bruto mensual
 * - Horas extra diurnas: 1.25x la hora ordinaria
 * - Horas extra nocturnas: 1.50x la hora ordinaria
 */

export const TASAS_PANAMA = {
  CSS_EMPLEADO: 0.0975,
  CSS_PATRONAL: 0.1225,
  SEG_EDU_EMPLEADO: 0.0125,
  SEG_EDU_PATRONAL: 0.0150,
  DECIMO_TERCER: 1 / 12,
  HORA_EXTRA_DIURNA: 1.25,
  HORA_EXTRA_NOCTURNA: 1.50,
  HORAS_MES: 240,
} as const;

export interface EntradaPlanilla {
  salarioBase: number;
  horasExtra: number;
  tipoHoraExtra: "diurna" | "nocturna";
  otrosIngresos: number;
  otrasDeducciones: number;
}

export interface ResultadoPlanilla {
  salarioBase: number;
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
  // Cargas patronales (referencia)
  cssPatronal: number;
  segEduPatronal: number;
  costoTotalPatronal: number;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula el impuesto sobre la renta mensual (referencia aproximada)
 * Basado en tabla ISR de Panamá para personas naturales.
 * Verificar tabla actualizada con la DGI.
 */
export function calcularISR(salarioAnual: number): number {
  if (salarioAnual <= 11000) return 0;
  if (salarioAnual <= 100000) return redondear((salarioAnual - 11000) * 0.15);
  return redondear(13350 + (salarioAnual - 100000) * 0.25);
}

/**
 * Calcula la planilla completa para un empleado
 */
export function calcularPlanillaEmpleado(entrada: EntradaPlanilla): ResultadoPlanilla {
  const { salarioBase, horasExtra, tipoHoraExtra, otrosIngresos, otrasDeducciones } = entrada;

  // Hora ordinaria
  const valorHoraOrdinaria = redondear(salarioBase / TASAS_PANAMA.HORAS_MES);
  const factorHE = tipoHoraExtra === "nocturna" ? TASAS_PANAMA.HORA_EXTRA_NOCTURNA : TASAS_PANAMA.HORA_EXTRA_DIURNA;
  const montoHorasExtra = redondear(horasExtra * valorHoraOrdinaria * factorHE);

  const totalIngresos = redondear(salarioBase + montoHorasExtra + otrosIngresos);

  // Deducciones del empleado
  const cssEmpleado = redondear(totalIngresos * TASAS_PANAMA.CSS_EMPLEADO);
  const seguroEducativo = redondear(totalIngresos * TASAS_PANAMA.SEG_EDU_EMPLEADO);

  // ISR aproximado (mensual)
  const salarioAnualEstimado = totalIngresos * 12;
  const isrAnual = calcularISR(salarioAnualEstimado);
  const impuestoRenta = redondear(isrAnual / 12);

  const totalDeducciones = redondear(cssEmpleado + seguroEducativo + impuestoRenta + otrasDeducciones);
  const salarioNeto = redondear(totalIngresos - totalDeducciones);

  // Décimo tercer mes (provisión mensual)
  const decimoTercerMes = redondear(salarioBase * TASAS_PANAMA.DECIMO_TERCER);

  // Cargas patronales (costo para la empresa)
  const cssPatronal = redondear(totalIngresos * TASAS_PANAMA.CSS_PATRONAL);
  const segEduPatronal = redondear(totalIngresos * TASAS_PANAMA.SEG_EDU_PATRONAL);
  const costoTotalPatronal = redondear(totalIngresos + cssPatronal + segEduPatronal + decimoTercerMes);

  return {
    salarioBase, montoHorasExtra, otrosIngresos, totalIngresos,
    cssEmpleado, seguroEducativo, impuestoRenta, otrasDeducciones,
    totalDeducciones, salarioNeto, decimoTercerMes,
    cssPatronal, segEduPatronal, costoTotalPatronal,
  };
}
