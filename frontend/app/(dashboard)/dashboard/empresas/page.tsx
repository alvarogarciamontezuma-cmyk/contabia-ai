"use client";

import { useState, useEffect } from "react";
import { useContabia } from "@/lib/store/ContabiaContext";
import type { Empresa } from "@/types/contabilidad";

const PAISES = ["Panamá", "Costa Rica", "Colombia", "México"];
const MONEDAS = ["USD", "CRC", "COP", "MXN"];

const etiquetaTipo: Record<string, string> = {
  activo: "Activa",
};

export default function EmpresasPage() {
  const { empresas, cargandoEmpresas, agregarEmpresa } = useContabia();
  const [montado, setMontado] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    ruc: "",
    pais: "Panamá",
    moneda: "USD",
  });
  const [error, setError] = useState("");

  useEffect(() => { setMontado(true); }, []);

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim()) {
      setError("El nombre de la empresa es obligatorio.");
      return;
    }

    const nueva: Omit<Empresa, "id"> = {
      nombre: form.nombre.trim(),
      ruc: form.ruc.trim() || undefined,
      pais: form.pais,
      moneda: form.moneda,
      activa: true,
    };

    agregarEmpresa(nueva);
    setForm({ nombre: "", ruc: "", pais: "Panamá", moneda: "USD" });
    setMostrarForm(false);
  }

  if (!montado || cargandoEmpresas) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-20 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        <div className="h-20 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Empresas</h2>
          <p className="text-sm text-gray-500 mt-1">
            {empresas.length} empresa{empresas.length !== 1 ? "s" : ""} registrada{empresas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {mostrarForm ? "Cancelar" : "+ Nueva empresa"}
        </button>
      </div>

      {/* Formulario nueva empresa */}
      {mostrarForm && (
        <form
          onSubmit={handleGuardar}
          className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-gray-300">Nueva empresa</h3>

          {error && (
            <div role="alert" className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="nombre" className="block text-sm text-gray-400">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Empresa Ejemplo S.A."
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="ruc" className="block text-sm text-gray-400">
                RUC (opcional)
              </label>
              <input
                id="ruc"
                type="text"
                value={form.ruc}
                onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                placeholder="155-123-456"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="pais" className="block text-sm text-gray-400">País</label>
              <select
                id="pais"
                value={form.pais}
                onChange={(e) => setForm({ ...form, pais: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAISES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="moneda" className="block text-sm text-gray-400">Moneda</label>
              <select
                id="moneda"
                value={form.moneda}
                onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONEDAS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Guardar empresa
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de empresas */}
      <div className="space-y-3">
        {empresas.map((emp) => (
          <div
            key={emp.id}
            className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
          >
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
