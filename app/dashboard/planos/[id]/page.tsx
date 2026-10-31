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

  // NOVO: Dados do Nutricionista e Anamnese para o PDF oficial
  const [nutricionista, setNutricionista] = useState<any>(null);
  const [ultimaAnamnese, setUltimaAnamnese] = useState<any>(null);

  const [nomeRefeicao, setNomeRefeicao] = useState("");
  const [horario, setHorario] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  // NOVO: Estado para saber se estamos editando alguma refeição
  const [refeicaoEmEdicao, setRefeicaoEmEdicao] = useState<string | null>(null);

  // NOVO: Estados para o WhatsApp
  const [modalWhatsAppAberto, setModalWhatsAppAberto] = useState(false);
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState("");
  const [telefoneWhatsApp, setTelefoneWhatsApp] = useState("");
  const [copiado, setCopiado] = useState(false);

  // ==========================================
  // NOVO: ESTADOS DO GERADOR DE CARDÁPIO IA
  // ==========================================
  const [modalIaCardapioAberto, setModalIaCardapioAberto] = useState(false);
  const [carregandoIaCardapio, setCarregandoIaCardapio] = useState(false);
  const [objetivoIa, setObjetivoIa] = useState("Emagrecimento e Definição");
  const [caloriasIa, setCaloriasIa] = useState("");
  const [qtdRefeicoesIa, setQtdRefeicoesIa] = useState(4);
  const [alergiasIa, setAlergiasIa] = useState("");
  const [preferenciasIa, setPreferenciasIa] = useState("");
  const [observacoesIa, setObservacoesIa] = useState("");
  const [cardapioSugerido, setCardapioSugerido] = useState<any | null>(null);
  const [inserindoRefeicoesIa, setInserindoRefeicoesIa] = useState(false);
  const [refeicoesIaSelecionadas, setRefeicoesIaSelecionadas] = useState<{ [key: number]: boolean }>({});

  // ==========================================
  // NOVO: ESTADOS DA LISTA DE COMPRAS
  // ==========================================
  const [modalComprasAberto, setModalComprasAberto] = useState(false);
  const [carregandoCompras, setCarregandoCompras] = useState(false);
  const [listaCompras, setListaCompras] = useState<any | null>(null);
  const [itensComprados, setItensComprados] = useState<{ [key: string]: boolean }>({});
  const [copiadoCompras, setCopiadoCompras] = useState(false);

  // ==========================================
  // REF DO DOCUMENTO OFICIAL DE IMPRESSÃO PDF
  // ==========================================
  const componentePDFRef = useRef<HTMLDivElement>(null);

  const handleExportarPDF = useReactToPrint({
    contentRef: componentePDFRef,
    documentTitle: `Plano_Alimentar_${plano?.pacientes?.perfis?.nome_completo || "Paciente"}`,
  });

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    // Busca dados do Nutricionista logado para timbre e assinatura
    if (user) {
      const { data: dataNutri } = await supabase
        .from("perfis")
        .select("nome_completo, email")
        .eq("id", user.id)
        .single();
      if (dataNutri) setNutricionista(dataNutri);
    }

    const { data: dataPlano } = await supabase
      .from("planos_alimentares")
      .select(`id, paciente_id, titulo, ativo, pacientes ( id, peso_kg, altura_cm, data_nascimento, perfis (nome_completo, email) )`)
      .eq("id", id)
      .single();

    if (dataPlano) {
      setPlano(dataPlano);

      // Busca anamnese mais recente para auto-preencher dados da IA e o cabeçalho do PDF
      if (dataPlano.paciente_id) {
        const { data: dataAnamnese } = await supabase
          .from("anamneses")
          .select("objetivo_principal, alergias_intolerancias, aversoes_preferencias, consumo_agua, rotina_sono")
          .eq("paciente_id", dataPlano.paciente_id)
          .order("data_anamnese", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dataAnamnese) {
          setUltimaAnamnese(dataAnamnese);
          if (dataAnamnese.objetivo_principal) setObjetivoIa(dataAnamnese.objetivo_principal);
          if (dataAnamnese.alergias_intolerancias) setAlergiasIa(dataAnamnese.alergias_intolerancias);
          if (dataAnamnese.aversoes_preferencias) setPreferenciasIa(dataAnamnese.aversoes_preferencias);
        }
      }
    }

    const { data: dataRefeicoes } = await supabase
      .from("refeicoes")
      .select("*")
      .eq("plano_id", id)
      .order("horario", { ascending: true }); 

    if (dataRefeicoes) setRefeicoes(dataRefeicoes);
    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, [id]);

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "--";
    const hoje = new Date(); const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (hoje.getMonth() - nasc.getMonth() < 0 || (hoje.getMonth() - nasc.getMonth() === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  const formatarData = (dataSql: string) => {
    if (!dataSql) return "--";
    const [ano, mes, dia] = dataSql.split("T")[0].split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const imc = plano?.pacientes?.peso_kg && plano?.pacientes?.altura_cm
    ? (plano.pacientes.peso_kg / ((plano.pacientes.altura_cm / 100) * (plano.pacientes.altura_cm / 100))).toFixed(1)
    : "--";

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

  // MÉTODOS DO WHATSAPP
  const abrirModalWhatsApp = () => {
    const nomePaciente = plano?.pacientes?.perfis?.nome_completo || "Paciente";

    let textoRefeicoes = "";
    if (refeicoes && refeicoes.length > 0) {
      textoRefeicoes = refeicoes
        .map((r) => {
          const horarioFmt = r.horario ? ` (${r.horario.substring(0, 5)})` : "";
          return `🍴 *${r.nome}*${horarioFmt}\n${r.descricao}`;
        })
        .join("\n\n");
    } else {
      textoRefeicoes = "Consulte seu plano alimentar detalhado em anexo.";
    }

    const texto = `Olá, *${nomePaciente}*! Tudo bem? 🥗\n\nSeu *Plano Alimentar personalizado (${plano?.titulo || "NutriOne"})* já está pronto!\n\n📋 *Resumo da sua rotina:*\n\n${textoRefeicoes}\n\nLembre-se: constância e hidratação são a chave para alcançar seus objetivos! Se tiver qualquer dúvida sobre alimentos ou substituições, estou à disposição. ✨\n\n_NutriOne Consultoria Nutricional_`;

    setMensagemWhatsApp(texto);
    setCopiado(false);
    setModalWhatsAppAberto(true);
  };

  const enviarWhatsApp = () => {
    const cleanPhone = telefoneWhatsApp.replace(/\D/g, "");
    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(mensagemWhatsApp)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagemWhatsApp)}`;
    window.open(url, "_blank");
  };

  const copiarMensagem = () => {
    navigator.clipboard.writeText(mensagemWhatsApp);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // ==========================================
  // FUNÇÕES DO GERADOR DE CARDÁPIO IA
  // ==========================================
  const handleGerarCardapioIa = async () => {
    setCarregandoIaCardapio(true);
    setCardapioSugerido(null);

    try {
      const res = await fetch("/api/ai/cardapio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objetivo: objetivoIa,
          caloriasMeta: caloriasIa ? parseInt(caloriasIa) : null,
          qtdRefeicoes: qtdRefeicoesIa,
          alergias: alergiasIa,
          preferencias: preferenciasIa,
          observacoes: observacoesIa,
          pacienteNome: plano?.pacientes?.perfis?.nome_completo,
          pacienteInfo: {
            peso: plano?.pacientes?.peso_kg,
            altura: plano?.pacientes?.altura_cm,
            idade: plano?.pacientes?.data_nascimento ? new Date().getFullYear() - new Date(plano.pacientes.data_nascimento).getFullYear() : null,
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao gerar cardápio com IA.");
      }

      setCardapioSugerido(data);
      // Marca todas as refeições sugeridas como selecionadas por padrão
      if (Array.isArray(data.refeicoes)) {
        const selecaoInicial: { [key: number]: boolean } = {};
        data.refeicoes.forEach((_: any, idx: number) => {
          selecaoInicial[idx] = true;
        });
        setRefeicoesIaSelecionadas(selecaoInicial);
      }
    } catch (err: any) {
      alert("Falha ao gerar cardápio com IA: " + err.message);
    } finally {
      setCarregandoIaCardapio(false);
    }
  };

  const handleImportarCardapioIa = async () => {
    if (!cardapioSugerido || !Array.isArray(cardapioSugerido.refeicoes)) return;

    const refeicoesParaInserir = cardapioSugerido.refeicoes.filter(
      (_: any, idx: number) => refeicoesIaSelecionadas[idx] !== false
    );

    if (refeicoesParaInserir.length === 0) {
      alert("Selecione ao menos 1 refeição para importar ao plano.");
      return;
    }

    setInserindoRefeicoesIa(true);
    const { data: { user } } = await supabase.auth.getUser();

    const registros = refeicoesParaInserir.map((r: any) => ({
      plano_id: id,
      nutricionista_id: user?.id,
      nome: r.nome,
      horario: r.horario || "12:00",
      descricao: r.descricao
    }));

    const { error } = await supabase.from("refeicoes").insert(registros);

    if (error) {
      alert("Erro ao importar refeições: " + error.message);
    } else {
      setModalIaCardapioAberto(false);
      setCardapioSugerido(null);
      carregarDados();
      alert(`✨ Sucesso! ${registros.length} refeições foram adicionadas ao plano com sucesso.`);
    }
    setInserindoRefeicoesIa(false);
  };

  // ==========================================
  // FUNÇÕES DA LISTA DE COMPRAS
  // ==========================================
  const handleAbrirListaCompras = async () => {
    if (refeicoes.length === 0) {
      alert("Adicione pelo menos 1 refeição ao plano alimentar antes de gerar a lista de compras.");
      return;
    }

    setModalComprasAberto(true);
    if (listaCompras) return; // Já gerou nesta sessão

    setCarregandoCompras(true);
    try {
      const res = await fetch("/api/ai/lista-compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refeicoes,
          pacienteNome: plano?.pacientes?.perfis?.nome_completo,
          planoTitulo: plano?.titulo
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao gerar lista de compras.");
      }

      setListaCompras(data);
    } catch (err: any) {
      alert("Erro ao gerar lista de compras: " + err.message);
    } finally {
      setCarregandoCompras(false);
    }
  };

  const handleToggleItemComprado = (itemKey: string) => {
    setItensComprados(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const montarTextoListaWhatsApp = () => {
    if (!listaCompras) return "";
    const nome = plano?.pacientes?.perfis?.nome_completo || "Paciente";

    let texto = `🛒 *Lista de Compras da Semana - NutriOne*\nPaciente: *${nome}*\nPlano: *${plano?.titulo || "Dieta Personalizada"}*\n\n`;

    if (listaCompras.hortifruti?.length) {
      texto += `🥬 *Hortifrúti (Feira):*\n${listaCompras.hortifruti.map((i: string) => `• ${i}`).join("\n")}\n\n`;
    }
    if (listaCompras.proteinas_carnes_ovos?.length) {
      texto += `🥩 *Proteínas & Ovos:*\n${listaCompras.proteinas_carnes_ovos.map((i: string) => `• ${i}`).join("\n")}\n\n`;
    }
    if (listaCompras.graos_cereais_mercearia?.length) {
      texto += `🌾 *Mercearia & Grãos:*\n${listaCompras.graos_cereais_mercearia.map((i: string) => `• ${i}`).join("\n")}\n\n`;
    }
    if (listaCompras.laticinios_derivados?.length) {
      texto += `🥛 *Laticínios & Derivados:*\n${listaCompras.laticinios_derivados.map((i: string) => `• ${i}`).join("\n")}\n\n`;
    }
    if (listaCompras.temperos_extras?.length) {
      texto += `🧂 *Temperos & Extras:*\n${listaCompras.temperos_extras.map((i: string) => `• ${i}`).join("\n")}\n\n`;
    }

    if (listaCompras.dica_compras) {
      texto += `💡 *Dica do Nutri:* ${listaCompras.dica_compras}\n\n`;
    }

    texto += `_NutriOne Consultoria Nutricional_`;
    return texto;
  };

  const handleEnviarListaWhatsApp = () => {
    const texto = montarTextoListaWhatsApp();
    const cleanPhone = telefoneWhatsApp.replace(/\D/g, "");
    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(texto)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  const handleCopiarListaCompras = () => {
    const texto = montarTextoListaWhatsApp();
    navigator.clipboard.writeText(texto);
    setCopiadoCompras(true);
    setTimeout(() => setCopiadoCompras(false), 2500);
  };

  // Criação ou Edição de Refeição
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
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto">
      
      {/* Cabeçalho e Botões de Ação */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/planos')} className="text-gray-500 hover:text-emerald-700 bg-white p-2 rounded-lg shadow-sm border border-gray-200 transition-colors cursor-pointer">
            ← Voltar
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{plano.titulo}</h1>
            <p className="text-emerald-600 font-medium mt-1 text-sm sm:text-base">
              Paciente: <span className="text-gray-600">{plano.pacientes?.perfis?.nome_completo}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Botão ✨ Gerador de Cardápio com IA */}
          <button
            onClick={() => setModalIaCardapioAberto(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <span>✨</span> Sugerir Cardápio IA
          </button>

          {/* Botão 🛒 Lista de Compras */}
          <button
            onClick={handleAbrirListaCompras}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <span>🛒</span> Lista de Compras
          </button>

          {/* Botão WhatsApp */}
          <button 
            onClick={abrirModalWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <span>💬</span> WhatsApp
          </button>

          {/* Botão Exportar PDF */}
          <button 
            onClick={handleExportarPDF}
            className="bg-gray-800 hover:bg-black text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            title="Exportar Cardápio Oficial em PDF"
          >
            <span>📄</span> Exportar PDF
          </button>
        </div>
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
                <button type="submit" disabled={salvando} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition duration-300 shadow-sm disabled:opacity-50 cursor-pointer">
                  {salvando ? "Salvando..." : refeicaoEmEdicao ? "Atualizar Refeição" : "+ Incluir no Plano"}
                </button>

                {refeicaoEmEdicao && (
                  <button type="button" onClick={handleCancelarEdicao} className="w-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 font-semibold py-3 rounded-xl transition duration-300 cursor-pointer">
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Coluna da Direita: Cardápio Interativo na Tela */}
        <div className="lg:col-span-2">
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Cardápio do Paciente</h3>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-semibold border border-emerald-200">
                {refeicoes.length} {refeicoes.length === 1 ? "refeição cadastrada" : "refeições cadastradas"}
              </span>
            </div>
            
            <div className="space-y-4">
              {refeicoes.length === 0 ? (
                <div className="text-center py-12 px-6 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 space-y-3">
                  <span className="text-4xl block">🥗</span>
                  <p className="font-semibold text-gray-700 text-base">Nenhuma refeição cadastrada neste plano ainda.</p>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Você pode adicionar refeição por refeição no formulário ao lado ou clicar em <strong>"✨ Sugerir Cardápio IA"</strong> para gerar um cardápio completo em segundos!
                  </p>
                  <button
                    onClick={() => setModalIaCardapioAberto(true)}
                    className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>✨</span> Gerar com Inteligência Artificial
                  </button>
                </div>
              ) : (
                refeicoes.map((ref) => (
                  <div key={ref.id} className="p-6 bg-white rounded-xl border-2 border-emerald-50 shadow-sm relative group overflow-hidden">
                    
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm">
                          {ref.horario}
                        </span>
                        <h4 className="font-bold text-gray-800 text-lg">{ref.nome}</h4>
                      </div>
                      
                      {/* BOTÕES DE AÇÃO: Aparecem no Hover */}
                      <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditarClique(ref)}
                          className="text-amber-500 hover:text-amber-700 text-sm font-semibold cursor-pointer"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleExcluirRefeicao(ref.id)}
                          className="text-red-400 hover:text-red-600 text-sm font-semibold cursor-pointer"
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

          </div>
        </div>

      </div>

      {/* ========================================================
          DOCUMENTO TIMBRADO DE IMPRESSÃO (PLANO ALIMENTAR EM PDF)
          Mesmo design, grafia e padrão oficial do Prontuário Médico
      ======================================================== */}
      <div className="hidden">
        <div ref={componentePDFRef} className="p-10 bg-white text-gray-800 space-y-6 font-sans">
          
          {/* Cabeçalho Oficial do Plano */}
          <div className="flex justify-between items-center border-b-2 border-emerald-600 pb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-emerald-800 tracking-tight">NutriOne</h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Clínica & Consultoria Nutricional Integrada</p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-gray-800">Prescrição Dietética & Plano Alimentar</h2>
              <p className="text-xs text-gray-500">
                Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {nutricionista?.nome_completo && (
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">Dr(a). {nutricionista.nome_completo}</p>
              )}
            </div>
          </div>

          {/* 1. Identificação do Paciente */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">1. Identificação do Paciente</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Nome Completo:</span>
                <span className="font-bold text-gray-800">{plano?.pacientes?.perfis?.nome_completo || "Paciente"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Idade / Nascimento:</span>
                <span className="font-bold text-gray-800">
                  {plano?.pacientes?.data_nascimento ? `${calcularIdade(plano.pacientes.data_nascimento)} anos (${formatarData(plano.pacientes.data_nascimento)})` : "--"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">E-mail:</span>
                <span className="font-bold text-gray-800">{plano?.pacientes?.perfis?.email || "--"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Peso Atual:</span>
                <span className="font-bold text-gray-800">{plano?.pacientes?.peso_kg ? `${plano.pacientes.peso_kg} kg` : "--"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Altura:</span>
                <span className="font-bold text-gray-800">{plano?.pacientes?.altura_cm ? `${plano.pacientes.altura_cm} cm` : "--"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">IMC:</span>
                <span className="font-bold text-gray-800">{imc !== "--" ? `${imc} kg/m²` : "--"}</span>
              </div>
            </div>
          </div>

          {/* 2. Diretrizes & Metas do Plano */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">2. Diretrizes & Metas Dietoterápicas</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block font-semibold">Título da Prescrição:</span>
                <span className="text-gray-800 font-bold">{plano.titulo}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-semibold">Foco / Objetivo:</span>
                <span className="text-emerald-800 font-bold">{ultimaAnamnese?.objetivo_principal || "Adequação Nutricional e Saúde"}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-semibold">Alergias / Intolerâncias:</span>
                <span className="text-gray-800">{ultimaAnamnese?.alergias_intolerancias || "Nenhuma relatada"}</span>
              </div>
            </div>
            {ultimaAnamnese?.consumo_agua && (
              <div className="pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-semibold">Meta de Hidratação Diária: </span>
                <span className="text-emerald-800 font-bold">{ultimaAnamnese.consumo_agua}</span>
              </div>
            )}
          </div>

          {/* 3. Prescrição das Refeições Diárias */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                3. Prescrição das Refeições Diárias ({refeicoes.length} {refeicoes.length === 1 ? "refeição" : "refeições"})
              </h3>
              <span className="text-[11px] text-gray-400">Siga as orientações e porções recomendadas</span>
            </div>

            {refeicoes.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">Nenhuma refeição cadastrada neste plano.</p>
            ) : (
              refeicoes.map((ref, idx) => (
                <div 
                  key={ref.id || idx} 
                  className="border-l-4 border-emerald-600 bg-gray-50/70 p-4 rounded-r-xl border-t border-r border-b border-gray-200 space-y-2 break-inside-avoid"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-xs">
                      {ref.horario}
                    </span>
                    <h4 className="font-bold text-gray-800 text-sm sm:text-base">{ref.nome}</h4>
                  </div>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed pl-1">
                    {ref.descricao}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* 4. Orientações Gerais de Hábitos Saudáveis */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-950 space-y-1.5 break-inside-avoid">
            <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>💡</span> Recomendações Gerais do Nutricionista
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 leading-relaxed">
              <li>Mastigue devagar e evite distrações (celular, TV) durante as refeições principais.</li>
              <li>Mantenha a ingestão hídrica constante entre as refeições, evitando grandes volumes de líquido junto com a comida.</li>
              <li>Priorize temperos naturais (alho, cebola, cúrcuma, azeite extra virgem, ervas frescas) e evite ultraprocessados.</li>
              <li>Dúvidas sobre substituições de alimentos ou horários devem ser consultadas diretamente com o nutricionista.</li>
            </ul>
          </div>

          {/* Campo de Assinatura */}
          <div className="pt-10 mt-8 border-t border-gray-200 flex justify-between items-end text-xs break-inside-avoid">
            <div className="text-gray-400">
              <p>NutriOne • Sistema de Gestão Nutricional Inteligente</p>
              <p>Prescrição dietoterápica personalizada e intransferível.</p>
            </div>
            <div className="text-center w-64 border-t border-gray-800 pt-2">
              <p className="font-bold text-gray-800">{nutricionista?.nome_completo || "Dr(a). Nutricionista"}</p>
              <p className="text-gray-500">Nutricionista Clínico(a)</p>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================
          MODAL 1: GERADOR DE CARDÁPIO COM INTELIGÊNCIA ARTIFICIAL
      ======================================================== */}
      {modalIaCardapioAberto && (
        <div 
          onClick={() => setModalIaCardapioAberto(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-3xl rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 space-y-6 my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Topo do Modal */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-lg">✨</span> IA Dietoterapêutica NutriOne
                </span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  Gerador Automático de Cardápio
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sugere refeições completas, quantidades e horários adaptados ao paciente.
                </p>
              </div>
              <button
                onClick={() => setModalIaCardapioAberto(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Configurações da Sugestão */}
            {!cardapioSugerido ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Objetivo Clínico
                    </label>
                    <select
                      value={objetivoIa}
                      onChange={(e) => setObjetivoIa(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none text-sm text-gray-800 bg-white"
                    >
                      <option value="Emagrecimento e Definição">Emagrecimento e Definição (Déficit Calórico)</option>
                      <option value="Hipertrofia e Ganho de Massa Muscular">Hipertrofia e Ganho de Massa (Superávit)</option>
                      <option value="Reeducação Alimentar e Manutenção">Reeducação Alimentar e Manutenção</option>
                      <option value="Estratégia Low Carb">Estratégia Low Carb / Cetogênica</option>
                      <option value="Alimentação Vegetariana / Plant-Based">Vegetariana / Plant-Based</option>
                      <option value="Controle Glicêmico / Diabetes">Controle Glicêmico / Diabetes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Número de Refeições no Dia
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQtdRefeicoesIa(num)}
                          className={`py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                            qtdRefeicoesIa === num
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {num} ref.
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Meta Calórica Aproximada (kcal) - Opcional
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 1800 (ou deixe vazio para a IA sugerir)"
                      value={caloriasIa}
                      onChange={(e) => setCaloriasIa(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none text-sm text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Alergias e Intolerâncias
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Lactose, Glúten, Amendoim..."
                      value={alergiasIa}
                      onChange={(e) => setAlergiasIa(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none text-sm text-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Preferências ou Aversões do Paciente
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Não gosta de peixe; prefere café da manhã prático com ovos..."
                    value={preferenciasIa}
                    onChange={(e) => setPreferenciasIa(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none text-sm text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Orientações Específicas do Nutricionista
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Priorizar fibras solúveis, evitar ultraprocessados, incluir sementes de chia/linhaça..."
                    value={observacoesIa}
                    onChange={(e) => setObservacoesIa(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none text-sm text-gray-800 resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGerarCardapioIa}
                    disabled={carregandoIaCardapio}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {carregandoIaCardapio ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Criando cardápio personalizado com IA...</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>Gerar Proposta de Cardápio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Pré-visualização do Cardápio Gerado */
              <div className="space-y-6">
                {/* Banner com Estimativas de Macros */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-emerald-900 text-base">
                      {cardapioSugerido.titulo_sugerido || "Sugestão de Cardápio Gerada"}
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      {cardapioSugerido.dicas_nutricionais || "Cardápio calculado com base nas necessidades do paciente."}
                    </p>
                  </div>
                  {cardapioSugerido.macronutrientes && (
                    <div className="flex items-center gap-2 text-xs shrink-0 bg-white px-3 py-2 rounded-xl border border-emerald-200">
                      <span className="font-bold text-gray-700">{cardapioSugerido.calorias_estimadas || "--"} kcal</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-blue-600 font-semibold">P: {cardapioSugerido.macronutrientes.proteinas_g}g</span>
                      <span className="text-amber-600 font-semibold">C: {cardapioSugerido.macronutrientes.carboidratos_g}g</span>
                      <span className="text-rose-600 font-semibold">G: {cardapioSugerido.macronutrientes.gorduras_g}g</span>
                    </div>
                  )}
                </div>

                {/* Lista de Refeições Sugeridas com Checkbox */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Refeições Propostas (Selecione as que deseja incluir):
                  </p>
                  {cardapioSugerido.refeicoes?.map((ref: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        refeicoesIaSelecionadas[idx] !== false
                          ? "bg-white border-emerald-300 shadow-2xs"
                          : "bg-gray-50 border-gray-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={refeicoesIaSelecionadas[idx] !== false}
                            onChange={(e) => {
                              setRefeicoesIaSelecionadas(prev => ({
                                ...prev,
                                [idx]: e.target.checked
                              }));
                            }}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                          />
                          <span className="font-bold text-gray-800 text-sm">{ref.nome}</span>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                            {ref.horario}
                          </span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap pl-7 leading-relaxed">
                        {ref.descricao}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCardapioSugerido(null)}
                    disabled={inserindoRefeicoesIa}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors text-sm cursor-pointer"
                  >
                    ← Ajustar Critérios e Recriar
                  </button>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setModalIaCardapioAberto(false)}
                      disabled={inserindoRefeicoesIa}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition-colors text-sm cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleImportarCardapioIa}
                      disabled={inserindoRefeicoesIa}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                    >
                      {inserindoRefeicoesIa ? "Importando..." : "📥 Inserir no Plano Alimentar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: LISTA DE COMPRAS INTELIGENTE DO PLANO
      ======================================================== */}
      {modalComprasAberto && (
        <div 
          onClick={() => setModalComprasAberto(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 space-y-6 my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Topo do Modal */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-lg">🛒</span> Organização Prática
                </span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  Lista de Compras Semanal
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ingredientes consolidados por seção do mercado para facilitar as compras do paciente.
                </p>
              </div>
              <button
                onClick={() => setModalComprasAberto(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {carregandoCompras ? (
              <div className="py-16 text-center space-y-3">
                <span className="text-4xl block animate-bounce">🛒</span>
                <p className="font-bold text-gray-700 text-base">Analisando refeições do plano alimentar...</p>
                <p className="text-xs text-gray-400">Consolidando quantidades e organizando por corredores do supermercado.</p>
              </div>
            ) : !listaCompras ? (
              <div className="py-12 text-center text-gray-500">
                Não foi possível carregar a lista de compras.
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Dica do Nutri */}
                {listaCompras.dica_compras && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                    <span className="text-base shrink-0">💡</span>
                    <p className="leading-relaxed"><strong>Dica de Ouro:</strong> {listaCompras.dica_compras}</p>
                  </div>
                )}

                {/* Categorias da Lista */}
                <div className="space-y-4">
                  {/* Hortifrúti */}
                  {listaCompras.hortifruti && listaCompras.hortifruti.length > 0 && (
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                      <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-2 mb-2">
                        <span>🥬</span> Hortifrúti (Frutas, Legumes & Verduras)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {listaCompras.hortifruti.map((item: string, i: number) => {
                          const k = `h-${i}`;
                          return (
                            <label key={k} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2 rounded-lg border border-emerald-100 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!itensComprados[k]}
                                onChange={() => handleToggleItemComprado(k)}
                                className="w-3.5 h-3.5 text-emerald-600 rounded"
                              />
                              <span className={itensComprados[k] ? "line-through text-gray-400" : ""}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Proteínas */}
                  {listaCompras.proteinas_carnes_ovos && listaCompras.proteinas_carnes_ovos.length > 0 && (
                    <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100">
                      <h4 className="font-bold text-rose-800 text-sm flex items-center gap-2 mb-2">
                        <span>🥩</span> Carnes, Ovos & Proteínas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {listaCompras.proteinas_carnes_ovos.map((item: string, i: number) => {
                          const k = `p-${i}`;
                          return (
                            <label key={k} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2 rounded-lg border border-rose-100 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!itensComprados[k]}
                                onChange={() => handleToggleItemComprado(k)}
                                className="w-3.5 h-3.5 text-rose-600 rounded"
                              />
                              <span className={itensComprados[k] ? "line-through text-gray-400" : ""}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grãos & Mercearia */}
                  {listaCompras.graos_cereais_mercearia && listaCompras.graos_cereais_mercearia.length > 0 && (
                    <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100">
                      <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
                        <span>🌾</span> Grãos, Cereais & Mercearia
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {listaCompras.graos_cereais_mercearia.map((item: string, i: number) => {
                          const k = `g-${i}`;
                          return (
                            <label key={k} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2 rounded-lg border border-amber-100 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!itensComprados[k]}
                                onChange={() => handleToggleItemComprado(k)}
                                className="w-3.5 h-3.5 text-amber-600 rounded"
                              />
                              <span className={itensComprados[k] ? "line-through text-gray-400" : ""}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Laticínios */}
                  {listaCompras.laticinios_derivados && listaCompras.laticinios_derivados.length > 0 && (
                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                      <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2 mb-2">
                        <span>🥛</span> Laticínios & Bebidas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {listaCompras.laticinios_derivados.map((item: string, i: number) => {
                          const k = `l-${i}`;
                          return (
                            <label key={k} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2 rounded-lg border border-blue-100 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!itensComprados[k]}
                                onChange={() => handleToggleItemComprado(k)}
                                className="w-3.5 h-3.5 text-blue-600 rounded"
                              />
                              <span className={itensComprados[k] ? "line-through text-gray-400" : ""}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Temperos & Extras */}
                  {listaCompras.temperos_extras && listaCompras.temperos_extras.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-2">
                        <span>🧂</span> Temperos, Óleos & Extras
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {listaCompras.temperos_extras.map((item: string, i: number) => {
                          const k = `t-${i}`;
                          return (
                            <label key={k} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2 rounded-lg border border-gray-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!itensComprados[k]}
                                onChange={() => handleToggleItemComprado(k)}
                                className="w-3.5 h-3.5 text-gray-600 rounded"
                              />
                              <span className={itensComprados[k] ? "line-through text-gray-400" : ""}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações da Lista */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCopiarListaCompras}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiadoCompras ? "✅ Lista Copiada!" : "📋 Copiar Lista"}
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setModalComprasAberto(false)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition-colors text-xs cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button
                      type="button"
                      onClick={handleEnviarListaWhatsApp}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>💬</span> Enviar no WhatsApp
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: MODAL DO WHATSAPP (PLANO ALIMENTAR)
      ======================================================== */}
      {modalWhatsAppAberto && (
        <div
          onClick={() => setModalWhatsAppAberto(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 space-y-6"
          >
            {/* Topo do Modal */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-lg">💬</span> WhatsApp Web & Celular
                </span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  Enviar Plano para {plano?.pacientes?.perfis?.nome_completo}
                </h3>
              </div>
              <button
                onClick={() => setModalWhatsAppAberto(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Campo de Telefone */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Telefone / WhatsApp com DDD (opcional)
              </label>
              <input
                type="text"
                value={telefoneWhatsApp}
                onChange={(e) => setTelefoneWhatsApp(e.target.value)}
                placeholder="Ex: 11999998888 (deixe em branco se preferir escolher o contato no WhatsApp)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none text-sm text-gray-800"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Se deixar em branco, o WhatsApp abrirá para você escolher o paciente na sua lista de conversas.
              </p>
            </div>

            {/* Mensagem Formatada */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700">Prévia da Mensagem (Personalizável)</label>
                <span className="text-[11px] text-gray-400">Pode editar o texto abaixo se quiser</span>
              </div>
              <textarea
                value={mensagemWhatsApp}
                onChange={(e) => setMensagemWhatsApp(e.target.value)}
                rows={9}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none text-xs text-gray-700 font-mono leading-relaxed resize-none bg-gray-50"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={copiarMensagem}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiado ? "✅ Copiado!" : "📋 Copiar Texto"}
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setModalWhatsAppAberto(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition-colors text-sm cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={enviarWhatsApp}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>💬</span> Abrir no WhatsApp
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
