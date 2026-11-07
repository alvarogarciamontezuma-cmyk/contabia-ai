/**
 * Motor contable de CONTABIA AI
 * Fase 4 — Validación de partida doble
 *
 * Regla fundamental: en todo asiento, la suma de débitos
 * debe ser exactamente igual a la suma de créditos.
 *
 * Este motor funciona de forma independiente a la IA.
 * Ningún asiento puede registrarse sin pasar estas validaciones.
 */

import type { LineaAsiento } from "@/types/contabilidad";

// Redondear a 2 decimales para evitar errores de punto flotante
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
  totalDebitos: number;
  totalCreditos: number;
  diferencia: number;
}

/**
 * Valida que un conjunto de líneas cumple la partida doble.
 * Retorna el resultado con los totales y los errores encontrados.
 */
export function validarPartidaDoble(lineas: LineaAsiento[]): ResultadoValidacion {
  const errores: string[] = [];

  if (!lineas || lineas.length === 0) {
    return { valido: false, errores: ["El asiento debe tener al menos una línea."], totalDebitos: 0, totalCreditos: 0, diferencia: 0 };
  }

  if (lineas.length < 2) {
    errores.push("Un asiento de partida doble requiere al menos 2 líneas.");
  }

  // Validar cada línea
  lineas.forEach((linea, i) => {
    const num = i + 1;
    if (!linea.cuentaId) {
      errores.push(`Línea ${num}: debe seleccionar una cuenta.`);
    }
    if (linea.debito < 0 || linea.credito < 0) {
      errores.push(`Línea ${num}: los valores no pueden ser negativos.`);
    }
    if (linea.debito === 0 && linea.credito === 0) {
      errores.push(`Línea ${num}: debe ingresar un monto en débito o crédito.`);
    }
    if (linea.debito > 0 && linea.credito > 0) {
      errores.push(`Línea ${num}: una línea no puede tener débito y crédito al mismo tiempo.`);
    }
  });

  const totalDebitos = redondear(lineas.reduce((s, l) => s + (l.debito || 0), 0));
  const totalCreditos = redondear(lineas.reduce((s, l) => s + (l.credito || 0), 0));
  const diferencia = redondear(Math.abs(totalDebitos - totalCreditos));

  if (totalDebitos === 0 && totalCreditos === 0) {
    errores.push("El asiento no tiene montos.");
  } else if (diferencia !== 0) {
    errores.push(
      `Partida doble no cuadra: débitos (${totalDebitos.toFixed(2)}) ≠ créditos (${totalCreditos.toFixed(2)}). Diferencia: ${diferencia.toFixed(2)}.`
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    totalDebitos,
    totalCreditos,
    diferencia,
  };
}

/**
 * Formatea un número como moneda USD
 */
export function formatearMoneda(valor: number, moneda = "USD"): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(valor);
}
