"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  // Estados da Tela
  const [isLogin, setIsLogin] = useState(true); // Controla se estamos no Login ou Cadastro
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Estados dos Campos
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (isLogin) {
      // 🟢 LÓGICA DE LOGIN
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        setErrorMsg("Email ou senha incorretos. Tente novamente.");
      } else {
        router.push("/dashboard"); // Se deu certo, viaja para o painel!
      }
    } else {
      // 🔵 LÓGICA DE CADASTRO
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nomeCompleto, // Já salva o nome no banco!
          }
        }
      });
      
      if (error) {
        setErrorMsg("Erro ao criar conta: " + error.message);
      } else {
        alert("Conta criada com sucesso! Faça o login para entrar.");
        setIsLogin(true); // Volta para a tela de login automaticamente
        setPassword(""); // Limpa a senha por segurança
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-white">
      
      {/* Lado Esquerdo - Painel Institucional (Sume em telas pequenas de celular) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-800 to-emerald-600 items-center justify-center relative overflow-hidden">
        {/* Círculos decorativos de fundo */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-900 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        
        <div className="relative z-10 p-16 text-center max-w-lg">
          <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight">
            Transforme a vida dos seus pacientes.
          </h1>
          <p className="text-emerald-100 text-lg font-medium leading-relaxed">
            O sistema de gestão alimentar completo, rápido e seguro feito exclusivamente para nutricionistas de alta performance.
          </p>
        </div>
      </div>

{/* Lado Direito - Formulário de Autenticação */}
<div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
  <div className="w-full max-w-md bg-white px-10 pb-10 pt-4 rounded-3xl shadow-xl border border-gray-100">
          
{/* Logo Centralizada */}
          <div className="flex justify-center mb-0">
            <img src="/imagem-V1.png" alt="NutriOne" className="w-64 h-auto object-contain" />
          </div>

          {/* Títulos Dinâmicos */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">
              {isLogin ? "Bem-vindo de volta!" : "Crie sua conta"}
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              {isLogin ? "Insira suas credenciais para acessar seu consultório." : "Comece a gerenciar seus pacientes hoje mesmo."}
            </p>
          </div>

          {/* Exibição de Erros */}
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 text-center border border-red-100">
              {errorMsg}
            </div>
          )}

          {/* O Formulário */}
          <form onSubmit={handleAuth} className="space-y-5">
            
            {/* Campo de Nome (Aparece SÓ se for Cadastro) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo do Nutricionista</label>
                <input 
                  type="text" required value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)}
                  placeholder="Ex: Dr. Luis Miguel" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email profissional</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@clinica.com.br" 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Senha secreta</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>

            {/* Link de Esqueci a Senha (Aparece SÓ se for Login) */}
            {isLogin && (
              <div className="flex justify-end">
                <a href="#" className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
            )}

            {/* Botão Principal */}
            <button 
              type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition duration-300 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none mt-2"
            >
              {loading ? "Processando..." : isLogin ? "Entrar no Consultório" : "Concluir Cadastro"}
            </button>
          </form>

          {/* Trocar entre Login e Cadastro */}
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-gray-600 text-sm">
              {isLogin ? "Ainda não tem uma conta?" : "Já possui uma conta?"}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrorMsg(""); // Limpa os erros ao trocar de tela
                }}
                className="ml-2 font-bold text-emerald-600 hover:text-emerald-800 transition-colors focus:outline-none"
              >
                {isLogin ? "Cadastre-se grátis" : "Faça login"}
              </button>
            </p>
          </div>

        </div>
      </div>
      
    </div>
  );
}