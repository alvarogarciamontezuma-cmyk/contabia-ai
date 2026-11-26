"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";
import { calcularPlanillaEmpleado, TASAS_PANAMA } from "@/lib/contabilidad/planilla";
import { generarReciboPlanillaPDF, exportarCSV } from "@/lib/utils/pdf";

interface Empleado { id: string; nombre: string; apellido: string; salario_base: number; }

interface LineaPlanillaForm {
  empleadoId: string;
  nombre: string;
  salarioBase: number;
  horasExtra: number;
  tipoHoraExtra: "diurna" | "nocturna";
  otrosIngresos: number;
  otrasDeducciones: number;
}

interface Planilla {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  total_salarios: number;
  total_deducciones: number;
  total_neto: number;
  creado_en: string;
}

export default function PlanillaPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [lineas, setLineas] = useState<LineaPlanillaForm[]>([]);
  const [form, setForm] = useState({ periodo: "", fechaInicio: "", fechaFin: "" });

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    setForm({
      periodo: `${hoy.toLocaleString("es-PA", { month: "long" })} ${yyyy}`,
      fechaInicio: `${yyyy}-${mm}-01`,
      fechaFin: `${yyyy}-${mm}-${String(hoy.getDate()).padStart(2, "0")}`,
    });
  }, []);

  useEffect(() => { if (montado && empresaActual) { cargarPlanillas(); cargarEmpleados(); } }, [montado, empresaActual?.id]);

  async function cargarPlanillas() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("planillas").select("*").eq("empresa_id", empresaActual.id).order("creado_en", { ascending: false });
    setPlanillas((data ?? []) as Planilla[]);
    setCargando(false);
  }

  async function cargarEmpleados() {
    if (!empresaActual) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("empleados").select("id, nombre, apellido, salario_base").eq("empresa_id", empresaActual.id).eq("activo", true).order("apellido");
    const lista = (data ?? []) as Empleado[];
    setEmpleados(lista);
    setLineas(lista.map(e => ({ empleadoId: e.id, nombre: `${e.apellido}, ${e.nombre}`, salarioBase: e.salario_base, horasExtra: 0, tipoHoraExtra: "diurna", otrosIngresos: 0, otrasDeducciones: 0 })));
  }

  function actualizarLinea(idx: number, campo: keyof LineaPlanillaForm, valor: string | number) {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!form.periodo.trim()) { setMensaje({ texto: "El período es obligatorio.", tipo: "error" }); return; }
    if (lineas.length === 0) { setMensaje({ texto: "No hay empleados activos.", tipo: "error" }); return; }

    setGuardando(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    const resultados = lineas.map(l => ({
      linea: l,
      calculo: calcularPlanillaEmpleado({ salarioBase: l.salarioBase, horasExtra: l.horasExtra, tipoHoraExtra: l.tipoHoraExtra, otrosIngresos: l.otrosIngresos, otrasDeducciones: l.otrasDeducciones }),
    }));

    const totalSalarios = resultados.reduce((s, r) => s + r.calculo.totalIngresos, 0);
    const totalDeducciones = resultados.reduce((s, r) => s + r.calculo.totalDeducciones, 0);
    const totalNeto = resultados.reduce((s, r) => s + r.calculo.salarioNeto, 0);

    const { data: planilla, error: errPlanilla } = await supabase.from("planillas").insert({
      empresa_id: empresaActual!.id, periodo: form.periodo.trim(),
      fecha_inicio: form.fechaInicio, fecha_fin: form.fechaFin,
      estado: "borrador", total_salarios: totalSalarios,
      total_deducciones: totalDeducciones, total_neto: totalNeto,
      creado_por: user?.email ?? "sistema",
    }).select().single();

    if (errPlanilla) { setGuardando(false); setMensaje({ texto: "Error: " + errPlanilla.message, tipo: "error" }); return; }

    const lineasDB = resultados.map(r => ({
      planilla_id: planilla.id, empleado_id: r.linea.empleadoId,
      empresa_id: empresaActual!.id, salario_base: r.calculo.salarioBase,
      horas_extra: r.linea.horasExtra, monto_horas_extra: r.calculo.montoHorasExtra,
      otros_ingresos: r.calculo.otrosIngresos, total_ingresos: r.calculo.totalIngresos,
      css_empleado: r.calculo.cssEmpleado, seguro_educativo: r.calculo.seguroEducativo,
      impuesto_renta: r.calculo.impuestoRenta, otras_deducciones: r.calculo.otrasDeducciones,
      total_deducciones: r.calculo.totalDeducciones, salario_neto: r.calculo.salarioNeto,
      decimo_tercer_mes: r.calculo.decimoTercerMes,
    }));

    await supabase.from("lineas_planilla").insert(lineasDB);
    setGuardando(false);
    setMensaje({ texto: `Planilla "${form.periodo}" creada correctamente.`, tipo: "exito" });
    setMostrarForm(false);
    cargarPlanillas();
  }

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Planilla</h2>
          <p className="text-sm text-gray-500 mt-1">Cálculo de salarios y deducciones — Panamá</p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "+ Nueva planilla"}
        </button>
      </div>

      <div className="bg-yellow-950 border border-yellow-800 rounded-xl px-4 py-3">
        <p className="text-xs text-yellow-400">
          ⚠ Los cálculos de CSS ({(TASAS_PANAMA.CSS_EMPLEADO * 100).toFixed(2)}% empleado / {(TASAS_PANAMA.CSS_PATRONAL * 100).toFixed(2)}% patronal), seguro educativo e ISR son de referencia.
          Verificar tasas vigentes con la CSS y la DGI antes de realizar pagos reales.
        </p>
      </div>

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-300">Nueva planilla</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-1">
              <label className="block text-sm text-gray-400">Período *</label>
              <input type="text" value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Desde</label>
              <input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Hasta</label>
              <input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {lineas.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No hay empleados activos. Regístralos primero en el módulo de Empleados.</p>
          ) : (
            <div className="space-y-2 overflow-x-auto">
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 uppercase tracking-wider px-1 min-w-[700px]">
                <span className="col-span-3">Empleado</span>
                <span className="col-span-2 text-right">Salario base</span>
                <span className="col-span-1 text-right">H. Extra</span>
                <span className="col-span-2">Tipo H.E.</span>
                <span className="col-span-2 text-right">Otros ing.</span>
                <span className="col-span-2 text-right">Neto aprox.</span>
              </div>
              {lineas.map((linea, idx) => {
                const calc = calcularPlanillaEmpleado({ salarioBase: linea.salarioBase, horasExtra: linea.horasExtra, tipoHoraExtra: linea.tipoHoraExtra, otrosIngresos: linea.otrosIngresos, otrasDeducciones: linea.otrasDeducciones });
                return (
                  <div key={linea.empleadoId} className="grid grid-cols-12 gap-2 items-center min-w-[700px]">
                    <div className="col-span-3 text-sm text-white truncate">{linea.nombre}</div>
                    <div className="col-span-2">
                      <input type="number" min="0" step="0.01" value={linea.salarioBase}
                        onChange={(e) => actualizarLinea(idx, "salarioBase", parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-1">
                      <input type="number" min="0" step="0.5" value={linea.horasExtra}
                        onChange={(e) => actualizarLinea(idx, "horasExtra", parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2">
                      <select value={linea.tipoHoraExtra} onChange={(e) => actualizarLinea(idx, "tipoHoraExtra", e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="diurna">Diurna</option>
                        <option value="nocturna">Nocturna</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0" step="0.01" value={linea.otrosIngresos}
                        onChange={(e) => actualizarLinea(idx, "otrosIngresos", parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2 text-right font-mono text-green-400 text-sm font-semibold">
                      {formatearMoneda(calc.salarioNeto)}
                    </div>
                  </div>
                );
              })}

              {/* Resumen total */}
              <div className="bg-gray-800 rounded-xl p-4 mt-3 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Total bruto</p>
                  <p className="text-white font-mono font-bold">
                    {formatearMoneda(lineas.reduce((s, l) => s + calcularPlanillaEmpleado({ salarioBase: l.salarioBase, horasExtra: l.horasExtra, tipoHoraExtra: l.tipoHoraExtra, otrosIngresos: l.otrosIngresos, otrasDeducciones: l.otrasDeducciones }).totalIngresos, 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Total deducciones</p>
                  <p className="text-red-400 font-mono font-bold">
                    {formatearMoneda(lineas.reduce((s, l) => s + calcularPlanillaEmpleado({ salarioBase: l.salarioBase, horasExtra: l.horasExtra, tipoHoraExtra: l.tipoHoraExtra, otrosIngresos: l.otrosIngresos, otrasDeducciones: l.otrasDeducciones }).totalDeducciones, 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Total neto a pagar</p>
                  <p className="text-green-400 font-mono font-bold">
                    {formatearMoneda(lineas.reduce((s, l) => s + calcularPlanillaEmpleado({ salarioBase: l.salarioBase, horasExtra: l.horasExtra, tipoHoraExtra: l.tipoHoraExtra, otrosIngresos: l.otrosIngresos, otrasDeducciones: l.otrasDeducciones }).salarioNeto, 0))}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={guardando || lineas.length === 0}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              {guardando ? "Guardando..." : "Crear planilla"}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
          </div>
        </form>
      )}

      {/* Historial */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {planillas.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No hay planillas generadas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Período</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Bruto</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Deducciones</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Neto</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {planillas.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-white font-medium">{p.periodo}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-300 hidden sm:table-cell">{formatearMoneda(p.total_salarios)}</td>
                  <td className="px-5 py-3 text-right font-mono text-red-400 hidden sm:table-cell">{formatearMoneda(p.total_deducciones)}</td>
                  <td className="px-5 py-3 text-right font-mono text-green-400 font-semibold">{formatearMoneda(p.total_neto)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${p.estado === "pagada" ? "bg-green-950 text-green-400 border-green-800" : p.estado === "aprobada" ? "bg-blue-950 text-blue-400 border-blue-800" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={async () => {
                      const supabase = createSupabaseBrowserClient();
                      const { data: lineas } = await supabase
                        .from("lineas_planilla")
                        .select("*, empleados(nombre, apellido)")
                        .eq("planilla_id", p.id);
                      (lineas ?? []).forEach((l: any) => {
                        generarReciboPlanillaPDF({
                          empresa: { nombre: empresaActual?.nombre ?? "", ruc: empresaActual?.ruc },
                          empleado: `${l.empleados?.apellido ?? ""}, ${l.empleados?.nombre ?? ""}`,
                          periodo: p.periodo,
                          salarioBase: Number(l.salario_base),
                          horasExtra: Number(l.horas_extra),
                          montoHorasExtra: Number(l.monto_horas_extra),
                          otrosIngresos: Number(l.otros_ingresos),
                          totalIngresos: Number(l.total_ingresos),
                          cssEmpleado: Number(l.css_empleado),
                          seguroEducativo: Number(l.seguro_educativo),
                          impuestoRenta: Number(l.impuesto_renta),
                          otrasDeducciones: Number(l.otras_deducciones),
                          totalDeducciones: Number(l.total_deducciones),
                          salarioNeto: Number(l.salario_neto),
                          decimoTercerMes: Number(l.decimo_tercer_mes),
                        });
                      });
                      exportarCSV(
                        `Planilla_${p.periodo}`,
                        ["Empleado", "Bruto", "CSS", "Seg.Edu", "ISR", "Deducciones", "Neto", "Décimo"],
                        (lineas ?? []).map((l: any) => [
                          `${l.empleados?.apellido ?? ""}, ${l.empleados?.nombre ?? ""}`,
                          l.total_ingresos, l.css_empleado, l.seguro_educativo,
                          l.impuesto_renta, l.total_deducciones, l.salario_neto, l.decimo_tercer_mes,
                        ])
                      );
                    }} className="text-green-400 hover:text-green-300 text-xs transition">
                      ↓ Recibos + CSV
                    </button>
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
