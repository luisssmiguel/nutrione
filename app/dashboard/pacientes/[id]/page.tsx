"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
// Importações da biblioteca de gráficos!
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ProntuarioPage() {
  const { id } = useParams(); 
  const router = useRouter();
  const supabase = createClient();
  
  const [paciente, setPaciente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editando, setEditando] = useState(false);
  const [pesoEdit, setPesoEdit] = useState("");
  const [alturaEdit, setAlturaEdit] = useState("");

  const [anotacoes, setAnotacoes] = useState<any[]>([]);
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [gerandoPlano, setGerandoPlano] = useState(false);

  const [exames, setExames] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // NOVO: Estado para guardar o histórico de peso para o gráfico
  const [historicoPeso, setHistoricoPeso] = useState<any[]>([]);

  // NOVO: Estado para guardar a última anamnese nutricional
  const [ultimaAnamnese, setUltimaAnamnese] = useState<any>(null);

  // NOVO: Estados do Copiloto Nutricional IA
  const [copilotoAberto, setCopilotoAberto] = useState(false);
  const [mensagensCopiloto, setMensagensCopiloto] = useState<Array<{ role: "user" | "model"; content: string }>>([]);
  const [inputCopiloto, setInputCopiloto] = useState("");
  const [carregandoCopiloto, setCarregandoCopiloto] = useState(false);
  const [ultimosExamesLab, setUltimosExamesLab] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (copilotoAberto) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagensCopiloto, copilotoAberto]);

  const carregarDados = async () => {
    // Busca Paciente
    const { data: dataPaciente } = await supabase.from("pacientes").select(`id, peso_kg, altura_cm, data_nascimento, perfis (nome_completo, email)`).eq("id", id).single();
    if (dataPaciente) {
      setPaciente(dataPaciente);
      setPesoEdit(dataPaciente.peso_kg.toString());
      setAlturaEdit(dataPaciente.altura_cm.toString());
    }

    // Busca Anotações
    const { data: dataAnotacoes } = await supabase.from("anotacoes").select("*").eq("paciente_id", id).order("data_criacao", { ascending: false }); 
    if (dataAnotacoes) setAnotacoes(dataAnotacoes);

    // Busca Exames
    const { data: dataExames } = await supabase.from("exames").select("*").eq("paciente_id", id).order("data_upload", { ascending: false });
    if (dataExames) setExames(dataExames);

    // Busca Última Anamnese
    const { data: dataAnamnese } = await supabase
      .from("anamneses")
      .select("*")
      .eq("paciente_id", id)
      .order("data_anamnese", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dataAnamnese) setUltimaAnamnese(dataAnamnese);

    // Busca Últimos Exames Laboratoriais
    const { data: dataLab } = await supabase
      .from("exames_laboratoriais")
      .select("*")
      .eq("paciente_id", id)
      .order("data_exame", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dataLab) setUltimosExamesLab(dataLab);

    // NOVO: Busca Histórico de Pesos e formata para o Gráfico
    const { data: dataHistorico } = await supabase
      .from("historico_pesos")
      .select("peso_kg, data_registro")
      .eq("paciente_id", id)
      .order("data_registro", { ascending: true }); // Gráfico sempre do mais antigo pro mais novo

    if (dataHistorico) {
      // Pega os dados do banco e converte a data para um texto curto, ex: "15 Fev"
      const dadosFormatados = dataHistorico.map((h) => ({
        data: new Date(h.data_registro).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        peso: h.peso_kg
      }));
      setHistoricoPeso(dadosFormatados);
    }

    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, [id]);

  // Atualiza as medidas E salva no histórico!
  const handleSalvarEdicao = async () => {
    const novoPeso = parseFloat(pesoEdit.toString().replace(',', '.'));
    const novaAltura = parseFloat(alturaEdit);
    
    const { error } = await supabase.from("pacientes").update({ peso_kg: novoPeso, altura_cm: novaAltura }).eq("id", id);
    
    if (!error) { 
      // Salva o novo peso no histórico para o gráfico andar
      await supabase.from("historico_pesos").insert({ paciente_id: id, peso_kg: novoPeso });
      
      setEditando(false); 
      carregarDados(); 
    }
  };

  const handleSalvarAnotacao = async () => {
    if (!novaAnotacao.trim()) return;
    setSalvandoNota(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("anotacoes").insert({ paciente_id: id, nutricionista_id: user?.id, texto: novaAnotacao });
    if (!error) { setNovaAnotacao(""); carregarDados(); }
    setSalvandoNota(false);
  };

  const handleExcluirAnotacao = async (idAnotacao: string) => {
    if (window.confirm("Apagar esta anotação?")) {
      await supabase.from("anotacoes").delete().eq("id", idAnotacao);
      carregarDados();
    }
  };

  const handleUploadExame = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const nomeUnico = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('exames').upload(nomeUnico, file);
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('exames').getPublicUrl(nomeUnico);
      await supabase.from('exames').insert({ paciente_id: id, nutricionista_id: user?.id, nome_arquivo: file.name, url_arquivo: publicUrl });
      carregarDados();
    }
    setUploading(false);
  };

 // NOVO: Função que verifica se tem plano ou cria um automático e já abre a tela de montagem
  const handleAcessarPlanoDireto = async () => {
    setGerandoPlano(true);
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Verifica se já existe um plano para este paciente
    const { data: planosExistentes } = await supabase
      .from("planos_alimentares")
      .select("id")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .limit(1);

    if (planosExistentes && planosExistentes.length > 0) {
      // Se já tem, joga direto pra tela de montagem dele
      router.push(`/dashboard/planos/${planosExistentes[0].id}`);
    } else {
      // 2. Se não tem, cria um plano automático e já abre ele
      const { data: novoPlano, error } = await supabase
        .from("planos_alimentares")
        .insert({
          paciente_id: id,
          nutricionista_id: user?.id,
          titulo: `Plano Alimentar - ${paciente?.perfis?.nome_completo}`,
          ativo: true
        })
        .select("id")
        .single();

      if (novoPlano) {
        router.push(`/dashboard/planos/${novoPlano.id}`);
      } else {
        alert("Erro ao criar plano: " + error?.message);
        setGerandoPlano(false);
      }
    }
  };

  if (loading) return <div className="p-12 text-emerald-700 font-medium text-lg">Carregando prontuário...</div>;
  if (!paciente) return <div className="p-12 text-red-500 font-medium text-lg">Paciente não encontrado.</div>;

  const calcularIdade = (dataNasc: string) => {
    const hoje = new Date(); const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (hoje.getMonth() - nasc.getMonth() < 0 || (hoje.getMonth() - nasc.getMonth() === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };
  const imc = (paciente.peso_kg / ((paciente.altura_cm / 100) * (paciente.altura_cm / 100))).toFixed(1);

  const handleEnviarCopiloto = async (textoManual?: string) => {
    const msgTexto = (textoManual || inputCopiloto).trim();
    if (!msgTexto || carregandoCopiloto) return;

    const novaLista = [
      ...mensagensCopiloto,
      { role: "user" as const, content: msgTexto }
    ];

    setMensagensCopiloto(novaLista);
    setInputCopiloto("");
    setCarregandoCopiloto(true);

    try {
      const res = await fetch("/api/ai/copiloto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: msgTexto,
          historico: mensagensCopiloto,
          contextoPaciente: {
            nome: paciente?.perfis?.nome_completo,
            idade: paciente?.data_nascimento ? calcularIdade(paciente.data_nascimento) : null,
            peso: paciente?.peso_kg,
            altura: paciente?.altura_cm,
            imc,
            anamnese: ultimaAnamnese,
            ultimos_exames: ultimosExamesLab
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao consultar o Copiloto.");
      }

      setMensagensCopiloto([
        ...novaLista,
        { role: "model" as const, content: data.resposta }
      ]);
    } catch (err: any) {
      setMensagensCopiloto([
        ...novaLista,
        {
          role: "model" as const,
          content: `⚠️ Desculpe, não consegui processar a resposta: ${err.message}`
        }
      ]);
    } finally {
      setCarregandoCopiloto(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/pacientes')} className="text-gray-500 hover:text-emerald-700 bg-white p-2 rounded-lg shadow-sm border border-gray-200 transition-colors">← Voltar</button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Prontuário Médico</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">Detalhes e acompanhamento do paciente.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Botão Copiloto IA */}
          <button
            onClick={() => setCopilotoAberto(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="text-lg">✨</span>
            <span>Copiloto IA</span>
          </button>

          {/* Botão Super Inteligente */}
          <button 
            onClick={handleAcessarPlanoDireto}
            disabled={gerandoPlano}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-transform transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {gerandoPlano ? "Abrindo..." : "📋 Gerar Plano Alimentar"}
          </button>
        </div>
      </div>

      {/* Cartão do Paciente */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-4xl border-4 border-emerald-50 shrink-0">
            {paciente.perfis.nome_completo.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{paciente.perfis.nome_completo}</h2>
            <p className="text-gray-500 mb-3">{paciente.perfis.email}</p>
            <div className="flex gap-2 flex-wrap items-center">
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">{calcularIdade(paciente.data_nascimento)} anos</span>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">IMC: {imc}</span>
              {ultimaAnamnese?.objetivo_principal && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  🎯 {ultimaAnamnese.objetivo_principal}
                </span>
              )}
              {ultimaAnamnese?.alergias_intolerancias && (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  ⚠️ Alergia/Intolerância
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/dashboard/pacientes/${id}/anamnese`)}
          className="w-full md:w-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
        >
          📋 {ultimaAnamnese ? "Ver Anamnese Completa" : "+ Preencher Anamnese"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo */}
        <div className="space-y-8 lg:col-span-1">

          {/* BLOCO: Anamnese Nutricional Rápida */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>📋</span> Anamnese
              </h3>
              <button 
                onClick={() => router.push(`/dashboard/pacientes/${id}/anamnese`)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                {ultimaAnamnese ? "Detalhes →" : "+ Preencher"}
              </button>
            </div>

            {ultimaAnamnese ? (
              <div className="space-y-3 text-xs">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <span className="text-gray-400 block font-medium mb-0.5">Objetivo</span>
                  <span className="text-gray-800 font-semibold">{ultimaAnamnese.objetivo_principal}</span>
                </div>
                {ultimaAnamnese.alergias_intolerancias && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <span className="text-amber-800 block font-bold mb-0.5">⚠️ Alergias / Intolerâncias</span>
                    <span className="text-amber-900 line-clamp-2">{ultimaAnamnese.alergias_intolerancias}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2.5 rounded-xl">
                    <span className="text-gray-400 block font-medium mb-0.5">Água</span>
                    <span className="text-gray-800 font-semibold truncate block">{ultimaAnamnese.consumo_agua || "—"}</span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl">
                    <span className="text-gray-400 block font-medium mb-0.5">Atividade</span>
                    <span className="text-gray-800 font-semibold truncate block">{ultimaAnamnese.nivel_atividade || "—"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Nenhuma anamnese cadastrada.</p>
                <button
                  onClick={() => router.push(`/dashboard/pacientes/${id}/anamnese`)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm"
                >
                  Preencher Agora
                </button>
              </div>
            )}
          </div>
          
          {/* BLOCO: Medidas */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Medidas Atuais</h3>
              {!editando ? (
                <button onClick={() => setEditando(true)} className="text-sm text-emerald-600 font-medium hover:underline">Editar</button>
              ) : (
                <button onClick={handleSalvarEdicao} className="text-sm bg-emerald-600 text-white px-3 py-1 rounded-md font-medium hover:bg-emerald-700">Salvar</button>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Peso (kg)</span>
                {!editando ? <span className="text-gray-800 font-bold">{paciente.peso_kg} kg</span> : <input type="number" step="0.1" value={pesoEdit} onChange={(e) => setPesoEdit(e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-right outline-none focus:border-emerald-500" />}
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Altura (cm)</span>
                {!editando ? <span className="text-gray-800 font-bold">{paciente.altura_cm} cm</span> : <input type="number" value={alturaEdit} onChange={(e) => setAlturaEdit(e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-right outline-none focus:border-emerald-500" />}
              </div>
            </div>
            {/* NOVO BOTÃO ADICIONADO AQUI */}
            <button 
              onClick={() => router.push(`/dashboard/pacientes/${id}/medidas`)} 
              className="w-full mt-6 bg-emerald-50 text-emerald-800 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex justify-center items-center gap-2"
            >
              📊 Avaliação Completa
            </button>
          </div>

          {/* NOVO BLOCO: Gráfico de Evolução! */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Evolução de Peso</h3>
            
            <div className="h-48 w-full mt-4">
              {historicoPeso.length < 2 ? (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-xs text-gray-500 text-center px-4">Edite o peso do paciente para começar a ver a evolução aqui.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicoPeso}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dx={-10} width={30} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Line type="monotone" dataKey="peso" stroke="#059669" strokeWidth={3} dot={{r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6, fill: '#059669'}} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* BLOCO: Exames */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Exames e Anexos</h3>
            
            {/* NOVO BOTÃO ADICIONADO AQUI */}
            <button 
              onClick={() => router.push(`/dashboard/pacientes/${id}/analise-exames`)}
              className="w-full mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 py-3 rounded-xl font-bold transition-all flex justify-center items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>🔬 Inserir e Analisar Resultados</span>
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">IA ✨</span>
            </button>
            
            <div className="mb-6">
              <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center p-4 rounded-xl transition-colors">
                <span className="text-sm text-emerald-600 font-semibold">{uploading ? "Enviando..." : "+ Anexar PDF ou Imagem"}</span>
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleUploadExame} disabled={uploading} />
              </label>
            </div>
            <div className="space-y-3">
              {exames.length === 0 ? <p className="text-sm text-gray-500 text-center">Nenhum exame anexado.</p> : exames.map((exame) => (
                  <div key={exame.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                    <span className="text-sm text-gray-700 truncate w-3/4" title={exame.nome_arquivo}>📄 {exame.nome_arquivo}</span>
                    <a href={exame.url_arquivo} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-bold hover:underline">Abrir</a>
                  </div>
              ))}
            </div>
          </div>

        </div>

        {/* Lado Direito (Histórico) */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Histórico e Anotações</h3>
          
          <div className="mb-8">
            <textarea value={novaAnotacao} onChange={(e) => setNovaAnotacao(e.target.value)} placeholder="Digite aqui como foi a consulta, queixas do paciente, metas..." className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none resize-none h-24 mb-3"></textarea>
            <div className="flex justify-end">
              <button onClick={handleSalvarAnotacao} disabled={salvandoNota || !novaAnotacao.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-xl transition duration-300 shadow-sm disabled:opacity-50">
                {salvandoNota ? "Salvando..." : "+ Salvar Anotação"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {anotacoes.length === 0 ? <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">Ainda não há anotações para este paciente.</div> : anotacoes.map((nota) => (
                <div key={nota.id} className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-emerald-700">Consulta</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(nota.data_criacao).toLocaleDateString('pt-BR')} às {new Date(nota.data_criacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <button onClick={() => handleExcluirAnotacao(nota.id)} className="text-red-400 hover:text-red-600 text-xs font-semibold transition-colors">Excluir</button>
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{nota.texto}</p>
                </div>
            ))}
          </div>
        </div>

      </div>

      {/* Botão Flutuante do Copiloto IA */}
      {!copilotoAberto && (
        <button
          onClick={() => setCopilotoAberto(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-3.5 rounded-full font-bold shadow-2xl border-2 border-white transition-all transform hover:scale-105 flex items-center gap-2.5 group cursor-pointer"
          title="Abrir Copiloto Nutricional IA"
        >
          <span className="text-xl animate-pulse">✨</span>
          <span className="text-sm font-semibold">Copiloto IA</span>
          <span className="hidden sm:inline-block text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Clínico</span>
        </button>
      )}

      {/* Drawer / Chat Lateral do Copiloto IA */}
      {copilotoAberto && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setCopilotoAberto(false)} 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-full sm:max-w-md md:max-w-lg bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
              
              {/* Header do Copiloto */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-xl shadow-inner shrink-0">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                      Copiloto NutriOne
                      <span className="bg-emerald-400/30 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">IA Ativa</span>
                    </h3>
                    <p className="text-xs text-emerald-100 truncate max-w-[220px] sm:max-w-xs">
                      Paciente: {paciente.perfis.nome_completo}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCopilotoAberto(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
                  title="Fechar Copiloto"
                >
                  ✕
                </button>
              </div>

              {/* Faixa com Resumo Rápido do Contexto Carregado */}
              <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  <span className="font-semibold text-emerald-900 shrink-0">Contexto:</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0">IMC {imc}</span>
                  {ultimaAnamnese ? (
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[150px] shrink-0">
                      🎯 {ultimaAnamnese.objetivo_principal || "Anamnese OK"}
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 shrink-0">Sem Anamnese</span>
                  )}
                  {ultimosExamesLab ? (
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0">🔬 Exames OK</span>
                  ) : null}
                </div>
              </div>

              {/* Área de Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gray-50/50">
                {/* Mensagem Inicial de Boas-vindas */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold shadow-xs">
                    ✨
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm text-sm text-gray-800 space-y-2 max-w-[90%]">
                    <p className="font-semibold text-emerald-800">
                      Olá, nutri! Sou seu copiloto clínico.
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      Já analisei o prontuário de <strong>{paciente.perfis.nome_completo}</strong>{ultimaAnamnese ? ", incluindo a anamnese nutricional" : ""}{ultimosExamesLab ? " e os exames de sangue" : ""}.
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      Como posso ajudar a otimizar a conduta dietoterápica hoje?
                    </p>
                  </div>
                </div>

                {/* Sugestões Rápidas (Chips de Pergunta) */}
                {mensagensCopiloto.length === 0 && (
                  <div className="pl-11 space-y-2 pt-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Perguntas Rápidas:</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleEnviarCopiloto(
                          ultimaAnamnese?.objetivo_principal 
                            ? `Quais estratégias dietoterápicas baseadas em evidências você sugere para atingir o objetivo: "${ultimaAnamnese.objetivo_principal}"?`
                            : "Sugira 3 condutas dietoterápicas prioritárias para este paciente com base no peso e IMC."
                        )}
                        className="text-left text-xs bg-white hover:bg-emerald-50 hover:border-emerald-300 text-gray-700 hover:text-emerald-800 p-2.5 rounded-xl border border-gray-200 transition-all shadow-2xs cursor-pointer"
                      >
                        🎯 {ultimaAnamnese?.objetivo_principal ? `Estratégia para ${ultimaAnamnese.objetivo_principal}` : "Conduta prioritária para o objetivo"}
                      </button>

                      <button
                        onClick={() => handleEnviarCopiloto(
                          "Sugira 3 opções de substituições inteligentes e sacietogênicas para o café da manhã ou lanches considerando a rotina do paciente."
                        )}
                        className="text-left text-xs bg-white hover:bg-emerald-50 hover:border-emerald-300 text-gray-700 hover:text-emerald-800 p-2.5 rounded-xl border border-gray-200 transition-all shadow-2xs cursor-pointer"
                      >
                        🥑 Substituições inteligentes para café/lanche
                      </button>

                      {ultimosExamesLab && (
                        <button
                          onClick={() => handleEnviarCopiloto(
                            "Com base nos exames laboratoriais registrados, quais nutrientes ou ajustes na dieta devo priorizar?"
                          )}
                          className="text-left text-xs bg-white hover:bg-emerald-50 hover:border-emerald-300 text-gray-700 hover:text-emerald-800 p-2.5 rounded-xl border border-gray-200 transition-all shadow-2xs cursor-pointer"
                        >
                          🔬 Conduta dietética com base nos exames laboratoriais
                        </button>
                      )}

                      {ultimaAnamnese?.alergias_intolerancias && (
                        <button
                          onClick={() => handleEnviarCopiloto(
                            `Como contornar as alergias/intolerâncias (${ultimaAnamnese.alergias_intolerancias}) garantindo o aporte nutricional adequado?`
                          )}
                          className="text-left text-xs bg-white hover:bg-emerald-50 hover:border-emerald-300 text-gray-700 hover:text-emerald-800 p-2.5 rounded-xl border border-gray-200 transition-all shadow-2xs cursor-pointer"
                        >
                          ⚠️ Manejo nutricional das alergias / intolerâncias
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Histórico da Conversa */}
                {mensagensCopiloto.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-xs ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {msg.role === "user" ? "Você" : "✨"}
                    </div>
                    <div
                      className={`p-4 rounded-2xl text-sm max-w-[85%] sm:max-w-[80%] shadow-sm ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white rounded-tr-none whitespace-pre-wrap leading-relaxed"
                          : "bg-white text-gray-800 rounded-tl-none border border-gray-100 whitespace-pre-wrap leading-relaxed"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* Carregando Resposta */}
                {carregandoCopiloto && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold shadow-xs">
                      ✨
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                      <span className="text-xs font-medium text-emerald-800">Copiloto formulando resposta clínica...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input e Envio */}
              <div className="p-4 bg-white border-t border-gray-200 shadow-inner shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEnviarCopiloto();
                  }}
                  className="flex gap-2 items-center"
                >
                  <input
                    type="text"
                    value={inputCopiloto}
                    onChange={(e) => setInputCopiloto(e.target.value)}
                    placeholder="Pergunte ao copiloto nutricional..."
                    disabled={carregandoCopiloto}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 outline-none text-sm disabled:bg-gray-100 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={carregandoCopiloto || !inputCopiloto.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 sm:px-5 py-3 rounded-xl transition-all shadow-md disabled:opacity-40 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Enviar</span>
                    <span>➤</span>
                  </button>
                </form>
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  NutriOne IA • Assistente para apoio à decisão clínica. Sempre valide as condutas.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}