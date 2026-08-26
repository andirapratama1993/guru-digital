'use client'

import { useState } from 'react'
import { History, Trash2, ChevronDown, ChevronUp, BookOpen, Bot } from 'lucide-react'
import { formatDate, BENTUK_SOAL_LABELS } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { BentukSoal } from '@/types'

interface HistoryRow {
  id: string
  tingkat_sekolah: string
  mata_pelajaran: string
  tingkat_kesulitan: string
  total_soal: number
  materi: string
  ai_agent_used: string
  created_at: string
}

interface HistoryClientProps {
  history: HistoryRow[]
}

const KESULITAN_COLOR: Record<string, string> = {
  mudah: 'bg-emerald-50 text-emerald-700',
  sedang: 'bg-amber-50 text-amber-700',
  sulit: 'bg-red-50 text-red-700',
}

export default function HistoryClient({ history: initialHistory }: HistoryClientProps) {
  const [history, setHistory] = useState(initialHistory)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Hapus soal ini dari riwayat?')) return
    setDeleting(id)
    const supabase = createClient()
    const { error } = await supabase.from('soal_history').delete().eq('id', id)
    if (error) {
      toast.error('Gagal menghapus')
    } else {
      setHistory(prev => prev.filter(h => h.id !== id))
      toast.success('Riwayat dihapus')
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Riwayat Soal</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {history.length > 0 ? `${history.length} sesi pembuatan soal` : 'Belum ada riwayat'}
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm">Belum ada soal yang dibuat</p>
          <p className="text-slate-300 text-xs mt-1">Buat soal pertama Anda di halaman Buat Soal</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all"
            >
              {/* Row header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{item.mata_pelajaran}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{item.tingkat_sekolah}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KESULITAN_COLOR[item.tingkat_kesulitan] || 'bg-slate-100 text-slate-600'}`}>
                      {item.tingkat_kesulitan}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {item.total_soal} soal
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 truncate max-w-xs">{item.materi}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                    <Bot className="w-3 h-3" />
                    <span>{item.ai_agent_used}</span>
                  </div>
                  <span className="hidden sm:block text-xs text-slate-300">
                    {formatDate(item.created_at)}
                  </span>
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {expanded === item.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === item.id && (
                <HistoryDetail id={item.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryDetail({ id }: { id: string }) {
  const [data, setData] = useState<{ soal_list: Array<{ bentuk: BentukSoal; nomor: number; pertanyaan: string; jawaban: string | boolean; opsi?: string[] }> } | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    if (data) return
    setLoading(true)
    const supabase = createClient()
    const { data: row } = await supabase
      .from('soal_history')
      .select('soal_list')
      .eq('id', id)
      .single()
    setData(row)
    setLoading(false)
  }

  // Load on mount
  if (!data && !loading) load()

  if (loading) return (
    <div className="px-5 py-4 border-t border-slate-50 text-xs text-slate-400">Memuat...</div>
  )

  if (!data) return null

  const grouped: Record<string, typeof data.soal_list> = {}
  for (const s of data.soal_list) {
    if (!grouped[s.bentuk]) grouped[s.bentuk] = []
    grouped[s.bentuk].push(s)
  }

  return (
    <div className="px-5 py-4 border-t border-slate-50 space-y-4">
      {Object.entries(grouped).map(([bentuk, soals]) => (
        <div key={bentuk}>
          <p className="text-xs font-semibold text-blue-600 mb-2">
            {BENTUK_SOAL_LABELS[bentuk as BentukSoal]} ({soals.length})
          </p>
          <div className="space-y-2">
            {soals.map((s, i) => (
              <div key={i} className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-medium text-slate-400">{s.nomor}.</span> {s.pertanyaan}
                {s.opsi && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.opsi.map((o, j) => (
                      <span key={j} className="text-slate-400">{String.fromCharCode(65 + j)}. {o}</span>
                    ))}
                  </div>
                )}
                <div className="mt-1 text-emerald-600 font-medium">
                  Jawaban: {typeof s.jawaban === 'boolean' ? (s.jawaban ? 'Benar' : 'Salah') : String(s.jawaban)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
