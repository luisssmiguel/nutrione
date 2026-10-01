"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PacientesPage() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");

  const [pacientes, setPacientes] = useState<any[]>([]);
  
  // NOVO: Estado da barra de pesquisa
  const [busca, setBusca] = useState("");
  
  const supabase = createClient();

  const carregarPacientes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Adicionei a altura e data_nascimento na busca para podermos ver nos detalhes
    const { data, error } = await supabase
      .from("pacientes")
      .select(`
        id,
        peso_kg,
        altura_cm,
        data_nascimento,
        perfis (nome_completo, email)
      `)
      .eq("nutricionista_id", user.id);

    if (data) {
      setPacientes(data);
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, []);

  const handleSalvarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("Erro: Você precisa estar logado!");
      setLoading(false);
      return;
    }

    const { data: perfilNovo, error: erroPerfil } = await supabase
      .from("perfis")
      .insert({
        tipo_usuario: "PACIENTE",
        nome_completo: nome,
        email: email,
      })
      .select()
      .single();

    if (erroPerfil) {
      alert("Erro ao criar perfil. O e-mail já existe?");
      setLoading(false);
      return;
    }

    const { error: erroPaciente } = await supabase
      .from("pacientes")
      .insert({
        id: perfilNovo.id,
        nutricionista_id: user.id,
        data_nascimento: dataNascimento,
        peso_kg: parseFloat(peso.replace(',', '.')), 
        altura_cm: parseFloat(altura),
      });

    if (erroPaciente) {
      alert("Erro ao salvar ficha médica: " + erroPaciente.message);
    } else {
      alert("Paciente salvo com sucesso!");
      setNome(""); setEmail(""); setDataNascimento(""); setPeso(""); setAltura("");
      carregarPacientes();
      setMostrarFormulario(false);
    }
    setLoading(false);
  };

  // ==========================================
  // NOVA FUNÇÃO: EXCLUIR PACIENTE
  // ==========================================
  const handleExcluirPaciente = async (idPaciente: string) => {
    const confirmacao = window.confirm("Tem certeza que deseja excluir este paciente? Todos os dados serão perdidos.");
    
    if (confirmacao) {
      // Como configuramos o banco com ON DELETE CASCADE, 
      // apagar o perfil apaga a ficha médica automaticamente!
      const { error } = await supabase.from("perfis").delete().eq("id", idPaciente);

      if (error) {
        alert("Erro ao excluir: " + error.message);
      } else {
        carregarPacientes(); // Atualiza a tabela tirando o paciente excluído da tela
      }
    }
  };

  // ==========================================
  // NOVA FUNÇÃO: VER DETALHES
  // ==========================================
  const handleVerDetalhes = (paciente: any) => {
    // Agora, em vez de um alert, ele viaja para a página única do paciente!
    router.push(`/dashboard/pacientes/${paciente.id}`);
  };

  // NOVO: Filtra os pacientes conforme você digita na barra de pesquisa
  const pacientesFiltrados = pacientes.filter((paciente) => {
    const nome = paciente.perfis?.nome_completo?.toLowerCase() || "";
    return nome.includes(busca.toLowerCase());
  });

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Meus Pacientes</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie os pacientes do seu consultório.</p>
        </div>
        
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-colors text-center"
        >
          {mostrarFormulario ? "Voltar para Lista" : "+ Novo Paciente"}
        </button>
      </div>

      {mostrarFormulario ? (
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 transition-all">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Cadastrar Novo Paciente</h2>
          
          <form onSubmit={handleSalvarPaciente} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" placeholder="joao@email.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Data de Nascimento</label>
                <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Peso (kg)</label>
                  <input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" placeholder="Ex: 70.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Altura (cm)</label>
                  <input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" placeholder="Ex: 175" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-8">
              <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-xl transition duration-300 shadow-md disabled:opacity-50">
                {loading ? "Salvando..." : "Salvar Paciente"}
              </button>
            </div>
          </form>
        </div>

      ) : (

        <>
          {/* NOVO: Barra de pesquisa adicionada aqui */}
          <div className="mb-6 flex items-center bg-white p-2 rounded-2xl border border-gray-200 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 transition-all">
            <span className="pl-4 pr-3 text-xl text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar paciente pelo nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full px-2 py-2 outline-none text-gray-700 bg-transparent placeholder-gray-400"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs sm:text-sm">
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600">Nome do Paciente</th>
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600 hidden md:table-cell">E-mail</th>
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600 text-center">Peso</th>
                  <th className="p-3.5 sm:p-4 font-semibold text-gray-600 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {/* NOVO: Alterado de pacientes.length para pacientesFiltrados.length */}
                {pacientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      {busca !== "" 
                        ? "Nenhum paciente encontrado com esse nome." 
                        : "Nenhum paciente cadastrado ainda. Clique em 'Novo Paciente' para começar!"}
                    </td>
                  </tr>
                ) : (
                  // NOVO: Alterado de pacientes.map para pacientesFiltrados.map
                  pacientesFiltrados.map((paciente) => (
                    <tr key={paciente.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3.5 sm:p-4">
                        <p className="font-bold text-gray-800 text-sm sm:text-base">{paciente.perfis?.nome_completo}</p>
                        <p className="text-xs text-gray-500 md:hidden">{paciente.perfis?.email}</p>
                      </td>
                      <td className="p-3.5 sm:p-4 hidden md:table-cell text-gray-600 text-sm">{paciente.perfis?.email}</td>
                      <td className="p-3.5 sm:p-4 text-center text-gray-600 text-sm">{paciente.peso_kg} kg</td>
                      <td className="p-3.5 sm:p-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {/* Conectando o botão de Ver Detalhes */}
                          <button 
                            onClick={() => handleVerDetalhes(paciente)}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap bg-emerald-50 px-2.5 py-1 rounded-lg"
                          >
                            Ver detalhes
                          </button>

                          {/* Adicionando o botão de Excluir */}
                          <button 
                            onClick={() => handleExcluirPaciente(paciente.id)}
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