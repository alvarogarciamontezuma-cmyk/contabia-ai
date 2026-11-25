"use client";

/**
 * Estado global de CONTABIA AI — Fase 9
 * Separación de datos por empresa con RLS en Supabase.
 * Cada usuario solo ve los datos de su empresa.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Empresa, Cuenta, Asiento } from "@/types/contabilidad";

// ── Tipos del contexto ───────────────────────────────────────────────────────

interface ContabiaContextType {
  empresaActual: Empresa | null;
  empresas: Empresa[];
  cargandoEmpresas: boolean;
  agregarEmpresa: (e: Omit<Empresa, "id">) => Promise<void>;
  seleccionarEmpresa: (empresa: Empresa) => void;

  cuentas: Cuenta[];
  cargandoCuentas: boolean;
  agregarCuenta: (c: Omit<Cuenta, "id" | "creadaEn">) => Promise<void>;

  asientos: Asiento[];
  cargandoAsientos: boolean;
  agregarAsiento: (a: Omit<Asiento, "id" | "creadoEn">) => Promise<void>;

  error: string | null;
  limpiarError: () => void;
}

const ContabiaContext = createContext<ContabiaContextType | null>(null);

// ── Mappers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmpresa(row: any): Empresa {
  return { id: row.id, nombre: row.nombre, ruc: row.ruc ?? undefined, pais: row.pais, moneda: row.moneda, activa: row.activa };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCuenta(row: any): Cuenta {
  return { id: row.id, codigo: row.codigo, nombre: row.nombre, tipo: row.tipo, descripcion: row.descripcion ?? undefined, activa: row.activa, creadaEn: new Date(row.creada_en) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAsiento(row: any): Asiento {
  return {
    id: row.id, fecha: new Date(row.fecha), descripcion: row.descripcion,
    confirmado: row.confirmado, creadoPor: row.creado_por, creadoEn: new Date(row.creado_en),
    lineas: (row.lineas_asiento ?? []).map((l: any) => ({
      cuentaId: l.cuenta_id, descripcion: l.descripcion,
      debito: Number(l.debito), credito: Number(l.credito),
    })),
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ContabiaProvider({ children }: { children: ReactNode }) {
  const supabase = createSupabaseBrowserClient();

  const [empresaActual, setEmpresaActual] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [cargandoCuentas, setCargandoCuentas] = useState(false);
  const [cargandoAsientos, setCargandoAsientos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar empresas del usuario (RLS filtra automáticamente)
  useEffect(() => {
    supabase
      .from("empresas")
      .select("*")
      .order("creada_en", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError("Error cargando empresas: " + error.message);
        else {
          const lista = (data ?? []).map(mapEmpresa);
          setEmpresas(lista);
          if (lista.length > 0) setEmpresaActual(lista[0]);
        }
        setCargandoEmpresas(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar cuentas cuando cambia la empresa actual
  useEffect(() => {
    if (!empresaActual) { setCuentas([]); return; }
    setCargandoCuentas(true);
    supabase
      .from("cuentas")
      .select("*")
      .eq("empresa_id", empresaActual.id)
      .order("codigo", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError("Error cargando cuentas: " + error.message);
        else setCuentas((data ?? []).map(mapCuenta));
        setCargandoCuentas(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaActual?.id]);

  // Cargar asientos cuando cambia la empresa actual
  useEffect(() => {
    if (!empresaActual) { setAsientos([]); return; }
    setCargandoAsientos(true);
    supabase
      .from("asientos")
      .select("*, lineas_asiento(*)")
      .eq("empresa_id", empresaActual.id)
      .order("fecha", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("Error cargando asientos: " + error.message);
        else setAsientos((data ?? []).map(mapAsiento));
        setCargandoAsientos(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaActual?.id]);

  function seleccionarEmpresa(empresa: Empresa) {
    setEmpresaActual(empresa);
  }

  async function agregarEmpresa(datos: Omit<Empresa, "id">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("No hay sesión activa."); return; }

    const { data, error } = await supabase
      .from("empresas")
      .insert({ nombre: datos.nombre, ruc: datos.ruc ?? null, pais: datos.pais, moneda: datos.moneda, activa: datos.activa })
      .select().single();
    if (error) { setError("Error guardando empresa: " + error.message); return; }

    // Vincular usuario con la nueva empresa
    await supabase.from("usuarios_empresas").insert({
      user_id: user.id,
      empresa_id: data.id,
      rol: "administrador",
    });

    const nueva = mapEmpresa(data);
    setEmpresas((prev) => [...prev, nueva]);
    if (!empresaActual) setEmpresaActual(nueva);
  }

  async function agregarCuenta(datos: Omit<Cuenta, "id" | "creadaEn">) {
    if (!empresaActual) { setError("Selecciona una empresa primero."); return; }
    const { data, error } = await supabase
      .from("cuentas")
      .insert({ codigo: datos.codigo, nombre: datos.nombre, tipo: datos.tipo, descripcion: datos.descripcion ?? null, activa: datos.activa, empresa_id: empresaActual.id })
      .select().single();
    if (error) { setError("Error guardando cuenta: " + error.message); return; }
    setCuentas((prev) => [...prev, mapCuenta(data)]);
  }

  async function agregarAsiento(datos: Omit<Asiento, "id" | "creadoEn">) {
    if (!empresaActual) { setError("Selecciona una empresa primero."); return; }

    const { data: asiento, error: errAsiento } = await supabase
      .from("asientos")
      .insert({ fecha: datos.fecha.toISOString().split("T")[0], descripcion: datos.descripcion, confirmado: datos.confirmado, creado_por: datos.creadoPor, empresa_id: empresaActual.id })
      .select().single();
    if (errAsiento) { setError("Error guardando asiento: " + errAsiento.message); return; }

    const lineas = datos.lineas.map((l) => ({
      asiento_id: asiento.id, cuenta_id: l.cuentaId,
      descripcion: l.descripcion, debito: l.debito, credito: l.credito,
    }));
    const { error: errLineas } = await supabase.from("lineas_asiento").insert(lineas);
    if (errLineas) { setError("Error guardando líneas: " + errLineas.message); return; }

    setAsientos((prev) => [{ ...mapAsiento(asiento), lineas: datos.lineas }, ...prev]);
  }

  return (
    <ContabiaContext.Provider value={{
      empresaActual, empresas, cargandoEmpresas, agregarEmpresa, seleccionarEmpresa,
      cuentas, cargandoCuentas, agregarCuenta,
      asientos, cargandoAsientos, agregarAsiento,
      error, limpiarError: () => setError(null),
    }}>
      {children}
    </ContabiaContext.Provider>
  );
}

export function useContabia() {
  const ctx = useContext(ContabiaContext);
  if (!ctx) throw new Error("useContabia debe usarse dentro de ContabiaProvider");
  return ctx;
}
