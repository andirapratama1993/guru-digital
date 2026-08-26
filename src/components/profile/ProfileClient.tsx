'use client'

import { useState } from 'react'
import { User, Key, School, Save, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface ProfileClientProps {
  user: SupabaseUser
  profile: {
    nama: string
    sekolah: string | null
    openai_api_key: string | null
    gemini_api_key: string | null
  } | null
}

export default function ProfileClient({ user, profile }: ProfileClientProps) {
  const [nama, setNama] = useState(profile?.nama || '')
  const [sekolah, setSekolah] = useState(profile?.sekolah || '')
  const [openaiKey, setOpenaiKey] = useState(profile?.openai_api_key || '')
  const [geminiKey, setGeminiKey] = useState(profile?.gemini_api_key || '')
  const [showOpenai, setShowOpenai] = useState(false)
  const [showGemini, setShowGemini] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingKeys, setSavingKeys] = useState(false)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ nama, sekolah })
      .eq('id', user.id)
    if (error) toast.error('Gagal menyimpan profil')
    else toast.success('Profil berhasil disimpan!')
    setSavingProfile(false)
  }

  async function handleSaveKeys(e: React.FormEvent) {
    e.preventDefault()
    setSavingKeys(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        openai_api_key: openaiKey || null,
        gemini_api_key: geminiKey || null,
      })
      .eq('id', user.id)
    if (error) toast.error('Gagal menyimpan API key')
    else toast.success('API Key berhasil disimpan!')
    setSavingKeys(false)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Profil</h1>
        <p className="text-sm text-slate-400 mt-0.5">Kelola informasi akun dan API key Anda</p>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">Informasi Akun</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-100 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Nama Anda"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5" /> Nama Sekolah
            </label>
            <input
              type="text"
              value={sekolah}
              onChange={e => setSekolah(e.target.value)}
              placeholder="Contoh: SMPN 1 Bandung"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <Key className="w-4 h-4 text-violet-600" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">API Key Pribadi</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          API key pribadi akan diprioritaskan. Jika kosong, aplikasi akan menggunakan API key default.
          Key disimpan terenkripsi dan tidak pernah ditampilkan ke pihak lain.
        </p>

        <form onSubmit={handleSaveKeys} className="space-y-4">
          {/* OpenAI */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              ChatGPT (OpenAI)
              {openaiKey && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
            </label>
            <div className="relative">
              <input
                type={showOpenai ? 'text' : 'password'}
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowOpenai(!showOpenai)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Dapatkan di platform.openai.com/api-keys</p>
          </div>

          {/* Gemini */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              Google Gemini
              {geminiKey && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
            </label>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Dapatkan di aistudio.google.com/apikey</p>
          </div>

          <button
            type="submit"
            disabled={savingKeys}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {savingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {savingKeys ? 'Menyimpan...' : 'Simpan API Key'}
          </button>
        </form>
      </div>
    </div>
  )
}
