"use client";

import { useState, useEffect } from "react";
import { useContabia } from "@/lib/store/ContabiaContext";
import { validarPartidaDoble, formatearMoneda } from "@/lib/contabilidad/motorContable";
import type { LineaAsiento } from "@/types/contabilidad";

function lineaVacia(): LineaAsiento & { _id: string } {
  return { _id: crypto.randomUUID(), cuentaId: "", descripcion: "", debito: 0, credito: 0 };
}

type LineaForm = LineaAsiento & { _id: string };

export default function AsientosPage() {
  const { cuentas, asientos, cargandoAsientos, agregarAsiento } = useContabia();
  const [montado, setMontado] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([lineaVacia(), lineaVacia()]);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    setFecha(`${yyyy}-${mm}-${dd}`);
  }, []);

  const totalDebitos = lineas.reduce((s, l) => s + (Number(l.debito) || 0), 0);
  const totalCreditos = lineas.reduce((s, l) => s + (Number(l.credito) || 0), 0);
  const cuadra = Math.round((totalDebitos - totalCreditos) * 100) === 0;

  function actualizarLinea(id: string, campo: keyof LineaAsiento, valor: string | number) {
    setLineas((prev) =>
      prev.map((l) => (l._id === id ? { ...l, [campo]: campo === "debito" || campo === "credito" ? Number(valor) || 0 : valor } : l))
    );
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()]);
  }

  function eliminarLinea(id: string) {
    if (lineas.length <= 2) return;
    setLineas((prev) => prev.filter((l) => l._id !== id));
  }

  function limpiarFormulario() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    setFecha(`${yyyy}-${mm}-${dd}`);
    setDescripcion("");
    setLineas([lineaVacia(), lineaVacia()]);
    setErrores([]);
    setGuardado(false);
  }

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setErrores([]);
    setGuardado(false);

    const errs: string[] = [];
    if (!descripcion.trim()) errs.push("La descripción del asiento es obligatoria.");
    if (!fecha) errs.push("La fecha es obligatoria.");

    const validacion = validarPartidaDoble(lineas);
    const todosLosErrores = [...errs, ...validacion.errores];

    if (todosLosErrores.length > 0) {
      setErrores(todosLosErrores);
      return;
    }

    agregarAsiento({
      fecha: new Date(fecha + "T00:00:00"),
      descripcion: descripcion.trim(),
      lineas: lineas.map(({ _id, ...l }) => l),
      confirmado: true,
      creadoPor: "Administrador",
    });

    setGuardado(true);
    limpiarFormulario();
    setMostrarForm(false);
  }

  if (!montado || cargandoAsientos) {
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
          <h2 className="text-2xl font-bold text-white">Asientos contables</h2>
          <p className="text-sm text-gray-500 mt-1">
            {asientos.length} asiento{asientos.length !== 1 ? "s" : ""} registrado{asientos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setMostrarForm((v) => !v); setErrores([]); setGuardado(false); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {mostrarForm ? "Cancelar" : "+ Nuevo asiento"}
        </button>
      </div>

      {guardado && (
        <div className="bg-green-950 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
          ✓ Asiento registrado correctamente. Partida doble verificada.
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-300">Nuevo asiento contable</h3>

          {errores.length > 0 && (
            <div role="alert" className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 space-y-1">
              {errores.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="fecha" className="block text-sm text-gray-400">Fecha <span className="text-red-500">*</span></label>
              <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="descripcion-asiento" className="block text-sm text-gray-400">Descripción <span className="text-red-500">*</span></label>
              <input id="descripcion-asiento" type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Pago de servicios de oficina"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 uppercase tracking-wider px-1">
              <span className="col-span-4">Cuenta</span>
              <span className="col-span-3">Descripción</span>
              <span className="col-span-2 text-right">Débito</span>
              <span className="col-span-2 text-right">Crédito</span>
              <span className="col-span-1" />
            </div>

            {lineas.map((linea) => (
              <div key={linea._id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <select value={linea.cuentaId} onChange={(e) => actualizarLinea(linea._id, "cuentaId", e.target.value)}
                    aria-label="Seleccionar cuenta"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Cuenta —</option>
                    {cuentas.filter(c => c.activa).map((c) => (
                      <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input type="text" value={linea.descripcion} onChange={(e) => actualizarLinea(linea._id, "descripcion", e.target.value)}
                    placeholder="Detalle" aria-label="Descripción de línea"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <input type="number" min="0" step="0.01" value={linea.debito || ""} onChange={(e) => actualizarLinea(linea._id, "debito", e.target.value)}
                    placeholder="0.00" aria-label="Débito"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <input type="number" min="0" step="0.01" value={linea.credito || ""} onChange={(e) => actualizarLinea(linea._id, "credito", e.target.value)}
                    placeholder="0.00" aria-label="Crédito"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => eliminarLinea(linea._id)} disabled={lineas.length <= 2}
                    aria-label="Eliminar línea" className="text-gray-600 hover:text-red-400 disabled:opacity-20 transition text-lg leading-none">×</button>
                </div>
              </div>
            ))}

            <button type="button" onClick={agregarLinea} className="text-blue-400 hover:text-blue-300 text-sm transition mt-1">
              + Agregar línea
            </button>
          </div>

          <div className={`rounded-lg px-4 py-3 border text-sm flex items-center justify-between ${
            cuadra && totalDebitos > 0 ? "bg-green-950 border-green-800 text-green-300" : "bg-gray-800 border-gray-700 text-gray-400"
          }`}>
            <span className="font-medium">{cuadra && totalDebitos > 0 ? "✓ Partida doble cuadrada" : "Verificando partida doble..."}</span>
            <div className="flex gap-6 font-mono">
              <span>Débitos: <strong>{formatearMoneda(totalDebitos)}</strong></span>
              <span>Créditos: <strong>{formatearMoneda(totalCreditos)}</strong></span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              Registrar asiento
            </button>
            <button type="button" onClick={() => { setMostrarForm(false); limpiarFormulario(); }}
              className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
          </div>
        </form>
      )}

      {asientos.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-600 text-sm">No hay asientos registrados todavía.</p>
          <p className="text-gray-700 text-xs mt-1">Crea el primer asiento con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {asientos.map((asiento) => {
            const totalDeb = asiento.lineas.reduce((s, l) => s + l.debito, 0);
            return (
              <div key={asiento.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{asiento.descripcion}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(asiento.fecha).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}
                      {" · "}{asiento.creadoPor}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-300">{formatearMoneda(totalDeb)}</span>
                    <span className="text-xs bg-green-950 text-green-400 border border-green-800 rounded-full px-2.5 py-1">✓ Cuadrado</span>
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-600">
                        <th className="text-left pb-1 font-normal">Cuenta</th>
                        <th className="text-left pb-1 font-normal hidden sm:table-cell">Descripción</th>
                        <th className="text-right pb-1 font-normal">Débito</th>
                        <th className="text-right pb-1 font-normal">Crédito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {asiento.lineas.map((linea, i) => {
                        const cuenta = cuentas.find((c) => c.id === linea.cuentaId);
                        return (
                          <tr key={i} className="text-gray-300">
                            <td className="py-1">{cuenta ? `${cuenta.codigo} ${cuenta.nombre}` : linea.cuentaId}</td>
                            <td className="py-1 text-gray-500 hidden sm:table-cell">{linea.descripcion}</td>
                            <td className="py-1 text-right font-mono">{linea.debito > 0 ? formatearMoneda(linea.debito) : ""}</td>
                            <td className="py-1 text-right font-mono">{linea.credito > 0 ? formatearMoneda(linea.credito) : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
