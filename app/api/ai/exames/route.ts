import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithFallback } from "@/lib/ai/gemini";

export async function GET() {
  return NextResponse.json({ status: "online", servico: "Leitor de Exames NutriOne IA" });
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

    const body = await req.json();
    const texto = body.texto;
    // Aceita arquivoBase64 direto ou aninhado em body.arquivo?.base64
    const arquivoBase64 = body.arquivoBase64 || body.arquivo?.base64 || body.base64;
    let mimeType = body.mimeType || body.arquivo?.mimeType || "application/pdf";

    if (!texto && !arquivoBase64) {
      return NextResponse.json(
        { error: "Nenhum texto ou arquivo enviado para processamento." },
        { status: 400 }
      );
    }

    const parts: any[] = [];

    // Se veio imagem ou PDF em base64
    if (arquivoBase64) {
      // Normaliza mimeType caso venha vazio
      if (!mimeType || mimeType === "application/octet-stream") {
        mimeType = "application/pdf";
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: arquivoBase64,
        },
      });
    }

    // Se veio texto colado do laudo
    if (texto && texto.trim()) {
      parts.push({
        text: `TEXTO DO LAUDO:\n${texto}`,
      });
    }

    // Prompt de extração com instrução estrita de JSON
    parts.push({
      text: `
Você é um especialista em análise e transcrição de laudos laboratoriais para prontuários de nutrição clínica.
Sua tarefa é analisar o laudo (imagem, PDF ou texto) fornecido e extrair os valores numéricos dos seguintes exames laboratoriais, se estiverem presentes:
- Glicemia de jejum (mg/dL) -> "glicemia"
- Insulina de jejum ou basal (µUI/mL) -> "insulina"
- Colesterol total (mg/dL) -> "colesterol_total"
- HDL colesterol (mg/dL) -> "hdl"
- LDL colesterol (mg/dL) -> "ldl"
- Triglicerídeos (mg/dL) -> "triglicerideos"
- TSH (µUI/mL) -> "tsh"
- T3 livre (pg/mL) -> "t3_livre"
- T4 livre (ng/dL) -> "t4_livre"
- Hemoglobina (g/dL) -> "hemoglobina"
- Leucócitos (mil/mm³ ou contagem total) -> "leucocitos"

ATENÇÃO: Extraia apenas números para os valores dos exames (ex: 82, 4.5, 172). Não inclua unidades na chave numérica. Se um exame não constar no laudo, preencha com null.

Responda OBRIGATORIAMENTE em formato JSON válido, estritamente com este esquema:
{
  "exames": {
    "glicemia": number | null,
    "insulina": number | null,
    "colesterol_total": number | null,
    "hdl": number | null,
    "ldl": number | null,
    "triglicerideos": number | null,
    "tsh": number | null,
    "t3_livre": number | null,
    "t4_livre": number | null,
    "hemoglobina": number | null,
    "leucocitos": number | null
  },
  "resumo": "Síntese dos resultados para o nutricionista..."
}
      `.trim(),
    });

    // Chamada com fallback automático entre modelos
    const { data, modelUsed } = await callGeminiWithFallback(
      {
        contents: [{ parts }],
      },
      apiKey
    );

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "A IA não retornou conteúdo legível para o laudo." },
        { status: 500 }
      );
    }

    // Extrai o JSON da resposta (mesmo se a IA colocar ```json ou texto ao redor)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Resposta sem bloco JSON:", rawText);
      return NextResponse.json(
        { error: "A IA processou o arquivo mas a resposta não pôde ser convertida em formato estruturado." },
        { status: 500 }
      );
    }

    const resultado = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ ...resultado, modelo: modelUsed });
  } catch (error: any) {
    console.error("Erro na rota de extração de exames:", error);
    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao processar o exame com IA." },
      { status: 500 }
    );
  }
}
