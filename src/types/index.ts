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
  mataPelajaran: MataPelajaran
  tingkatKesulitan: TingkatKesulitan
  bentukSoalList: BentukSoalConfig[]
  materi: string
  aiAgent: AIAgent
  userId: string
}

export interface SoalItem {
  nomor: number
  bentuk: BentukSoal
  pertanyaan: string
  opsi?: string[]           // untuk pilihan ganda, menjodohkan
  jawaban: string | boolean // jawaban kunci
  pasangan?: string[]       // untuk menjodohkan (kolom kanan)
  kotak?: string[][]        // untuk TTS: grid
  kata?: string[]           // untuk TTS: daftar kata
}

export interface HasilSoal {
  id?: string
  userId: string
  tingkatSekolah: TingkatSekolah
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
