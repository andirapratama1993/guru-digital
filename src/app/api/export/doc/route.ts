import { NextRequest, NextResponse } from 'next/server'
import type { HasilSoal } from '@/types'
import { BENTUK_SOAL_LABELS } from '@/lib/utils'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, PageNumber, Header, Footer
} from 'docx'

export async function POST(request: NextRequest) {
  try {
    const hasil: HasilSoal = await request.json()

    const children: Paragraph[] = []

    // Title
    children.push(
      new Paragraph({
        text: 'LEMBAR SOAL',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `Mata Pelajaran: ${hasil.mataPelajaran}`, bold: true, size: 24 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `Jenjang: ${hasil.tingkatSekolah}   |   Tingkat: ${hasil.tingkatKesulitan.toUpperCase()}`, size: 22 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `Materi: ${hasil.materi.slice(0, 100)}${hasil.materi.length > 100 ? '...' : ''}`,
            size: 20,
            italics: true,
            color: '666666',
          }),
        ],
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2563EB' } },
        spacing: { after: 400 },
        children: [],
      })
    )

    // Group soal by bentuk
    const groupedSoal: Record<string, typeof hasil.soalList> = {}
    for (const soal of hasil.soalList) {
      if (!groupedSoal[soal.bentuk]) groupedSoal[soal.bentuk] = []
      groupedSoal[soal.bentuk].push(soal)
    }

    for (const [bentuk, soalGroup] of Object.entries(groupedSoal)) {
      // Section header
      children.push(
        new Paragraph({
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: BENTUK_SOAL_LABELS[bentuk as keyof typeof BENTUK_SOAL_LABELS].toUpperCase(),
              bold: true,
              size: 24,
              color: '2563EB',
            }),
          ],
        })
      )

      for (const soal of soalGroup) {
        // Question
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: `${soal.nomor}. `, bold: true, size: 22 }),
              new TextRun({ text: soal.pertanyaan, size: 22 }),
            ],
          })
        )

        // Pilihan ganda options
        if (bentuk === 'pilihan_ganda' && soal.opsi) {
          soal.opsi.forEach((opsi, i) => {
            children.push(
              new Paragraph({
                indent: { left: 360 },
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: `${String.fromCharCode(65 + i)}. ${opsi}`, size: 22 }),
                ],
              })
            )
          })
        }

        // Menjodohkan
        if (bentuk === 'menjodohkan' && soal.opsi && soal.pasangan) {
          const rows = Math.max(soal.opsi.length, soal.pasangan.length)
          const tableRows: TableRow[] = [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Kolom A', bold: true, size: 22 })] })],
                  width: { size: 4500, type: WidthType.DXA },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Kolom B', bold: true, size: 22 })] })],
                  width: { size: 4500, type: WidthType.DXA },
                }),
              ],
            }),
          ]
          for (let i = 0; i < rows; i++) {
            tableRows.push(new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: soal.opsi[i] ? `${i + 1}. ${soal.opsi[i]}` : '', size: 22 })] })],
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: soal.pasangan[i] ? `${String.fromCharCode(65 + i)}. ${soal.pasangan[i]}` : '', size: 22 })] })],
                }),
              ],
            }))
          }
          children.push(new Paragraph({ spacing: { before: 100 }, children: [] }))
          // @ts-expect-error docx Table is not a Paragraph but valid child
          children.push(new Table({ rows: tableRows, width: { size: 9000, type: WidthType.DXA } }))
        }

        // Benar / Salah options
        if (bentuk === 'benar_salah') {
          children.push(
            new Paragraph({
              indent: { left: 360 },
              spacing: { after: 60 },
              children: [
                new TextRun({ text: 'a. Benar     b. Salah', size: 22 }),
              ],
            })
          )
        }

        children.push(new Paragraph({ spacing: { after: 80 }, children: [] }))
      }
    }

    // Answer key
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: 'KUNCI JAWABAN', bold: true, size: 28, color: '2563EB' }),
        ],
      })
    )

    for (const soal of hasil.soalList) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${soal.nomor}. `, bold: true, size: 20 }),
            new TextRun({
              text: typeof soal.jawaban === 'boolean'
                ? (soal.jawaban ? 'Benar' : 'Salah')
                : String(soal.jawaban),
              size: 20,
              color: '16A34A',
            }),
          ],
        })
      )
    }

    const doc = new Document({
      sections: [{
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Guru Digital | ${hasil.mataPelajaran} - ${hasil.tingkatSekolah}`, size: 18, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Halaman ', size: 18, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '94A3B8' }),
                  new TextRun({ text: ' dari ', size: 18, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="soal-${hasil.mataPelajaran}-${hasil.tingkatSekolah}.docx"`,
      },
    })
  } catch (err) {
    console.error('Doc export error:', err)
    return NextResponse.json({ error: 'Gagal membuat file .docx' }, { status: 500 })
  }
}
