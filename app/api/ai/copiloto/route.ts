import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithFallback } from "@/lib/ai/gemini";

export async function GET() {
  return NextResponse.json({ status: "online", servico: "Copiloto NutriOne IA" });
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

    const { mensagem, historico, contextoPaciente } = await req.json();

    if (!mensagem || !mensagem.trim()) {
      return NextResponse.json(
        { error: "Nenhuma mensagem enviada para o Copiloto." },
        { status: 400 }
      );
    }

    // Monta o resumo clínico do paciente para instruir o Gemini
    let contextoTexto = "Nenhum dado clínico detalhado fornecido.";
    if (contextoPaciente) {
      const p = contextoPaciente;
      const an = p.anamnese || {};
      const ex = p.ultimos_exames || {};

      contextoTexto = `
INFORMAÇÕES DO PACIENTE ATUAL EM ATENDIMENTO:
- Nome: ${p.nome || "Paciente"}
- Idade: ${p.idade ? `${p.idade} anos` : "Não informada"} | Peso: ${p.peso ? `${p.peso} kg` : "--"} | Altura: ${p.altura ? `${p.altura} cm` : "--"} | IMC: ${p.imc || "--"}
- Objetivo Primário: ${an.objetivo_principal || "Não especificado"}
- Alergias e Intolerâncias: ${an.alergias_intolerancias || "Nenhuma relatada"}
- Aversões e Preferências: ${an.aversoes_preferencias || "Nenhuma relatada"}
- Histórico Clínico & Familiar: ${an.historico_clinico || "Sem histórico prévio"}
- Medicamentos e Suplementos: ${an.medicamentos_suplementos || "Nenhum em uso"}
- Nível de Atividade Física: ${an.nivel_atividade || "Sedentário"}
- Ingestão Hídrica: ${an.consumo_agua || "Não informada"}
- Qualidade do Sono: ${an.rotina_sono || "Não informada"}
- Saúde Intestinal: ${an.saude_intestinal || "Normal"}
${
  Object.keys(ex).length > 0
    ? `- Últimos Exames de Sangue: ${JSON.stringify(ex)}`
    : ""
}
      `.trim();
    }

    const systemPrompt = `
Você é o "Copiloto NutriOne", um assistente de inteligência artificial de elite especializado em Nutrição Clínica, Nutrição Esportiva, Bioquímica Metabólica e Dietoterapia Baseada em Evidências.
Você foi integrado diretamente ao prontuário médico para auxiliar o(a) nutricionista durante a consulta e tomada de decisão clínica.

${contextoTexto}

DIRETRIZES DE RESPOSTA:
1. Comunicação entre profissionais de saúde: Seja direto, técnico porém acessível, empático e prático.
2. Formatação impecável: Utilize Markdown com títulos curtos, listas com marcadores (bullet points) e termos-chave em negrito para facilitar a leitura rápida pelo nutricionista durante a consulta.
3. Personalização: Sempre leve em conta as características específicas deste paciente (alergias, queixas gastrointestinais, exames e objetivos).
4. Sugestões práticas: Se o profissional pedir substituições, receitas ou combinações, cite porções práticas ou equivalentes calóricos/macronutrientes.
5. Seja conciso: Evite enrolações ou introduções genéricas; vá direto ao ponto com alto valor clínico.
    `.trim();

    // Monta histórico de mensagens para multi-turn chat
    const contents: any[] = [];

    // Prompt de sistema como primeira instrução
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt + "\n\nPor favor, confirme que entendeu o contexto do paciente e está pronto para me auxiliar." }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Entendido perfeitamente! Estou pronto para auxiliar no atendimento deste paciente com base em evidências científicas e foco nos objetivos clínicos. Como posso ajudar agora?" }],
    });

    // Histórico de conversas anteriores (se houver)
    if (Array.isArray(historico)) {
      for (const item of historico) {
        if (item.role && item.content) {
          contents.push({
            role: item.role === "user" ? "user" : "model",
            parts: [{ text: item.content }],
          });
        }
      }
    }

    // Mensagem atual do nutricionista
    contents.push({
      role: "user",
      parts: [{ text: mensagem }],
    });

    // Chamada com fallback automático entre modelos
    const { data, modelUsed } = await callGeminiWithFallback({ contents }, apiKey);

    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resposta) {
      return NextResponse.json(
        { error: "O Copiloto não conseguiu gerar uma resposta legível no momento." },
        { status: 500 }
      );
    }

    return NextResponse.json({ resposta, modelo: modelUsed });
  } catch (error: any) {
    console.error("Erro na rota do copiloto:", error);
    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao consultar o Copiloto." },
      { status: 500 }
    );
  }
}
