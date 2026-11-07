export default function Header() {
  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      {/* Empresa activa */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Empresa:</span>
        <span className="text-sm text-gray-300 font-medium">
          Empresa de prueba S.A.
        </span>
        <span className="text-xs bg-gray-800 text-gray-500 rounded px-2 py-0.5 ml-1">
          Demo
        </span>
      </div>

      {/* Usuario */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Administrador</span>
        <div
          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold"
          aria-label="Avatar del usuario"
        >
          A
        </div>
      </div>
    </header>
  );
}
