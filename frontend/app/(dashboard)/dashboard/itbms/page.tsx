"use client";

import { useState } from "react";
import { calcularITBMS, extraerITBMS, TASAS_ITBMS, ETIQUETAS_TASA, type TasaITBMS } from "@/lib/contabilidad/itbms";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

type Modo = "calcular" | "extraer";

export default function ITBMSPage() {
  const [modo, setModo] = useState<Modo>("calcular");
  const [monto, setMonto] = useState("");
  const [tasa, setTasa] = useState<TasaITBMS>("general");

  const montoNum = parseFloat(monto) || 0;
  const resultado = modo === "calcular"
    ? calcularITBMS(montoNum, tasa)
    : extraerITBMS(montoNum, tasa);

  const tasas = Object.entries(TASAS_ITBMS) as [TasaITBMS, number][];

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-white">ITBMS — Panamá</h2>
        <p className="text-sm text-gray-500 mt-1">
          Impuesto de Transferencia de Bienes Muebles y Servicios
        </p>
      </div>

      {/* Advertencia legal */}
      <div className="bg-yellow-950 border border-yellow-800 rounded-xl px-4 py-3">
        <p className="text-xs text-yellow-400">
          ⚠ Este módulo es informativo. Los cálculos fiscales deben validarse con un contador
          o abogado tributario antes de presentarlos a la DGI.
        </p>
      </div>

      {/* Calculadora */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-300">Calculadora de ITBMS</h3>

        {/* Modo */}
        <div className="flex gap-2">
          <button
            onClick={() => setModo("calcular")}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              modo === "calcular" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Agregar ITBMS
          </button>
          <button
            onClick={() => setModo("extraer")}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              modo === "extraer" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Extraer ITBMS
          </button>
        </div>

        <p className="text-xs text-gray-600">
          {modo === "calcular"
            ? "Ingresa el monto sin impuesto para calcular el ITBMS."
            : "Ingresa el monto total que ya incluye el ITBMS para extraerlo."}
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="monto" className="block text-sm text-gray-400">
              {modo === "calcular" ? "Subtotal (sin impuesto)" : "Total (con impuesto)"}
            </label>
            <input
              id="monto"
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="tasa" className="block text-sm text-gray-400">Tasa</label>
            <select
              id="tasa"
              value={tasa}
              onChange={(e) => setTasa(e.target.value as TasaITBMS)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tasas.map(([k]) => (
                <option key={k} value={k}>{ETIQUETAS_TASA[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultado */}
        {montoNum > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white font-mono">{formatearMoneda(resultado.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                ITBMS ({(resultado.porcentaje * 100).toFixed(0)}%)
              </span>
              <span className="text-yellow-400 font-mono">{formatearMoneda(resultado.montoITBMS)}</span>
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-semibold">
              <span className="text-white">Total</span>
              <span className="text-white font-mono">{formatearMoneda(resultado.total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de tasas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300">Tasas vigentes en Panamá</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Categoría</th>
              <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Tasa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr><td className="px-5 py-3 text-gray-300">Bienes y servicios generales</td><td className="px-5 py-3 text-right text-white font-mono">7%</td></tr>
            <tr><td className="px-5 py-3 text-gray-300">Bebidas alcohólicas y tabaco</td><td className="px-5 py-3 text-right text-white font-mono">10%</td></tr>
            <tr><td className="px-5 py-3 text-gray-300">Productos de lujo</td><td className="px-5 py-3 text-right text-white font-mono">15%</td></tr>
            <tr><td className="px-5 py-3 text-gray-300">Alimentos básicos, medicamentos, educación</td><td className="px-5 py-3 text-right text-green-400 font-mono">Exento</td></tr>
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600">
            Referencia: Ley 76 de 1976 y modificaciones posteriores. Verificar con la DGI para casos específicos.
          </p>
        </div>
      </div>

    </div>
  );
}
