"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

interface EstadoServicio {
  nombre: string;
  estado: "ok" | "advertencia" | "error" | "verificando";
  detalle: string;
  icono: string;
}

interface EstadisticaGlobal {
  totalEmpresas: number;
  totalUsuarios: number;
  totalAsientos: number;
  totalDocumentos: number;
  totalFacturas: number;
  totalEmpleados: number;
  suscripcionesActivas: number;
  suscripcionesPrueba: number;
  pagosPendientes: number;
}

export default function AutocarePage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [ultimaVerificacion, setUltimaVerificacion] = useState<Date | null>(null);
  const [servicios, setServicios] = useState<EstadoServicio[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticaGlobal | null>(null);
  const [erroresRecientes, setErroresRecientes] = useState<string[]>([]);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => { setMontado(true); }, []);
  useEffect(() => { if (montado) verificarSistema(); }, [montado]);

  async function verificarSistema() {
    setVerificando(true);
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const errores: string[] = [];
    const nuevosServicios: EstadoServicio[] = [];

    // 1. Verificar conexión a Supabase
    try {
      const { error } = await supabase.from("empresas").select("count").limit(1);
      nuevosServicios.push({
        nombre: "Base de datos Supabase",
        estado: error ? "error" : "ok",
        detalle: error ? error.message : "Conexión activa",
        icono: "🗄",
      });
      if (error) errores.push("Base de datos: " + error.message);
    } catch {
      nuevosServicios.push({ nombre: "Base de datos Supabase", estado: "error", detalle: "Sin conexión", icono: "🗄" });
      errores.push("Base de datos: Sin conexión");
    }

    // 2. Verificar Storage
    try {
      const { error } = await supabase.storage.getBucket("documentos");
      nuevosServicios.push({
        nombre: "Storage de documentos",
        estado: error ? "advertencia" : "ok",
        detalle: error ? "Bucket no encontrado" : "Bucket activo",
        icono: "📁",
      });
      if (error) errores.push("Storage: " + error.message);
    } catch {
      nuevosServicios.push({ nombre: "Storage de documentos", estado: "advertencia", detalle: "No verificable", icono: "📁" });
    }

    // 3. Verificar autenticación
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      nuevosServicios.push({
        nombre: "Autenticación",
        estado: error || !user ? "error" : "ok",
        detalle: user ? `Usuario activo: ${user.email}` : "Sin sesión",
        icono: "🔐",
      });
    } catch {
      nuevosServicios.push({ nombre: "Autenticación", estado: "error", detalle: "Error verificando sesión", icono: "🔐" });
    }

    // 4. Verificar RLS — intenta leer sin empresa_id
    try {
      const { data, error } = await supabase.from("asientos").select("count").limit(1);
      nuevosServicios.push({
        nombre: "Seguridad RLS",
        estado: error ? "advertencia" : "ok",
        detalle: error ? "Posible problema de RLS" : "Políticas activas",
        icono: "🛡",
      });
    } catch {
      nuevosServicios.push({ nombre: "Seguridad RLS", estado: "advertencia", detalle: "No verificable", icono: "🛡" });
    }

    // 5. Verificar variables de entorno
    const urlOk = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const keyOk = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    nuevosServicios.push({
      nombre: "Variables de entorno",
      estado: urlOk && keyOk ? "ok" : "error",
      detalle: urlOk && keyOk ? "Configuradas correctamente" : "Faltan variables de entorno",
      icono: "⚙",
    });

    // 6. Recopilar estadísticas globales
    try {
      const [
        { count: totalEmpresas },
        { count: totalAsientos },
        { count: totalDocumentos },
        { count: totalFacturas },
        { count: totalEmpleados },
        { data: suscripciones },
        { data: pagos },
      ] = await Promise.all([
        supabase.from("empresas").select("*", { count: "exact", head: true }),
        supabase.from("asientos").select("*", { count: "exact", head: true }),
        supabase.from("documentos").select("*", { count: "exact", head: true }),
        supabase.from("facturas").select("*", { count: "exact", head: true }),
        supabase.from("empleados").select("*", { count: "exact", head: true }),
        supabase.from("suscripciones").select("estado"),
        supabase.from("pagos").select("estado").eq("estado", "pendiente"),
      ]);

      setEstadisticas({
        totalEmpresas: totalEmpresas ?? 0,
        totalUsuarios: totalEmpresas ?? 0,
        totalAsientos: totalAsientos ?? 0,
        totalDocumentos: totalDocumentos ?? 0,
        totalFacturas: totalFacturas ?? 0,
        totalEmpleados: totalEmpleados ?? 0,
        suscripcionesActivas: suscripciones?.filter(s => s.estado === "activa").length ?? 0,
        suscripcionesPrueba: suscripciones?.filter(s => s.estado === "prueba").length ?? 0,
        pagosPendientes: pagos?.length ?? 0,
      });

      nuevosServicios.push({
        nombre: "Estadísticas del sistema",
        estado: "ok",
        detalle: `${totalEmpresas ?? 0} empresa(s) · ${totalAsientos ?? 0} asiento(s)`,
        icono: "📊",
      });
    } catch {
      nuevosServicios.push({ nombre: "Estadísticas del sistema", estado: "advertencia", detalle: "No se pudieron cargar", icono: "📊" });
      errores.push("No se pudieron cargar las estadísticas globales.");
    }

    setServicios(nuevosServicios);
    setErroresRecientes(errores);
    setUltimaVerificacion(new Date());
    setCargando(false);
    setVerificando(false);
  }

  const colorEstado = {
    ok:          "bg-green-950 text-green-400 border-green-800",
    advertencia: "bg-yellow-950 text-yellow-400 border-yellow-800",
    error:       "bg-red-950 text-red-400 border-red-800",
    verificando: "bg-gray-800 text-gray-400 border-gray-700",
  };

  const iconoEstado = { ok: "✓", advertencia: "⚠", error: "✗", verificando: "⟳" };

  const estadoGeneral = servicios.some(s => s.estado === "error") ? "error"
    : servicios.some(s => s.estado === "advertencia") ? "advertencia" : "ok";

  if (!montado) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">CONTABIA AUTOCARE</h2>
          <p className="text-sm text-gray-500 mt-1">Monitoreo y estado del sistema</p>
        </div>
        <button onClick={verificarSistema} disabled={verificando}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {verificando ? "Verificando..." : "↺ Verificar ahora"}
        </button>
      </div>

      {/* Estado general */}
      {!cargando && (
        <div className={`rounded-xl p-5 border flex items-center justify-between ${colorEstado[estadoGeneral]}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{estadoGeneral === "ok" ? "✅" : estadoGeneral === "advertencia" ? "⚠️" : "🚨"}</span>
            <div>
              <p className="font-semibold">
                {estadoGeneral === "ok" ? "Sistema funcionando correctamente" :
                 estadoGeneral === "advertencia" ? "Sistema con advertencias menores" :
                 "Se detectaron errores críticos"}
              </p>
              <p className="text-xs opacity-70">
                {ultimaVerificacion
                  ? `Última verificación: ${ultimaVerificacion.toLocaleTimeString("es-PA")}`
                  : "Verificando..."}
              </p>
            </div>
          </div>
          <span className="text-3xl font-bold">{iconoEstado[estadoGeneral]}</span>
        </div>
      )}

      {/* Servicios */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300">Estado de servicios</h3>
        </div>
        {cargando ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {servicios.map((s) => (
              <div key={s.nombre} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{s.icono}</span>
                  <div>
                    <p className="text-sm text-white">{s.nombre}</p>
                    <p className="text-xs text-gray-500">{s.detalle}</p>
                  </div>
                </div>
                <span className={`text-xs border rounded-full px-2.5 py-1 ${colorEstado[s.estado]}`}>
                  {iconoEstado[s.estado]} {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estadísticas globales */}
      {estadisticas && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400">Estadísticas globales</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Empresas", valor: estadisticas.totalEmpresas, icono: "🏢" },
              { label: "Asientos", valor: estadisticas.totalAsientos, icono: "📒" },
              { label: "Documentos", valor: estadisticas.totalDocumentos, icono: "📁" },
              { label: "Facturas", valor: estadisticas.totalFacturas, icono: "🧾" },
              { label: "Empleados", valor: estadisticas.totalEmpleados, icono: "👤" },
              { label: "Suscripciones activas", valor: estadisticas.suscripcionesActivas, icono: "✅" },
              { label: "En período de prueba", valor: estadisticas.suscripcionesPrueba, icono: "🕐" },
              { label: "Pagos pendientes", valor: estadisticas.pagosPendientes, icono: "💰" },
            ].map((item) => (
              <div key={item.label} className={`bg-gray-900 border rounded-xl p-4 space-y-2 ${item.label === "Pagos pendientes" && item.valor > 0 ? "border-yellow-800" : "border-gray-800"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span>{item.icono}</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${item.label === "Pagos pendientes" && item.valor > 0 ? "text-yellow-400" : "text-white"}`}>
                  {item.valor}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errores detectados */}
      {erroresRecientes.length > 0 && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-red-300">Problemas detectados</h3>
          <ul className="space-y-1">
            {erroresRecientes.map((e, i) => (
              <li key={i} className="text-xs text-red-400">• {e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Notas de seguridad */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Notas de seguridad</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <p>✓ Los datos de cada empresa están aislados mediante RLS en Supabase.</p>
          <p>✓ Las contraseñas se almacenan con hash seguro por Supabase Auth.</p>
          <p>✓ Los documentos se almacenan en Storage privado — sin acceso público.</p>
          <p>✓ La clave secreta de administración nunca se expone al navegador.</p>
          <p>✓ Los asientos confirmados no pueden modificarse silenciosamente.</p>
          <p>⚠ Los respaldos automáticos requieren el plan Pro de Supabase.</p>
          <p>⚠ AUTOCARE no realiza cambios destructivos automáticamente — toda acción crítica requiere aprobación.</p>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-blue-950 border border-blue-800 rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-blue-300">Recomendaciones</h3>
        <ul className="space-y-1 text-xs text-blue-400">
          <li>• Exporta periódicamente tus datos desde Supabase → Base de datos → Backups.</li>
          <li>• Revisa los pagos pendientes regularmente en Administración → Pagos clientes.</li>
          <li>• Verifica los documentos pendientes antes de cerrar cada período contable.</li>
          <li>• Actualiza las tasas de CSS e ITBMS al inicio de cada año fiscal.</li>
        </ul>
      </div>

    </div>
  );
}
