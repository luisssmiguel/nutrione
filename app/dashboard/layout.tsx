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
    // AJUSTE 1: Trocamos min-h-screen por h-screen e adicionamos overflow-hidden
    <div className="flex h-screen overflow-hidden bg-gray-50">
      
      <aside className="w-64 bg-emerald-800 text-white p-6 hidden md:flex flex-col shadow-xl z-10">
        
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
          <a 
            href="/dashboard" 
            className={`block py-3 px-4 rounded-xl font-medium transition-colors ${
              pathname === '/dashboard' ? 'bg-emerald-700 shadow-sm' : 'hover:bg-emerald-700/50'
            }`}
          >
            Visão Geral
          </a>
          
          <a 
            href="/dashboard/pacientes" 
            className={`block py-3 px-4 rounded-xl font-medium transition-colors ${
              pathname === '/dashboard/pacientes' ? 'bg-emerald-700 shadow-sm' : 'hover:bg-emerald-700/50'
            }`}
          >
            Meus Pacientes
          </a>
          
          <a 
            href="/dashboard/planos" 
            className={`block py-3 px-4 rounded-xl font-medium transition-colors ${
              pathname.includes('/dashboard/planos') ? 'bg-emerald-700 shadow-sm' : 'hover:bg-emerald-700/50'
            }`}
          >
            Planos Alimentares
          </a>

          <a 
            href="/dashboard/agenda" 
            className={`block py-3 px-4 rounded-xl font-medium transition-colors ${
              pathname.includes('/dashboard/agenda') ? 'bg-emerald-700 shadow-sm' : 'hover:bg-emerald-700/50'
            }`}
          >
            Agenda
          </a>
        </nav>

        {/* O mt-auto aqui garante que o botão fique sempre no fundo! */}
        <button 
          onClick={handleLogout}
          className="mt-auto py-3 px-4 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-xl font-medium transition-colors text-left"
        >
          Sair do sistema
        </button>
      </aside>

      {/* AJUSTE 2: Adicionamos o overflow-y-auto aqui no main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}