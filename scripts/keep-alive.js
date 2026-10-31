/**
 * Script Keep-Alive autônomo para o Supabase.
 * Pode ser executado manualmente ou agendado no Windows Task Scheduler.
 */

const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error("Arquivo .env.local não encontrado.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Variáveis do Supabase não encontradas em .env.local");
  process.exit(1);
}

async function pingSupabase() {
  try {
    const endpoint = `${supabaseUrl}/rest/v1/perfis?select=id&limit=1`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (res.ok) {
      console.log(`[${new Date().toISOString()}] ✅ Supabase ativo e renovado! (HTTP ${res.status})`);
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠️ Resposta inesperada: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Erro ao conectar ao Supabase:`, err.message);
  }
}

pingSupabase();
