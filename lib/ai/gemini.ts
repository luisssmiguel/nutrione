const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
];

export async function callGeminiWithFallback(
  payload: any,
  apiKey: string
): Promise<{ data: any; modelUsed: string }> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return { data, modelUsed: model };
      }

      const errText = await res.text();
      console.warn(`[Gemini IA] Modelo ${model} retornou ${res.status}. Tentando modelo reserva...`);
      lastError = new Error(`HTTP ${res.status}: ${errText}`);
    } catch (err: any) {
      console.warn(`[Gemini IA] Modelo ${model} falha de rede: ${err.message}. Tentando reserva...`);
      lastError = err;
    }
  }

  throw lastError || new Error("Não foi possível conectar a nenhum dos modelos de IA no momento.");
}
