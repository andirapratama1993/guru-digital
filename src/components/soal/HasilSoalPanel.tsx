'use client'

import { useState } from 'react'
import { Copy, Check, FileDown, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { HasilSoal, BentukSoal } from '@/types'
import { BENTUK_SOAL_LABELS, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface HasilSoalPanelProps {
  hasil: HasilSoal
}

export default function HasilSoalPanel({ hasil }: HasilSoalPanelProps) {
  const [copied, setCopied] = useState(false)
  const [downloadingDoc, setDownloadingDoc] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<BentukSoal>>(
    new Set(hasil.soalList.map(s => s.bentuk) as BentukSoal[])
  )

  const fullText = buildFullText(hasil)

  function toggleGroup(bentuk: BentukSoal) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(bentuk)) next.delete(bentuk)
      else next.add(bentuk)
      return next
    })
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    toast.success('Soal berhasil disalin!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownloadDoc() {
    setDownloadingDoc(true)
    try {
      const res = await fetch('/api/export/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasil),
      })
      if (!res.ok) throw new Error('Gagal mengunduh')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `soal-${hasil.mataPelajaran}-${hasil.tingkatSekolah}.docx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('File .docx berhasil diunduh!')
    } catch {
      toast.error('Gagal mengunduh file .docx')
    } finally {
      setDownloadingDoc(false)
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasil),
      })
      if (!res.ok) throw new Error('Gagal mengunduh')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `soal-${hasil.mataPelajaran}-${hasil.tingkatSekolah}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('File .pdf berhasil diunduh!')
    } catch {
      toast.error('Gagal mengunduh file .pdf')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Group soal by bentuk
  const groupedSoal: Record<string, typeof hasil.soalList> = {}
  for (const soal of hasil.soalList) {
    if (!groupedSoal[soal.bentuk]) groupedSoal[soal.bentuk] = []
    groupedSoal[soal.bentuk].push(soal)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Hasil Soal</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasil.mataPelajaran} · {hasil.tingkatSekolah} · {hasil.tingkatKesulitan} · {hasil.soalList.length} soal
            {hasil.createdAt && ` · ${formatDate(hasil.createdAt)}`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin!' : 'Salin Semua'}
          </button>
          <button
            onClick={handleDownloadDoc}
            disabled={downloadingDoc}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {downloadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            .docx
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            .pdf
          </button>
        </div>
      </div>

      {/* Soal content */}
      <div className="p-6 space-y-6">
        {Object.entries(groupedSoal).map(([bentuk, soalGroup]) => {
          const isExpanded = expandedGroups.has(bentuk as BentukSoal)
          return (
            <div key={bentuk} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(bentuk as BentukSoal)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {BENTUK_SOAL_LABELS[bentuk as BentukSoal]}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    {soalGroup.length} soal
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="p-4 space-y-4">
                  {soalGroup.map((soal, idx) => (
                    <SoalCard key={idx} soal={soal} nomor={soal.nomor} bentuk={bentuk as BentukSoal} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SoalCard({ soal, nomor, bentuk }: {
  soal: HasilSoal['soalList'][0]
  nomor: number
  bentuk: BentukSoal
}) {
  return (
    <div className="pb-4 border-b border-slate-50 last:border-0 last:pb-0">
      <p className="text-sm text-slate-900 leading-relaxed">
        <span className="font-semibold text-blue-600 mr-1">{nomor}.</span>
        {soal.pertanyaan}
      </p>

      {/* Pilihan ganda */}
      {bentuk === 'pilihan_ganda' && soal.opsi && (
        <div className="mt-2 space-y-1">
          {soal.opsi.map((opsi, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-400 shrink-0 w-5">
                {String.fromCharCode(65 + i)}.
              </span>
              <span>{opsi}</span>
            </div>
          ))}
        </div>
      )}

      {/* Menjodohkan */}
      {bentuk === 'menjodohkan' && soal.opsi && soal.pasangan && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 mb-1">Kolom A</p>
            {soal.opsi.map((o, i) => (
              <div key={i} className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded">
                {i + 1}. {o}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 mb-1">Kolom B</p>
            {soal.pasangan.map((p, i) => (
              <div key={i} className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded">
                {String.fromCharCode(65 + i)}. {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benar salah */}
      {bentuk === 'benar_salah' && (
        <div className="mt-2 flex gap-2">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-medium border border-emerald-100">
            Benar
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 font-medium border border-red-100">
            Salah
          </span>
        </div>
      )}

      {/* Jawaban (kunci) */}
      <div className="mt-2">
        <span className="text-xs text-slate-400">Jawaban: </span>
        <span className="text-xs font-medium text-emerald-600">
          {typeof soal.jawaban === 'boolean'
            ? (soal.jawaban ? 'Benar' : 'Salah')
            : String(soal.jawaban)
          }
        </span>
      </div>
    </div>
  )
}

function buildFullText(hasil: HasilSoal): string {
  const lines: string[] = []
  lines.push(`LEMBAR SOAL`)
  lines.push(`Mata Pelajaran : ${hasil.mataPelajaran}`)
  lines.push(`Jenjang        : ${hasil.tingkatSekolah}`)
  lines.push(`Tingkat        : ${hasil.tingkatKesulitan.toUpperCase()}`)
  lines.push(`Materi         : ${hasil.materi.slice(0, 100)}...`)
  lines.push('='.repeat(60))
  lines.push('')

  const groupedSoal: Record<string, typeof hasil.soalList> = {}
  for (const soal of hasil.soalList) {
    if (!groupedSoal[soal.bentuk]) groupedSoal[soal.bentuk] = []
    groupedSoal[soal.bentuk].push(soal)
  }

  for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
    lines.push(`--- ${BENTUK_SOAL_LABELS[bentuk as BentukSoal].toUpperCase()} ---`)
    lines.push('')
    for (const soal of soalGroup) {
      lines.push(`${soal.nomor}. ${soal.pertanyaan}`)
      if (bentuk === 'pilihan_ganda' && soal.opsi) {
        soal.opsi.forEach((o, i) => lines.push(`   ${String.fromCharCode(65 + i)}. ${o}`))
      }
      if (bentuk === 'menjodohkan' && soal.opsi && soal.pasangan) {
        lines.push('   Kolom A:')
        soal.opsi.forEach((o, i) => lines.push(`   ${i + 1}. ${o}`))
        lines.push('   Kolom B:')
        soal.pasangan.forEach((p, i) => lines.push(`   ${String.fromCharCode(65 + i)}. ${p}`))
      }
      lines.push(`   Jawaban: ${typeof soal.jawaban === 'boolean' ? (soal.jawaban ? 'Benar' : 'Salah') : soal.jawaban}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
