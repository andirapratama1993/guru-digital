import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { GenerateSoalRequest, SoalItem, HasilSoal } from '@/types'
import { BENTUK_SOAL_LABELS } from '@/lib/utils'
import { buildCrossword } from '@/lib/crossword'

async function generateWithOpenAI(apiKey: string, prompt: string): Promise<string> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Kamu adalah asisten guru profesional Indonesia. Buat soal berkualitas tinggi dalam format JSON yang valid. Response HANYA berupa JSON object, tidak ada teks lain.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
  })
  return completion.choices[0].message.content || '{}'
}

async function generateWithGemini(apiKey: string, prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

function buildPrompt(req: GenerateSoalRequest & { kelas: number }): string {
  const bentukList = req.bentukSoalList.map(b =>
    `- ${BENTUK_SOAL_LABELS[b.bentuk]}: ${b.jumlah} soal`
  ).join('\n')

  const hasMenjodohkan = req.bentukSoalList.some(b => b.bentuk === 'menjodohkan')
  const hasTTS = req.bentukSoalList.some(b => b.bentuk === 'teka_teki_silang')
  const totalSoal = req.bentukSoalList.reduce((sum, b) => sum + b.jumlah, 0)

  return `Buat soal ujian untuk siswa ${req.tingkatSekolah} Kelas ${req.kelas} mata pelajaran ${req.mataPelajaran}.

Tingkat Kesulitan: ${req.tingkatKesulitan}
Materi: ${req.materi}

Bentuk soal yang dibutuhkan:
${bentukList}

Format JSON yang WAJIB diikuti:
{
  "soalList": [
    {
      "nomor": 1,
      "bentuk": "pilihan_ganda",
      "pertanyaan": "teks pertanyaan lengkap",
      "opsi": ["teks opsi A", "teks opsi B", "teks opsi C", "teks opsi D"],
      "jawaban": "teks opsi A"
    },
    {
      "nomor": 2,
      "bentuk": "esai",
      "pertanyaan": "teks pertanyaan",
      "jawaban": "jawaban lengkap dan detail"
    },
    {
      "nomor": 3,
      "bentuk": "isian_singkat",
      "pertanyaan": "teks pertanyaan dengan titik-titik: ...",
      "jawaban": "jawaban singkat"
    }${hasMenjodohkan ? `,
    {
      "nomor": 4,
      "bentuk": "menjodohkan",
      "pertanyaan": "Jodohkan pernyataan di Kolom A dengan jawaban yang tepat di Kolom B!",
      "opsi": ["Kolom A item 1", "Kolom A item 2", "Kolom A item 3", "Kolom A item 4", "Kolom A item 5"],
      "pasangan": ["Kolom B item 1", "Kolom B item 2", "Kolom B item 3", "Kolom B item 4", "Kolom B item 5"],
      "jawaban": "1-A, 2-B, 3-C, 4-D, 5-E"
    }` : ''},
    {
      "nomor": 5,
      "bentuk": "benar_salah",
      "pertanyaan": "pernyataan yang harus dinilai benar atau salah",
      "jawaban": true
    }${hasTTS ? `,
    {
      "nomor": 6,
      "bentuk": "teka_teki_silang",
      "pertanyaan": "Isi teka-teki silang berikut berdasarkan petunjuk yang tersedia!",
      "kata": ["KATA1", "KATA2", "KATA3", "KATA4", "KATA5", "KATA6", "KATA7"],
      "petunjukMendatar": [
        {"nomor": 1, "pertanyaan": "petunjuk mendatar relevan dengan materi"},
        {"nomor": 3, "pertanyaan": "petunjuk mendatar relevan dengan materi"}
      ],
      "petunjukMenurun": [
        {"nomor": 1, "pertanyaan": "petunjuk menurun relevan dengan materi"},
        {"nomor": 2, "pertanyaan": "petunjuk menurun relevan dengan materi"}
      ],
      "jawaban": "Lihat kunci jawaban TTS"
    }` : ''}
  ]
}

ATURAN WAJIB:
1. Nomor soal berurutan dari 1 sampai ${totalSoal}
2. Tingkat kesulitan HARUS sesuai: ${req.tingkatKesulitan} (${req.tingkatSekolah} Kelas ${req.kelas})
3. Bahasa Indonesia yang baik dan benar
4. Pilihan ganda: SELALU 4 opsi berisi teks lengkap, bukan hanya huruf A/B/C/D
5. Benar/salah: jawaban berupa boolean true atau false (bukan string)
${hasMenjodohkan ? '6. MENJODOHKAN: WAJIB tepat 5 item di opsi (Kolom A) dan 5 item di pasangan (Kolom B). Isi dengan konten nyata relevan materi.' : ''}
${hasTTS ? '7. TEKA-TEKI SILANG: berikan 6-8 kata (huruf kapital, tanpa spasi, hanya A-Z) yang relevan dengan materi. JANGAN sertakan field "kotak" - sistem akan membangun grid otomatis. Pastikan petunjukMendatar dan petunjukMenurun sesuai jumlah kata.' : ''}`
}

function parseAndValidateSoal(
  raw: string,
  req: GenerateSoalRequest & { kelas: number }
): SoalItem[] {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try { parsed = JSON.parse(match[0]) }
      catch { throw new Error('Format JSON tidak valid dari AI') }
    } else {
      throw new Error('Format JSON tidak valid dari AI')
    }
  }

  const rawList: unknown[] = (parsed.soalList || parsed.soal || []) as unknown[]
  if (!Array.isArray(rawList)) throw new Error('Format soal tidak valid')

  let nomor = 1
  const validated: SoalItem[] = []

  for (const s of rawList as Record<string, unknown>[]) {
    const bentuk = String(s.bentuk || 'esai') as SoalItem['bentuk']

    // Menjodohkan: ensure min 5 pairs
    let opsi = Array.isArray(s.opsi) ? (s.opsi as string[]) : undefined
    let pasangan = Array.isArray(s.pasangan) ? (s.pasangan as string[]) : undefined

    if (bentuk === 'menjodohkan') {
      opsi = opsi || []
      pasangan = pasangan || []
      while (opsi.length < 5) opsi.push(`Item ${opsi.length + 1}`)
      while (pasangan.length < 5) pasangan.push(`Pasangan ${pasangan.length + 1}`)
    }

    // TTS: build proper crossword grid from kata list using algorithm
    let kotak: SoalItem['kotak'] = undefined
    let petunjukMendatar = Array.isArray(s.petunjukMendatar)
      ? (s.petunjukMendatar as { nomor: number; pertanyaan: string }[])
      : []
    let petunjukMenurun = Array.isArray(s.petunjukMenurun)
      ? (s.petunjukMenurun as { nomor: number; pertanyaan: string }[])
      : []

    if (bentuk === 'teka_teki_silang') {
      const kata = Array.isArray(s.kata)
        ? (s.kata as string[]).map(k => String(k).toUpperCase().replace(/[^A-Z]/g, '')).filter(k => k.length >= 3)
        : []

      // Build clues array (across first, then down)
      const allClues = [
        ...petunjukMendatar.map(p => p.pertanyaan),
        ...petunjukMenurun.map(p => p.pertanyaan),
      ]

      const crossword = buildCrossword(kata, allClues)
      kotak = crossword.grid

      // Re-assign clues from crossword builder output
      petunjukMendatar = crossword.across
      petunjukMenurun = crossword.down
    }

    validated.push({
      nomor: nomor++,
      bentuk,
      pertanyaan: String(s.pertanyaan || (s as Record<string, unknown>).soal || ''),
      opsi,
      jawaban: (s.jawaban !== undefined && s.jawaban !== null ? s.jawaban : '') as string | boolean,
      pasangan,
      kotak,
      petunjukMendatar: bentuk === 'teka_teki_silang' ? petunjukMendatar : undefined,
      petunjukMenurun: bentuk === 'teka_teki_silang' ? petunjukMenurun : undefined,
      kata: bentuk === 'teka_teki_silang'
        ? (Array.isArray(s.kata) ? (s.kata as string[]).map(k => String(k).toUpperCase()) : [])
        : undefined,
    })
  }

  return validated
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as GenerateSoalRequest & {
      kelas: number
      uploadedFiles?: { name: string; content: string; type: string }[]
    }

    // Get user's API keys
    const { data: profile } = await supabase
      .from('profiles')
      .select('openai_api_key, gemini_api_key')
      .eq('id', user.id)
      .single()

    const userOpenAIKey = profile?.openai_api_key
    const userGeminiKey = profile?.gemini_api_key
    // Default: prioritize OpenAI
    const defaultOpenAIKey = process.env.DEFAULT_OPENAI_API_KEY
    const defaultGeminiKey = process.env.DEFAULT_GEMINI_API_KEY

    // Build materi with file content
    let materiFull = body.materi
    if (body.uploadedFiles && body.uploadedFiles.length > 0) {
      const textFiles = body.uploadedFiles.filter(f => f.type === 'file')
      if (textFiles.length > 0) {
        materiFull += '\n\nKonten file:\n' + textFiles.map(f => f.content).join('\n\n')
      }
    }

    const req = { ...body, materi: materiFull, userId: user.id, kelas: body.kelas || 7 }
    const prompt = buildPrompt(req)
    let rawResult: string
    let aiAgentUsed: string

    const agent = body.aiAgent || 'default'

    if (agent === 'chatgpt') {
      const key = userOpenAIKey || defaultOpenAIKey
      if (!key) return NextResponse.json({ error: 'API Key OpenAI tidak tersedia. Tambahkan di menu Profil.' }, { status: 400 })
      rawResult = await generateWithOpenAI(key, prompt)
      aiAgentUsed = 'ChatGPT'
    } else if (agent === 'gemini') {
      const key = userGeminiKey || defaultGeminiKey
      if (!key) return NextResponse.json({ error: 'API Key Gemini tidak tersedia. Tambahkan di menu Profil.' }, { status: 400 })
      rawResult = await generateWithGemini(key, prompt)
      aiAgentUsed = 'Gemini'
    } else {
      // Default: OpenAI first (prioritized), fallback Gemini
      const openaiKey = userOpenAIKey || defaultOpenAIKey
      const geminiKey = userGeminiKey || defaultGeminiKey

      if (openaiKey) {
        try {
          rawResult = await generateWithOpenAI(openaiKey, prompt)
          aiAgentUsed = 'ChatGPT (Auto)'
        } catch (err) {
          console.warn('OpenAI failed, trying Gemini:', err)
          if (!geminiKey) throw err
          rawResult = await generateWithGemini(geminiKey, prompt)
          aiAgentUsed = 'Gemini (Auto-fallback)'
        }
      } else if (geminiKey) {
        rawResult = await generateWithGemini(geminiKey, prompt)
        aiAgentUsed = 'Gemini (Auto)'
      } else {
        return NextResponse.json({
          error: 'Tidak ada API Key tersedia. Tambahkan API Key di menu Profil atau hubungi administrator.',
        }, { status: 400 })
      }
    }

    const soalList = parseAndValidateSoal(rawResult, req)

    const hasil: HasilSoal = {
      userId: user.id,
      tingkatSekolah: req.tingkatSekolah,
      kelas: req.kelas,
      mataPelajaran: req.mataPelajaran,
      tingkatKesulitan: req.tingkatKesulitan,
      bentukSoalList: req.bentukSoalList,
      materi: body.materi.slice(0, 500),
      soalList,
      aiAgentUsed,
      createdAt: new Date().toISOString(),
    }

    // Save to history
    const { data: saved } = await supabase
      .from('soal_history')
      .insert({
        user_id: user.id,
        tingkat_sekolah: hasil.tingkatSekolah,
        mata_pelajaran: hasil.mataPelajaran,
        tingkat_kesulitan: hasil.tingkatKesulitan,
        bentuk_soal_list: hasil.bentukSoalList,
        materi: hasil.materi,
        soal_list: hasil.soalList,
        ai_agent_used: hasil.aiAgentUsed,
        total_soal: soalList.length,
      })
      .select('id')
      .single()

    if (saved?.id) hasil.id = saved.id

    return NextResponse.json(hasil)
  } catch (err: unknown) {
    console.error('Generate error:', err)
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
