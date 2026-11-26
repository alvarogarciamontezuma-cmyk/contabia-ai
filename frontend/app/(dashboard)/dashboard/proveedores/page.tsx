"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";

interface Proveedor {
  id: string;
  nombre: string;
  ruc: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
}

export default function ProveedoresPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [form, setForm] = useState({ nombre: "", ruc: "", email: "", telefono: "", direccion: "" });

  useEffect(() => { setMontado(true); }, []);
  useEffect(() => { if (montado && empresaActual) cargar(); }, [montado, empresaActual?.id]);

  async function cargar() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("proveedores").select("*")
      .eq("empresa_id", empresaActual.id).order("nombre");
    setProveedores((data ?? []) as Proveedor[]);
    setCargando(false);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!form.nombre.trim()) { setMensaje({ texto: "El nombre es obligatorio.", tipo: "error" }); return; }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("proveedores").insert({
      empresa_id: empresaActual!.id, nombre: form.nombre.trim(),
      ruc: form.ruc.trim() || null, email: form.email.trim() || null,
      telefono: form.telefono.trim() || null, direccion: form.direccion.trim() || null,
    });
    if (error) { setMensaje({ texto: "Error: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Proveedor guardado.", tipo: "exito" });
    setForm({ nombre: "", ruc: "", email: "", telefono: "", direccion: "" });
    setMostrarForm(false);
    cargar();
  }

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Proveedores</h2>
          <p className="text-sm text-gray-500 mt-1">{proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""} registrado{proveedores.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "+ Nuevo proveedor"}
        </button>
      </div>

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Nuevo proveedor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: "pnombre", label: "Nombre *", placeholder: "Nombre del proveedor", campo: "nombre" as const },
              { id: "pruc", label: "RUC", placeholder: "155-123-456", campo: "ruc" as const },
              { id: "pemail", label: "Correo", placeholder: "proveedor@email.com", campo: "email" as const },
              { id: "ptelefono", label: "Teléfono", placeholder: "6000-0000", campo: "telefono" as const },
            ].map(({ id, label, placeholder, campo }) => (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className="block text-sm text-gray-400">{label}</label>
                <input id={id} type="text" value={form[campo]} onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="pdireccion" className="block text-sm text-gray-400">Dirección</label>
              <input id="pdireccion" type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Dirección del proveedor"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition">Guardar</button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {proveedores.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No hay proveedores registrados todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Nombre</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">RUC</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden md:table-cell">Correo</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden md:table-cell">Teléfono</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {proveedores.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-white font-medium">{p.nombre}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{p.ruc ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{p.email ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{p.telefono ?? "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${p.activo ? "bg-green-950 text-green-400 border-green-800" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {p.activo && (
                      <button onClick={async () => {
                        if (!confirm(`¿Desactivar a "${p.nombre}"?`)) return;
                        const supabase = createSupabaseBrowserClient();
                        await supabase.from("proveedores").update({ activo: false }).eq("id", p.id);
                        cargar();
                      }} className="text-red-400 hover:text-red-300 text-xs transition">Desactivar</button>
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
