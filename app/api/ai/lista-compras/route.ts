import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithFallback } from "@/lib/ai/gemini";

export async function GET() {
  return NextResponse.json({ status: "online", servico: "Gerador de Lista de Compras NutriOne IA" });
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

    const { refeicoes, pacienteNome, planoTitulo } = await req.json();

    if (!Array.isArray(refeicoes) || refeicoes.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma refeição informada para gerar a lista de compras." },
        { status: 400 }
      );
    }

    const textoRefeicoes = refeicoes
      .map((r: any) => `[${r.nome} - ${r.horario || ""}]\n${r.descricao}`)
      .join("\n\n");

    const systemPrompt = `
Você é o "Assistente de Compras & Planejamento Alimentar NutriOne".
Sua tarefa é analisar todas as refeições do plano alimentar abaixo e extrair uma lista de compras semanal inteligente, consolidando ingredientes repetidos e agrupando por seções reais de supermercado/feira.

PLANO ALIMENTAR:
Paciente: ${pacienteNome || "Paciente"}
Título: ${planoTitulo || "Plano Alimentar"}

REFEIÇÕES CADASTRADAS:
${textoRefeicoes}

DIRETRIZES:
1. Agrupe os alimentos nas seguintes 5 categorias:
   - "hortifruti": Frutas, verduras, legumes, ervas frescas, tubérculos.
   - "proteinas_carnes_ovos": Ovos, frango, carnes bovinas, peixes, atum, whey protein, tofu, etc.
   - "graos_cereais_mercearia": Aveia, arroz integral, quinoa, pão integral, azeite de oliva, castanhas, sementes, etc.
   - "laticinios_derivados": Leite, iogurte natural, queijos brancos/cottage, bebidas vegetais.
   - "temperos_extras": Orégano, cúrcuma, canela, café, chás, sal marinho, etc.
2. Cada item deve ser uma string clara com sugestão de quantidade semanal estimada (ex: "Ovos - 2 a 3 dúzias", "Banana prata - 1 penca (6-8 un)", "Peito de frango - 1 kg").
3. Remova duplicidades entre refeições (ex: se ovo aparece no café e na janta, some a estimativa).
4. Forneça uma dica prática em "dica_compras" para economizar tempo ou dinheiro na feira/mercado.

Responda OBRIGATORIAMENTE em formato JSON válido, estritamente no esquema:
{
  "hortifruti": ["item 1", "item 2"],
  "proteinas_carnes_ovos": ["item 1", "item 2"],
  "graos_cereais_mercearia": ["item 1", "item 2"],
  "laticinios_derivados": ["item 1", "item 2"],
  "temperos_extras": ["item 1", "item 2"],
  "dica_compras": "Prefira comprar frutas da estação para melhor custo-benefício..."
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
        { error: "A IA não conseguiu gerar a lista de compras." },
        { status: 500 }
      );
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "A resposta da IA não pôde ser convertida no formato JSON da lista de compras." },
        { status: 500 }
      );
    }

    const resultado = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ ...resultado, modelo: modelUsed });
  } catch (error: any) {
    console.error("Erro na rota da lista de compras:", error);
    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao gerar lista de compras com IA." },
      { status: 500 }
    );
  }
}
