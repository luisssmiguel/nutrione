"use client";

import { useEffect } from "react";

/**
 * Componente invisível (Background Keep-Alive Bot).
 * Garante que o Supabase receba consultas leves de tempos em tempos
 * para que o plano gratuito NUNCA seja pausado por inatividade.
 */
export default function SupabaseKeepAlive() {
  useEffect(() => {
    const realizarPing = async () => {
      try {
        const STORAGE_KEY = "nutrione_last_supabase_ping";
        const agora = Date.now();
        const ultimoPing = localStorage.getItem(STORAGE_KEY);

        // Se já pingou nos últimos 30 minutos, não precisa repetir de imediato
        if (ultimoPing && agora - parseInt(ultimoPing, 10) < 30 * 60 * 1000) {
          return;
        }

        await fetch("/api/ping", { cache: "no-store" });
        localStorage.setItem(STORAGE_KEY, agora.toString());
      } catch {
        // Silencioso para não poluir o console nem afetar a experiência do usuário
      }
    };

    // Ping imediato ao carregar a página
    realizarPing();

    // Ping periódico a cada 45 minutos enquanto o sistema estiver aberto
    const interval = setInterval(realizarPing, 45 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Totalmente invisível na tela
  return null;
}
