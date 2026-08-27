import { NextRequest, NextResponse } from 'next/server'
import type { HasilSoal, TTSCell } from '@/types'
import { BENTUK_SOAL_LABELS } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const hasil: HasilSoal = await request.json()
    const jsPDF = (await import('jspdf')).default

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 18
    const contentWidth = pageWidth - margin * 2
    let y = margin + 6

    // ─── helpers ────────────────────────────────────────────────
    function addRunningHeader() {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Guru Digital  |  ${hasil.mataPelajaran} – Kelas ${hasil.kelas} ${hasil.tingkatSekolah}`,
        pageWidth - margin, 10, { align: 'right' }
      )
      doc.setTextColor(30, 41, 59)
    }

    function addFooters() {
      const total = doc.getNumberOfPages()
      for (let i = 1; i <= total; i++) {
        doc.setPage(i)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(148, 163, 184)
        doc.text('Dibuat dengan Guru Digital', margin, pageHeight - 7)
        doc.text(`Halaman ${i} / ${total}`, pageWidth / 2, pageHeight - 7, { align: 'center' })
        doc.setTextColor(30, 41, 59)
      }
    }

    function newPage() {
      doc.addPage()
      y = margin + 6
      addRunningHeader()
    }

    function checkBreak(needed: number) {
      if (y + needed > pageHeight - 16) newPage()
    }

    function sectionDivider(label: string) {
      checkBreak(12)
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F')
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text(label, margin + 3, y + 5.5)
      doc.setTextColor(30, 41, 59)
      y += 11
    }

    function writeWrapped(text: string, indent: number, fontSize: number, bold = false) {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      const lines = doc.splitTextToSize(text, contentWidth - indent)
      checkBreak(lines.length * (fontSize * 0.45 + 1))
      doc.text(lines, margin + indent, y)
      y += lines.length * (fontSize * 0.45 + 1) + 1
    }

    // ─── title block ────────────────────────────────────────────
    addRunningHeader()
    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 5

    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('LEMBAR SOAL', pageWidth / 2, y, { align: 'center' })
    y += 7

    doc.setFontSize(11)
    doc.text(hasil.mataPelajaran, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text(
      `Kelas ${hasil.kelas} ${hasil.tingkatSekolah}   ·   Kesulitan: ${hasil.tingkatKesulitan.toUpperCase()}   ·   Total: ${hasil.soalList.length} soal`,
      pageWidth / 2, y, { align: 'center' }
    )
    y += 5

    const materiShort = hasil.materi.length > 90 ? hasil.materi.slice(0, 90) + '...' : hasil.materi
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    const materiLines = doc.splitTextToSize(`Materi: ${materiShort}`, contentWidth)
    doc.text(materiLines, pageWidth / 2, y, { align: 'center' })
    y += materiLines.length * 4 + 1

    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 9
    doc.setTextColor(30, 41, 59)

    // ─── group soal by bentuk ───────────────────────────────────
    const groupedSoal: Record<string, typeof hasil.soalList> = {}
    for (const soal of hasil.soalList) {
      if (!groupedSoal[soal.bentuk]) groupedSoal[soal.bentuk] = []
      groupedSoal[soal.bentuk].push(soal)
    }

    for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
      sectionDivider(`${BENTUK_SOAL_LABELS[bentuk as keyof typeof BENTUK_SOAL_LABELS].toUpperCase()} (${soalGroup.length} soal)`)

      for (const soal of soalGroup) {
        // question
        checkBreak(12)
        const qLines = doc.splitTextToSize(soal.pertanyaan, contentWidth - 8)
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(37, 99, 235)
        doc.text(`${soal.nomor}.`, margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(15, 23, 42)
        doc.text(qLines, margin + 8, y)
        y += qLines.length * 5 + 1

        // pilihan ganda
        if (bentuk === 'pilihan_ganda' && soal.opsi) {
          for (let i = 0; i < soal.opsi.length; i++) {
            const optLines = doc.splitTextToSize(`${String.fromCharCode(65 + i)}. ${soal.opsi[i]}`, contentWidth - 18)
            checkBreak(optLines.length * 4.5 + 1)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(71, 85, 105)
            doc.text(optLines, margin + 14, y)
            y += optLines.length * 4.5 + 0.5
          }
          y += 1
        }

        // menjodohkan
        if (bentuk === 'menjodohkan' && soal.opsi && soal.pasangan) {
          checkBreak(8)
          const halfW = (contentWidth - 10) / 2
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(71, 85, 105)
          doc.text('Kolom A', margin + 8, y)
          doc.text('Kolom B', margin + 10 + halfW, y)
          y += 5

          doc.setFont('helvetica', 'normal')
          const rows = Math.max(soal.opsi.length, soal.pasangan.length)
          for (let i = 0; i < rows; i++) {
            checkBreak(6)
            doc.setFontSize(9)
            doc.setTextColor(30, 41, 59)
            const aLines = doc.splitTextToSize(soal.opsi[i] ? `${i + 1}. ${soal.opsi[i]}` : '', halfW - 2)
            const bLines = doc.splitTextToSize(soal.pasangan[i] ? `${String.fromCharCode(65 + i)}. ${soal.pasangan[i]}` : '', halfW - 2)
            doc.text(aLines, margin + 8, y)
            doc.text(bLines, margin + 10 + halfW, y)
            y += Math.max(aLines.length, bLines.length) * 4.5 + 0.5
          }
          y += 2
        }

        // benar/salah
        if (bentuk === 'benar_salah') {
          checkBreak(6)
          doc.setFontSize(9)
          doc.setTextColor(71, 85, 105)
          doc.text('( Benar )   ( Salah )', margin + 14, y)
          y += 5
        }

        // teka-teki silang – gambar grid TANPA jawaban (soal kosong)
        if (bentuk === 'teka_teki_silang' && soal.kotak) {
          y += 2
          drawTTSGrid(doc, soal.kotak, margin + 8, y, contentWidth - 16, false)
          const cellMm = Math.min(7, (contentWidth - 16) / (soal.kotak[0]?.length || 10))
          y += soal.kotak.length * cellMm + 4

          // petunjuk mendatar
          if (soal.petunjukMendatar?.length) {
            checkBreak(8)
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(37, 99, 235)
            doc.text('Mendatar (→)', margin + 8, y)
            y += 5
            for (const p of soal.petunjukMendatar) {
              const lines = doc.splitTextToSize(`${p.nomor}. ${p.pertanyaan}`, contentWidth - 20)
              checkBreak(lines.length * 4.5 + 1)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(30, 41, 59)
              doc.text(lines, margin + 12, y)
              y += lines.length * 4.5 + 0.5
            }
          }

          // petunjuk menurun
          if (soal.petunjukMenurun?.length) {
            checkBreak(8)
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(37, 99, 235)
            doc.text('Menurun (↓)', margin + 8, y)
            y += 5
            for (const p of soal.petunjukMenurun) {
              const lines = doc.splitTextToSize(`${p.nomor}. ${p.pertanyaan}`, contentWidth - 20)
              checkBreak(lines.length * 4.5 + 1)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(30, 41, 59)
              doc.text(lines, margin + 12, y)
              y += lines.length * 4.5 + 0.5
            }
          }
          y += 3
        }

        // spacer between questions
        y += 3
      }
    }

    // ─── kunci jawaban ──────────────────────────────────────────
    newPage()
    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 6

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('KUNCI JAWABAN', pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 8

    for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
      sectionDivider(BENTUK_SOAL_LABELS[bentuk as keyof typeof BENTUK_SOAL_LABELS].toUpperCase())

      for (const soal of soalGroup) {
        // Skip TTS - handle separately
        if (bentuk === 'teka_teki_silang') continue

        checkBreak(14)

        // question (short version)
        const qShort = soal.pertanyaan.length > 80
          ? soal.pertanyaan.slice(0, 80) + '...'
          : soal.pertanyaan

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text(`${soal.nomor}.`, margin + 2, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        const qLines = doc.splitTextToSize(qShort, contentWidth - 14)
        doc.text(qLines, margin + 8, y)
        y += qLines.length * 4.5 + 0.5

        // answer
        checkBreak(7)
        const answerText = typeof soal.jawaban === 'boolean'
          ? (soal.jawaban ? 'Benar' : 'Salah')
          : String(soal.jawaban)

        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(22, 163, 74)
        const ansLines = doc.splitTextToSize(`Jawaban: ${answerText}`, contentWidth - 14)
        doc.text(ansLines, margin + 8, y)
        y += ansLines.length * 5 + 4

        // separator
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(margin + 4, y - 2, margin + contentWidth - 4, y - 2)
      }
    }

    // TTS kunci jawaban – grid dengan huruf terisi + daftar kata
    const ttsSoals = hasil.soalList.filter(s => s.bentuk === 'teka_teki_silang')
    if (ttsSoals.length > 0) {
      sectionDivider('TEKA-TEKI SILANG – KUNCI JAWABAN')
      for (const soal of ttsSoals) {
        checkBreak(12)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text(`Soal ${soal.nomor}:`, margin + 5, y)
        y += 5

        // Grid dengan huruf jawaban terisi (showAnswers = true)
        if (soal.kotak) {
          drawTTSGrid(doc, soal.kotak, margin + 8, y, contentWidth - 16, true)
          const cellMm = Math.min(7.5, (contentWidth - 16) / (soal.kotak[0]?.length || 10))
          y += soal.kotak.length * cellMm + 4
        }

        // Daftar kata jawaban
        if (soal.kata && soal.kata.length > 0) {
          checkBreak(8)
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(22, 163, 74)
          const kataText = `Kata-kata: ${soal.kata.join(', ')}`
          const kLines = doc.splitTextToSize(kataText, contentWidth - 10)
          doc.text(kLines, margin + 5, y)
          y += kLines.length * 5 + 3
        }
      }
    }

    addFooters()

    const buffer = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="soal-${hasil.mataPelajaran}-${hasil.tingkatSekolah}-kelas${hasil.kelas}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF export error:', err)
    return NextResponse.json({ error: 'Gagal membuat file .pdf' }, { status: 500 })
  }
}

// Draw TTS grid as actual table in PDF
function drawTTSGrid(
  doc: InstanceType<Awaited<typeof import('jspdf')>['default']>,
  kotak: TTSCell[][],
  startX: number,
  startY: number,
  maxWidth: number,
  showAnswers = false
) {
  const cols = kotak[0]?.length || 1
  const rows = kotak.length
  const cellSize = Math.min(7.5, maxWidth / cols)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = kotak[r][c]
      const x = startX + c * cellSize
      const y = startY + r * cellSize

      if (cell.blocked) {
        doc.setFillColor(30, 41, 59)
        doc.rect(x, y, cellSize, cellSize, 'F')
      } else {
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(148, 163, 184)
        doc.setLineWidth(0.3)
        doc.rect(x, y, cellSize, cellSize, 'FD')

        // nomor di sudut kiri atas
        if (cell.nomor !== undefined) {
          doc.setFontSize(4.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(37, 99, 235)
          doc.text(String(cell.nomor), x + 0.5, y + 3)
        }

        // huruf kunci – hanya tampil di kunci jawaban
        if (showAnswers && cell.huruf) {
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(15, 23, 42)
          doc.text(cell.huruf, x + cellSize / 2, y + cellSize / 2 + 2, { align: 'center' })
        }
      }
    }
  }
  doc.setTextColor(30, 41, 59)
  doc.setDrawColor(0, 0, 0)
}
