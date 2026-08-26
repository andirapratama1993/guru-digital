export type TingkatSekolah = 'SD' | 'SMP' | 'SMA'

export type MataPelajaran =
  | 'Matematika'
  | 'Bahasa Indonesia'
  | 'Bahasa Inggris'
  | 'IPA'
  | 'IPS'
  | 'PKN'
  | 'Penjaskes'
  | 'Seni Budaya'
  | 'Agama Islam'
  | 'Bahasa Sunda'
  | 'Bahasa Jawa'
  | 'Fisika'
  | 'Kimia'
  | 'Biologi'
  | 'Sosiologi'
  | 'Sejarah'
  | 'Akuntansi'
  | 'Teknologi Informatika'

export type TingkatKesulitan = 'mudah' | 'sedang' | 'sulit'

export type BentukSoal =
  | 'pilihan_ganda'
  | 'esai'
  | 'isian_singkat'
  | 'menjodohkan'
  | 'benar_salah'
  | 'teka_teki_silang'

export type AIAgent = 'default' | 'gemini' | 'chatgpt'

export type OutputFormat = 'text' | 'doc' | 'pdf'

export interface BentukSoalConfig {
  bentuk: BentukSoal
  jumlah: number
}

export interface GenerateSoalRequest {
  tingkatSekolah: TingkatSekolah
  kelas: number
  mataPelajaran: MataPelajaran
  tingkatKesulitan: TingkatKesulitan
  bentukSoalList: BentukSoalConfig[]
  materi: string
  aiAgent: AIAgent
  userId: string
}

export interface TTSCell {
  huruf: string      // huruf yang diisi, kosong jika diblokir
  blocked: boolean   // true = sel hitam
  nomor?: number     // nomor petunjuk di sudut sel
}

export interface SoalItem {
  nomor: number
  bentuk: BentukSoal
  pertanyaan: string
  opsi?: string[]            // untuk pilihan ganda, menjodohkan (kolom A)
  jawaban: string | boolean  // jawaban kunci
  pasangan?: string[]        // untuk menjodohkan (kolom B)
  kotak?: TTSCell[][]        // untuk TTS: grid 2D
  petunjukMendatar?: { nomor: number; pertanyaan: string }[]  // TTS
  petunjukMenurun?: { nomor: number; pertanyaan: string }[]   // TTS
  kata?: string[]            // TTS: daftar kata
}

export interface HasilSoal {
  id?: string
  userId: string
  tingkatSekolah: TingkatSekolah
  kelas: number
  mataPelajaran: MataPelajaran
  tingkatKesulitan: TingkatKesulitan
  bentukSoalList: BentukSoalConfig[]
  materi: string
  soalList: SoalItem[]
  aiAgentUsed: string
  createdAt?: string
}

export interface UserProfile {
  id: string
  email: string
  nama: string
  sekolah?: string
  openaiApiKey?: string
  geminiApiKey?: string
  createdAt?: string
}

export interface HistoryItem {
  id: string
  tingkatSekolah: TingkatSekolah
  mataPelajaran: MataPelajaran
  tingkatKesulitan: TingkatKesulitan
  totalSoal: number
  materi: string
  aiAgentUsed: string
  createdAt: string
}
