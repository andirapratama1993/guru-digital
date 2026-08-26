'use client'

import { useState, useRef } from 'react'
import {
  Sparkles, FileText, Image as ImageIcon, X,
  ChevronDown, Loader2, Bot, Menu, ChevronUp
} from 'lucide-react'
import { cn, TINGKAT_SEKOLAH, KELAS_BY_TINGKAT, MATA_PELAJARAN_BY_TINGKAT, BENTUK_SOAL_LABELS, AI_AGENT_LABELS } from '@/lib/utils'
import type {
  TingkatSekolah, MataPelajaran, TingkatKesulitan,
  BentukSoal, BentukSoalConfig, AIAgent, HasilSoal
} from '@/types'
import HasilSoalPanel from '@/components/soal/HasilSoalPanel'
import toast from 'react-hot-toast'

const KESULITAN: { value: TingkatKesulitan; label: string; color: string }[] = [
  { value: 'mudah', label: 'Mudah', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'sedang', label: 'Sedang', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'sulit', label: 'Sulit', color: 'bg-red-50 text-red-700 border-red-200' },
]

const BENTUK_SOAL_LIST: BentukSoal[] = [
  'pilihan_ganda', 'esai', 'isian_singkat',
  'menjodohkan', 'benar_salah', 'teka_teki_silang'
]

export default function DashboardPage() {
  const [tingkatSekolah, setTingkatSekolah] = useState<TingkatSekolah>('SMP')
  const [kelas, setKelas] = useState<number>(7)
  const [mataPelajaran, setMataPelajaran] = useState<MataPelajaran>('Matematika')
  const [kesulitan, setKesulitan] = useState<TingkatKesulitan>('sedang')
  const [selectedBentuk, setSelectedBentuk] = useState<Set<BentukSoal>>(new Set(['pilihan_ganda']))
  const [jumlahSoal, setJumlahSoal] = useState<Record<BentukSoal, number>>({
    pilihan_ganda: 10, esai: 5, isian_singkat: 5,
    menjodohkan: 3, benar_salah: 5, teka_teki_silang: 1
  })
  const [materi, setMateri] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string; type: 'image' | 'file' }[]>([])
  const [aiAgent, setAiAgent] = useState<AIAgent>('default')
  const [loading, setLoading] = useState(false)
  const [hasil, setHasil] = useState<HasilSoal | null>(null)
  const [formCollapsed, setFormCollapsed] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const mapelList = MATA_PELAJARAN_BY_TINGKAT[tingkatSekolah]
  const kelasList = KELAS_BY_TINGKAT[tingkatSekolah]

  function handleTingkatChange(t: TingkatSekolah) {
    setTingkatSekolah(t)
    setKelas(KELAS_BY_TINGKAT[t][0])
    setMataPelajaran(MATA_PELAJARAN_BY_TINGKAT[t][0])
  }

  function toggleBentuk(bentuk: BentukSoal) {
    setSelectedBentuk(prev => {
      const next = new Set(prev)
      if (next.has(bentuk)) {
        if (next.size === 1) return prev
        next.delete(bentuk)
      } else {
        next.add(bentuk)
      }
      return next
    })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      const reader = new FileReader()
      if (type === 'image') {
        reader.onload = (ev) => {
          setUploadedFiles(prev => [...prev, { name: file.name, content: ev.target?.result as string, type: 'image' }])
        }
        reader.readAsDataURL(file)
      } else {
        reader.onload = (ev) => {
          setUploadedFiles(prev => [...prev, { name: file.name, content: ev.target?.result as string, type: 'file' }])
        }
        reader.readAsText(file)
      }
    }
    e.target.value = ''
  }

  async function handleGenerate() {
    if (!materi.trim() && uploadedFiles.length === 0) {
      toast.error('Masukkan materi terlebih dahulu')
      return
    }

    const bentukSoalList: BentukSoalConfig[] = Array.from(selectedBentuk).map(b => ({
      bentuk: b,
      jumlah: jumlahSoal[b]
    }))

    setLoading(true)
    setHasil(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tingkatSekolah,
          kelas,
          mataPelajaran,
          tingkatKesulitan: kesulitan,
          bentukSoalList,
          materi: materi + (uploadedFiles.length > 0
            ? '\n\n[File tambahan: ' + uploadedFiles.map(f => f.name).join(', ') + ']'
            : ''),
          uploadedFiles,
          aiAgent,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat soal')
      }

      const data: HasilSoal = await res.json()
      setHasil(data)
      setFormCollapsed(true)
      toast.success('Soal berhasil dibuat!')
      // Scroll to hasil
      setTimeout(() => {
        document.getElementById('hasil-soal')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900">Buat Soal</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 hidden sm:block">Isi parameter di bawah lalu masukkan materi</p>
        </div>
        {hasil && (
          <button
            onClick={() => setFormCollapsed(!formCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {formCollapsed ? <><ChevronDown className="w-3.5 h-3.5" /> Tampilkan Form</> : <><ChevronUp className="w-3.5 h-3.5" /> Sembunyikan Form</>}
          </button>
        )}
      </div>

      {/* Form - collapsible after generate */}
      {!formCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Jenjang & Kelas */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jenjang & Kelas</label>
              {/* Jenjang */}
              <div className="flex gap-2 mt-3">
                {TINGKAT_SEKOLAH.map(t => (
                  <button
                    key={t}
                    onClick={() => handleTingkatChange(t)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                      tingkatSekolah === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {/* Kelas */}
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-2">Kelas</p>
                <div className="flex flex-wrap gap-2">
                  {kelasList.map(k => (
                    <button
                      key={k}
                      onClick={() => setKelas(k)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-sm font-semibold border transition-all',
                        kelas === k
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      )}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mata Pelajaran */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mata Pelajaran</label>
              <div className="relative mt-3">
                <select
                  value={mataPelajaran}
                  onChange={e => setMataPelajaran(e.target.value as MataPelajaran)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                >
                  {mapelList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Tingkat Kesulitan */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tingkat Kesulitan</label>
              <div className="flex gap-2 mt-3">
                {KESULITAN.map(k => (
                  <button
                    key={k.value}
                    onClick={() => setKesulitan(k.value)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                      kesulitan === k.value ? k.color + ' font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Agent */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" /> AI Agent
              </label>
              <div className="relative mt-3">
                <select
                  value={aiAgent}
                  onChange={e => setAiAgent(e.target.value as AIAgent)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                >
                  {Object.entries(AI_AGENT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-3 space-y-4">

            {/* Bentuk Soal */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bentuk Soal</label>
              <p className="text-xs text-slate-400 mt-0.5">Pilih satu atau lebih, lalu tentukan jumlah soal</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {BENTUK_SOAL_LIST.map(bentuk => {
                  const isSelected = selectedBentuk.has(bentuk)
                  return (
                    <div key={bentuk} className="space-y-1.5">
                      <button
                        onClick={() => toggleBentuk(bentuk)}
                        className={cn(
                          'w-full px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left',
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        )}
                      >
                        {BENTUK_SOAL_LABELS[bentuk]}
                      </button>
                      {isSelected && (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-xs text-slate-400 shrink-0">Jml:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={jumlahSoal[bentuk]}
                            onChange={e => setJumlahSoal(prev => ({
                              ...prev,
                              [bentuk]: Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
                            }))}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                          />
                          <span className="text-xs text-slate-400 shrink-0">soal</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Materi Input */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Materi Pembelajaran</label>
              <textarea
                value={materi}
                onChange={e => setMateri(e.target.value)}
                placeholder="Ketik atau tempel materi pembelajaran di sini...&#10;&#10;Contoh: Materi tentang persamaan linear satu variabel, mencakup pengertian, bentuk umum ax + b = 0, dan cara penyelesaiannya."
                rows={6}
                className="w-full mt-3 px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
              />

              {/* Upload buttons */}
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Upload Foto
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Upload File
                </button>
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload(e, 'image')} />
                <input ref={fileInputRef} type="file" accept=".txt,.pdf,.doc,.docx" multiple className="hidden" onChange={e => handleFileUpload(e, 'file')} />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                      {f.type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <span className="text-xs text-slate-600 truncate flex-1">{f.name}</span>
                      <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shadow-sm shadow-blue-200"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sedang membuat soal...</>
                : <><Sparkles className="w-4 h-4" /> Generate Soal</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Hasil Soal */}
      {hasil && (
        <div id="hasil-soal">
          <HasilSoalPanel hasil={hasil} />
        </div>
      )}
    </div>
  )
}
