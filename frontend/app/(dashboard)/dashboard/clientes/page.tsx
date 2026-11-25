"use client";

import { useState, useEffect } from "react";
import { useContabia } from "@/lib/store/ContabiaContext";

const PAISES = ["Panamá", "Costa Rica", "Colombia", "México"];
const MONEDAS = ["USD", "CRC", "COP", "MXN"];

export default function ClientesPage() {
  const { empresas, cargandoEmpresas } = useContabia();
  const [montado, setMontado] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombreEmpresa: "",
    ruc: "",
    pais: "Panamá",
    moneda: "USD",
    emailUsuario: "",
    passwordUsuario: "",
  });

  useEffect(() => { setMontado(true); }, []);

  async function handleCrearCliente(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setExito("");

    if (!form.nombreEmpresa.trim()) { setError("El nombre de la empresa es obligatorio."); return; }
    if (!form.emailUsuario.trim()) { setError("El correo del usuario es obligatorio."); return; }
    if (!form.emailUsuario.includes("@")) { setError("Ingresa un correo válido."); return; }
    if (form.passwordUsuario.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }

    setCargando(true);

    const res = await fetch("/api/admin/crear-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setCargando(false);

    if (!res.ok) {
      setError(data.error ?? "Error desconocido.");
      return;
    }

    setExito(data.mensaje);
    setForm({ nombreEmpresa: "", ruc: "", pais: "Panamá", moneda: "USD", emailUsuario: "", passwordUsuario: "" });
    setMostrarForm(false);
  }

  if (!montado || cargandoEmpresas) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-32 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Clientes</h2>
          <p className="text-sm text-gray-500 mt-1">
            {empresas.length} empresa{empresas.length !== 1 ? "s" : ""} registrada{empresas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setMostrarForm((v) => !v); setError(""); setExito(""); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {mostrarForm ? "Cancelar" : "+ Nuevo cliente"}
        </button>
      </div>

      {/* Mensaje de éxito */}
      {exito && (
        <div className="bg-green-950 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
          ✓ {exito}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <form onSubmit={handleCrearCliente} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-300">Nuevo cliente</h3>
          <p className="text-xs text-gray-500">
            Se creará la empresa, el usuario de acceso y el plan de cuentas básico automáticamente.
          </p>

          {error && (
            <div role="alert" className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Datos de la empresa */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Empresa</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="nombreEmpresa" className="block text-sm text-gray-400">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input id="nombreEmpresa" type="text" value={form.nombreEmpresa}
                  onChange={(e) => setForm({ ...form, nombreEmpresa: e.target.value })}
                  placeholder="Empresa Cliente S.A."
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label htmlFor="ruc" className="block text-sm text-gray-400">RUC (opcional)</label>
                <input id="ruc" type="text" value={form.ruc}
                  onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                  placeholder="155-123-456"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label htmlFor="pais" className="block text-sm text-gray-400">País</label>
                <select id="pais" value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PAISES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="moneda" className="block text-sm text-gray-400">Moneda</label>
                <select id="moneda" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Datos del usuario */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Usuario de acceso</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="emailUsuario" className="block text-sm text-gray-400">
                  Correo <span className="text-red-500">*</span>
                </label>
                <input id="emailUsuario" type="email" value={form.emailUsuario}
                  onChange={(e) => setForm({ ...form, emailUsuario: e.target.value })}
                  placeholder="contador@empresa.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label htmlFor="passwordUsuario" className="block text-sm text-gray-400">
                  Contraseña inicial <span className="text-red-500">*</span>
                </label>
                <input id="passwordUsuario" type="password" value={form.passwordUsuario}
                  onChange={(e) => setForm({ ...form, passwordUsuario: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              El cliente usará este correo y contraseña para entrar al sistema.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={cargando}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              {cargando ? "Creando cliente..." : "Crear cliente"}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)}
              className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de empresas */}
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
            <span className="text-xs bg-green-950 text-green-400 border border-green-800 rounded-full px-3 py-1">
              Activa
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
