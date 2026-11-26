"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";

interface PeriodoContable {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "abierto" | "cerrado";
  cerrado_por: string | null;
  cerrado_en: string | null;
  creado_en: string;
}

export default function CierresPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [periodos, setPeriodos] = useState<PeriodoContable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });

  const [form, setForm] = useState({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
  });

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    setForm((f) => ({
      ...f,
      nombre: `${hoy.toLocaleString("es-PA", { month: "long" })} ${yyyy}`,
      fechaInicio: `${yyyy}-${mm}-01`,
      fechaFin: `${yyyy}-${mm}-${String(hoy.getDate()).padStart(2, "0")}`,
    }));
  }, []);

  useEffect(() => {
    if (montado && empresaActual) cargarPeriodos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montado, empresaActual?.id]);

  async function cargarPeriodos() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("periodos_contables")
      .select("*")
      .eq("empresa_id", empresaActual.id)
      .order("fecha_inicio", { ascending: false });
    setPeriodos((data ?? []) as PeriodoContable[]);
    setCargando(false);
  }

  async function handleCrearPeriodo(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!form.nombre.trim()) { setMensaje({ texto: "El nombre es obligatorio.", tipo: "error" }); return; }
    if (!form.fechaInicio || !form.fechaFin) { setMensaje({ texto: "Las fechas son obligatorias.", tipo: "error" }); return; }
    if (form.fechaFin < form.fechaInicio) { setMensaje({ texto: "La fecha fin no puede ser anterior a la fecha inicio.", tipo: "error" }); return; }

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("periodos_contables").insert({
      empresa_id: empresaActual!.id,
      nombre: form.nombre.trim(),
      fecha_inicio: form.fechaInicio,
      fecha_fin: form.fechaFin,
      estado: "abierto",
    });

    if (error) { setMensaje({ texto: "Error al crear el período: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Período creado correctamente.", tipo: "exito" });
    setMostrarForm(false);
    cargarPeriodos();
  }

  async function handleCerrarPeriodo(periodo: PeriodoContable) {
    if (!confirm(`¿Seguro que deseas cerrar el período "${periodo.nombre}"? Esta acción bloqueará los asientos de este período.`)) return;
    setProcesando(periodo.id);

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("periodos_contables")
      .update({ estado: "cerrado", cerrado_por: user?.email ?? "sistema", cerrado_en: new Date().toISOString() })
      .eq("id", periodo.id);

    setProcesando(null);
    if (error) { setMensaje({ texto: "Error al cerrar el período: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: `Período "${periodo.nombre}" cerrado correctamente.`, tipo: "exito" });
    cargarPeriodos();
  }

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Cierres contables</h2>
          <p className="text-sm text-gray-500 mt-1">Gestiona los períodos contables de la empresa</p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "+ Nuevo período"}
        </button>
      </div>

      {/* Aviso */}
      <div className="bg-yellow-950 border border-yellow-800 rounded-xl px-4 py-3">
        <p className="text-xs text-yellow-400">
          ⚠ Un período cerrado bloquea la modificación de asientos dentro de ese rango de fechas. Esta acción no puede revertirse sin autorización del administrador.
        </p>
      </div>

      {/* Mensajes */}
      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.tipo === "exito" ? "✓ " : "• "}{mensaje.texto}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <form onSubmit={handleCrearPeriodo} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Nuevo período contable</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-1">
              <label className="block text-sm text-gray-400">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Enero 2026"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Fecha inicio <span className="text-red-500">*</span></label>
              <input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Fecha fin <span className="text-red-500">*</span></label>
              <input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              Crear período
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de períodos */}
      {periodos.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-600 text-sm">No hay períodos contables creados todavía.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Período</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Desde</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Hasta</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Estado</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {periodos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-white font-medium">{p.nombre}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{new Date(p.fecha_inicio).toLocaleDateString("es-PA")}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{new Date(p.fecha_fin).toLocaleDateString("es-PA")}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${p.estado === "abierto" ? "bg-green-950 text-green-400 border-green-800" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                      {p.estado === "abierto" ? "Abierto" : "Cerrado"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {p.estado === "abierto" && (
                      <button onClick={() => handleCerrarPeriodo(p)} disabled={procesando === p.id}
                        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs px-3 py-1 rounded-lg transition">
                        {procesando === p.id ? "..." : "Cerrar período"}
                      </button>
                    )}
                    {p.estado === "cerrado" && (
                      <span className="text-xs text-gray-600">
                        {p.cerrado_por ? `Por ${p.cerrado_por}` : "Cerrado"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
