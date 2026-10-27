import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  const { error } = await supabase.from('keep_alive').insert({ date: new Date().toISOString() });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
