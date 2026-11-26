"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo: string;
  archivo_tamano: number;
  estado: string;
  notas: string | null;
  monto_detectado: number | null;
  fecha_detectada: string | null;
  proveedor_detectado: string | null;
  creado_en: string;
}

const TIPOS_DOC = ["factura", "recibo", "comprobante", "contrato", "otro"];
const TIPOS_MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB

const colorEstado: Record<string, string> = {
  pendiente:     "bg-yellow-950 text-yellow-400 border-yellow-800",
  revisado:      "bg-blue-950 text-blue-400 border-blue-800",
  contabilizado: "bg-green-950 text-green-400 border-green-800",
  rechazado:     "bg-red-950 text-red-400 border-red-800",
};

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [documentoVista, setDocumentoVista] = useState<Documento | null>(null);
  const [urlVista, setUrlVista] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nombre: "",
    tipo: "factura",
    notas: "",
    montoDetectado: "",
    fechaDetectada: "",
    proveedorDetectado: "",
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  useEffect(() => { setMontado(true); }, []);
  useEffect(() => { if (montado && empresaActual) cargar(); }, [montado, empresaActual?.id]);

  async function cargar() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("documentos").select("*")
      .eq("empresa_id", empresaActual.id)
      .order("creado_en", { ascending: false });
    setDocumentos((data ?? []) as Documento[]);
    setCargando(false);
  }

  function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!TIPOS_MIME_PERMITIDOS.includes(f.type)) {
      setMensaje({ texto: "Tipo de archivo no permitido. Solo PDF, JPG, PNG y WEBP.", tipo: "error" });
      return;
    }
    if (f.size > TAMANO_MAXIMO) {
      setMensaje({ texto: "El archivo supera el límite de 10 MB.", tipo: "error" });
      return;
    }

    setArchivo(f);
    setMensaje({ texto: "", tipo: "" });

    // Auto-completar nombre si está vacío
    if (!form.nombre) {
      setForm((prev) => ({ ...prev, nombre: f.name.replace(/\.[^/.]+$/, "") }));
    }

    // Preview para imágenes
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview("");
    }
  }

  async function handleSubir(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });

    if (!archivo) { setMensaje({ texto: "Selecciona un archivo.", tipo: "error" }); return; }
    if (!form.nombre.trim()) { setMensaje({ texto: "El nombre es obligatorio.", tipo: "error" }); return; }

    setSubiendo(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Ruta única en Storage: empresa_id/timestamp_nombre
    const extension = archivo.name.split(".").pop();
    const ruta = `${empresaActual!.id}/${Date.now()}_${form.nombre.trim().replace(/\s+/g, "_")}.${extension}`;

    const { error: errStorage } = await supabase.storage
      .from("documentos")
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

    if (errStorage) {
      setSubiendo(false);
      setMensaje({ texto: "Error al subir el archivo: " + errStorage.message, tipo: "error" });
      return;
    }

    const { error: errDB } = await supabase.from("documentos").insert({
      empresa_id: empresaActual!.id,
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      archivo_url: ruta,
      archivo_nombre: archivo.name,
      archivo_tipo: archivo.type,
      archivo_tamano: archivo.size,
      estado: "pendiente",
      notas: form.notas.trim() || null,
      monto_detectado: parseFloat(form.montoDetectado) || null,
      fecha_detectada: form.fechaDetectada || null,
      proveedor_detectado: form.proveedorDetectado.trim() || null,
      subido_por: user?.email ?? "sistema",
    });

    setSubiendo(false);

    if (errDB) {
      // Si falla la DB, eliminar el archivo subido
      await supabase.storage.from("documentos").remove([ruta]);
      setMensaje({ texto: "Error al guardar el documento: " + errDB.message, tipo: "error" });
      return;
    }

    setMensaje({ texto: "Documento subido correctamente.", tipo: "exito" });
    setForm({ nombre: "", tipo: "factura", notas: "", montoDetectado: "", fechaDetectada: "", proveedorDetectado: "" });
    setArchivo(null);
    setPreview("");
    setMostrarForm(false);
    if (inputRef.current) inputRef.current.value = "";
    cargar();
  }

  async function verDocumento(doc: Documento) {
    setDocumentoVista(doc);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.archivo_url, 60);
    setUrlVista(data?.signedUrl ?? "");
  }

  async function eliminarDocumento(doc: Documento) {
    if (!confirm(`¿Seguro que deseas eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    const supabase = createSupabaseBrowserClient();
    // Eliminar archivo del storage
    await supabase.storage.from("documentos").remove([doc.archivo_url]);
    // Eliminar registro de la base de datos
    await supabase.from("documentos").delete().eq("id", doc.id);
    setDocumentoVista(null);
    setMensaje({ texto: "Documento eliminado.", tipo: "exito" });
    cargar();
  }

  async function cambiarEstado(id: string, estado: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("documentos").update({ estado }).eq("id", id);
    setDocumentoVista(null);
    cargar();
  }

  const documentosFiltrados = filtroEstado === "todos"
    ? documentos
    : documentos.filter(d => d.estado === filtroEstado);

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Documentos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {documentos.length} documento{documentos.length !== 1 ? "s" : ""} · {documentos.filter(d => d.estado === "pendiente").length} pendiente{documentos.filter(d => d.estado === "pendiente").length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "↑ Subir documento"}
        </button>
      </div>

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.tipo === "exito" ? "✓ " : "• "}{mensaje.texto}
        </div>
      )}

      {/* Formulario de subida */}
      {mostrarForm && (
        <form onSubmit={handleSubir} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-300">Subir documento</h3>

          {/* Área de selección de archivo */}
          <div
            className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition"
            onClick={() => inputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Vista previa" className="max-h-32 mx-auto rounded-lg object-contain" />
            ) : archivo ? (
              <div className="space-y-1">
                <p className="text-2xl">📄</p>
                <p className="text-sm text-white">{archivo.name}</p>
                <p className="text-xs text-gray-500">{formatearTamano(archivo.size)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl">📁</p>
                <p className="text-sm text-gray-400">Haz clic para seleccionar un archivo</p>
                <p className="text-xs text-gray-600">PDF, JPG, PNG, WEBP · Máx. 10 MB</p>
              </div>
            )}
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleArchivoSeleccionado} className="hidden" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-sm text-gray-400">Nombre *</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Factura Proveedor ABC"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TIPOS_DOC.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Monto (si aplica)</label>
              <input type="number" min="0" step="0.01" value={form.montoDetectado}
                onChange={(e) => setForm({ ...form, montoDetectado: e.target.value })}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Fecha del documento</label>
              <input type="date" value={form.fechaDetectada} onChange={(e) => setForm({ ...form, fechaDetectada: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Proveedor / Emisor</label>
              <input type="text" value={form.proveedorDetectado} onChange={(e) => setForm({ ...form, proveedorDetectado: e.target.value })}
                placeholder="Nombre del proveedor"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <label className="block text-sm text-gray-400">Notas</label>
              <input type="text" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Observaciones opcionales"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={subiendo || !archivo}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              {subiendo ? "Subiendo..." : "Subir documento"}
            </button>
            <button type="button" onClick={() => { setMostrarForm(false); setArchivo(null); setPreview(""); }}
              className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {["todos", "pendiente", "revisado", "contabilizado", "rechazado"].map((estado) => (
          <button key={estado} onClick={() => setFiltroEstado(estado)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filtroEstado === estado ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}>
            {estado === "todos" ? "Todos" : estado.charAt(0).toUpperCase() + estado.slice(1)}
            {estado !== "todos" && (
              <span className="ml-1.5 text-gray-500">({documentos.filter(d => d.estado === estado).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de documentos */}
      {documentosFiltrados.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-600 text-sm">No hay documentos{filtroEstado !== "todos" ? ` con estado "${filtroEstado}"` : ""}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentosFiltrados.map((doc) => (
            <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 hover:border-gray-600 transition">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{doc.nombre}</p>
                  <p className="text-xs text-gray-500 capitalize">{doc.tipo} · {formatearTamano(doc.archivo_tamano)}</p>
                </div>
                <span className="text-2xl ml-2">{doc.archivo_tipo === "application/pdf" ? "📄" : "🖼"}</span>
              </div>

              {(doc.monto_detectado || doc.proveedor_detectado) && (
                <div className="space-y-1 text-xs text-gray-400">
                  {doc.proveedor_detectado && <p>🏢 {doc.proveedor_detectado}</p>}
                  {doc.monto_detectado && <p>💰 {formatearMoneda(doc.monto_detectado)}</p>}
                  {doc.fecha_detectada && <p>📅 {new Date(doc.fecha_detectada).toLocaleDateString("es-PA")}</p>}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className={`text-xs border rounded-full px-2.5 py-1 ${colorEstado[doc.estado]}`}>
                  {doc.estado.charAt(0).toUpperCase() + doc.estado.slice(1)}
                </span>
                <button onClick={() => verDocumento(doc)}
                  className="text-blue-400 hover:text-blue-300 text-xs transition">
                  Ver documento →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de vista de documento */}
      {documentoVista && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setDocumentoVista(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-semibold">{documentoVista.nombre}</h3>
                <p className="text-xs text-gray-500 capitalize">{documentoVista.tipo} · {formatearTamano(documentoVista.archivo_tamano)}</p>
              </div>
              <button onClick={() => setDocumentoVista(null)} className="text-gray-500 hover:text-white text-xl transition">×</button>
            </div>

            {/* Vista del archivo */}
            {urlVista && (
              documentoVista.archivo_tipo === "application/pdf" ? (
                <iframe src={urlVista} className="w-full h-64 rounded-lg border border-gray-700" title="PDF" />
              ) : (
                <img src={urlVista} alt={documentoVista.nombre} className="w-full rounded-lg object-contain max-h-64" />
              )
            )}

            {/* Información */}
            <div className="space-y-2 text-sm">
              {documentoVista.proveedor_detectado && <div className="flex justify-between"><span className="text-gray-400">Proveedor</span><span className="text-white">{documentoVista.proveedor_detectado}</span></div>}
              {documentoVista.monto_detectado && <div className="flex justify-between"><span className="text-gray-400">Monto</span><span className="text-white font-mono">{formatearMoneda(documentoVista.monto_detectado)}</span></div>}
              {documentoVista.fecha_detectada && <div className="flex justify-between"><span className="text-gray-400">Fecha</span><span className="text-white">{new Date(documentoVista.fecha_detectada).toLocaleDateString("es-PA")}</span></div>}
              {documentoVista.notas && <div className="flex justify-between"><span className="text-gray-400">Notas</span><span className="text-white">{documentoVista.notas}</span></div>}
            </div>

            {/* Acciones de estado */}
            <div className="border-t border-gray-800 pt-4">
              <p className="text-xs text-gray-500 mb-3">Cambiar estado:</p>
              <div className="flex gap-2 flex-wrap">
                {["pendiente", "revisado", "contabilizado", "rechazado"].map((estado) => (
                  <button key={estado} onClick={() => cambiarEstado(documentoVista.id, estado)}
                    disabled={documentoVista.estado === estado}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-40 ${colorEstado[estado]}`}>
                    {estado.charAt(0).toUpperCase() + estado.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Enlace de descarga */}
            {urlVista && (
              <div className="flex gap-3 justify-center">
                <a href={urlVista} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm transition">
                  ↗ Abrir en nueva pestaña
                </a>
                <a href={urlVista} download={documentoVista.archivo_nombre}
                  className="text-green-400 hover:text-green-300 text-sm transition">
                  ↓ Descargar archivo
                </a>
              </div>
            )}

            {/* Eliminar documento */}
            {documentoVista.estado === "pendiente" && (
              <div className="border-t border-gray-800 pt-4 text-center">
                <button onClick={() => eliminarDocumento(documentoVista)}
                  className="text-red-400 hover:text-red-300 text-xs transition">
                  🗑 Eliminar documento
                </button>
                <p className="text-xs text-gray-700 mt-1">Solo documentos pendientes pueden eliminarse.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
