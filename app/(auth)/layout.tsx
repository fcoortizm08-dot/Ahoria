export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#07090f] flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1117] border-r border-[#1e2d45] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="text-white font-bold text-base">
            Ahoria
          </span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Tus finanzas,<br />
            <span className="text-blue-400">claras.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Entiende tu situación financiera en menos de 1 minuto
            y toma mejores decisiones sin depender de planillas complejas.
          </p>
          <div className="flex flex-col gap-3">
            {[
              '✓ Dashboard financiero en tiempo real',
              '✓ Control de ingresos, gastos y deudas',
              '✓ Metas de ahorro con progreso visual',
            ].map(item => (
              <div key={item} className="text-sm text-slate-400">{item}</div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600">© 2025 Ahoria.</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  )
}