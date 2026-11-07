export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">

        {/* Logo / Nombre */}
        <div className="space-y-2">
          <h1 dir="ltr" className="text-5xl font-bold tracking-tight text-blue-400">
            CONTABIA AI
          </h1>
          <p className="text-lg text-gray-400">
            Plataforma de contabilidad, finanzas y administración empresarial
          </p>
        </div>

        {/* Estado del sistema */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Estado del sistema
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            <span className="text-sm text-gray-300">Servidor en línea</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            <span className="text-sm text-gray-300">Base de datos — pendiente de configuración</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />
            <span className="text-sm text-gray-300">Motor contable — en desarrollo</span>
          </div>
        </div>

        {/* Fase actual */}
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-300">
            <span className="font-semibold">Fase 1</span> — Estructura base del proyecto
          </p>
          <p className="text-xs text-blue-500 mt-1">Panamá · 2026</p>
        </div>

      </div>
    </main>
  );
}
