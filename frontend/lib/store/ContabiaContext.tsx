"use client";

/**
 * Estado global de CONTABIA AI — Fase 3
 * Almacenamiento en memoria (sin base de datos todavía).
 * En fases posteriores este contexto se conectará a Supabase o PostgreSQL.
 */

import { createContext, useContext, useState, ReactNode } from "react";
import type { Empresa, Cuenta } from "@/types/contabilidad";

// ── Datos de demostración ────────────────────────────────────────────────────

const empresasDemo: Empresa[] = [
  {
    id: "emp-001",
    nombre: "Empresa de prueba S.A.",
    ruc: "155-123-456",
    pais: "Panamá",
    moneda: "USD",
    activa: true,
  },
];

const cuentasDemo: Cuenta[] = [
  { id: "c-101", codigo: "1.0.00", nombre: "ACTIVO",            tipo: "activo",     activa: true, creadaEn: new Date() },
  { id: "c-102", codigo: "1.1.01", nombre: "Caja General",      tipo: "activo",     activa: true, creadaEn: new Date() },
  { id: "c-103", codigo: "1.1.02", nombre: "Banco Nacional",    tipo: "activo",     activa: true, creadaEn: new Date() },
  { id: "c-201", codigo: "2.0.00", nombre: "PASIVO",            tipo: "pasivo",     activa: true, creadaEn: new Date() },
  { id: "c-202", codigo: "2.1.01", nombre: "Cuentas por pagar", tipo: "pasivo",     activa: true, creadaEn: new Date() },
  { id: "c-301", codigo: "3.0.00", nombre: "PATRIMONIO",        tipo: "patrimonio", activa: true, creadaEn: new Date() },
  { id: "c-302", codigo: "3.1.01", nombre: "Capital social",    tipo: "patrimonio", activa: true, creadaEn: new Date() },
  { id: "c-401", codigo: "4.0.00", nombre: "INGRESOS",          tipo: "ingreso",    activa: true, creadaEn: new Date() },
  { id: "c-402", codigo: "4.1.01", nombre: "Ventas",            tipo: "ingreso",    activa: true, creadaEn: new Date() },
  { id: "c-501", codigo: "5.0.00", nombre: "GASTOS",            tipo: "gasto",      activa: true, creadaEn: new Date() },
  { id: "c-502", codigo: "5.1.01", nombre: "Gastos generales",  tipo: "gasto",      activa: true, creadaEn: new Date() },
];

// ── Tipos del contexto ───────────────────────────────────────────────────────

interface ContabiaContextType {
  empresas: Empresa[];
  agregarEmpresa: (e: Omit<Empresa, "id">) => void;

  cuentas: Cuenta[];
  agregarCuenta: (c: Omit<Cuenta, "id" | "creadaEn">) => void;
}

const ContabiaContext = createContext<ContabiaContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function ContabiaProvider({ children }: { children: ReactNode }) {
  const [empresas, setEmpresas] = useState<Empresa[]>(empresasDemo);
  const [cuentas, setCuentas] = useState<Cuenta[]>(cuentasDemo);

  function agregarEmpresa(datos: Omit<Empresa, "id">) {
    const nueva: Empresa = {
      ...datos,
      id: `emp-${Date.now()}`,
    };
    setEmpresas((prev) => [...prev, nueva]);
  }

  function agregarCuenta(datos: Omit<Cuenta, "id" | "creadaEn">) {
    const nueva: Cuenta = {
      ...datos,
      id: `c-${Date.now()}`,
      creadaEn: new Date(),
    };
    setCuentas((prev) => [...prev, nueva]);
  }

  return (
    <ContabiaContext.Provider value={{ empresas, agregarEmpresa, cuentas, agregarCuenta }}>
      {children}
    </ContabiaContext.Provider>
  );
}

// ── Hook de acceso ───────────────────────────────────────────────────────────

export function useContabia() {
  const ctx = useContext(ContabiaContext);
  if (!ctx) throw new Error("useContabia debe usarse dentro de ContabiaProvider");
  return ctx;
}
