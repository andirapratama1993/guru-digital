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
    const FOOTER_H = 18   // reserved space for footer at bottom
    const LINE_H = 5      // standard line height mm
    let y = margin + 14   // start below running header

    // ─── running header on current page ─────────────────────────
    function addRunningHeader() {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Guru Digital  |  ${hasil.mataPelajaran} – Kelas ${hasil.kelas} ${hasil.tingkatSekolah}`,
        pageWidth - margin, 10, { align: 'right' }
      )
      // thin top border line
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(margin, 12, pageWidth - margin, 12)
      doc.setTextColor(30, 41, 59)
      doc.setDrawColor(0, 0, 0)
    }

    // ─── footer on all pages after content is done ───────────────
    function addFooters() {
      const total = doc.getNumberOfPages()
      for (let i = 1; i <= total; i++) {
        doc.setPage(i)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(148, 163, 184)
        // footer line
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
        doc.text('Guru Digital', margin, pageHeight - 8)
        doc.text(`Halaman ${i} / ${total}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        doc.text(hasil.mataPelajaran, pageWidth - margin, pageHeight - 8, { align: 'right' })
        doc.setTextColor(30, 41, 59)
        doc.setDrawColor(0, 0, 0)
      }
    }

    // ─── new page helper ─────────────────────────────────────────
    function newPage() {
      doc.addPage()
      y = margin + 14
      addRunningHeader()
    }

    // ─── check if content fits, if not go to new page ────────────
    function ensureSpace(needed: number) {
      if (y + needed > pageHeight - FOOTER_H) newPage()
    }

    // ─── section divider ─────────────────────────────────────────
    function sectionDivider(label: string) {
      ensureSpace(14)
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F')
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text(label, margin + 4, y + 5.5)
      doc.setTextColor(30, 41, 59)
      y += 12
    }

    // ─── write wrapped text with auto page break ─────────────────
    function writeText(
      text: string,
      x: number,
      fontSize: number,
      color: [number, number, number],
      bold = false,
      maxW?: number
    ): number {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setTextColor(...color)
      const w = maxW ?? (contentWidth - (x - margin))
      const lines = doc.splitTextToSize(text, w) as string[]
      const blockH = lines.length * (fontSize * 0.43 + 0.8)
      ensureSpace(blockH + 2)
      doc.text(lines, x, y)
      y += blockH + 1
      return blockH
    }

    // ─── title block ─────────────────────────────────────────────
    addRunningHeader()
    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 6

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('LEMBAR SOAL', pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(hasil.mataPelajaran, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text(
      `Kelas ${hasil.kelas} ${hasil.tingkatSekolah}   ·   Kesulitan: ${hasil.tingkatKesulitan.toUpperCase()}   ·   Total Soal: ${hasil.soalList.length}`,
      pageWidth / 2, y, { align: 'center' }
    )
    y += 5

    const materiShort = hasil.materi.length > 100 ? hasil.materi.slice(0, 100) + '...' : hasil.materi
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    const materiLines = doc.splitTextToSize(`Materi: ${materiShort}`, contentWidth - 10) as string[]
    doc.text(materiLines, pageWidth / 2, y, { align: 'center' })
    y += materiLines.length * 3.8 + 3

    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 10
    doc.setTextColor(30, 41, 59)

    // ─── group soal ───────────────────────────────────────────────
    const groupedSoal: Record<string, typeof hasil.soalList> = {}
    for (const soal of hasil.soalList) {
      if (!groupedSoal[soal.bentuk]) groupedSoal[soal.bentuk] = []
      groupedSoal[soal.bentuk].push(soal)
    }

    for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
      sectionDivider(
        `${BENTUK_SOAL_LABELS[bentuk as keyof typeof BENTUK_SOAL_LABELS].toUpperCase()} (${soalGroup.length} soal)`
      )

      for (const soal of soalGroup) {
        // ── question number + text ──
        const qLines = doc.splitTextToSize(soal.pertanyaan, contentWidth - 10) as string[]
        const qH = qLines.length * 5.2
        ensureSpace(qH + 4)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(37, 99, 235)
        doc.text(`${soal.nomor}.`, margin, y)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(15, 23, 42)
        doc.text(qLines, margin + 9, y)
        y += qH + 2

        // ── pilihan ganda ──
        if (bentuk === 'pilihan_ganda' && soal.opsi) {
          for (let i = 0; i < soal.opsi.length; i++) {
            const optLines = doc.splitTextToSize(
              `${String.fromCharCode(65 + i)}. ${soal.opsi[i]}`,
              contentWidth - 20
            ) as string[]
            const optH = optLines.length * 4.8
            ensureSpace(optH + 1)
            doc.setFontSize(9.5)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(60, 60, 60)
            doc.text(optLines, margin + 15, y)
            y += optH + 0.5
          }
          y += 2
        }

        // ── menjodohkan ──
        if (bentuk === 'menjodohkan' && soal.opsi && soal.pasangan) {
          const rowCount = Math.max(soal.opsi.length, soal.pasangan.length)
          const halfW = (contentWidth - 12) / 2

          ensureSpace(rowCount * 6 + 12)

          // header kolom
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(71, 85, 105)
          doc.setFillColor(241, 245, 249)
          doc.roundedRect(margin + 6, y - 1, halfW, 6.5, 1, 1, 'F')
          doc.roundedRect(margin + 10 + halfW, y - 1, halfW, 6.5, 1, 1, 'F')
          doc.text('Kolom A', margin + 8, y + 4)
          doc.text('Kolom B', margin + 12 + halfW, y + 4)
          y += 8

          doc.setFont('helvetica', 'normal')
          doc.setTextColor(30, 41, 59)
          for (let i = 0; i < rowCount; i++) {
            const aText = soal.opsi[i] ? `${i + 1}.  ${soal.opsi[i]}` : ''
            const bText = soal.pasangan[i] ? `${String.fromCharCode(65 + i)}.  ${soal.pasangan[i]}` : ''
            const aLines = doc.splitTextToSize(aText, halfW - 4) as string[]
            const bLines = doc.splitTextToSize(bText, halfW - 4) as string[]
            const rowH = Math.max(aLines.length, bLines.length) * 4.8
            ensureSpace(rowH + 1)
            doc.setFontSize(9)
            doc.text(aLines, margin + 8, y)
            doc.text(bLines, margin + 12 + halfW, y)
            // thin row separator
            doc.setDrawColor(226, 232, 240)
            doc.setLineWidth(0.2)
            doc.line(margin + 6, y + rowH, margin + 6 + halfW * 2 + 4, y + rowH)
            y += rowH + 1.5
          }
          y += 3
        }

        // ── benar/salah ──
        if (bentuk === 'benar_salah') {
          ensureSpace(8)
          doc.setFontSize(9.5)
          doc.setTextColor(71, 85, 105)
          // draw choice boxes
          doc.setDrawColor(148, 163, 184)
          doc.setLineWidth(0.3)
          doc.roundedRect(margin + 14, y - 4, 22, 7, 1, 1, 'S')
          doc.roundedRect(margin + 42, y - 4, 22, 7, 1, 1, 'S')
          doc.text('Benar', margin + 25, y, { align: 'center' })
          doc.text('Salah', margin + 53, y, { align: 'center' })
          doc.setDrawColor(0, 0, 0)
          y += 6
        }

        // ── teka-teki silang ──
        if (bentuk === 'teka_teki_silang' && soal.kotak) {
          const cols = soal.kotak[0]?.length || 1
          const rows = soal.kotak.length
          const cellSize = Math.min(7.5, (contentWidth - 16) / cols)
          const gridH = rows * cellSize

          // If grid doesn't fit on remaining page, go to new page first
          ensureSpace(gridH + 10)

          y += 2
          drawTTSGrid(doc, soal.kotak, margin + 8, y, contentWidth - 16, false)
          y += gridH + 6

          // ── petunjuk mendatar ──
          if (soal.petunjukMendatar?.length) {
            ensureSpace(10)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(37, 99, 235)
            doc.text('Mendatar (→)', margin + 8, y)
            y += LINE_H + 1

            for (const p of soal.petunjukMendatar) {
              const lines = doc.splitTextToSize(`${p.nomor}. ${p.pertanyaan}`, contentWidth - 22) as string[]
              const lineH = lines.length * 4.8
              ensureSpace(lineH + 1)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(30, 41, 59)
              doc.text(lines, margin + 13, y)
              y += lineH + 1
            }
            y += 2
          }

          // ── petunjuk menurun ──
          if (soal.petunjukMenurun?.length) {
            ensureSpace(10)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(37, 99, 235)
            doc.text('Menurun (↓)', margin + 8, y)
            y += LINE_H + 1

            for (const p of soal.petunjukMenurun) {
              const lines = doc.splitTextToSize(`${p.nomor}. ${p.pertanyaan}`, contentWidth - 22) as string[]
              const lineH = lines.length * 4.8
              ensureSpace(lineH + 1)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(30, 41, 59)
              doc.text(lines, margin + 13, y)
              y += lineH + 1
            }
            y += 2
          }
        }

        // spacer between questions
        y += 4

        // thin separator line between questions (not after last in group)
        if (soal !== soalGroup[soalGroup.length - 1]) {
          doc.setDrawColor(241, 245, 249)
          doc.setLineWidth(0.3)
          doc.line(margin + 8, y - 2, pageWidth - margin - 8, y - 2)
          doc.setDrawColor(0, 0, 0)
        }
      }

      y += 4 // extra space after each section
    }

    // ─── kunci jawaban – always on new page ──────────────────────
    newPage()

    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 7

    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('KUNCI JAWABAN', pageWidth / 2, y, { align: 'center' })
    y += 9

    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 10

    for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
      sectionDivider(
        BENTUK_SOAL_LABELS[bentuk as keyof typeof BENTUK_SOAL_LABELS].toUpperCase()
      )

      for (const soal of soalGroup) {
        if (bentuk === 'teka_teki_silang') continue

        ensureSpace(16)

        // nomor + pertanyaan (singkat)
        const qShort = soal.pertanyaan.length > 85
          ? soal.pertanyaan.slice(0, 85) + '...'
          : soal.pertanyaan

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text(`${soal.nomor}.`, margin + 3, y)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        const qLines = doc.splitTextToSize(qShort, contentWidth - 16) as string[]
        doc.text(qLines, margin + 9, y)
        y += qLines.length * 4.6 + 1

        // jawaban
        ensureSpace(8)
        const answerText = typeof soal.jawaban === 'boolean'
          ? (soal.jawaban ? 'Benar' : 'Salah')
          : String(soal.jawaban)

        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(22, 163, 74)
        const ansLines = doc.splitTextToSize(`Jawaban: ${answerText}`, contentWidth - 16) as string[]
        doc.text(ansLines, margin + 9, y)
        y += ansLines.length * 5 + 5

        // separator
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.25)
        doc.line(margin + 6, y - 2, pageWidth - margin - 6, y - 2)
        doc.setDrawColor(0, 0, 0)
      }
    }

    // ─── TTS kunci jawaban ────────────────────────────────────────
    const ttsSoals = hasil.soalList.filter(s => s.bentuk === 'teka_teki_silang')
    if (ttsSoals.length > 0) {
      sectionDivider('TEKA-TEKI SILANG – KUNCI JAWABAN')

      for (const soal of ttsSoals) {
        ensureSpace(14)
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text(`Soal ${soal.nomor}:`, margin + 5, y)
        y += 7

        if (soal.kotak) {
          const cols = soal.kotak[0]?.length || 1
          const rows = soal.kotak.length
          const cellSize = Math.min(7.5, (contentWidth - 16) / cols)
          const gridH = rows * cellSize
          ensureSpace(gridH + 8)
          drawTTSGrid(doc, soal.kotak, margin + 8, y, contentWidth - 16, true)
          y += gridH + 6
        }

        if (soal.kata && soal.kata.length > 0) {
          ensureSpace(10)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(22, 163, 74)
          const kataLines = doc.splitTextToSize(`Kata-kata: ${soal.kata.join('  ·  ')}`, contentWidth - 10) as string[]
          doc.text(kataLines, margin + 5, y)
          y += kataLines.length * 5 + 4
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

// ─── draw TTS grid ────────────────────────────────────────────────
function drawTTSGrid(
  doc: InstanceType<Awaited<typeof import('jspdf')>['default']>,
  kotak: TTSCell[][],
  startX: number,
  startY: number,
  maxWidth: number,
  showAnswers = false
) {
  const cols = kotak[0]?.length || 1
  const cellSize = Math.min(7.5, maxWidth / cols)

  for (let r = 0; r < kotak.length; r++) {
    for (let c = 0; c < kotak[r].length; c++) {
      const cell = kotak[r][c]
      const x = startX + c * cellSize
      const cy = startY + r * cellSize

      if (cell.blocked) {
        doc.setFillColor(30, 41, 59)
        doc.rect(x, cy, cellSize, cellSize, 'F')
      } else {
        // white cell with border
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(120, 140, 170)
        doc.setLineWidth(0.35)
        doc.rect(x, cy, cellSize, cellSize, 'FD')

        // clue number at top-left corner
        if (cell.nomor !== undefined) {
          doc.setFontSize(4)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(37, 99, 235)
          doc.text(String(cell.nomor), x + 0.6, cy + 2.8)
        }

        // answer letter – only in key
        if (showAnswers && cell.huruf) {
          doc.setFontSize(cellSize > 6 ? 7 : 5.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(15, 23, 42)
          doc.text(
            cell.huruf.toUpperCase(),
            x + cellSize / 2,
            cy + cellSize / 2 + (cellSize > 6 ? 2.2 : 1.8),
            { align: 'center' }
          )
        }
      }
    }
  }

  // reset
  doc.setTextColor(30, 41, 59)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
}
