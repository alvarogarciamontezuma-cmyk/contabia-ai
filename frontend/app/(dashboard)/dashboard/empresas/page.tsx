"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";

const PAISES = ["Panamá", "Costa Rica", "Colombia", "México"];
const MONEDAS = ["USD", "CRC", "COP", "MXN"];

interface EmpresaDetalle {
  id: string;
  nombre: string;
  nombre_comercial: string | null;
  ruc: string | null;
  pais: string;
  moneda: string;
  activa: boolean;
  direccion: string | null;
  telefono: string | null;
  email_empresa: string | null;
  sitio_web: string | null;
  logo_url: string | null;
}

export default function EmpresasPage() {
  const { empresas, cargandoEmpresas, agregarEmpresa, seleccionarEmpresa } = useContabia();
  const [montado, setMontado] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<EmpresaDetalle | null>(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [guardando, setGuardando] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const [form, setForm] = useState({
    nombre: "", nombreComercial: "", ruc: "", pais: "Panamá", moneda: "USD",
    direccion: "", telefono: "", email: "", sitioWeb: "",
  });

  const [formEdicion, setFormEdicion] = useState({
    nombre: "", nombreComercial: "", ruc: "", pais: "", moneda: "",
    direccion: "", telefono: "", email: "", sitioWeb: "",
  });

  useEffect(() => { setMontado(true); }, []);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!form.nombre.trim()) { setMensaje({ texto: "El nombre es obligatorio.", tipo: "error" }); return; }
    agregarEmpresa({ nombre: form.nombre.trim(), ruc: form.ruc.trim() || undefined, pais: form.pais, moneda: form.moneda, activa: true });
    setForm({ nombre: "", nombreComercial: "", ruc: "", pais: "Panamá", moneda: "USD", direccion: "", telefono: "", email: "", sitioWeb: "" });
    setMostrarForm(false);
  }

  async function cargarDetalle(empresaId: string) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
    if (data) {
      setEmpresaEditando(data as EmpresaDetalle);
      setFormEdicion({
        nombre: data.nombre, nombreComercial: data.nombre_comercial ?? "",
        ruc: data.ruc ?? "", pais: data.pais, moneda: data.moneda,
        direccion: data.direccion ?? "", telefono: data.telefono ?? "",
        email: data.email_empresa ?? "", sitioWeb: data.sitio_web ?? "",
      });
      setLogoPreview(data.logo_url ?? "");
    }
  }

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaEditando) return;
    setGuardando(true);
    setMensaje({ texto: "", tipo: "" });
    const supabase = createSupabaseBrowserClient();

    // Subir logo si se seleccionó uno nuevo
    let logoUrl = empresaEditando.logo_url;
    if (logoRef.current?.files?.[0]) {
      const archivo = logoRef.current.files[0];
      const ruta = `logos/${empresaEditando.id}/${Date.now()}.${archivo.name.split(".").pop()}`;
      const { error: errLogo } = await supabase.storage.from("documentos").upload(ruta, archivo, { upsert: true });
      if (!errLogo) {
        const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(ruta);
        logoUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("empresas").update({
      nombre: formEdicion.nombre.trim(),
      nombre_comercial: formEdicion.nombreComercial.trim() || null,
      ruc: formEdicion.ruc.trim() || null,
      pais: formEdicion.pais,
      moneda: formEdicion.moneda,
      direccion: formEdicion.direccion.trim() || null,
      telefono: formEdicion.telefono.trim() || null,
      email_empresa: formEdicion.email.trim() || null,
      sitio_web: formEdicion.sitioWeb.trim() || null,
      logo_url: logoUrl,
    }).eq("id", empresaEditando.id);

    setGuardando(false);
    if (error) { setMensaje({ texto: "Error: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Empresa actualizada correctamente.", tipo: "exito" });
    setEmpresaEditando(null);
  }

  if (!montado || cargandoEmpresas) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-20 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  // ── Vista de edición ──────────────────────────────────────────────────────
  if (empresaEditando) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setEmpresaEditando(null)} className="text-gray-400 hover:text-white transition text-sm">← Volver</button>
          <h2 className="text-2xl font-bold text-white">Personalizar empresa</h2>
        </div>

        {mensaje.texto && (
          <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleGuardarEdicion} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">

          {/* Logo */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Logo de la empresa</label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-gray-700 bg-gray-800" />
              )}
              <div>
                <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { const r = new FileReader(); r.onload = ev => setLogoPreview(ev.target?.result as string); r.readAsDataURL(f); }
                  }}
                  className="hidden" id="logo-input" />
                <label htmlFor="logo-input" className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition border border-gray-700">
                  {logoPreview ? "Cambiar logo" : "Subir logo"}
                </label>
                <p className="text-xs text-gray-600 mt-1">JPG, PNG, WEBP · Máx. 2 MB</p>
              </div>
            </div>
          </div>

          {/* Campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: "enombre", label: "Nombre legal *", campo: "nombre" as const, placeholder: "Empresa S.A." },
              { id: "ecomercial", label: "Nombre comercial", campo: "nombreComercial" as const, placeholder: "Nombre que aparece en facturas" },
              { id: "eruc", label: "RUC", campo: "ruc" as const, placeholder: "155-123-456" },
              { id: "etelefono", label: "Teléfono", campo: "telefono" as const, placeholder: "507-6000-0000" },
              { id: "eemail", label: "Correo de la empresa", campo: "email" as const, placeholder: "info@empresa.com" },
              { id: "eweb", label: "Sitio web", campo: "sitioWeb" as const, placeholder: "www.empresa.com" },
            ].map(({ id, label, campo, placeholder }) => (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className="block text-sm text-gray-400">{label}</label>
                <input id={id} type="text" value={formEdicion[campo]}
                  onChange={(e) => setFormEdicion({ ...formEdicion, [campo]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-sm text-gray-400">Dirección</label>
              <input type="text" value={formEdicion.direccion}
                onChange={(e) => setFormEdicion({ ...formEdicion, direccion: e.target.value })}
                placeholder="Dirección completa de la empresa"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">País</label>
              <select value={formEdicion.pais} onChange={(e) => setFormEdicion({ ...formEdicion, pais: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PAISES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Moneda</label>
              <select value={formEdicion.moneda} onChange={(e) => setFormEdicion({ ...formEdicion, moneda: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONEDAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={guardando}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
            <button type="button" onClick={() => setEmpresaEditando(null)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Vista principal ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Empresas</h2>
          <p className="text-sm text-gray-500 mt-1">{empresas.length} empresa{empresas.length !== 1 ? "s" : ""} registrada{empresas.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "+ Nueva empresa"}
        </button>
      </div>

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Nueva empresa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="nombre" className="block text-sm text-gray-400">Nombre <span className="text-red-500">*</span></label>
              <input id="nombre" type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Empresa Ejemplo S.A."
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label htmlFor="ruc" className="block text-sm text-gray-400">RUC</label>
              <input id="ruc" type="text" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                placeholder="155-123-456"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label htmlFor="pais" className="block text-sm text-gray-400">País</label>
              <select id="pais" value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PAISES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="moneda" className="block text-sm text-gray-400">Moneda</label>
              <select id="moneda" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONEDAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">Guardar empresa</button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {empresas.map((emp) => (
          <div key={emp.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-white font-medium">{emp.nombre}</p>
              <div className="flex gap-4 text-xs text-gray-500">
                {emp.ruc && <span>RUC: {emp.ruc}</span>}
                <span>{emp.pais}</span>
                <span>{emp.moneda}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-green-950 text-green-400 border border-green-800 rounded-full px-3 py-1">Activa</span>
              <button onClick={() => cargarDetalle(emp.id)}
                className="text-blue-400 hover:text-blue-300 text-xs transition">
                ✏ Personalizar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
