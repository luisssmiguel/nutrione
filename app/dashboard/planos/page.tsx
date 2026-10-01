"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function PlanosConteudo() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const searchParams = useSearchParams();
  const urlNovoPlano = searchParams.get("novo_plano");
  const urlPacienteId = searchParams.get("paciente_id");

  const [planos, setPlanos] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  
  const [pacienteSelecionado, setPacienteSelecionado] = useState("");
  const [titulo, setTitulo] = useState("");

  // NOVO: Estado para guardar o texto da barra de pesquisa
  const [busca, setBusca] = useState("");

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: dataPacientes } = await supabase
      .from("pacientes")
      .select(`id, perfis(nome_completo)`)
      .eq("nutricionista_id", user.id);
      
    if (dataPacientes) setPacientes(dataPacientes);

    const { data: dataPlanos } = await supabase
      .from("planos_alimentares")
      .select(`
        id, 
        titulo, 
        ativo, 
        criado_em,
        pacientes (
          perfis (nome_completo)
        )
      `)
      .eq("nutricionista_id", user.id)
      .order("criado_em", { ascending: false });

    if (dataPlanos) setPlanos(dataPlanos);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (urlNovoPlano === "true") {
      setMostrarFormulario(true);
    }
    if (urlPacienteId) {
      setPacienteSelecionado(urlPacienteId);
    }
  }, [urlNovoPlano, urlPacienteId]);

  const handleSalvarPlano = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteSelecionado) {
      alert("Por favor, selecione um paciente.");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("planos_alimentares")
      .insert({
        paciente_id: pacienteSelecionado,
        nutricionista_id: user?.id,
        titulo: titulo,
        ativo: true 
      });

    if (error) {
      alert("Erro ao criar plano: " + error.message);
    } else {
      setMostrarFormulario(false);
      setTitulo("");
      setPacienteSelecionado("");
      router.replace('/dashboard/planos', { scroll: false }); 
      carregarDados();
    }
    setLoading(false);
  };

  const handleExcluirPlano = async (idPlano: string) => {
    if (window.confirm("Tem certeza que deseja excluir este plano alimentar?")) {
      await supabase.from("planos_alimentares").delete().eq("id", idPlano);
      carregarDados();
    }
  };

  // NOVO: Lógica que filtra a tabela em tempo real com base no que foi digitado!
  const planosFiltrados = planos.filter((plano) => {
    const nomePaciente = plano.pacientes?.perfis?.nome_completo?.toLowerCase() || "";
    const tituloPlano = plano.titulo?.toLowerCase() || "";
    const termo = busca.toLowerCase();
    
    return nomePaciente.includes(termo) || tituloPlano.includes(termo);
  });

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Planos Alimentares</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Crie e gerencie as dietas dos seus pacientes.</p>
        </div>
        
        <button 
          onClick={() => {
            setMostrarFormulario(!mostrarFormulario);
            if (mostrarFormulario) router.replace('/dashboard/planos', { scroll: false });
          }}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-colors text-center"
        >
          {mostrarFormulario ? "Voltar para Lista" : "+ Novo Plano"}
        </button>
      </div>

      {mostrarFormulario ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Criar Novo Plano Alimentar</h2>
          <form onSubmit={handleSalvarPlano} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Paciente</label>
                <select 
                  value={pacienteSelecionado}
                  onChange={(e) => setPacienteSelecionado(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none bg-white"
                >
                  <option value="" disabled>Selecione um paciente...</option>
                  {pacientes.map((pac) => (
                    <option key={pac.id} value={pac.id}>
                      {pac.perfis?.nome_completo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Título do Plano</label>
                <input 
                  type="text" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" 
                  placeholder="Ex: Dieta de Hipertrofia - Fase 1" 
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100 mt-8">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-xl transition duration-300 shadow-md disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Criar Plano"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* NOVO: Barra de Pesquisa */}
          <div className="mb-6 flex items-center bg-white p-2 rounded-2xl border border-gray-200 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 transition-all">
            <span className="pl-4 pr-3 text-xl text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar por nome do paciente ou título do plano..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full px-2 py-2 outline-none text-gray-700 bg-transparent placeholder-gray-400"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs sm:text-sm">
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600">Título do Plano</th>
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600">Paciente</th>
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600 text-center">Status</th>
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600 hidden md:table-cell">Criado em</th>
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {/* NOVO: Substituímos o 'planos.length' por 'planosFiltrados.length' */}
                {planosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      {busca !== "" 
                        ? "Nenhum resultado encontrado para a sua pesquisa." 
                        : "Nenhum plano alimentar criado ainda."}
                    </td>
                  </tr>
                ) : (
                  // NOVO: Substituímos 'planos.map' por 'planosFiltrados.map'
                  planosFiltrados.map((plano) => (
                    <tr key={plano.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3.5 sm:p-4 font-bold text-gray-800 text-sm sm:text-base">{plano.titulo}</td>
                      <td className="p-3.5 sm:p-4 font-medium text-gray-700 text-sm">{plano.pacientes?.perfis?.nome_completo}</td>
                      <td className="p-3.5 sm:p-4 text-center">
                        {plano.ativo ? (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Ativo</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">Inativo</span>
                        )}
                      </td>
                      <td className="p-3.5 sm:p-4 hidden md:table-cell text-gray-600 text-sm">
                        {new Date(plano.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3.5 sm:p-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => router.push(`/dashboard/planos/${plano.id}`)}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap bg-emerald-50 px-2.5 py-1 rounded-lg"
                          >
                            Montar Dieta
                          </button>
                          <button 
                            onClick={() => handleExcluirPlano(plano.id)}
                            className="text-red-500 hover:text-red-700 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap px-2 py-1"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function PlanosPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-medium text-emerald-700">Carregando Planos...</div>}>
      <PlanosConteudo />
    </Suspense>
  );
}