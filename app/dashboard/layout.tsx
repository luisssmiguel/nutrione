"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation"; 
import { createClient } from "../../lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname(); 
  const supabase = createClient();
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    const verificarAcesso = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
      } else {
        setAutorizado(true);
      }
    };
    verificarAcesso();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!autorizado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-emerald-700 font-medium">
        Verificando acesso...
      </div>
    );
  }

  return (
    // Mudamos para flex-col no mobile e flex-row no desktop
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-50">
      
      {/* =======================================
          CABEÇALHO MOBILE (Só aparece no celular)
      ======================================= */}
      <div className="md:hidden bg-emerald-800 text-white p-4 flex justify-between items-center shadow-md z-20 shrink-0">
        <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-lg">
          <Image 
            src="/logo.png" 
            alt="Logo NutriOne" 
            width={90} 
            height={25} 
            className="object-contain"
          />
        </div>
        <button onClick={handleLogout} className="text-xs font-bold text-emerald-200 hover:text-white px-2 py-1">
          Sair
        </button>
      </div>

      {/* =======================================
          BARRA LATERAL DESKTOP (Só aparece no PC)
      ======================================= */}
      <aside className="w-64 bg-emerald-800 text-white p-6 hidden md:flex flex-col shadow-xl z-10 shrink-0">
        <div className="mb-10 flex justify-center bg-white/10 p-4 rounded-xl">
           <Image 
            src="/logo.png" 
            alt="Logo NutriOne" 
            width={140} 
            height={40} 
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </div>

        <nav className="space-y-3 flex-1">
          <a href="/dashboard" className={`block py-3 px-4 rounded-xl font-medium transition-colors ${pathname === '/dashboard' ? 'bg-emerald-700 shadow-sm' : 'hover:bg-emerald-700/50'}`}>
            Visão Geral
          </a>
          <a href="/dashboard/pacientes" className={`block py-3 px-4 rounded-xl font-medium transition-colors ${pathname.includes('/pacientes') ? 'bg-emerald-700 shadow-sm' : 'hover:bg-emerald-700/50'}`}>
            Meus Pacientes
          </a>
          <a href="/dashboard/planos" className={`block py-3 px-4 rounded-xl font-medium transition-colors ${pathname.includes('/planos') ? 'bg-emerald-700 shadow-sm' : 'hover:bg-emerald-700/50'}`}>
            Planos Alimentares
          </a>
          <a href="/dashboard/agenda" className={`block py-3 px-4 rounded-xl font-medium transition-colors ${pathname.includes('/agenda') ? 'bg-emerald-700 shadow-sm' : 'hover:bg-emerald-700/50'}`}>
            Agenda
          </a>
        </nav>

        <button onClick={handleLogout} className="mt-auto py-3 px-4 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-xl font-medium transition-colors text-left">
          Sair do sistema
        </button>
      </aside>

      {/* =======================================
          CONTEÚDO PRINCIPAL (Telas do sistema)
      ======================================= */}
      {/* Adicionamos pb-24 no mobile para o conteúdo não ficar escondido atrás do menu inferior */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {children}
      </main>

      {/* =======================================
          MENU INFERIOR MOBILE (Só aparece no celular)
      ======================================= */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <a href="/dashboard" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/dashboard' ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
          <span className="text-xl mb-0.5">📊</span>
          <span className="text-[10px] font-bold">Início</span>
        </a>
        <a href="/dashboard/pacientes" className={`flex flex-col items-center justify-center w-full h-full ${pathname.includes('/pacientes') ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
          <span className="text-xl mb-0.5">👥</span>
          <span className="text-[10px] font-bold">Pacientes</span>
        </a>
        <a href="/dashboard/planos" className={`flex flex-col items-center justify-center w-full h-full ${pathname.includes('/planos') ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
          <span className="text-xl mb-0.5">🍎</span>
          <span className="text-[10px] font-bold">Planos</span>
        </a>
        <a href="/dashboard/agenda" className={`flex flex-col items-center justify-center w-full h-full ${pathname.includes('/agenda') ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
          <span className="text-xl mb-0.5">📅</span>
          <span className="text-[10px] font-bold">Agenda</span>
        </a>
      </nav>

    </div>
  );
}