"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../../../lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

export default function AnamnesePacientePage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [paciente, setPaciente] = useState<any>(null);
  const [historicoAnamneses, setHistoricoAnamneses] = useState<any[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [anamneseEmEdicao, setAnamneseEmEdicao] = useState<string | null>(null);

  // Campos da Anamnese
  const [dataAnamnese, setDataAnamnese] = useState(new Date().toISOString().split("T")[0]);
  const [objetivoPrincipal, setObjetivoPrincipal] = useState("Emagrecimento");
  const [outroObjetivo, setOutroObjetivo] = useState("");
  const [historicoClinico, setHistoricoClinico] = useState("");
  const [medicamentosSuplementos, setMedicamentosSuplementos] = useState("");
  const [alergiasIntolerancias, setAlergiasIntolerancias] = useState("");
  const [aversoesPreferencias, setAversoesPreferencias] = useState("");
  const [consumoAgua, setConsumoAgua] = useState("");
  const [rotinaSono, setRotinaSono] = useState("");
  const [nivelAtividade, setNivelAtividade] = useState("Sedentário");
  const [saudeIntestinal, setSaudeIntestinal] = useState("");
  const [observacoesExtras, setObservacoesExtras] = useState("");

  const carregarDados = async () => {
    setLoading(true);

    // 1. Busca dados do Paciente
    const { data: dataPaciente } = await supabase
      .from("pacientes")
      .select("id, data_nascimento, perfis (nome_completo, email)")
      .eq("id", id)
      .single();

    if (dataPaciente) setPaciente(dataPaciente);

    // 2. Busca histórico de Anamneses
    const { data: dataAnamneses } = await supabase
      .from("anamneses")
      .select("*")
      .eq("paciente_id", id)
      .order("data_anamnese", { ascending: false })
      .order("criado_em", { ascending: false });

    if (dataAnamneses) {
      setHistoricoAnamneses(dataAnamneses);
      // Se não há nenhuma cadastrada ainda, já abre o formulário por padrão
      if (dataAnamneses.length === 0) {
        setMostrarFormulario(true);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (id) carregarDados();
  }, [id]);

  const limparFormulario = () => {
    setAnamneseEmEdicao(null);
    setDataAnamnese(new Date().toISOString().split("T")[0]);
    setObjetivoPrincipal("Emagrecimento");
    setOutroObjetivo("");
    setHistoricoClinico("");
    setMedicamentosSuplementos("");
    setAlergiasIntolerancias("");
    setAversoesPreferencias("");
    setConsumoAgua("");
    setRotinaSono("");
    setNivelAtividade("Sedentário");
    setSaudeIntestinal("");
    setObservacoesExtras("");
  };

  const handleEditarClique = (anamnese: any) => {
    setAnamneseEmEdicao(anamnese.id);
    setDataAnamnese(anamnese.data_anamnese || new Date().toISOString().split("T")[0]);

    const objetivosPadrao = ["Emagrecimento", "Hipertrofia", "Reeducação Alimentar", "Controle de Exames/Patologia", "Performance Esportiva"];
    if (objetivosPadrao.includes(anamnese.objetivo_principal)) {
      setObjetivoPrincipal(anamnese.objetivo_principal);
      setOutroObjetivo("");
    } else {
      setObjetivoPrincipal("Outro");
      setOutroObjetivo(anamnese.objetivo_principal || "");
    }

    setHistoricoClinico(anamnese.historico_clinico || "");
    setMedicamentosSuplementos(anamnese.medicamentos_suplementos || "");
    setAlergiasIntolerancias(anamnese.alergias_intolerancias || "");
    setAversoesPreferencias(anamnese.aversoes_preferencias || "");
    setConsumoAgua(anamnese.consumo_agua || "");
    setRotinaSono(anamnese.rotina_sono || "");
    setNivelAtividade(anamnese.nivel_atividade || "Sedentário");
    setSaudeIntestinal(anamnese.saude_intestinal || "");
    setObservacoesExtras(anamnese.observacoes_extras || "");

    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSalvarAnamnese = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    const { data: { user } } = await supabase.auth.getUser();

    const objetivoFinal = objetivoPrincipal === "Outro" ? outroObjetivo : objetivoPrincipal;

    const payload = {
      paciente_id: id,
      nutricionista_id: user?.id,
      data_anamnese: dataAnamnese,
      objetivo_principal: objetivoFinal,
      historico_clinico: historicoClinico,
      medicamentos_suplementos: medicamentosSuplementos,
      alergias_intolerancias: alergiasIntolerancias,
      aversoes_preferencias: aversoesPreferencias,
      consumo_agua: consumoAgua,
      rotina_sono: rotinaSono,
      nivel_atividade: nivelAtividade,
      saude_intestinal: saudeIntestinal,
      observacoes_extras: observacoesExtras,
    };

    let erroSalvar = null;

    if (anamneseEmEdicao) {
      const { error } = await supabase
        .from("anamneses")
        .update(payload)
        .eq("id", anamneseEmEdicao);
      erroSalvar = error;
    } else {
      const { error } = await supabase
        .from("anamneses")
        .insert(payload);
      erroSalvar = error;
    }

    if (erroSalvar) {
      alert("Erro ao salvar anamnese: " + erroSalvar.message);
    } else {
      limparFormulario();
      setMostrarFormulario(false);
      await carregarDados();
    }

    setSalvando(false);
  };

  const handleExcluirAnamnese = async (anamneseId: string) => {
    if (!window.confirm("Deseja realmente excluir este registro de anamnese?")) return;

    const { error } = await supabase
      .from("anamneses")
      .delete()
      .eq("id", anamneseId);

    if (!error) {
      carregarDados();
    } else {
      alert("Erro ao excluir: " + error.message);
    }
  };

  const formatarData = (dataSql: string) => {
    if (!dataSql) return "";
    const [ano, mes, dia] = dataSql.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  if (loading) {
    return <div className="p-12 text-emerald-700 font-medium text-lg text-center">Carregando anamnese...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/pacientes/${id}`)}
            className="text-gray-500 hover:text-emerald-700 bg-white p-2 rounded-lg shadow-sm border border-gray-200 transition-colors"
          >
            ← Voltar ao Prontuário
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Anamnese Nutricional</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              Paciente: <span className="font-semibold text-emerald-800">{paciente?.perfis?.nome_completo}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (mostrarFormulario) {
              limparFormulario();
              setMostrarFormulario(false);
            } else {
              limparFormulario();
              setMostrarFormulario(true);
            }
          }}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-center"
        >
          {mostrarFormulario ? "✕ Fechar Formulário" : "+ Nova Anamnese"}
        </button>
      </div>

      {/* FORMULÁRIO DE ANAMNESE */}
      {mostrarFormulario && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-emerald-100 mb-10 transition-all">
          <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {anamneseEmEdicao ? "✏️ Editar Registro de Anamnese" : "📋 Nova Anamnese Estruturada"}
              </h2>
              <p className="text-sm text-gray-500">Preencha os dados de estilo de vida, sintomas e objetivos.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500">Data:</label>
              <input
                type="date"
                value={dataAnamnese}
                onChange={(e) => setDataAnamnese(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-medium text-gray-700"
              />
            </div>
          </div>

          <form onSubmit={handleSalvarAnamnese} className="space-y-8">
            {/* BLOCO 1: OBJETIVO */}
            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
              <h3 className="text-md font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <span>🎯</span> 1. Objetivo Principal & Motivação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Objetivo Primário</label>
                  <select
                    value={objetivoPrincipal}
                    onChange={(e) => setObjetivoPrincipal(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-gray-800 font-medium"
                  >
                    <option value="Emagrecimento">Emagrecimento / Perda de Gordura</option>
                    <option value="Hipertrofia">Hipertrofia / Ganho de Massa Muscular</option>
                    <option value="Reeducação Alimentar">Reeducação Alimentar & Longevidade</option>
                    <option value="Controle de Exames/Patologia">Controle Metabólico / Exames Laboratoriais</option>
                    <option value="Performance Esportiva">Performance Esportiva</option>
                    <option value="Outro">Outro (especificar)</option>
                  </select>
                </div>
                {objetivoPrincipal === "Outro" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Descreva o Objetivo</label>
                    <input
                      type="text"
                      value={outroObjetivo}
                      onChange={(e) => setOutroObjetivo(e.target.value)}
                      placeholder="Ex: Preparação para cirurgia, gestação..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* BLOCO 2: HISTÓRICO CLÍNICO E MEDICAMENTOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h3 className="text-md font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span>🩺</span> 2. Histórico Clínico & Familiar
                </h3>
                <p className="text-xs text-gray-500 mb-3">Diagnósticos prévios, histórico familiar (diabetes, hipertensão, etc.) e cirurgias.</p>
                <textarea
                  value={historicoClinico}
                  onChange={(e) => setHistoricoClinico(e.target.value)}
                  placeholder="Ex: Hipertensão leve controlada. Mãe diabética. Nega cirurgias prévias."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 h-28 resize-none"
                />
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h3 className="text-md font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span>💊</span> 3. Medicamentos & Suplementos
                </h3>
                <p className="text-xs text-gray-500 mb-3">Medicamentos contínuos, dosagens, polivitamínicos, creatina, whey, etc.</p>
                <textarea
                  value={medicamentosSuplementos}
                  onChange={(e) => setMedicamentosSuplementos(e.target.value)}
                  placeholder="Ex: Losartana 50mg pela manhã. Creatina 5g e Vitamina D 2000UI."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 h-28 resize-none"
                />
              </div>
            </div>

            {/* BLOCO 3: ALERGIAS, AVERSÕES E PREFERÊNCIAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-amber-50/40 p-5 rounded-xl border border-amber-200">
                <h3 className="text-md font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <span>⚠️</span> 4. Alergias & Intolerâncias
                </h3>
                <p className="text-xs text-amber-700 mb-3">Alergias alimentares, intolerância à lactose, glúten, frutos do mar, etc.</p>
                <textarea
                  value={alergiasIntolerancias}
                  onChange={(e) => setAlergiasIntolerancias(e.target.value)}
                  placeholder="Ex: Intolerância severa a lactose. Alergia a camarão."
                  className="w-full bg-white border border-amber-200 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-400 h-24 resize-none"
                />
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h3 className="text-md font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span>🍽️</span> 5. Aversões & Preferências
                </h3>
                <p className="text-xs text-gray-500 mb-3">Alimentos que recusa comer e refeições/ingredientes favoritos.</p>
                <textarea
                  value={aversoesPreferencias}
                  onChange={(e) => setAversoesPreferencias(e.target.value)}
                  placeholder="Ex: Não come fígado nem quiabo de jeito nenhum. Adora ovos e frutas cítricas."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 h-24 resize-none"
                />
              </div>
            </div>

            {/* BLOCO 4: HÁBITOS DE VIDA & ROTINA */}
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>⚡</span> 6. Rotina, Atividade Física & Hidratação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nível de Atividade Física</label>
                  <select
                    value={nivelAtividade}
                    onChange={(e) => setNivelAtividade(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 font-medium text-gray-800"
                  >
                    <option value="Sedentário">Sedentário (pouco ou nenhum exercício)</option>
                    <option value="Leve (1-2x/sem)">Leve (1 a 2 vezes por semana)</option>
                    <option value="Moderado (3-4x/sem)">Moderado (3 a 4 vezes por semana)</option>
                    <option value="Intenso (5-6x/sem)">Intenso (5 a 6 vezes por semana)</option>
                    <option value="Atleta / Duplo período">Atleta / Treinos diários intensos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Consumo Médio de Água</label>
                  <input
                    type="text"
                    value={consumoAgua}
                    onChange={(e) => setConsumoAgua(e.target.value)}
                    placeholder="Ex: 2.0 a 2.5 litros/dia"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Qualidade & Horas de Sono</label>
                  <input
                    type="text"
                    value={rotinaSono}
                    onChange={(e) => setRotinaSono(e.target.value)}
                    placeholder="Ex: 7h/noite, acorda descansado"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* BLOCO 5: SAÚDE INTESTINAL E OBSERVAÇÕES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h3 className="text-md font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span>🍃</span> 7. Saúde Gastrointestinal
                </h3>
                <p className="text-xs text-gray-500 mb-3">Frequência de evacuação, consistência, constipação, azia, refluxo ou gases.</p>
                <textarea
                  value={saudeIntestinal}
                  onChange={(e) => setSaudeIntestinal(e.target.value)}
                  placeholder="Ex: Evacua 1x ao dia, consistência normal. Relata azia ocasional após refeições gordurosas."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 h-24 resize-none"
                />
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h3 className="text-md font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span>📝</span> 8. Observações Gerais
                </h3>
                <p className="text-xs text-gray-500 mb-3">Comportamento com doces, apetite, estresse, momentos de ansiedade, etc.</p>
                <textarea
                  value={observacoesExtras}
                  onChange={(e) => setObservacoesExtras(e.target.value)}
                  placeholder="Ex: Compulsão noturna por doces perto das 21h. Nível alto de estresse no trabalho."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 h-24 resize-none"
                />
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  limparFormulario();
                  setMostrarFormulario(false);
                }}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
              >
                {salvando ? "Salvando..." : anamneseEmEdicao ? "Atualizar Anamnese" : "Salvar Anamnese"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTÓRICO DE ANAMNESES */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Histórico de Registros ({historicoAnamneses.length})</h2>
        </div>

        {historicoAnamneses.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-gray-600 font-medium">Nenhuma anamnese registrada para este paciente ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique no botão acima para criar a primeira anamnese nutricional.</p>
          </div>
        ) : (
          historicoAnamneses.map((item, index) => (
            <div
              key={item.id}
              className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-200 transition-all space-y-6"
            >
              {/* TOPO DO CARD */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full">
                    {index === 0 ? "Última Anamnese" : `Avaliação ${formatarData(item.data_anamnese)}`}
                  </span>
                  <span className="text-gray-400 text-sm">📅 Realizada em {formatarData(item.data_anamnese)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEditarClique(item)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleExcluirAnamnese(item.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {/* GRID DE INFORMAÇÕES RESUMIDAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 block mb-1">🎯 Objetivo</span>
                  <span className="text-sm font-semibold text-gray-800">{item.objetivo_principal || "Não informado"}</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 block mb-1">🏃 Atividade Física</span>
                  <span className="text-sm font-semibold text-gray-800">{item.nivel_atividade || "Sedentário"}</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 block mb-1">💧 Ingestão de Água</span>
                  <span className="text-sm font-semibold text-gray-800">{item.consumo_agua || "Não informado"}</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 block mb-1">🌙 Sono</span>
                  <span className="text-sm font-semibold text-gray-800">{item.rotina_sono || "Não informado"}</span>
                </div>
              </div>

              {/* DETALHES CLÍNICOS E ALIMENTARES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {item.alergias_intolerancias && (
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                    <span className="font-bold text-amber-900 block mb-1 text-xs uppercase tracking-wider">⚠️ Alergias & Intolerâncias</span>
                    <p className="text-amber-950 font-medium whitespace-pre-wrap">{item.alergias_intolerancias}</p>
                  </div>
                )}

                {item.aversoes_preferencias && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="font-bold text-gray-600 block mb-1 text-xs uppercase tracking-wider">🍽️ Aversões & Preferências</span>
                    <p className="text-gray-800 whitespace-pre-wrap">{item.aversoes_preferencias}</p>
                  </div>
                )}

                {item.historico_clinico && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="font-bold text-gray-600 block mb-1 text-xs uppercase tracking-wider">🩺 Histórico Clínico</span>
                    <p className="text-gray-800 whitespace-pre-wrap">{item.historico_clinico}</p>
                  </div>
                )}

                {item.medicamentos_suplementos && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="font-bold text-gray-600 block mb-1 text-xs uppercase tracking-wider">💊 Medicamentos & Suplementos</span>
                    <p className="text-gray-800 whitespace-pre-wrap">{item.medicamentos_suplementos}</p>
                  </div>
                )}

                {item.saude_intestinal && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="font-bold text-gray-600 block mb-1 text-xs uppercase tracking-wider">🍃 Saúde Intestinal</span>
                    <p className="text-gray-800 whitespace-pre-wrap">{item.saude_intestinal}</p>
                  </div>
                )}

                {item.observacoes_extras && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="font-bold text-gray-600 block mb-1 text-xs uppercase tracking-wider">📝 Observações Extras</span>
                    <p className="text-gray-800 whitespace-pre-wrap">{item.observacoes_extras}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
