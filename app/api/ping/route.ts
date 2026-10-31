import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { erro: "Configurações do Supabase não encontradas." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consulta super leve para gerar tráfego de leitura no PostgreSQL
    const { data, error } = await supabase.from("perfis").select("id").limit(1);

    if (error) {
      // Se não encontrar tabela perfis, tenta pacientes
      await supabase.from("pacientes").select("id").limit(1);
    }

    return NextResponse.json({
      status: "online",
      banco: "Supabase ativo",
      horario: new Date().toISOString(),
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "erro", mensagem: err?.message || "Falha ao acordar o Supabase" },
      { status: 500 }
    );
  }
}
