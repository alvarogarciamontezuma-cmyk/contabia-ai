/**
 * Módulo ITBMS — Panamá
 * Fase 12
 *
 * ADVERTENCIA: Este módulo es informativo y de apoyo.
 * Los cálculos fiscales deben validarse con un contador
 * o abogado tributario competente antes de usarlos
 * con clientes reales o presentarlos a la DGI.
 *
 * Fuente de referencia: Ley 76 de 1976 y sus modificaciones.
 * Tasa general vigente: 7%
 * Tasas especiales: 10% (alcohol, tabaco), 15% (productos de lujo)
 */

export const TASAS_ITBMS = {
  general:  0.07,  // 7% — tasa general
  especial: 0.10,  // 10% — alcohol, tabaco
  lujo:     0.15,  // 15% — productos de lujo
  exento:   0.00,  // 0% — exento de ITBMS
} as const;

export type TasaITBMS = keyof typeof TASAS_ITBMS;

export const ETIQUETAS_TASA: Record<TasaITBMS, string> = {
  general:  "7% — General",
  especial: "10% — Especial (alcohol/tabaco)",
  lujo:     "15% — Lujo",
  exento:   "Exento",
};

export interface CalculoITBMS {
  subtotal: number;
  tasa: TasaITBMS;
  porcentaje: number;
  montoITBMS: number;
  total: number;
}

/**
 * Calcula el ITBMS sobre un monto base
 */
export function calcularITBMS(subtotal: number, tasa: TasaITBMS = "general"): CalculoITBMS {
  const porcentaje = TASAS_ITBMS[tasa];
  const montoITBMS = Math.round(subtotal * porcentaje * 100) / 100;
  const total = Math.round((subtotal + montoITBMS) * 100) / 100;
  return { subtotal, tasa, porcentaje, montoITBMS, total };
}

/**
 * Extrae el ITBMS de un monto que ya incluye el impuesto
 */
export function extraerITBMS(totalConImpuesto: number, tasa: TasaITBMS = "general"): CalculoITBMS {
  const porcentaje = TASAS_ITBMS[tasa];
  const subtotal = Math.round((totalConImpuesto / (1 + porcentaje)) * 100) / 100;
  const montoITBMS = Math.round((totalConImpuesto - subtotal) * 100) / 100;
  return { subtotal, tasa, porcentaje, montoITBMS, total: totalConImpuesto };
}

/**
 * Resumen de ITBMS para un período
 */
export interface ResumenITBMS {
  itbmsCobrado: number;   // ITBMS en ventas (débito fiscal)
  itbmsPagado: number;    // ITBMS en compras (crédito fiscal)
  saldoFavor: number;     // itbmsCobrado - itbmsPagado (positivo = pagar a DGI)
}

export function calcularResumenITBMS(
  ventas: { monto: number; tasa: TasaITBMS }[],
  compras: { monto: number; tasa: TasaITBMS }[]
): ResumenITBMS {
  const itbmsCobrado = ventas.reduce((s, v) => s + calcularITBMS(v.monto, v.tasa).montoITBMS, 0);
  const itbmsPagado = compras.reduce((s, c) => s + calcularITBMS(c.monto, c.tasa).montoITBMS, 0);
  const saldoFavor = Math.round((itbmsCobrado - itbmsPagado) * 100) / 100;
  return { itbmsCobrado, itbmsPagado, saldoFavor };
}
