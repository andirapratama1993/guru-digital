'use client'

import { useState } from 'react'
import { Copy, Check, FileDown, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { HasilSoal, BentukSoal, TTSCell } from '@/types'
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

  async function handleDownload(endpoint: 'doc' | 'pdf', ext: string) {
    if (endpoint === 'doc') setDownloadingDoc(true)
    else setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/export/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasil),
      })
      if (!res.ok) throw new Error('Gagal mengunduh')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `soal-${hasil.mataPelajaran}-${hasil.tingkatSekolah}-kelas${hasil.kelas}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`File .${ext} berhasil diunduh!`)
    } catch {
      toast.error(`Gagal mengunduh file .${ext}`)
    } finally {
      if (endpoint === 'doc') setDownloadingDoc(false)
      else setDownloadingPdf(false)
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
      <div className="px-4 sm:px-6 py-4 border-b border-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Hasil Soal</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {hasil.mataPelajaran} · Kelas {hasil.kelas} {hasil.tingkatSekolah} · {hasil.tingkatKesulitan} · {hasil.soalList.length} soal
              {hasil.createdAt && ` · ${formatDate(hasil.createdAt)}`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin!' : 'Salin'}
            </button>
            <button
              onClick={() => handleDownload('doc', 'docx')}
              disabled={downloadingDoc}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {downloadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              .docx
            </button>
            <button
              onClick={() => handleDownload('pdf', 'pdf')}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              .pdf
            </button>
          </div>
        </div>
      </div>

      {/* Soal content */}
      <div className="p-4 sm:p-6 space-y-4">
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
                <div className="p-3 sm:p-4 space-y-4 sm:space-y-5">
                  {soalGroup.map((soal, idx) => (
                    <SoalCard key={idx} soal={soal} bentuk={bentuk as BentukSoal} />
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

function SoalCard({ soal, bentuk }: {
  soal: HasilSoal['soalList'][0]
  bentuk: BentukSoal
}) {
  return (
    <div className="pb-4 border-b border-slate-50 last:border-0 last:pb-0">
      <p className="text-sm text-slate-900 leading-relaxed">
        <span className="font-semibold text-blue-600 mr-1">{soal.nomor}.</span>
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

      {/* Menjodohkan - min 5 pasangan */}
      {bentuk === 'menjodohkan' && soal.opsi && soal.pasangan && (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Kolom A</p>
              <div className="space-y-1.5">
                {soal.opsi.map((o, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-blue-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-blue-600 shrink-0">{i + 1}.</span>
                    <span>{o}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Kolom B</p>
              <div className="space-y-1.5">
                {soal.pasangan.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-slate-500 shrink-0">{String.fromCharCode(65 + i)}.</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benar salah */}
      {bentuk === 'benar_salah' && (
        <div className="mt-2 flex gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-semibold border border-emerald-100">
            Benar
          </span>
          <span className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 font-semibold border border-red-100">
            Salah
          </span>
        </div>
      )}

      {/* Teka-teki silang - tampilkan grid */}
      {bentuk === 'teka_teki_silang' && soal.kotak && (
        <TTSGrid
          kotak={soal.kotak}
          petunjukMendatar={soal.petunjukMendatar}
          petunjukMenurun={soal.petunjukMenurun}
          kata={soal.kata}
        />
      )}

      {/* Jawaban */}
      {bentuk !== 'teka_teki_silang' && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Jawaban:</span>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            {typeof soal.jawaban === 'boolean'
              ? (soal.jawaban ? 'Benar' : 'Salah')
              : String(soal.jawaban)
            }
          </span>
        </div>
      )}
    </div>
  )
}

function TTSGrid({
  kotak,
  petunjukMendatar,
  petunjukMenurun,
  kata,
}: {
  kotak: TTSCell[][]
  petunjukMendatar?: { nomor: number; pertanyaan: string }[]
  petunjukMenurun?: { nomor: number; pertanyaan: string }[]
  kata?: string[]
}) {
  const CELL_SIZE = 32

  return (
    <div className="mt-4 space-y-4">
      {/* Grid TTS */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Grid Teka-Teki Silang</p>
        <div className="overflow-x-auto">
          <div
            className="inline-grid border border-slate-300 rounded-lg overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${kotak[0]?.length ?? 1}, ${CELL_SIZE}px)` }}
          >
            {kotak.map((row, ri) =>
              row.map((cell, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  className="relative flex items-center justify-center border border-slate-200"
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                >
                  {cell.blocked ? (
                    <div className="absolute inset-0 bg-slate-800" />
                  ) : (
                    <>
                      {cell.nomor !== undefined && (
                        <span
                          className="absolute top-0.5 left-0.5 text-blue-600 font-bold leading-none"
                          style={{ fontSize: 8 }}
                        >
                          {cell.nomor}
                        </span>
                      )}
                      <span className="text-xs font-medium text-slate-700 uppercase">
                        {cell.huruf || ''}
                      </span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">* Kotak hitam = pemisah kata. Isi kotak putih sesuai petunjuk.</p>
      </div>

      {/* Petunjuk Mendatar */}
      {petunjukMendatar && petunjukMendatar.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">→ Mendatar</p>
          <div className="space-y-1">
            {petunjukMendatar.map((p, i) => (
              <div key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="font-semibold text-blue-600 shrink-0 w-6">{p.nomor}.</span>
                <span>{p.pertanyaan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Petunjuk Menurun */}
      {petunjukMenurun && petunjukMenurun.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">↓ Menurun</p>
          <div className="space-y-1">
            {petunjukMenurun.map((p, i) => (
              <div key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="font-semibold text-blue-600 shrink-0 w-6">{p.nomor}.</span>
                <span>{p.pertanyaan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daftar kata (kunci) */}
      {kata && kata.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kunci Jawaban TTS</p>
          <div className="flex flex-wrap gap-2">
            {kata.map((k, i) => (
              <span key={i} className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function buildFullText(hasil: HasilSoal): string {
  const lines: string[] = []
  lines.push('LEMBAR SOAL')
  lines.push(`Mata Pelajaran : ${hasil.mataPelajaran}`)
  lines.push(`Kelas          : ${hasil.kelas} ${hasil.tingkatSekolah}`)
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
      if (bentuk === 'teka_teki_silang') {
        if (soal.petunjukMendatar?.length) {
          lines.push('   Mendatar:')
          soal.petunjukMendatar.forEach(p => lines.push(`   ${p.nomor}. ${p.pertanyaan}`))
        }
        if (soal.petunjukMenurun?.length) {
          lines.push('   Menurun:')
          soal.petunjukMenurun.forEach(p => lines.push(`   ${p.nomor}. ${p.pertanyaan}`))
        }
        if (soal.kata?.length) {
          lines.push(`   Kunci: ${soal.kata.join(', ')}`)
        }
      } else {
        lines.push(`   Jawaban: ${typeof soal.jawaban === 'boolean' ? (soal.jawaban ? 'Benar' : 'Salah') : soal.jawaban}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
