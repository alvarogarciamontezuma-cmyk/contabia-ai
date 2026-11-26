"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

interface PagoAdmin {
  id: string;
  empresa_id: string;
  monto: number;
  metodo: string;
  estado: "pendiente" | "confirmado" | "rechazado";
  referencia: string | null;
  notas: string | null;
  fecha_pago: string;
  empresas: { nombre: string } | null;
}

export default function AdminPagosPage() {
  const [montado, setMontado] = useState(false);
  const [pagos, setPagos] = useState<PagoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => { setMontado(true); }, []);

  useEffect(() => {
    if (montado) cargarPagos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montado]);

  async function cargarPagos() {
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("pagos")
      .select("*, empresas(nombre)")
      .order("fecha_pago", { ascending: false });
    setPagos((data ?? []) as PagoAdmin[]);
    setCargando(false);
  }

  async function accionPago(pagoId: string, empresaId: string, accion: "confirmar" | "rechazar") {
    setProcesando(pagoId);
    setMensaje("");

    const res = await fetch("/api/admin/confirmar-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagoId, empresaId, accion }),
    });

    const data = await res.json();
    setProcesando(null);

    if (!res.ok) { setMensaje("Error: " + data.error); return; }

    setMensaje(accion === "confirmar" ? "Pago confirmado correctamente." : "Pago rechazado.");
    cargarPagos();
  }

  const colorEstado: Record<string, string> = {
    pendiente:  "bg-yellow-950 text-yellow-400 border-yellow-800",
    confirmado: "bg-green-950 text-green-400 border-green-800",
    rechazado:  "bg-red-950 text-red-400 border-red-800",
  };

  if (!montado || cargando) {
    return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Administración de pagos</h2>
        <p className="text-sm text-gray-500 mt-1">Confirma o rechaza los pagos de tus clientes</p>
      </div>

      {mensaje && (
        <div className="bg-green-950 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
          ✓ {mensaje}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {pagos.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No hay pagos registrados todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Empresa</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Referencia</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden md:table-cell">Fecha</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Monto</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Estado</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {pagos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-white">{p.empresas?.nombre ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-gray-400 text-xs hidden sm:table-cell">{p.referencia ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 hidden md:table-cell">
                    {new Date(p.fecha_pago).toLocaleDateString("es-PA")}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-white">{formatearMoneda(p.monto)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${colorEstado[p.estado]}`}>
                      {p.estado === "pendiente" ? "Pendiente" :
                       p.estado === "confirmado" ? "Confirmado" : "Rechazado"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {p.estado === "pendiente" && (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => accionPago(p.id, p.empresa_id, "confirmar")}
                          disabled={procesando === p.id}
                          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs px-3 py-1 rounded-lg transition"
                        >
                          {procesando === p.id ? "..." : "Confirmar"}
                        </button>
                        <button
                          onClick={() => accionPago(p.id, p.empresa_id, "rechazar")}
                          disabled={procesando === p.id}
                          className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-xs px-3 py-1 rounded-lg transition"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
