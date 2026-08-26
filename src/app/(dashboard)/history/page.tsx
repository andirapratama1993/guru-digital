import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoryClient from '@/components/history/HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: history } = await supabase
    .from('soal_history')
    .select('id, tingkat_sekolah, mata_pelajaran, tingkat_kesulitan, total_soal, materi, ai_agent_used, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return <HistoryClient history={history || []} />
}
