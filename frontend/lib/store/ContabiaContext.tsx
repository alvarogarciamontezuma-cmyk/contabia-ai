"use client";

/**
 * Estado global de CONTABIA AI — Fase 5
 * Datos persistentes en Supabase (PostgreSQL en la nube).
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Empresa, Cuenta, Asiento } from "@/types/contabilidad";

// ── Tipos del contexto ───────────────────────────────────────────────────────

interface ContabiaContextType {
  empresas: Empresa[];
  cargandoEmpresas: boolean;
  agregarEmpresa: (e: Omit<Empresa, "id">) => Promise<void>;

  cuentas: Cuenta[];
  cargandoCuentas: boolean;
  agregarCuenta: (c: Omit<Cuenta, "id" | "creadaEn">) => Promise<void>;

  asientos: Asiento[];
  cargandoAsientos: boolean;
  agregarAsiento: (a: Omit<Asiento, "id" | "creadoEn">) => Promise<void>;

  error: string | null;
}

const ContabiaContext = createContext<ContabiaContextType | null>(null);

// ── Mappers: convertir filas de Supabase a tipos internos ────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmpresa(row: any): Empresa {
  return {
    id: row.id,
    nombre: row.nombre,
    ruc: row.ruc ?? undefined,
    pais: row.pais,
    moneda: row.moneda,
    activa: row.activa,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCuenta(row: any): Cuenta {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    tipo: row.tipo,
    descripcion: row.descripcion ?? undefined,
    activa: row.activa,
    creadaEn: new Date(row.creada_en),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAsiento(row: any): Asiento {
  return {
    id: row.id,
    fecha: new Date(row.fecha),
    descripcion: row.descripcion,
    confirmado: row.confirmado,
    creadoPor: row.creado_por,
    creadoEn: new Date(row.creado_en),
    lineas: (row.lineas_asiento ?? []).map((l: any) => ({
      cuentaId: l.cuenta_id,
      descripcion: l.descripcion,
      debito: Number(l.debito),
      credito: Number(l.credito),
    })),
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ContabiaProvider({ children }: { children: ReactNode }) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [cargandoCuentas, setCargandoCuentas] = useState(true);
  const [cargandoAsientos, setCargandoAsientos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar empresas
  useEffect(() => {
    supabase
      .from("empresas")
      .select("*")
      .order("creada_en", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError("Error cargando empresas: " + error.message);
        else setEmpresas((data ?? []).map(mapEmpresa));
        setCargandoEmpresas(false);
      });
  }, []);

  // Cargar cuentas
  useEffect(() => {
    supabase
      .from("cuentas")
      .select("*")
      .order("codigo", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError("Error cargando cuentas: " + error.message);
        else setCuentas((data ?? []).map(mapCuenta));
        setCargandoCuentas(false);
      });
  }, []);

  // Cargar asientos con sus líneas
  useEffect(() => {
    supabase
      .from("asientos")
      .select("*, lineas_asiento(*)")
      .order("fecha", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("Error cargando asientos: " + error.message);
        else setAsientos((data ?? []).map(mapAsiento));
        setCargandoAsientos(false);
      });
  }, []);

  async function agregarEmpresa(datos: Omit<Empresa, "id">) {
    const { data, error } = await supabase
      .from("empresas")
      .insert({ nombre: datos.nombre, ruc: datos.ruc ?? null, pais: datos.pais, moneda: datos.moneda, activa: datos.activa })
      .select()
      .single();
    if (error) { setError("Error guardando empresa: " + error.message); return; }
    setEmpresas((prev) => [...prev, mapEmpresa(data)]);
  }

  async function agregarCuenta(datos: Omit<Cuenta, "id" | "creadaEn">) {
    const { data, error } = await supabase
      .from("cuentas")
      .insert({ codigo: datos.codigo, nombre: datos.nombre, tipo: datos.tipo, descripcion: datos.descripcion ?? null, activa: datos.activa })
      .select()
      .single();
    if (error) { setError("Error guardando cuenta: " + error.message); return; }
    setCuentas((prev) => [...prev, mapCuenta(data)]);
  }

  async function agregarAsiento(datos: Omit<Asiento, "id" | "creadoEn">) {
    // 1. Insertar el asiento
    const { data: asiento, error: errAsiento } = await supabase
      .from("asientos")
      .insert({
        fecha: datos.fecha.toISOString().split("T")[0],
        descripcion: datos.descripcion,
        confirmado: datos.confirmado,
        creado_por: datos.creadoPor,
      })
      .select()
      .single();

    if (errAsiento) { setError("Error guardando asiento: " + errAsiento.message); return; }

    // 2. Insertar las líneas
    const lineas = datos.lineas.map((l) => ({
      asiento_id: asiento.id,
      cuenta_id: l.cuentaId,
      descripcion: l.descripcion,
      debito: l.debito,
      credito: l.credito,
    }));

    const { error: errLineas } = await supabase.from("lineas_asiento").insert(lineas);
    if (errLineas) { setError("Error guardando líneas: " + errLineas.message); return; }

    // 3. Actualizar estado local
    const nuevoAsiento: Asiento = {
      ...mapAsiento(asiento),
      lineas: datos.lineas,
    };
    setAsientos((prev) => [nuevoAsiento, ...prev]);
  }

  return (
    <ContabiaContext.Provider value={{
      empresas, cargandoEmpresas, agregarEmpresa,
      cuentas, cargandoCuentas, agregarCuenta,
      asientos, cargandoAsientos, agregarAsiento,
      error,
    }}>
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
