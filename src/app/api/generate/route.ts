import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { GenerateSoalRequest, SoalItem, HasilSoal } from '@/types'
import { BENTUK_SOAL_LABELS } from '@/lib/utils'

async function generateWithOpenAI(apiKey: string, prompt: string): Promise<string> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey })

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Kamu adalah asisten guru profesional Indonesia. Buat soal berkualitas tinggi dalam format JSON yang valid. Selalu response dengan JSON object sesuai format yang diminta. PENTING: untuk teka_teki_silang, kotak harus berupa array 2D yang valid dengan objek {huruf, blocked, nomor}.'
      },
      { role: 'user', content: prompt }
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

  return `Buat soal ujian untuk siswa ${req.tingkatSekolah} Kelas ${req.kelas} mata pelajaran ${req.mataPelajaran}.

Tingkat Kesulitan: ${req.tingkatKesulitan}
Materi: ${req.materi}

Bentuk soal yang dibutuhkan:
${bentukList}

Buat soal dalam format JSON berikut (response hanya JSON, tidak ada teks lain):
{
  "soalList": [
    {
      "nomor": 1,
      "bentuk": "pilihan_ganda",
      "pertanyaan": "...",
      "opsi": ["teks opsi A", "teks opsi B", "teks opsi C", "teks opsi D"],
      "jawaban": "teks opsi A"
    },
    {
      "nomor": 2,
      "bentuk": "esai",
      "pertanyaan": "...",
      "jawaban": "Jawaban lengkap dan detail..."
    },
    {
      "nomor": 3,
      "bentuk": "isian_singkat",
      "pertanyaan": "... adalah ...",
      "jawaban": "jawaban singkat"
    },
    ${hasMenjodohkan ? `{
      "nomor": 4,
      "bentuk": "menjodohkan",
      "pertanyaan": "Jodohkan pernyataan di Kolom A dengan jawaban yang tepat di Kolom B!",
      "opsi": ["item Kolom A 1", "item Kolom A 2", "item Kolom A 3", "item Kolom A 4", "item Kolom A 5"],
      "pasangan": ["item Kolom B 1", "item Kolom B 2", "item Kolom B 3", "item Kolom B 4", "item Kolom B 5"],
      "jawaban": "1-A, 2-B, 3-C, 4-D, 5-E"
    },` : ''}
    {
      "nomor": 5,
      "bentuk": "benar_salah",
      "pertanyaan": "Pernyataan yang harus dinilai benar atau salah...",
      "jawaban": true
    }${hasTTS ? `,
    {
      "nomor": 6,
      "bentuk": "teka_teki_silang",
      "pertanyaan": "Isi teka-teki silang berikut berdasarkan petunjuk yang tersedia!",
      "kotak": [
        [{"huruf":"","blocked":false,"nomor":1},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":false,"nomor":2},{"huruf":"","blocked":false},{"huruf":"","blocked":false}],
        [{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":true},{"huruf":"","blocked":true},{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":true}],
        [{"huruf":"","blocked":false,"nomor":3},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false}],
        [{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":true},{"huruf":"","blocked":true},{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":true}],
        [{"huruf":"","blocked":false,"nomor":4},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false}],
        [{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":true},{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":true},{"huruf":"","blocked":false},{"huruf":"","blocked":true},{"huruf":"","blocked":true}],
        [{"huruf":"","blocked":false,"nomor":5},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false},{"huruf":"","blocked":false}]
      ],
      "petunjukMendatar": [
        {"nomor": 1, "pertanyaan": "Petunjuk mendatar nomor 1 berkaitan dengan materi..."},
        {"nomor": 3, "pertanyaan": "Petunjuk mendatar nomor 3 berkaitan dengan materi..."},
        {"nomor": 4, "pertanyaan": "Petunjuk mendatar nomor 4 berkaitan dengan materi..."},
        {"nomor": 5, "pertanyaan": "Petunjuk mendatar nomor 5 berkaitan dengan materi..."}
      ],
      "petunjukMenurun": [
        {"nomor": 1, "pertanyaan": "Petunjuk menurun nomor 1 berkaitan dengan materi..."},
        {"nomor": 2, "pertanyaan": "Petunjuk menurun nomor 2 berkaitan dengan materi..."},
        {"nomor": 4, "pertanyaan": "Petunjuk menurun nomor 4 berkaitan dengan materi..."}
      ],
      "kata": ["KATA1", "KATA2", "KATA3", "KATA4", "KATA5"],
      "jawaban": "Lihat kunci jawaban TTS"
    }` : ''}
  ]
}

ATURAN WAJIB:
1. Nomor soal berurutan dari 1 sampai total soal
2. Tingkat kesulitan HARUS sesuai: ${req.tingkatKesulitan}
3. Bahasa Indonesia yang baik dan benar, sesuai level ${req.tingkatSekolah} Kelas ${req.kelas}
4. Pilihan ganda: SELALU 4 opsi, isi opsi dengan teks lengkap bukan hanya huruf
5. Benar/salah: jawaban berupa boolean true atau false
${hasMenjodohkan ? `6. MENJODOHKAN: WAJIB minimal 5 pasangan di opsi dan pasangan. Opsi = Kolom A, Pasangan = Kolom B. Isi dengan konten nyata yang relevan dengan materi, bukan placeholder.` : ''}
${hasTTS ? `7. TEKA-TEKI SILANG: kotak harus array 2D valid. Setiap sel adalah objek {huruf: string, blocked: boolean, nomor?: number}. Sel blocked=true adalah kotak hitam. Nomor muncul di sel awal kata. Isi petunjukMendatar dan petunjukMenurun dengan pertanyaan tentang materi. Kata-kata harus relevan dengan materi pelajaran.` : ''}
- Total soal: ${req.bentukSoalList.reduce((sum, b) => sum + b.jumlah, 0)} soal`
}

function buildTTSGrid(size = 9): import('@/types').TTSCell[][] {
  // Fallback grid jika AI tidak menghasilkan grid yang valid
  const grid: import('@/types').TTSCell[][] = []
  for (let r = 0; r < 7; r++) {
    const row: import('@/types').TTSCell[] = []
    for (let c = 0; c < size; c++) {
      const blocked = (r % 2 === 1) && (c % 2 === 1)
      row.push({
        huruf: '',
        blocked,
        nomor: (!blocked && r === 0 && c === 0) ? 1 : undefined,
      })
    }
    grid.push(row)
  }
  return grid
}

function normalizeTTSGrid(raw: unknown): import('@/types').TTSCell[][] {
  if (!Array.isArray(raw) || raw.length === 0) return buildTTSGrid()

  try {
    const grid: import('@/types').TTSCell[][] = (raw as unknown[][]).map(row => {
      if (!Array.isArray(row)) return []
      return (row as Record<string, unknown>[]).map(cell => ({
        huruf: typeof cell?.huruf === 'string' ? cell.huruf : '',
        blocked: typeof cell?.blocked === 'boolean' ? cell.blocked : false,
        nomor: typeof cell?.nomor === 'number' ? cell.nomor : undefined,
      }))
    })
    // Validate dimensions
    if (grid.length < 3 || grid[0].length < 3) return buildTTSGrid()
    return grid
  } catch {
    return buildTTSGrid()
  }
}

function parseAndValidateSoal(raw: string, req: GenerateSoalRequest & { kelas: number }): SoalItem[] {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try { parsed = JSON.parse(match[0]) } catch { throw new Error('Format JSON tidak valid') }
    } else {
      throw new Error('Format JSON tidak valid')
    }
  }

  const soalList: unknown[] = parsed.soalList || parsed.soal || []

  if (!Array.isArray(soalList)) throw new Error('Format soal tidak valid')

  let nomor = 1
  const validated: SoalItem[] = []

  for (const s of soalList as Record<string, unknown>[]) {
    const bentuk = String(s.bentuk || 'esai') as SoalItem['bentuk']

    // Handle TTS grid normalization
    const kotak = bentuk === 'teka_teki_silang'
      ? normalizeTTSGrid(s.kotak)
      : undefined

    // Ensure menjodohkan has at least 5 pairs
    let opsi = Array.isArray(s.opsi) ? s.opsi as string[] : undefined
    let pasangan = Array.isArray(s.pasangan) ? s.pasangan as string[] : undefined

    if (bentuk === 'menjodohkan') {
      if (!opsi || opsi.length < 5) {
        opsi = opsi || []
        while (opsi.length < 5) opsi.push(`Item ${opsi.length + 1}`)
      }
      if (!pasangan || pasangan.length < 5) {
        pasangan = pasangan || []
        while (pasangan.length < 5) pasangan.push(`Pasangan ${pasangan.length + 1}`)
      }
    }

    validated.push({
      nomor: nomor++,
      bentuk,
      pertanyaan: String(s.pertanyaan || (s as Record<string, unknown>).soal || ''),
      opsi,
      jawaban: (s.jawaban !== undefined && s.jawaban !== null ? s.jawaban : '') as string | boolean,
      pasangan,
      kotak,
      petunjukMendatar: bentuk === 'teka_teki_silang'
        ? (Array.isArray(s.petunjukMendatar) ? s.petunjukMendatar as { nomor: number; pertanyaan: string }[] : [])
        : undefined,
      petunjukMenurun: bentuk === 'teka_teki_silang'
        ? (Array.isArray(s.petunjukMenurun) ? s.petunjukMenurun as { nomor: number; pertanyaan: string }[] : [])
        : undefined,
      kata: Array.isArray(s.kata) ? s.kata as string[] : undefined,
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

    const req = {
      ...body,
      materi: materiFull,
      userId: user.id,
      kelas: body.kelas || 7,
    }

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
      // Default: try OpenAI first, fallback to Gemini
      const openaiKey = userOpenAIKey || defaultOpenAIKey
      const geminiKey = userGeminiKey || defaultGeminiKey

      if (openaiKey) {
        try {
          rawResult = await generateWithOpenAI(openaiKey, prompt)
          aiAgentUsed = 'ChatGPT (Auto)'
        } catch (openaiErr) {
          console.warn('OpenAI failed, trying Gemini:', openaiErr)
          if (!geminiKey) throw openaiErr
          rawResult = await generateWithGemini(geminiKey, prompt)
          aiAgentUsed = 'Gemini (Auto-fallback)'
        }
      } else if (geminiKey) {
        rawResult = await generateWithGemini(geminiKey, prompt)
        aiAgentUsed = 'Gemini (Auto)'
      } else {
        return NextResponse.json({
          error: 'Tidak ada API Key tersedia. Tambahkan API Key di menu Profil atau hubungi administrator.'
        }, { status: 400 })
      }
    }

    const soalList = parseAndValidateSoal(rawResult, req)
    const totalSoal = soalList.length

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
        total_soal: totalSoal,
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
