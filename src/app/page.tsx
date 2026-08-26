import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-semibold text-slate-900 tracking-tight">
            Guru Digital
          </span>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
          Buat Soal Berkualitas<br />
          <span className="text-blue-600">dengan Bantuan AI</span>
        </h1>
        <p className="text-slate-500 text-lg mb-10 leading-relaxed">
          Platform AI untuk guru Indonesia. Buat soal ujian, ulangan, dan latihan
          untuk semua jenjang dan mata pelajaran dalam hitungan detik.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-center"
          >
            Mulai Gratis
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-white text-slate-700 rounded-xl font-medium border border-slate-200 hover:bg-slate-50 transition-colors text-center"
          >
            Masuk
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { label: 'Jenjang', value: 'SD • SMP • SMA' },
            { label: 'Mata Pelajaran', value: '18 Mapel' },
            { label: 'Bentuk Soal', value: '6 Tipe' },
          ].map((f) => (
            <div key={f.label} className="p-4 bg-white rounded-xl border border-slate-100">
              <div className="text-sm font-medium text-slate-900">{f.value}</div>
              <div className="text-xs text-slate-400 mt-1">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
