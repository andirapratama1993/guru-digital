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
        content: 'Kamu adalah asisten guru profesional Indonesia. Buat soal berkualitas tinggi dalam format JSON yang valid. Selalu response dengan JSON array soal sesuai format yang diminta.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 4000,
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

function buildPrompt(req: GenerateSoalRequest): string {
  const bentukList = req.bentukSoalList.map(b =>
    `- ${BENTUK_SOAL_LABELS[b.bentuk]}: ${b.jumlah} soal`
  ).join('\n')

  return `Buat soal ujian untuk siswa ${req.tingkatSekolah} mata pelajaran ${req.mataPelajaran}.

Tingkat Kesulitan: ${req.tingkatKesulitan}
Materi: ${req.materi}

Bentuk soal yang dibutuhkan:
${bentukList}

Buat soal dalam format JSON berikut:
{
  "soalList": [
    {
      "nomor": 1,
      "bentuk": "pilihan_ganda",
      "pertanyaan": "...",
      "opsi": ["A", "B", "C", "D"],
      "jawaban": "A"
    },
    {
      "nomor": 2,
      "bentuk": "esai",
      "pertanyaan": "...",
      "jawaban": "Jawaban lengkap..."
    },
    {
      "nomor": 3,
      "bentuk": "isian_singkat",
      "pertanyaan": "...",
      "jawaban": "..."
    },
    {
      "nomor": 4,
      "bentuk": "menjodohkan",
      "pertanyaan": "Jodohkan kolom A dengan kolom B yang tepat:",
      "opsi": ["item1", "item2", "item3"],
      "pasangan": ["pasangan1", "pasangan2", "pasangan3"],
      "jawaban": "1-B, 2-A, 3-C"
    },
    {
      "nomor": 5,
      "bentuk": "benar_salah",
      "pertanyaan": "...",
      "jawaban": true
    },
    {
      "nomor": 6,
      "bentuk": "teka_teki_silang",
      "pertanyaan": "Petunjuk TTS:",
      "kata": ["kata1", "kata2"],
      "jawaban": "Lihat kunci jawaban"
    }
  ]
}

Aturan penting:
- Buat soal yang relevan dengan materi yang diberikan
- Tingkat kesulitan harus sesuai: ${req.tingkatKesulitan}
- Bahasa Indonesia yang baik dan benar
- Untuk pilihan_ganda: selalu sediakan 4 opsi (A, B, C, D)
- Untuk benar_salah: jawaban berupa true atau false
- Untuk menjodohkan: sediakan opsi dan pasangan yang seimbang
- Nomor soal harus berurutan dari 1 sampai total soal
- Total soal: ${req.bentukSoalList.reduce((sum, b) => sum + b.jumlah, 0)} soal`
}

function parseAndValidateSoal(raw: string, req: GenerateSoalRequest): SoalItem[] {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
    else throw new Error('Format JSON tidak valid')
  }

  const soalList: SoalItem[] = parsed.soalList || parsed.soal || parsed || []

  if (!Array.isArray(soalList)) {
    throw new Error('Format soal tidak valid')
  }

  // Re-number and validate
  let nomor = 1
  const validated: SoalItem[] = []
  for (const s of soalList) {
    validated.push({
      nomor: nomor++,
      bentuk: s.bentuk || 'esai',
      pertanyaan: s.pertanyaan || (s as unknown as Record<string, unknown>).soal as string || '',
      opsi: s.opsi,
      jawaban: s.jawaban ?? '',
      pasangan: s.pasangan,
      kata: s.kata,
      kotak: s.kotak,
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

    const req: GenerateSoalRequest = {
      ...body,
      materi: materiFull,
      userId: user.id,
    }

    const prompt = buildPrompt(req)
    let rawResult: string
    let aiAgentUsed: string

    // Determine which AI to use and try with fallback
    const agent = body.aiAgent || 'default'

    if (agent === 'chatgpt') {
      const key = userOpenAIKey || defaultOpenAIKey
      if (!key) return NextResponse.json({ error: 'API Key OpenAI tidak tersedia' }, { status: 400 })
      rawResult = await generateWithOpenAI(key, prompt)
      aiAgentUsed = 'ChatGPT'
    } else if (agent === 'gemini') {
      const key = userGeminiKey || defaultGeminiKey
      if (!key) return NextResponse.json({ error: 'API Key Gemini tidak tersedia' }, { status: 400 })
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
