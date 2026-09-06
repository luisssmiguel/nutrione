"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";

export default function MontagemPlanoPage() {
  const { id } = useParams(); 
  const router = useRouter();
  const supabase = createClient();
  
  const [plano, setPlano] = useState<any>(null);
  const [refeicoes, setRefeicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [nomeRefeicao, setNomeRefeicao] = useState("");
  const [horario, setHorario] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  // NOVO: Estado para saber se estamos editando alguma refeição
  const [refeicaoEmEdicao, setRefeicaoEmEdicao] = useState<string | null>(null);

  const componentePDFRef = useRef<HTMLDivElement>(null);

  const handleExportarPDF = useReactToPrint({
    contentRef: componentePDFRef,
    documentTitle: `Plano_Alimentar`,
  });

  const carregarDados = async () => {
    const { data: dataPlano } = await supabase
      .from("planos_alimentares")
      .select(`id, titulo, ativo, pacientes ( perfis (nome_completo) )`)
      .eq("id", id)
      .single();

    if (dataPlano) setPlano(dataPlano);

    const { data: dataRefeicoes } = await supabase
      .from("refeicoes")
      .select("*")
      .eq("plano_id", id)
      .order("horario", { ascending: true }); 

    if (dataRefeicoes) setRefeicoes(dataRefeicoes);
    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, [id]);

  // NOVO: Função para colocar os dados no formulário quando clicar em Editar
  const handleEditarClique = (ref: any) => {
    setRefeicaoEmEdicao(ref.id);
    setNomeRefeicao(ref.nome);
    setHorario(ref.horario);
    setDescricao(ref.descricao);
  };

  // NOVO: Função para limpar o formulário e cancelar a edição
  const handleCancelarEdicao = () => {
    setRefeicaoEmEdicao(null);
    setNomeRefeicao("");
    setHorario("");
    setDescricao("");
  };

  // ATUALIZADO: Agora ele sabe se deve Criar (Insert) ou Atualizar (Update)
  const handleSalvarRefeicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (refeicaoEmEdicao) {
      // Faz o UPDATE da refeição existente
      const { error } = await supabase
        .from("refeicoes")
        .update({
          nome: nomeRefeicao,
          horario: horario,
          descricao: descricao
        })
        .eq("id", refeicaoEmEdicao);

      if (!error) {
        handleCancelarEdicao();
        carregarDados();
      } else {
        alert("Erro ao atualizar refeição: " + error.message);
      }
    } else {
      // Faz o INSERT de uma nova refeição
      const { error } = await supabase.from("refeicoes").insert({
        plano_id: id,
        nutricionista_id: user?.id,
        nome: nomeRefeicao,
        horario: horario,
        descricao: descricao
      });

      if (!error) {
        handleCancelarEdicao();
        carregarDados(); 
      } else {
        alert("Erro ao criar refeição: " + error.message);
      }
    }
    setSalvando(false);
  };

  const handleExcluirRefeicao = async (idRefeicao: string) => {
    if (window.confirm("Deseja mesmo apagar esta refeição?")) {
      await supabase.from("refeicoes").delete().eq("id", idRefeicao);
      carregarDados();
    }
  };

  if (loading) return <div className="p-12 text-emerald-700 font-medium">Carregando plano...</div>;
  if (!plano) return <div className="p-12 text-red-500 font-medium">Plano não encontrado.</div>;

  return (
    <div className="p-8 md:p-12">
      
      {/* Cabeçalho e Exportar PDF */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/planos')} className="text-gray-500 hover:text-emerald-700 bg-white p-2 rounded-lg shadow-sm border border-gray-200 transition-colors">
            ← Voltar
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{plano.titulo}</h1>
            <p className="text-emerald-600 font-medium mt-1">
              Paciente: <span className="text-gray-600">{plano.pacientes?.perfis?.nome_completo}</span>
            </p>
          </div>
        </div>

        <button 
          onClick={handleExportarPDF}
          className="bg-gray-800 hover:bg-black text-white px-6 py-3 rounded-xl font-bold shadow-md transition-transform transform hover:-translate-y-0.5 flex items-center gap-2"
        >
          📄 Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna da Esquerda: Formulário Inteligente (Adiciona e Edita) */}
        <div className="lg:col-span-1 space-y-8">
          <div className={`p-8 rounded-2xl shadow-sm border transition-colors ${refeicaoEmEdicao ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 h-fit'}`}>
            <h3 className="text-lg font-bold text-gray-800 mb-6">
              {refeicaoEmEdicao ? "✏️ Editando Refeição" : "Adicionar Refeição"}
            </h3>
            
            <form onSubmit={handleSalvarRefeicao} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Refeição</label>
                <input type="text" required value={nomeRefeicao} onChange={(e) => setNomeRefeicao(e.target.value)} placeholder="Ex: Almoço" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Horário</label>
                <input type="time" required value={horario} onChange={(e) => setHorario(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Alimentos / Descrição</label>
                <textarea required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Liste os alimentos e quantidades..." className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none resize-none h-32"></textarea>
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <button type="submit" disabled={salvando} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition duration-300 shadow-sm disabled:opacity-50">
                  {salvando ? "Salvando..." : refeicaoEmEdicao ? "Atualizar Refeição" : "+ Incluir no Plano"}
                </button>

                {refeicaoEmEdicao && (
                  <button type="button" onClick={handleCancelarEdicao} className="w-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 font-semibold py-3 rounded-xl transition duration-300">
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Coluna da Direita: Cardápio */}
        <div className="lg:col-span-2">
          
          <div ref={componentePDFRef} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
            
            {/* CABEÇALHO DO PDF (Invisível na tela) */}
            <div className="hidden print:block mb-10 text-center border-b-2 border-emerald-100 pb-6">
              <h1 className="text-3xl font-extrabold text-emerald-800">NutriOne</h1>
              <h2 className="text-xl font-bold text-gray-800 mt-4">{plano.titulo}</h2>
              <p className="text-gray-600 mt-1">Paciente: <span className="font-semibold">{plano.pacientes?.perfis?.nome_completo}</span></p>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-6 print:hidden">Cardápio do Paciente</h3>
            
            <div className="space-y-4">
              {refeicoes.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200 print:hidden">
                  Nenhuma refeição cadastrada neste plano.
                </div>
              ) : (
                refeicoes.map((ref) => (
                  <div key={ref.id} className="p-6 bg-white rounded-xl border-2 border-emerald-50 shadow-sm relative group overflow-hidden print:border-gray-200 print:shadow-none print:break-inside-avoid">
                    
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 print:bg-gray-800"></div>
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-100 text-emerald-800 print:bg-gray-200 print:text-black font-bold px-3 py-1 rounded-lg text-sm">
                          {ref.horario}
                        </span>
                        <h4 className="font-bold text-gray-800 text-lg">{ref.nome}</h4>
                      </div>
                      
                      {/* BOTÕES DE AÇÃO: Aparecem no Hover e somem na impressão */}
                      <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <button 
                          onClick={() => handleEditarClique(ref)}
                          className="text-amber-500 hover:text-amber-700 text-sm font-semibold"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleExcluirRefeicao(ref.id)}
                          className="text-red-400 hover:text-red-600 text-sm font-semibold"
                        >
                          Excluir
                        </button>
                      </div>

                    </div>
                    
                    <p className="text-gray-700 whitespace-pre-wrap pl-2 leading-relaxed">
                      {ref.descricao}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* RODAPÉ DO PDF */}
            <div className="hidden print:block mt-12 text-center text-sm text-gray-500 pt-6 border-t border-gray-100">
              <p>Plano alimentar gerado pelo sistema NutriOne.</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}