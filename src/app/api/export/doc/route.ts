import { NextRequest, NextResponse } from 'next/server'
import type { HasilSoal, TTSCell } from '@/types'
import { BENTUK_SOAL_LABELS } from '@/lib/utils'
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, PageNumber, Header, Footer, ShadingType,
  HeightRule, TableLayoutType
} from 'docx'

type DocChild = Paragraph | Table

interface ParaOpts {
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]
  spacing?: { before?: number; after?: number }
  border?: Record<string, unknown>
  shading?: Record<string, unknown>
  pageBreakBefore?: boolean
  indent?: { left?: number }
}

function makePara(children: TextRun[], opts?: ParaOpts): Paragraph {
  return new Paragraph({ children, spacing: { after: 80 }, ...(opts as object) } as ConstructorParameters<typeof Paragraph>[0])
}

function makeHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: '2563EB' })],
    spacing: { before: 300, after: 150 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DBEAFE' } },
  })
}

function makeSectionHeader(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: '2563EB' })],
    spacing: { before: 240, after: 120 },
    shading: { type: ShadingType.CLEAR, color: 'EFF6FF', fill: 'EFF6FF' },
  })
}

export async function POST(request: NextRequest) {
  try {
    const hasil: HasilSoal = await request.json()

    const soalChildren: DocChild[] = []
    const keyChildren: DocChild[] = []

    // ─── title block ────────────────────────────────────────────
    soalChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'LEMBAR SOAL', bold: true, size: 36, color: '0F172A' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '2563EB' } },
      }),
      makePara([new TextRun({ text: hasil.mataPelajaran, bold: true, size: 28 })], { alignment: AlignmentType.CENTER }),
      makePara([new TextRun({
        text: `Kelas ${hasil.kelas} ${hasil.tingkatSekolah}   |   Tingkat Kesulitan: ${hasil.tingkatKesulitan.toUpperCase()}   |   Total: ${hasil.soalList.length} soal`,
        size: 20, color: '475569'
      })], { alignment: AlignmentType.CENTER }),
      makePara([new TextRun({
        text: `Materi: ${hasil.materi.slice(0, 100)}${hasil.materi.length > 100 ? '...' : ''}`,
        size: 18, italics: true, color: '94A3B8'
      })], { alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
    )

    // ─── group soal by bentuk ───────────────────────────────────
    const groupedSoal: Record<string, typeof hasil.soalList> = {}
    for (const soal of hasil.soalList) {
      if (!groupedSoal[soal.bentuk]) groupedSoal[soal.bentuk] = []
      groupedSoal[soal.bentuk].push(soal)
    }

    for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
      soalChildren.push(makeSectionHeader(
        `${BENTUK_SOAL_LABELS[bentuk as keyof typeof BENTUK_SOAL_LABELS].toUpperCase()} (${soalGroup.length} soal)`
      ))

      for (const soal of soalGroup) {
        // question
        soalChildren.push(makePara([
          new TextRun({ text: `${soal.nomor}. `, bold: true, size: 22, color: '2563EB' }),
          new TextRun({ text: soal.pertanyaan, size: 22 }),
        ]))

        // pilihan ganda
        if (bentuk === 'pilihan_ganda' && soal.opsi) {
          soal.opsi.forEach((o, i) => {
            soalChildren.push(makePara([
              new TextRun({ text: `     ${String.fromCharCode(65 + i)}. ${o}`, size: 22, color: '475569' })
            ]))
          })
        }

        // menjodohkan
        if (bentuk === 'menjodohkan' && soal.opsi && soal.pasangan) {
          const rows = Math.max(soal.opsi.length, soal.pasangan.length)
          const tableRows: TableRow[] = [
            new TableRow({
              children: [
                new TableCell({
                  children: [makePara([new TextRun({ text: 'Kolom A', bold: true, size: 20, color: '2563EB' })])],
                  width: { size: 4500, type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, fill: 'DBEAFE' },
                }),
                new TableCell({
                  children: [makePara([new TextRun({ text: 'Kolom B', bold: true, size: 20, color: '2563EB' })])],
                  width: { size: 4500, type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                }),
              ],
            })
          ]
          for (let i = 0; i < rows; i++) {
            tableRows.push(new TableRow({
              children: [
                new TableCell({
                  children: [makePara([new TextRun({ text: soal.opsi[i] ? `${i + 1}. ${soal.opsi[i]}` : '', size: 20 })])],
                }),
                new TableCell({
                  children: [makePara([new TextRun({ text: soal.pasangan[i] ? `${String.fromCharCode(65 + i)}. ${soal.pasangan[i]}` : '', size: 20 })])],
                }),
              ],
            }))
          }
          soalChildren.push(new Table({
            rows: tableRows,
            width: { size: 9000, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
          }))
        }

        // benar/salah
        if (bentuk === 'benar_salah') {
          soalChildren.push(makePara([
            new TextRun({ text: '     ( Benar )     ( Salah )', size: 22, color: '64748B' })
          ]))
        }

        // TTS
        if (bentuk === 'teka_teki_silang' && soal.kotak) {
          soalChildren.push(...buildTTSDocx(soal.kotak, soal.petunjukMendatar, soal.petunjukMenurun))
        }

        soalChildren.push(new Paragraph({ children: [], spacing: { after: 80 } }))
      }
    }

    // ─── kunci jawaban ──────────────────────────────────────────
    keyChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'KUNCI JAWABAN', bold: true, size: 32, color: '2563EB' })],
        alignment: AlignmentType.CENTER,
        pageBreakBefore: true,
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '2563EB' } },
      })
    )

    for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
      keyChildren.push(makeSectionHeader(
        BENTUK_SOAL_LABELS[bentuk as keyof typeof BENTUK_SOAL_LABELS].toUpperCase()
      ))

      for (const soal of soalGroup) {
        // Question (truncated)
        const qShort = soal.pertanyaan.length > 90
          ? soal.pertanyaan.slice(0, 90) + '...'
          : soal.pertanyaan

        keyChildren.push(makePara([
          new TextRun({ text: `${soal.nomor}. `, bold: true, size: 20, color: '1E293B' }),
          new TextRun({ text: qShort, size: 20, color: '475569' }),
        ]))

        // Answer
        if (bentuk === 'teka_teki_silang') {
          const kataStr = soal.kata?.join(', ') || 'Lihat grid TTS'
          keyChildren.push(makePara([
            new TextRun({ text: '   → Kata-kata: ', bold: true, size: 20, color: '16A34A' }),
            new TextRun({ text: kataStr, size: 20, color: '16A34A' }),
          ]))
          // Include TTS grid with answers filled
          if (soal.kotak) {
            keyChildren.push(...buildTTSDocx(soal.kotak, soal.petunjukMendatar, soal.petunjukMenurun, true))
          }
        } else {
          const answerText = typeof soal.jawaban === 'boolean'
            ? (soal.jawaban ? 'Benar' : 'Salah')
            : String(soal.jawaban)
          keyChildren.push(makePara([
            new TextRun({ text: '   Jawaban: ', bold: true, size: 21, color: '16A34A' }),
            new TextRun({ text: answerText, size: 21, color: '16A34A', bold: true }),
          ]))
        }

        // divider
        keyChildren.push(new Paragraph({
          children: [],
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' } },
          spacing: { after: 120 },
        }))
      }
    }

    // ─── build document ─────────────────────────────────────────
    const headerPara = new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({
          text: `Guru Digital  |  ${hasil.mataPelajaran} – Kelas ${hasil.kelas} ${hasil.tingkatSekolah}`,
          size: 16, color: '94A3B8'
        })],
      })],
    })

    const footerPara = new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Halaman ', size: 16, color: '94A3B8' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
          new TextRun({ text: ' dari ', size: 16, color: '94A3B8' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8' }),
        ],
      })],
    })

    const allChildren: DocChild[] = [...soalChildren, ...keyChildren]

    const docx = new Document({
      sections: [{
        headers: { default: headerPara },
        footers: { default: footerPara },
        children: allChildren as Paragraph[],
      }],
    })

    const buffer = await Packer.toBuffer(docx)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="soal-${hasil.mataPelajaran}-${hasil.tingkatSekolah}-kelas${hasil.kelas}.docx"`,
      },
    })
  } catch (err) {
    console.error('Doc export error:', err)
    return NextResponse.json({ error: 'Gagal membuat file .docx' }, { status: 500 })
  }
}

// Build TTS grid as Word Table
function buildTTSDocx(
  kotak: TTSCell[][],
  petunjukMendatar?: { nomor: number; pertanyaan: string }[],
  petunjukMenurun?: { nomor: number; pertanyaan: string }[],
  showAnswers = false
): DocChild[] {
  const result: DocChild[] = []
  const rows = kotak.length
  const cols = kotak[0]?.length || 1

  // Cell size in DXA (1/20 of a point). 360 DXA ≈ 6.35mm
  const cellDxa = 360

  const tableRows: TableRow[] = []
  for (let r = 0; r < rows; r++) {
    const cells: TableCell[] = []
    for (let c = 0; c < cols; c++) {
      const cell = kotak[r][c]

      if (cell.blocked) {
        cells.push(new TableCell({
          children: [new Paragraph({ children: [] })],
          width: { size: cellDxa, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: '1E293B' },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        }))
      } else {
        const cellChildren: Paragraph[] = []
        if (cell.nomor !== undefined) {
          cellChildren.push(new Paragraph({
            children: [new TextRun({ text: String(cell.nomor), size: 10, bold: true, color: '2563EB' })],
            spacing: { before: 0, after: 0 },
          }))
        }
        cellChildren.push(new Paragraph({
          children: [new TextRun({
            text: (showAnswers && cell.huruf) ? cell.huruf : '',
            size: 18, bold: true, color: '0F172A'
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
        }))

        cells.push(new TableCell({
          children: cellChildren,
          width: { size: cellDxa, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: 'FFFFFF' },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
          },
          margins: { top: 20, bottom: 20, left: 30, right: 30 },
        }))
      }
    }
    tableRows.push(new TableRow({
      children: cells,
      height: { value: cellDxa, rule: HeightRule.EXACT },
    }))
  }

  result.push(new Table({
    rows: tableRows,
    width: { size: cols * cellDxa, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
  }))

  // Petunjuk mendatar
  if (petunjukMendatar?.length) {
    result.push(makePara([new TextRun({ text: 'Mendatar (→)', bold: true, size: 20, color: '2563EB' })],
      { spacing: { before: 200, after: 80 } }))
    for (const p of petunjukMendatar) {
      result.push(makePara([new TextRun({ text: `${p.nomor}. ${p.pertanyaan}`, size: 20 })]))
    }
  }

  // Petunjuk menurun
  if (petunjukMenurun?.length) {
    result.push(makePara([new TextRun({ text: 'Menurun (↓)', bold: true, size: 20, color: '2563EB' })],
      { spacing: { before: 200, after: 80 } }))
    for (const p of petunjukMenurun) {
      result.push(makePara([new TextRun({ text: `${p.nomor}. ${p.pertanyaan}`, size: 20 })]))
    }
  }

  return result
}
