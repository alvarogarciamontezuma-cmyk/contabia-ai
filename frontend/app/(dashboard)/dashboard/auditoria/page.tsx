"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";

interface RegistroAuditoria {
  id: string;
  accion: string;
  tabla: string;
  registro_id: string | null;
  descripcion: string | null;
  creado_en: string;
}

const colorAccion: Record<string, string> = {
  crear_asiento:   "bg-green-950 text-green-400 border-green-800",
  cerrar_periodo:  "bg-yellow-950 text-yellow-400 border-yellow-800",
  crear_cuenta:    "bg-blue-950 text-blue-400 border-blue-800",
  crear_empresa:   "bg-purple-950 text-purple-400 border-purple-800",
  confirmar_pago:  "bg-green-950 text-green-400 border-green-800",
  rechazar_pago:   "bg-red-950 text-red-400 border-red-800",
};

export default function AuditoriaPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(0);
  const POR_PAGINA = 20;

  useEffect(() => { setMontado(true); }, []);

  useEffect(() => {
    if (montado && empresaActual) cargarRegistros();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montado, empresaActual?.id, pagina]);

  async function cargarRegistros() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("auditoria")
      .select("*")
      .eq("empresa_id", empresaActual.id)
      .order("creado_en", { ascending: false })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1);
    setRegistros((data ?? []) as RegistroAuditoria[]);
    setCargando(false);
  }

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-white">Auditoría</h2>
        <p className="text-sm text-gray-500 mt-1">Historial de operaciones realizadas en el sistema</p>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {registros.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-600 text-sm">No hay registros de auditoría todavía.</p>
            <p className="text-gray-700 text-xs mt-1">Las operaciones del sistema se registrarán aquí automáticamente.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Fecha</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Acción</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Tabla</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden md:table-cell">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {registros.map((r) => (
                <tr key={r.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono">
                    {new Date(r.creado_en).toLocaleString("es-PA")}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${colorAccion[r.accion] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                      {r.accion.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell">{r.tabla}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell">{r.descripcion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {registros.length === POR_PAGINA && (
        <div className="flex gap-2 justify-center">
          <button onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={pagina === 0}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white text-sm px-4 py-2 rounded-lg transition">
            ← Anterior
          </button>
          <button onClick={() => setPagina((p) => p + 1)}
            className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition">
            Siguiente →
          </button>
        </div>
      )}

      <p className="text-xs text-gray-700">
        Los registros de auditoría no pueden modificarse ni eliminarse. Se guardan de forma permanente para garantizar la trazabilidad del sistema.
      </p>
    </div>
  );
}
