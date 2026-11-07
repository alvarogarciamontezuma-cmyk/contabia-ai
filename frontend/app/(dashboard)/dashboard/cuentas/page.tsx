"use client";

import { useState, useEffect } from "react";
import { useContabia } from "@/lib/store/ContabiaContext";
import type { TipoCuenta } from "@/types/contabilidad";

const TIPOS: { valor: TipoCuenta; etiqueta: string }[] = [
  { valor: "activo",     etiqueta: "Activo" },
  { valor: "pasivo",     etiqueta: "Pasivo" },
  { valor: "patrimonio", etiqueta: "Patrimonio" },
  { valor: "ingreso",    etiqueta: "Ingreso" },
  { valor: "gasto",      etiqueta: "Gasto" },
];

const colorTipo: Record<TipoCuenta, string> = {
  activo:     "bg-blue-950 text-blue-400 border-blue-800",
  pasivo:     "bg-red-950 text-red-400 border-red-800",
  patrimonio: "bg-purple-950 text-purple-400 border-purple-800",
  ingreso:    "bg-green-950 text-green-400 border-green-800",
  gasto:      "bg-yellow-950 text-yellow-400 border-yellow-800",
};

export default function CuentasPage() {
  const { cuentas, cargandoCuentas, agregarCuenta } = useContabia();
  const [montado, setMontado] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtro, setFiltro] = useState<TipoCuenta | "todas">("todas");
  const [form, setForm] = useState({ codigo: "", nombre: "", tipo: "activo" as TipoCuenta, descripcion: "" });
  const [error, setError] = useState("");

  useEffect(() => { setMontado(true); }, []);

  const cuentasFiltradas = filtro === "todas"
    ? cuentas
    : cuentas.filter((c) => c.tipo === filtro);

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.codigo.trim()) { setError("El código es obligatorio."); return; }
    if (!form.nombre.trim()) { setError("El nombre es obligatorio."); return; }

    const codigoExiste = cuentas.some(
      (c) => c.codigo.toLowerCase() === form.codigo.trim().toLowerCase()
    );
    if (codigoExiste) { setError("Ya existe una cuenta con ese código."); return; }

    agregarCuenta({
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      descripcion: form.descripcion.trim() || undefined,
      activa: true,
    });

    setForm({ codigo: "", nombre: "", tipo: "activo", descripcion: "" });
    setMostrarForm(false);
  }

  if (!montado || cargandoCuentas) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Plan de cuentas</h2>
          <p className="text-sm text-gray-500 mt-1">
            {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""} en el catálogo
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {mostrarForm ? "Cancelar" : "+ Nueva cuenta"}
        </button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <form
          onSubmit={handleGuardar}
          className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-gray-300">Nueva cuenta contable</h3>

          {error && (
            <div role="alert" className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="codigo" className="block text-sm text-gray-400">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                id="codigo"
                type="text"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="1.1.03"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="nombre-cuenta" className="block text-sm text-gray-400">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre-cuenta"
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre de la cuenta"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="tipo" className="block text-sm text-gray-400">Tipo</label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCuenta })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="descripcion" className="block text-sm text-gray-400">
                Descripción (opcional)
              </label>
              <input
                id="descripcion"
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción breve"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              Guardar cuenta
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2">
        {(["todas", ...TIPOS.map((t) => t.valor)] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFiltro(t as TipoCuenta | "todas")}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filtro === t
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            {t === "todas" ? "Todas" : TIPOS.find((x) => x.valor === t)?.etiqueta}
          </button>
        ))}
      </div>

      {/* Tabla de cuentas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Código</th>
              <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Nombre</th>
              <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Tipo</th>
              <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden md:table-cell">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {cuentasFiltradas.map((cuenta) => (
              <tr key={cuenta.id} className="hover:bg-gray-800/50 transition">
                <td className="px-5 py-3 font-mono text-gray-300">{cuenta.codigo}</td>
                <td className="px-5 py-3 text-white">{cuenta.nombre}</td>
                <td className="px-5 py-3 hidden sm:table-cell">
                  <span className={`text-xs border rounded-full px-2.5 py-1 ${colorTipo[cuenta.tipo]}`}>
                    {TIPOS.find((t) => t.valor === cuenta.tipo)?.etiqueta}
                  </span>
                </td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <span className={`text-xs ${cuenta.activa ? "text-green-400" : "text-gray-600"}`}>
                    {cuenta.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {cuentasFiltradas.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-8">
            No hay cuentas para este filtro.
          </p>
        )}
      </div>

    </div>
  );
}
