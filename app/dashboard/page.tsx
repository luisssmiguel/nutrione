"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<any>(null);
  
  // Indicadores
  const [stats, setStats] = useState({ pacientes: 0, planos: 0, consultas: 0 });
  
  // Listas
  const [ultimosPlanos, setUltimosPlanos] = useState<any[]>([]);
  const [proximasConsultas, setProximasConsultas] = useState<any[]>([]); // NOVO ESTADO

  useEffect(() => {
    async function carregarDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // 1. Busca os dados do perfil logado (Nome e avatar)
      const { data: dadosPerfil } = await supabase
        .from("perfis")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (dadosPerfil) setPerfil(dadosPerfil);

      // 2. Busca as métricas (Total de pacientes, planos e consultas/anotações)
      const { count: countPac } = await supabase.from("pacientes").select("*", { count: 'exact', head: true }).eq("nutricionista_id", user.id);
      const { count: countPlanos } = await supabase.from("planos_alimentares").select("*", { count: 'exact', head: true }).eq("nutricionista_id", user.id).eq("ativo", true);
      const { count: countConsultas } = await supabase.from("anotacoes").select("*", { count: 'exact', head: true }).eq("nutricionista_id", user.id);

      setStats({
        pacientes: countPac || 0,
        planos: countPlanos || 0,
        consultas: countConsultas || 0
      });

      // 3. Busca os Últimos Planos Alimentares
      const { data: planos } = await supabase
        .from("planos_alimentares")
        .select("id, titulo, criado_em, pacientes(perfis(nome_completo))")
        .eq("nutricionista_id", user.id)
        .order("criado_em", { ascending: false })
        .limit(4);
      
      if (planos) setUltimosPlanos(planos);

      // 4. NOVO: Busca as Próximas Consultas da Agenda (Apenas de hoje em diante)
      const hoje = new Date().toISOString().split('T')[0]; // Pega a data de hoje no formato YYYY-MM-DD
      const { data: agenda } = await supabase
        .from("agendamentos")
        .select("id, data_consulta, hora_consulta, tipo_consulta, pacientes(perfis(nome_completo))")
        .eq("nutricionista_id", user.id)
        .gte("data_consulta", hoje) // gte = Greater Than or Equal (Maior ou igual a hoje)
        .order("data_consulta", { ascending: true })
        .order("hora_consulta", { ascending: true })
        .limit(4); // Mostra só as 4 próximas para não poluir a tela

      if (agenda) setProximasConsultas(agenda);

      setLoading(false);
    }
    carregarDashboard();
  }, []);

const formatarData = (dataSql: string) => {
    // 1. Corta no "T" para separar a data da hora
    const apenasData = dataSql.split("T")[0]; 
    // 2. Agora fatiamos o ano, mês e dia normalmente
    const [ano, mes, dia] = apenasData.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatarHora = (horaSql: string) => horaSql.substring(0, 5);

  if (loading) {
    return <div className="p-12 text-emerald-700 font-medium text-center">Carregando painel...</div>;
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Visão Geral</h1>
          <p className="text-gray-500 mt-1">Acompanhe os indicadores do seu consultório.</p>
        </div>
        
        {/* Identificação do Nutricionista logado */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-gray-800">Dr(a). {perfil?.nome_completo?.split(" ")[0] || "Nutricionista"}</p>
            <p className="text-xs text-emerald-600 font-medium">Nutricionista</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xl border-2 border-emerald-50">
            {perfil?.nome_completo?.charAt(0) || "N"}
          </div>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">Total de Pacientes</h3>
          <p className="text-4xl font-black text-emerald-700">{stats.pacientes}</p>
          <p className="text-xs text-gray-400 mt-2">Cadastrados no sistema</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">Planos Ativos</h3>
          <p className="text-4xl font-black text-emerald-700">{stats.planos}</p>
          <p className="text-xs text-gray-400 mt-2">Dietas em andamento</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">Total de Consultas</h3>
          <p className="text-4xl font-black text-emerald-700">{stats.consultas}</p>
          <p className="text-xs text-gray-400 mt-2">Anotações registradas</p>
        </div>
      </div>

      {/* GRID INFERIOR DIVIDIDO: AGENDA E PLANOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUNA ESQUERDA: Resumo da Agenda (NOVO) */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Próximas Consultas</h2>
            <button 
              onClick={() => router.push('/dashboard/agenda')} 
              className="text-sm text-emerald-600 font-bold hover:underline"
            >
              Ver agenda inteira &rarr;
            </button>
          </div>
          
          <div className="space-y-4">
            {proximasConsultas.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
                Sua agenda está livre.
              </div>
            ) : (
              proximasConsultas.map((consulta) => {
                // Lógica simples para destacar se a consulta for HOJE
                const isHoje = consulta.data_consulta === new Date().toISOString().split('T')[0];

                return (
                  <div key={consulta.id} className="bg-gray-50 hover:bg-emerald-50/50 p-4 rounded-xl border border-gray-100 transition-colors flex items-center gap-4">
                    <div className={`p-3 rounded-lg text-center min-w-[70px] ${isHoje ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700'}`}>
                      <span className="block text-xs font-bold uppercase">{isHoje ? 'HOJE' : formatarData(consulta.data_consulta).substring(0, 5)}</span>
                      <span className="block text-lg font-black">{formatarHora(consulta.hora_consulta)}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">{consulta.pacientes?.perfis?.nome_completo}</h4>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded mt-1 inline-block">
                        {consulta.tipo_consulta}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Últimos Planos Criados */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Últimos Planos Criados</h2>
            <button 
              onClick={() => router.push('/dashboard/planos')} 
              className="text-sm text-emerald-600 font-bold hover:underline"
            >
              Ver todos &rarr;
            </button>
          </div>
          
          <div className="space-y-4">
            {ultimosPlanos.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
                Nenhum plano criado.
              </div>
            ) : (
              ultimosPlanos.map((plano) => (
                <div key={plano.id} className="bg-gray-50 hover:bg-white p-5 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors flex justify-between items-center cursor-pointer shadow-sm hover:shadow-md" onClick={() => router.push(`/dashboard/planos/${plano.id}`)}>
                  <div>
                    <h4 className="font-bold text-gray-800">{plano.titulo}</h4>
                    <p className="text-sm text-gray-500 mt-1">Paciente: <span className="font-medium text-gray-700">{plano.pacientes?.perfis?.nome_completo}</span></p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wide">Novo</span>
                    <span className="text-xs text-gray-400 font-medium">{formatarData(plano.criado_em)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}