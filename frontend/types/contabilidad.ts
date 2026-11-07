/**
 * Tipos base del motor contable de CONTABIA AI
 * Fase 1 — Estructura inicial
 * 
 * Estos tipos son la base del sistema de partida doble.
 * Ningún cálculo fiscal o legal debe considerarse definitivo
 * sin validación de un profesional competente.
 */

// Tipo de cuenta contable según partida doble
export type TipoCuenta =
  | "activo"
  | "pasivo"
  | "patrimonio"
  | "ingreso"
  | "gasto";

// Cuenta del plan de cuentas
export interface Cuenta {
  id: string;
  codigo: string;        // Ej: "1.1.01"
  nombre: string;        // Ej: "Caja General"
  tipo: TipoCuenta;
  descripcion?: string;
  activa: boolean;
  creadaEn: Date;
}

// Línea individual de un asiento contable
export interface LineaAsiento {
  cuentaId: string;
  descripcion: string;
  debito: number;
  credito: number;
}

// Asiento contable completo (partida doble)
export interface Asiento {
  id: string;
  fecha: Date;
  descripcion: string;
  lineas: LineaAsiento[];
  confirmado: boolean;
  creadoEn: Date;
  creadoPor: string;
}

// Empresa (para separación de datos por cliente)
export interface Empresa {
  id: string;
  nombre: string;
  ruc?: string;          // Registro Único del Contribuyente (Panamá)
  pais: string;
  moneda: string;        // Ej: "USD"
  activa: boolean;
}
