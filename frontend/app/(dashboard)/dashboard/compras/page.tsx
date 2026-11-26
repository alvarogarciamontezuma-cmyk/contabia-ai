"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

interface Proveedor { id: string; nombre: string; }

interface Compra {
  id: string;
  numero: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
  subtotal: number;
  itbms: number;
  total: number;
  estado: string;
  proveedores: { nombre: string } | null;
}

const colorEstado: Record<string, string> = {
  pendiente: "bg-yellow-950 text-yellow-400 border-yellow-800",
  pagada:    "bg-green-950 text-green-400 border-green-800",
  vencida:   "bg-red-950 text-red-400 border-red-800",
  anulada:   "bg-gray-800 text-gray-500 border-gray-700",
};

export default function ComprasPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    proveedorId: "", numero: "", fecha: "", fechaVencimiento: "",
    subtotal: "", itbms: "", total: "", notas: "",
  });

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    setForm((f) => ({ ...f, fecha: `${yyyy}-${mm}-${dd}` }));
  }, []);

  useEffect(() => { if (montado && empresaActual) { cargar(); cargarProveedores(); } }, [montado, empresaActual?.id]);

  async function cargar() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("compras")
      .select("*, proveedores(nombre)")
      .eq("empresa_id", empresaActual.id)
      .order("fecha", { ascending: false });
    setCompras((data ?? []) as Compra[]);
    setCargando(false);
  }

  async function cargarProveedores() {
    if (!empresaActual) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("proveedores").select("id, nombre").eq("empresa_id", empresaActual.id).order("nombre");
    setProveedores((data ?? []) as Proveedor[]);
  }

  // Calcular total automáticamente
  function calcularTotal(subtotal: string, itbms: string) {
    const s = parseFloat(subtotal) || 0;
    const i = parseFloat(itbms) || 0;
    return String(Math.round((s + i) * 100) / 100);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!form.fecha) { setMensaje({ texto: "La fecha es obligatoria.", tipo: "error" }); return; }
    if (!form.subtotal) { setMensaje({ texto: "El subtotal es obligatorio.", tipo: "error" }); return; }

    setGuardando(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("compras").insert({
      empresa_id: empresaActual!.id,
      proveedor_id: form.proveedorId || null,
      numero: form.numero.trim() || null,
      fecha: form.fecha,
      fecha_vencimiento: form.fechaVencimiento || null,
      subtotal: parseFloat(form.subtotal) || 0,
      itbms: parseFloat(form.itbms) || 0,
      total: parseFloat(form.total) || 0,
      estado: "pendiente",
      notas: form.notas.trim() || null,
      creado_por: user?.email ?? "sistema",
    });

    setGuardando(false);
    if (error) { setMensaje({ texto: "Error: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Compra registrada correctamente.", tipo: "exito" });
    setForm({ proveedorId: "", numero: "", fecha: form.fecha, fechaVencimiento: "", subtotal: "", itbms: "", total: "", notas: "" });
    setMostrarForm(false);
    cargar();
  }

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  const totalPendiente = compras.filter(c => c.estado === "pendiente").reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Compras</h2>
          <p className="text-sm text-gray-500 mt-1">{compras.length} compra{compras.length !== 1 ? "s" : ""} registrada{compras.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "+ Registrar compra"}
        </button>
      </div>

      {/* Resumen */}
      {compras.length > 0 && (
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-yellow-300">Cuentas por pagar (pendientes)</span>
          <span className="font-mono font-bold text-yellow-300">{formatearMoneda(totalPendiente)}</span>
        </div>
      )}

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Registrar compra</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Proveedor</label>
              <select value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">N° Factura proveedor</label>
              <input type="text" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })}
                placeholder="Opcional"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Fecha *</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Subtotal *</label>
              <input type="number" min="0" step="0.01" value={form.subtotal}
                onChange={(e) => setForm((f) => ({ ...f, subtotal: e.target.value, total: calcularTotal(e.target.value, f.itbms) }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">ITBMS</label>
              <input type="number" min="0" step="0.01" value={form.itbms}
                onChange={(e) => setForm((f) => ({ ...f, itbms: e.target.value, total: calcularTotal(f.subtotal, e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Total</label>
              <input type="number" min="0" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Vencimiento</label>
              <input type="date" value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-sm text-gray-400">Notas</label>
              <input type="text" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Opcional"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={guardando}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              {guardando ? "Guardando..." : "Registrar compra"}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {compras.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No hay compras registradas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Proveedor</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">N° Factura</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Fecha</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Total</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {compras.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-white">{c.proveedores?.nombre ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 font-mono hidden sm:table-cell">{c.numero ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{new Date(c.fecha).toLocaleDateString("es-PA")}</td>
                  <td className="px-5 py-3 text-right font-mono text-white">{formatearMoneda(c.total)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${colorEstado[c.estado] ?? colorEstado.pendiente}`}>
                      {c.estado.charAt(0).toUpperCase() + c.estado.slice(1)}
                    </span>
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
