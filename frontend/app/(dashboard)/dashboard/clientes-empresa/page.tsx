"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";

interface ClienteEmpresa {
  id: string;
  nombre: string;
  ruc: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
  creado_en: string;
}

export default function ClientesEmpresaPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [clientes, setClientes] = useState<ClienteEmpresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [form, setForm] = useState({ nombre: "", ruc: "", email: "", telefono: "", direccion: "" });

  useEffect(() => { setMontado(true); }, []);
  useEffect(() => { if (montado && empresaActual) cargarClientes(); }, [montado, empresaActual?.id]);

  async function cargarClientes() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("clientes_empresa").select("*")
      .eq("empresa_id", empresaActual.id).order("nombre");
    setClientes((data ?? []) as ClienteEmpresa[]);
    setCargando(false);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!form.nombre.trim()) { setMensaje({ texto: "El nombre es obligatorio.", tipo: "error" }); return; }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("clientes_empresa").insert({
      empresa_id: empresaActual!.id, nombre: form.nombre.trim(),
      ruc: form.ruc.trim() || null, email: form.email.trim() || null,
      telefono: form.telefono.trim() || null, direccion: form.direccion.trim() || null,
    });
    if (error) { setMensaje({ texto: "Error: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Cliente guardado.", tipo: "exito" });
    setForm({ nombre: "", ruc: "", email: "", telefono: "", direccion: "" });
    setMostrarForm(false);
    cargarClientes();
  }

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Clientes</h2>
          <p className="text-sm text-gray-500 mt-1">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "+ Nuevo cliente"}
        </button>
      </div>

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Nuevo cliente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: "nombre", label: "Nombre *", placeholder: "Nombre del cliente", campo: "nombre" as const },
              { id: "ruc", label: "RUC", placeholder: "155-123-456", campo: "ruc" as const },
              { id: "email", label: "Correo", placeholder: "cliente@email.com", campo: "email" as const },
              { id: "telefono", label: "Teléfono", placeholder: "6000-0000", campo: "telefono" as const },
            ].map(({ id, label, placeholder, campo }) => (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className="block text-sm text-gray-400">{label}</label>
                <input id={id} type="text" value={form[campo]} onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="direccion" className="block text-sm text-gray-400">Dirección</label>
              <input id="direccion" type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Dirección del cliente"
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
        {clientes.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No hay clientes registrados todavía.</p>
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
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-white font-medium">{c.nombre}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{c.ruc ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{c.email ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{c.telefono ?? "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${c.activo ? "bg-green-950 text-green-400 border-green-800" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                      {c.activo ? "Activo" : "Inactivo"}
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
