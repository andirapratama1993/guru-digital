import { NextRequest, NextResponse } from 'next/server'
import type { HasilSoal } from '@/types'
import { BENTUK_SOAL_LABELS } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const hasil: HasilSoal = await request.json()

    // Dynamic import to avoid server-side issues
    const jsPDF = (await import('jspdf')).default

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let y = margin

    function addPage() {
      doc.addPage()
      y = margin
      addHeader()
    }

    function checkPageBreak(needed: number) {
      if (y + needed > pageHeight - 25) addPage()
    }

    function addHeader() {
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Guru Digital | ${hasil.mataPelajaran} - ${hasil.tingkatSekolah}`, pageWidth - margin, 10, { align: 'right' })
      doc.setTextColor(0, 0, 0)
    }

    function addFooter() {
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        doc.text('Dibuat dengan Guru Digital', margin, pageHeight - 8)
        doc.setTextColor(0, 0, 0)
      }
    }

    // Draw header line
    addHeader()

    // Title block
    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 6

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('LEMBAR SOAL', pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Mata Pelajaran: ${hasil.mataPelajaran}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text(
      `Jenjang: ${hasil.tingkatSekolah}   |   Tingkat Kesulitan: ${hasil.tingkatKesulitan.toUpperCase()}   |   Total: ${hasil.soalList.length} soal`,
      pageWidth / 2, y, { align: 'center' }
    )
    y += 5

    const materiShort = hasil.materi.length > 100 ? hasil.materi.slice(0, 100) + '...' : hasil.materi
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Materi: ${materiShort}`, pageWidth / 2, y, { align: 'center' })
    y += 4

    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 10

    doc.setTextColor(0, 0, 0)

    // Group soal by bentuk
    const groupedSoal: Record<string, typeof hasil.soalList> = {}
    for (const soal of hasil.soalList) {
      if (!groupedSoal[soal.bentuk]) groupedSoal[soal.bentuk] = []
      groupedSoal[soal.bentuk].push(soal)
    }

    for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
      checkPageBreak(16)

      // Section header
      doc.setFillColor(239, 246, 255)
      doc.rect(margin, y, contentWidth, 7, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text(
        `${BENTUK_SOAL_LABELS[bentuk as keyof typeof BENTUK_SOAL_LABELS].toUpperCase()} (${soalGroup.length} soal)`,
        margin + 3, y + 5
      )
      doc.setTextColor(0, 0, 0)
      y += 10

      for (const soal of soalGroup) {
        checkPageBreak(20)

        // Question number + text
        const questionLines = doc.splitTextToSize(soal.pertanyaan, contentWidth - 12)
        checkPageBreak(questionLines.length * 5 + 6)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(37, 99, 235)
        doc.text(`${soal.nomor}.`, margin, y + 1)
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'normal')
        doc.text(questionLines, margin + 8, y + 1)
        y += questionLines.length * 5 + 2

        // Pilihan ganda
        if (bentuk === 'pilihan_ganda' && soal.opsi) {
          for (let i = 0; i < soal.opsi.length; i++) {
            checkPageBreak(6)
            const optLines = doc.splitTextToSize(`${String.fromCharCode(65 + i)}. ${soal.opsi[i]}`, contentWidth - 16)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(71, 85, 105)
            doc.text(optLines, margin + 14, y)
            y += optLines.length * 5
          }
        }

        // Menjodohkan
        if (bentuk === 'menjodohkan' && soal.opsi && soal.pasangan) {
          const halfW = (contentWidth - 8) / 2
          checkPageBreak(8)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(100, 116, 139)
          doc.text('Kolom A', margin + 14, y)
          doc.text('Kolom B', margin + 14 + halfW + 4, y)
          y += 4
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(71, 85, 105)
          const rows = Math.max(soal.opsi.length, soal.pasangan.length)
          for (let i = 0; i < rows; i++) {
            checkPageBreak(6)
            if (soal.opsi[i]) doc.text(`${i + 1}. ${soal.opsi[i]}`, margin + 14, y)
            if (soal.pasangan[i]) doc.text(`${String.fromCharCode(65 + i)}. ${soal.pasangan[i]}`, margin + 14 + halfW + 4, y)
            y += 5
          }
        }

        // Benar/Salah
        if (bentuk === 'benar_salah') {
          doc.setFontSize(9)
          doc.setTextColor(71, 85, 105)
          doc.text('Benar  /  Salah', margin + 14, y)
          y += 5
        }

        y += 4
      }
      y += 4
    }

    // Answer key - new page
    doc.addPage()
    y = margin
    addHeader()

    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, contentWidth, 1.5, 'F')
    y += 8

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('KUNCI JAWABAN', pageWidth / 2, y, { align: 'center' })
    y += 10

    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)

    const cols = 4
    const colWidth = contentWidth / cols
    let col = 0

    for (const soal of hasil.soalList) {
      const x = margin + col * colWidth
      if (col === 0) checkPageBreak(6)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text(`${soal.nomor}.`, x, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(22, 163, 74)
      const ans = typeof soal.jawaban === 'boolean'
        ? (soal.jawaban ? 'Benar' : 'Salah')
        : String(soal.jawaban).slice(0, 30)
      doc.text(ans, x + 8, y)

      col++
      if (col >= cols) {
        col = 0
        y += 6
      }
    }

    addFooter()

    const buffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="soal-${hasil.mataPelajaran}-${hasil.tingkatSekolah}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF export error:', err)
    return NextResponse.json({ error: 'Gagal membuat file .pdf' }, { status: 500 })
  }
}
