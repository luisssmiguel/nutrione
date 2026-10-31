"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

// Configurações de tempo
const STORAGE_KEY = "nutrione_ultima_atividade";
const TEMPO_LIMITE_MS = 60 * 60 * 1000; // 1 hora de inatividade
const TEMPO_AVISO_MS = 2 * 60 * 1000;   // Aviso nos últimos 2 minutos (120 segundos)
const INTERVALO_CHECAGEM_MS = 1000;     // Checagem a cada 1 segundo

export default function AutoLogoutInatividade() {
  const router = useRouter();
  const supabase = createClient();

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(120);

  const avisoAtivoRef = useRef(false);
  const ultimoRegistroRef = useRef<number>(Date.now());
  const executandoLogoutRef = useRef(false);

  // Executa o logout e redireciona para a tela de login
  const deslogarPorInatividade = useCallback(async () => {
    if (executandoLogoutRef.current) return;
    executandoLogoutRef.current = true;

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro ao encerrar sessão por inatividade:", err);
    } finally {
      // Redireciona com parâmetro de inatividade
      router.push("/?motivo=inatividade");
    }
  }, [router, supabase]);

  // Atualiza a marcação de tempo de atividade
  const registrarAtividade = useCallback(() => {
    // Se o aviso estiver aberto, o usuário precisa interagir conscientemente (ex: clicar no botão)
    if (avisoAtivoRef.current) return;

    const agora = Date.now();
    // Throttle de 3 segundos para evitar escritas desnecessárias no localStorage
    if (agora - ultimoRegistroRef.current > 3000) {
      ultimoRegistroRef.current = agora;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, agora.toString());
        } catch {
          // Fallback silencioso caso localStorage esteja bloqueado
        }
      }
    }
  }, []);

  // Botão "Continuar Conectado" do Modal
  const handleContinuarConectado = () => {
    const agora = Date.now();
    ultimoRegistroRef.current = agora;
    avisoAtivoRef.current = false;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, agora.toString());
      } catch {}
    }
    setMostrarAviso(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inicializa a última atividade se ainda não existir
    const salva = localStorage.getItem(STORAGE_KEY);
    if (!salva) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    // Monitora interações do usuário na tela
    const eventos = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    const handleEvento = () => registrarAtividade();

    eventos.forEach((evento) => {
      window.addEventListener(evento, handleEvento, { passive: true });
    });

    // Sincroniza abas: se outra aba atualizou a atividade, zera o aviso desta aba
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const novaAtividade = parseInt(e.newValue, 10);
        if (!isNaN(novaAtividade)) {
          ultimoRegistroRef.current = novaAtividade;
          if (avisoAtivoRef.current) {
            avisoAtivoRef.current = false;
            setMostrarAviso(false);
          }
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Loop de checagem a cada segundo
    const interval = setInterval(() => {
      if (executandoLogoutRef.current) return;

      const agora = Date.now();
      const ultimaAtividadeStr = localStorage.getItem(STORAGE_KEY);
      const ultimaAtividade = ultimaAtividadeStr ? parseInt(ultimaAtividadeStr, 10) : ultimoRegistroRef.current;
      const tempoInativo = agora - ultimaAtividade;

      // 1. Expirou o tempo total (1 hora)
      if (tempoInativo >= TEMPO_LIMITE_MS) {
        clearInterval(interval);
        deslogarPorInatividade();
        return;
      }

      // 2. Entrou na janela de aviso prévio (últimos 2 minutos)
      if (tempoInativo >= TEMPO_LIMITE_MS - TEMPO_AVISO_MS) {
        const restanteSeg = Math.max(0, Math.ceil((TEMPO_LIMITE_MS - tempoInativo) / 1000));
        setSegundosRestantes(restanteSeg);
        avisoAtivoRef.current = true;
        setMostrarAviso(true);
      } else {
        if (avisoAtivoRef.current) {
          avisoAtivoRef.current = false;
          setMostrarAviso(false);
        }
      }
    }, INTERVALO_CHECAGEM_MS);

    // Quando o usuário volta para a aba (ex: destravou o PC ou abriu a tampa do notebook)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const agora = Date.now();
        const ultimaAtividadeStr = localStorage.getItem(STORAGE_KEY);
        const ultimaAtividade = ultimaAtividadeStr ? parseInt(ultimaAtividadeStr, 10) : ultimoRegistroRef.current;
        if (agora - ultimaAtividade >= TEMPO_LIMITE_MS) {
          deslogarPorInatividade();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      eventos.forEach((evento) => {
        window.removeEventListener(evento, handleEvento);
      });
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [deslogarPorInatividade, registrarAtividade]);

  // Formata os segundos em MM:SS
  const formatarTempo = (totalSegundos: number) => {
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
  };

  if (!mostrarAviso) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-aviso-sessao"
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-200 text-center space-y-5"
      >
        {/* Ícone de Alerta */}
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-3xl shadow-inner">
          ⏱️
        </div>

        <div className="space-y-2">
          <h3 id="titulo-aviso-sessao" className="text-xl font-bold text-gray-900">
            Sua sessão está prestes a expirar!
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Por segurança e privacidade dos dados médicos dos seus pacientes, seu acesso será encerrado automaticamente por inatividade em:
          </p>
        </div>

        {/* Cronômetro Regressivo */}
        <div className="py-3 px-6 bg-amber-50 rounded-2xl border border-amber-200 inline-block">
          <span className="text-3xl font-extrabold font-mono text-amber-700 tracking-wider">
            {formatarTempo(segundosRestantes)}
          </span>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={deslogarPorInatividade}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm transition-colors cursor-pointer"
          >
            Sair Agora
          </button>
          <button
            type="button"
            onClick={handleContinuarConectado}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer hover:scale-[1.02]"
          >
            Continuar Conectado
          </button>
        </div>

        <p className="text-[11px] text-gray-400">
          Qualquer clique ou toque renovará seu tempo de sessão.
        </p>
      </div>
    </div>
  );
}
