"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  cargo: string | null;
  departamento: string | null;
  fecha_ingreso: string;
  salario_base: number;
  tipo_contrato: string;
  activo: boolean;
}

export default function EmpleadosPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [form, setForm] = useState({
    nombre: "", apellido: "", cedula: "", cargo: "",
    departamento: "", fechaIngreso: "", salarioBase: "", tipoContrato: "indefinido",
  });

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    setForm((f) => ({ ...f, fechaIngreso: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}` }));
  }, []);

  useEffect(() => { if (montado && empresaActual) cargar(); }, [montado, empresaActual?.id]);

  async function cargar() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("empleados").select("*")
      .eq("empresa_id", empresaActual.id).order("apellido");
    setEmpleados((data ?? []) as Empleado[]);
    setCargando(false);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!form.nombre.trim()) { setMensaje({ texto: "El nombre es obligatorio.", tipo: "error" }); return; }
    if (!form.apellido.trim()) { setMensaje({ texto: "El apellido es obligatorio.", tipo: "error" }); return; }
    if (!form.fechaIngreso) { setMensaje({ texto: "La fecha de ingreso es obligatoria.", tipo: "error" }); return; }
    if (!form.salarioBase) { setMensaje({ texto: "El salario base es obligatorio.", tipo: "error" }); return; }

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("empleados").insert({
      empresa_id: empresaActual!.id,
      nombre: form.nombre.trim(), apellido: form.apellido.trim(),
      cedula: form.cedula.trim() || null, cargo: form.cargo.trim() || null,
      departamento: form.departamento.trim() || null,
      fecha_ingreso: form.fechaIngreso,
      salario_base: parseFloat(form.salarioBase) || 0,
      tipo_contrato: form.tipoContrato,
    });

    if (error) { setMensaje({ texto: "Error: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Empleado registrado.", tipo: "exito" });
    setForm((f) => ({ ...f, nombre: "", apellido: "", cedula: "", cargo: "", departamento: "", salarioBase: "" }));
    setMostrarForm(false);
    cargar();
  }

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  const totalNomina = empleados.filter(e => e.activo).reduce((s, e) => s + e.salario_base, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Empleados</h2>
          <p className="text-sm text-gray-500 mt-1">{empleados.filter(e => e.activo).length} empleado{empleados.filter(e => e.activo).length !== 1 ? "s" : ""} activo{empleados.filter(e => e.activo).length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "+ Nuevo empleado"}
        </button>
      </div>

      {empleados.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-gray-400">Total nómina mensual (salarios base)</span>
          <span className="font-mono font-bold text-white">{formatearMoneda(totalNomina)}</span>
        </div>
      )}

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Nuevo empleado</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: "enombre", label: "Nombre *", campo: "nombre" as const, placeholder: "Juan" },
              { id: "eapellido", label: "Apellido *", campo: "apellido" as const, placeholder: "García" },
              { id: "ecedula", label: "Cédula", campo: "cedula" as const, placeholder: "8-123-456" },
              { id: "ecargo", label: "Cargo", campo: "cargo" as const, placeholder: "Contador" },
              { id: "edepartamento", label: "Departamento", campo: "departamento" as const, placeholder: "Administración" },
              { id: "esalario", label: "Salario base *", campo: "salarioBase" as const, placeholder: "0.00" },
            ].map(({ id, label, campo, placeholder }) => (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className="block text-sm text-gray-400">{label}</label>
                <input id={id} type="text" value={form[campo]} onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Fecha de ingreso *</label>
              <input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Tipo de contrato</label>
              <select value={form.tipoContrato} onChange={(e) => setForm({ ...form, tipoContrato: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="indefinido">Indefinido</option>
                <option value="temporal">Temporal</option>
                <option value="por_obra">Por obra</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition">Guardar</button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {empleados.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No hay empleados registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Nombre</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Cargo</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden md:table-cell">Cédula</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Salario base</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {empleados.map((e) => (
                <tr key={e.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-white">{e.apellido}, {e.nombre}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{e.cargo ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 hidden md:table-cell font-mono text-xs">{e.cedula ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-white">{formatearMoneda(e.salario_base)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${e.activo ? "bg-green-950 text-green-400 border-green-800" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                      {e.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-700">
        ⚠ Los cálculos de planilla deben validarse con un profesional de recursos humanos o abogado laboral antes de realizar pagos reales.
      </p>
    </div>
  );
}
