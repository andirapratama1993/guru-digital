import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { BentukSoal, TingkatSekolah, MataPelajaran } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TINGKAT_SEKOLAH: TingkatSekolah[] = ['SD', 'SMP', 'SMA']

export const KELAS_BY_TINGKAT: Record<TingkatSekolah, number[]> = {
  SD:  [1, 2, 3, 4, 5, 6],
  SMP: [7, 8, 9],
  SMA: [10, 11, 12],
}

export const MATA_PELAJARAN_BY_TINGKAT: Record<TingkatSekolah, MataPelajaran[]> = {
  SD: [
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'IPA',
    'IPS',
    'PKN',
    'Penjaskes',
    'Seni Budaya',
    'Agama Islam',
    'Bahasa Sunda',
    'Bahasa Jawa',
  ],
  SMP: [
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'IPA',
    'IPS',
    'PKN',
    'Penjaskes',
    'Seni Budaya',
    'Agama Islam',
    'Bahasa Sunda',
    'Bahasa Jawa',
    'Teknologi Informatika',
  ],
  SMA: [
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'Fisika',
    'Kimia',
    'Biologi',
    'Sosiologi',
    'Sejarah',
    'PKN',
    'Penjaskes',
    'Seni Budaya',
    'Agama Islam',
    'Bahasa Sunda',
    'Bahasa Jawa',
    'Akuntansi',
    'Teknologi Informatika',
    'IPS',
  ],
}

export const BENTUK_SOAL_LABELS: Record<BentukSoal, string> = {
  pilihan_ganda: 'Pilihan Ganda',
  esai: 'Esai',
  isian_singkat: 'Isian Singkat',
  menjodohkan: 'Menjodohkan',
  benar_salah: 'Benar / Salah',
  teka_teki_silang: 'Teka-Teki Silang',
}

export const TINGKAT_KESULITAN_LABELS = {
  mudah: 'Mudah',
  sedang: 'Sedang',
  sulit: 'Sulit',
}

export const AI_AGENT_LABELS = {
  default: 'Default (Auto)',
  gemini: 'Google Gemini',
  chatgpt: 'ChatGPT (OpenAI)',
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}
