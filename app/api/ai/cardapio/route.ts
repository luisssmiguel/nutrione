import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithFallback } from "@/lib/ai/gemini";

export async function GET() {
  return NextResponse.json({ status: "online", servico: "Gerador de Cardápio NutriOne IA" });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chave GEMINI_API_KEY não configurada no servidor (.env.local)." },
        { status: 500 }
      );
    }

    const {
      objetivo,
      caloriasMeta,
      qtdRefeicoes,
      alergias,
      preferencias,
      pacienteNome,
      pacienteInfo,
      observacoes,
    } = await req.json();

    const infoTexto = `
DADOS DO PACIENTE:
- Nome: ${pacienteNome || "Paciente"}
- Objetivo Clínico: ${objetivo || "Reeducação alimentar e saúde"}
- Meta Calórica Aproximada: ${caloriasMeta ? `${caloriasMeta} kcal` : "Adequar para o objetivo"}
- Quantidade de Refeições Desejada: ${qtdRefeicoes || 4} refeições ao longo do dia
- Alergias e Intolerâncias: ${alergias || "Nenhuma relatada"}
- Preferências / Aversões Alimentares: ${preferencias || "Nenhuma restrição específica"}
- Idade: ${pacienteInfo?.idade ? `${pacienteInfo.idade} anos` : "--"} | Peso: ${pacienteInfo?.peso ? `${pacienteInfo.peso} kg` : "--"} | Altura: ${pacienteInfo?.altura ? `${pacienteInfo.altura} cm` : "--"} | IMC: ${pacienteInfo?.imc || "--"}
- Observações adicionais do nutricionista: ${observacoes || "Nenhuma"}
    `.trim();

    const systemPrompt = `
Você é o "Especialista em Dietoterapia NutriOne", um assistente de inteligência artificial de elite que projeta cardápios nutricionais balanceados, realistas, saborosos e baseados em evidências científicas.

Sua tarefa é criar uma sugestão completa de plano alimentar para um(a) nutricionista clínico(a) avaliar, ajustar e prescrever ao paciente.

${infoTexto}

DIRETRIZES FUNDAMENTAIS:
1. Respeite OBRIGATORIAMENTE qualquer alergia ou intolerância alimentar informada.
2. Fracione o dia exatamente em ${qtdRefeicoes || 4} refeições bem distribuídas com horários lógicos (ex: 07:30, 10:00, 13:00, 16:30, 19:30).
3. Cada refeição deve ter:
   - "nome": Nome da refeição (ex: "Café da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia").
   - "horario": Horário sugerido em formato "HH:MM" (ex: "07:30").
   - "descricao": Lista de alimentos com porções práticas para o paciente (usando marcadores "• " ou "- "), opções de substituição direta entre parênteses quando couber, e orientações claras de preparo ou consumo.
4. Forneça uma estimativa de calorias e divisão aproximada de macronutrientes.
5. Inclua um parágrafo curto de "dicas_nutricionais" com orientações práticas para o paciente (hidratação, temperos naturais, sono).

Responda OBRIGATORIAMENTE em formato JSON válido, estritamente de acordo com o esquema abaixo, sem markdown desnecessário fora do JSON:
{
  "titulo_sugerido": "Plano Alimentar - Foco em ...",
  "calorias_estimadas": 1800,
  "macronutrientes": {
    "proteinas_g": 120,
    "carboidratos_g": 190,
    "gorduras_g": 50
  },
  "refeicoes": [
    {
      "nome": "Café da Manhã",
      "horario": "07:30",
      "descricao": "• 2 ovos mexidos com azeite de oliva e orégano\n• 1 fatia de pão 100% integral (ou 1 tapioca de 40g)\n• 1 fruta média (mamão papaia ou maçã)\n• 1 xícara de café sem açúcar ou chá verde"
    }
  ],
  "dicas_nutricionais": "Manter ingestão hídrica mínima de 2.5L ao dia..."
}
    `.trim();

    const { data, modelUsed } = await callGeminiWithFallback(
      {
        contents: [{ parts: [{ text: systemPrompt }] }],
      },
      apiKey
    );

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json(
        { error: "A IA não conseguiu gerar a estrutura do cardápio." },
        { status: 500 }
      );
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "A resposta da IA não pôde ser convertida no formato JSON do cardápio." },
        { status: 500 }
      );
    }

    const resultado = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ ...resultado, modelo: modelUsed });
  } catch (error: any) {
    console.error("Erro na rota do gerador de cardápio:", error);
    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao gerar cardápio com IA." },
      { status: 500 }
    );
  }
}
