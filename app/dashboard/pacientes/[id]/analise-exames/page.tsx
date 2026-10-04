"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../../../lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

// ==========================================
// CÉREBRO 2.0 (Com faixa Intermediária/Atenção)
// ==========================================
const dicionarioExames: any = {
  glicemia: {
    nome: "Glicemia em Jejum", unidade: "mg/dL", 
    min: 70, min_ideal: 70, max_ideal: 85, max: 99,
    baixo: "Hipoglicemia. Pode causar fraqueza e tremores.",
    normal: "Glicemia em nível ótimo e seguro.",
    intermediario: "Alerta para resistência à insulina. Já exige controle de carboidratos simples.",
    alto: "Pré-diabetes ou diabetes. Risco metabólico alto."
  },
  insulina: {
    nome: "Insulina Basal", unidade: "µU/mL", 
    min: 2, min_ideal: 2, max_ideal: 6, max: 15,
    baixo: "Pode indicar falência na produção pancreática.",
    normal: "Sensibilidade à insulina excelente.",
    intermediario: "Início de resistência à insulina. Pâncreas trabalhando mais que o normal.",
    alto: "Hiperinsulinemia severa. Alto risco de síndrome metabólica."
  },
  colesterol_total: {
    nome: "Colesterol Total", unidade: "mg/dL", 
    min: 0, min_ideal: 0, max_ideal: 190, max: 240,
    baixo: "Níveis extremamente baixos podem estar associados à desnutrição.",
    normal: "Nível seguro para risco cardiovascular.",
    intermediario: "Limítrofe. Requer ajuste no consumo de gorduras saturadas e estilo de vida.",
    alto: "Risco cardiovascular elevado."
  },
  hdl: {
    nome: "HDL (Colesterol Bom)", unidade: "mg/dL", 
    min: 40, min_ideal: 50, max_ideal: 999, max: 999, 
    baixo: "Risco cardiovascular aumentado. Associado a sedentarismo e dieta pobre.",
    normal: "Excelente efeito protetor para o coração e vasos.",
    intermediario: "Nível aceitável, mas pode ser otimizado com exercícios físicos e ômega-3.",
    alto: "Nível protetor excelente."
  },
  ldl: {
    nome: "LDL (Colesterol Ruim)", unidade: "mg/dL", 
    min: 0, min_ideal: 0, max_ideal: 100, max: 159,
    baixo: "Níveis ótimos e seguros.",
    normal: "Dentro da margem de proteção e saúde vascular.",
    intermediario: "Limítrofe alto. Atenção ao consumo de ultraprocessados e poucas fibras.",
    alto: "Alto risco de formação de placas de gordura (aterosclerose) e infarto."
  },
  triglicerideos: {
    nome: "Triglicerídeos", unidade: "mg/dL", 
    min: 0, min_ideal: 0, max_ideal: 100, max: 150,
    baixo: "Geralmente indica boa oxidação de gorduras.",
    normal: "Excelente controle metabólico.",
    intermediario: "Alerta inicial. Geralmente associado ao excesso de carboidratos, doces ou álcool.",
    alto: "Risco aumentado de esteatose hepática (gordura no fígado)."
  },
  tsh: {
    nome: "TSH (Horm. Tireoide)", unidade: "µUI/mL", 
    min: 0.4, min_ideal: 0.4, max_ideal: 2.5, max: 4.5,
    baixo: "Possível hipertireoidismo. Tireoide muito acelerada.",
    normal: "Funcionamento tireoidiano ótimo.",
    intermediario: "Hipotireoidismo subclínico ou fadiga. Metabolismo começando a desacelerar.",
    alto: "Hipotireoidismo primário evidente. Tendência a ganho de peso e cansaço."
  },
  t3_livre: {
    nome: "T3 Livre", unidade: "pg/mL", 
    min: 2.0, min_ideal: 2.8, max_ideal: 4.0, max: 4.4,
    baixo: "Baixa conversão de hormônios. Comum em dietas muito restritas.",
    normal: "Conversão hormonal tireoidiana e metabolismo em boa fase.",
    intermediario: "Aceitável, mas pode ser melhorado com ajuste de selênio e zinco.",
    alto: "Aceleração metabólica intensa (Hipertireoidismo)."
  },
  t4_livre: {
    nome: "T4 Livre", unidade: "ng/dL", 
    min: 0.9, min_ideal: 1.1, max_ideal: 1.4, max: 1.7,
    baixo: "Produção insuficiente pela glândula tireoide.",
    normal: "Produção adequada.",
    intermediario: "Nível aceitável, requer monitoramento junto com o T3.",
    alto: "Excesso de hormônio tireoidiano ativo."
  },
  hemoglobina: {
    nome: "Hemoglobina", unidade: "g/dL", 
    min: 12, min_ideal: 13, max_ideal: 15, max: 16,
    baixo: "Quadro de Anemia (geralmente deficiência de Ferro ou B12).",
    normal: "Oxigenação sanguínea perfeita.",
    intermediario: "Limítrofe inferior. Possível início de deficiência de ferro (verificar ferritina).",
    alto: "Possível desidratação severa ou policitemia."
  },
  leucocitos: {
    nome: "Leucócitos", unidade: "/mm³", 
    min: 4000, min_ideal: 5000, max_ideal: 8000, max: 11000,
    baixo: "Leucopenia. Sistema imunológico deprimido.",
    normal: "Imunidade em bom estado.",
    intermediario: "Aceitável, mas monitorar possível estresse ou leve quadro inflamatório.",
    alto: "Leucocitose. Indica provável infecção ativa ou forte inflamação sistêmica."
  }
};

export default function AnaliseExamesPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [paciente, setPaciente] = useState<any>(null);
  const [historicoExames, setHistoricoExames] = useState<any[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // NOVO: Estado para saber se estamos editando um exame
  const [exameEmEdicao, setExameEmEdicao] = useState<string | null>(null);

  const [dataExame, setDataExame] = useState(new Date().toISOString().split('T')[0]);
  const [valores, setValores] = useState<any>({
    glicemia: "", insulina: "", colesterol_total: "", hdl: "", ldl: "", triglicerideos: "",
    tsh: "", t3_livre: "", t4_livre: "", hemoglobina: "", leucocitos: ""
  });
  // NOVO: Estados da IA para Leitura de Laudo
  const [modalIaAberto, setModalIaAberto] = useState(false);
  const [modoEntradaIa, setModoEntradaIa] = useState<"texto" | "arquivo">("texto");
  const [textoLaudo, setTextoLaudo] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [carregandoIa, setCarregandoIa] = useState(false);
  const [resumoIa, setResumoIa] = useState<string | null>(null);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProcessarIa = async () => {
    if (modoEntradaIa === "texto" && !textoLaudo.trim()) {
      alert("Por favor, cole o texto do laudo.");
      return;
    }
    if (modoEntradaIa === "arquivo" && !arquivoSelecionado) {
      alert("Por favor, selecione uma foto ou PDF do laudo.");
      return;
    }

    setCarregandoIa(true);
    try {
      let body: any = {};
      if (modoEntradaIa === "texto") {
        body.texto = textoLaudo;
      } else if (arquivoSelecionado) {
        const base64 = await convertFileToBase64(arquivoSelecionado);
        let mime = arquivoSelecionado.type;
        if (!mime || mime === "application/octet-stream") {
          const nomeMinusculo = arquivoSelecionado.name.toLowerCase();
          if (nomeMinusculo.endsWith(".pdf")) mime = "application/pdf";
          else if (nomeMinusculo.endsWith(".png")) mime = "image/png";
          else if (nomeMinusculo.endsWith(".jpg") || nomeMinusculo.endsWith(".jpeg")) mime = "image/jpeg";
          else if (nomeMinusculo.endsWith(".webp")) mime = "image/webp";
          else mime = "application/pdf";
        }
        body.arquivoBase64 = base64;
        body.mimeType = mime;
        body.arquivo = { base64, mimeType: mime };
      }

      const res = await fetch("/api/ai/exames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar laudo.");
      }

      if (data.exames) {
        const novosValores: any = { ...valores };
        let countPreenchidos = 0;
        for (const [campo, val] of Object.entries(data.exames)) {
          if (val !== null && val !== undefined && campo in dicionarioExames) {
            novosValores[campo] = val.toString();
            countPreenchidos++;
          }
        }
        setValores(novosValores);
        if (data.resumo) setResumoIa(data.resumo);
        setModalIaAberto(false);
        setTextoLaudo("");
        setArquivoSelecionado(null);
        alert(`✨ Sucesso! A IA identificou e preencheu ${countPreenchidos} exames automaticamente.`);
      }
    } catch (err: any) {
      alert("Falha na leitura do laudo com IA: " + err.message);
    } finally {
      setCarregandoIa(false);
    }
  };

  const carregarDados = async () => {
    const { data: dataPacientes } = await supabase.from("pacientes").select(`id, perfis (nome_completo)`).eq("id", id).single();
    if (dataPacientes) setPaciente(dataPacientes);

    const { data: dataExames } = await supabase.from("exames_laboratoriais").select("*").eq("paciente_id", id).order("data_exame", { ascending: false });
    if (dataExames) setHistoricoExames(dataExames);
  };

  useEffect(() => { carregarDados(); }, [id]);

  const handleInputChange = (campo: string, valor: string) => {
    setValores({ ...valores, [campo]: valor });
  };

  // NOVO: Limpa o form e reseta a edição
  const limparFormulario = () => {
    setExameEmEdicao(null);
    setDataExame(new Date().toISOString().split('T')[0]);
    setValores({ glicemia: "", insulina: "", colesterol_total: "", hdl: "", ldl: "", triglicerideos: "", tsh: "", t3_livre: "", t4_livre: "", hemoglobina: "", leucocitos: "" });
  };

  // NOVO: Abre os dados antigos no formulário
  const handleEditarClique = (exame: any) => {
    setExameEmEdicao(exame.id);
    setDataExame(exame.data_exame);
    setValores({
      glicemia: exame.glicemia ? exame.glicemia.toString() : "",
      insulina: exame.insulina ? exame.insulina.toString() : "",
      colesterol_total: exame.colesterol_total ? exame.colesterol_total.toString() : "",
      hdl: exame.hdl ? exame.hdl.toString() : "",
      ldl: exame.ldl ? exame.ldl.toString() : "",
      triglicerideos: exame.triglicerideos ? exame.triglicerideos.toString() : "",
      tsh: exame.tsh ? exame.tsh.toString() : "",
      t3_livre: exame.t3_livre ? exame.t3_livre.toString() : "",
      t4_livre: exame.t4_livre ? exame.t4_livre.toString() : "",
      hemoglobina: exame.hemoglobina ? exame.hemoglobina.toString() : "",
      leucocitos: exame.leucocitos ? exame.leucocitos.toString() : ""
    });
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // NOVO: Função para Excluir
  const handleExcluirExame = async (idExame: string) => {
    if (window.confirm("Deseja realmente excluir esta análise de exame?")) {
      await supabase.from("exames_laboratoriais").delete().eq("id", idExame);
      carregarDados();
    }
  };

  const handleSalvarExames = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const parseNum = (val: string) => val ? parseFloat(val.replace(',', '.')) : null;

    const payload = {
      paciente_id: id, nutricionista_id: user?.id, data_exame: dataExame,
      glicemia: parseNum(valores.glicemia), insulina: parseNum(valores.insulina),
      colesterol_total: parseNum(valores.colesterol_total), hdl: parseNum(valores.hdl),
      ldl: parseNum(valores.ldl), triglicerideos: parseNum(valores.triglicerideos),
      tsh: parseNum(valores.tsh), t3_livre: parseNum(valores.t3_livre),
      t4_livre: parseNum(valores.t4_livre), hemoglobina: parseNum(valores.hemoglobina),
      leucocitos: parseNum(valores.leucocitos)
    };

    let error;

    // NOVO: Verifica se vai atualizar ou criar novo
    if (exameEmEdicao) {
      const { error: updateError } = await supabase.from("exames_laboratoriais").update(payload).eq("id", exameEmEdicao);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("exames_laboratoriais").insert(payload);
      error = insertError;
    }

    if (error) alert("Erro: " + error.message);
    else {
      setMostrarFormulario(false);
      limparFormulario();
      carregarDados();
    }
    setLoading(false);
  };

  const analisarResultado = (campo: string, valor: number | null) => {
    if (valor === null) return null;
    const ref = dicionarioExames[campo];
    if (!ref) return null;

    if (valor > ref.max) return { status: "ALTO", cor: "bg-red-100 text-red-700 border-red-200", icone: "🔺", texto: ref.alto };
    if (valor < ref.min) return { status: "BAIXO", cor: "bg-blue-100 text-blue-700 border-blue-200", icone: "🧊", texto: ref.baixo };
    if (valor > ref.max_ideal || valor < ref.min_ideal) return { status: "ATENÇÃO", cor: "bg-amber-100 text-amber-700 border-amber-200", icone: "⚠️", texto: ref.intermediario };
    return { status: "IDEAL", cor: "bg-emerald-100 text-emerald-700 border-emerald-200", icone: "✅", texto: ref.normal };
  };

  const formatarData = (dataSql: string) => {
    const [ano, mes, dia] = dataSql.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-6xl mx-auto">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/dashboard/pacientes/${id}`)} className="text-gray-500 hover:text-emerald-700 bg-white p-2 rounded-lg shadow-sm border border-gray-200 transition-colors">← Voltar</button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Análise de Exames</h1>
            <p className="text-emerald-600 font-medium mt-1 text-sm sm:text-base">
              Paciente: <span className="text-gray-600">{paciente?.perfis?.nome_completo || "Carregando..."}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            if (mostrarFormulario) limparFormulario();
            setMostrarFormulario(!mostrarFormulario);
          }} 
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold shadow-sm transition-colors text-center ${mostrarFormulario ? "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
        >
          {mostrarFormulario ? "Cancelar Lançamento" : "+ Lançar Novo Exame"}
        </button>
      </div>

      {mostrarFormulario ? (
        
        <div className={`bg-white p-5 sm:p-8 rounded-2xl shadow-sm border mb-8 animate-in fade-in slide-in-from-top-4 transition-colors ${exameEmEdicao ? "border-amber-200 bg-amber-50/30" : "border-gray-100"}`}>
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {exameEmEdicao ? "✏️ Editando Exame" : "Digitar Valores do Exame"}
            </h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-100 hidden md:inline-block">
              O sistema possui 4 níveis de alerta: Ideal, Atenção, Alto e Baixo.
            </span>
          </div>

          {/* BANNER DO LEITOR DE EXAMES COM IA */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-5 sm:p-6 text-white mb-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <h3 className="font-bold text-lg">Leitor Inteligente de Laudos (IA)</h3>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Gemini 3.8 Flash</span>
              </div>
              <p className="text-xs text-emerald-100 mt-1.5 max-w-xl leading-relaxed">
                Envie uma foto/PDF do laudo do laboratório ou cole o texto do exame. A IA extrai e preenche todos os valores automaticamente para você!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalIaAberto(true)}
              className="bg-white hover:bg-emerald-50 text-emerald-900 font-bold px-6 py-3 rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5 text-sm flex items-center justify-center gap-2 self-stretch sm:self-auto shrink-0"
            >
              <span>🪄</span> Ler Laudo com IA
            </button>
          </div>

          {/* SÍNTESE CLÍNICA GERADA PELA IA */}
          {resumoIa && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-sm mb-6 flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">Síntese Clínica da IA (Gemini):</span>
                  <button type="button" onClick={() => setResumoIa(null)} className="text-emerald-500 hover:text-emerald-700 text-xs">✕ Ocultar</button>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-emerald-900 leading-relaxed font-medium">{resumoIa}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSalvarExames} className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Data da Coleta do Sangue</label>
              <input type="date" value={dataExame} onChange={(e) => setDataExame(e.target.value)} required className="px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none w-full md:w-1/3 bg-white" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-white md:bg-gray-50 p-0 md:p-5 rounded-2xl md:border border-gray-200">
                <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">🩸 Perfil Glicêmico</h3>
                <div className="space-y-3">
                  {['glicemia', 'insulina'].map(campo => (
                    <div key={campo}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{dicionarioExames[campo].nome} <span className="text-gray-400 font-normal">({dicionarioExames[campo].unidade})</span></label>
                      <input type="number" step="0.01" value={valores[campo]} onChange={(e) => handleInputChange(campo, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" placeholder={`Ótimo: ${dicionarioExames[campo].min_ideal}-${dicionarioExames[campo].max_ideal}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white md:bg-gray-50 p-0 md:p-5 rounded-2xl md:border border-gray-200">
                <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">🫀 Perfil Lipídico</h3>
                <div className="space-y-3">
                  {['colesterol_total', 'hdl', 'ldl', 'triglicerideos'].map(campo => (
                    <div key={campo}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{dicionarioExames[campo].nome} <span className="text-gray-400 font-normal">({dicionarioExames[campo].unidade})</span></label>
                      <input type="number" step="0.01" value={valores[campo]} onChange={(e) => handleInputChange(campo, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" placeholder={campo === 'hdl' ? `Ótimo: > ${dicionarioExames[campo].min_ideal}` : `Ótimo: < ${dicionarioExames[campo].max_ideal}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white md:bg-gray-50 p-0 md:p-5 rounded-2xl md:border border-gray-200 space-y-6">
                <div>
                  <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">🦋 Tireoide & Sangue</h3>
                  <div className="space-y-3">
                    {['tsh', 't3_livre', 't4_livre', 'hemoglobina'].map(campo => (
                      <div key={campo}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{dicionarioExames[campo].nome} <span className="text-gray-400 font-normal">({dicionarioExames[campo].unidade})</span></label>
                        <input type="number" step="0.01" value={valores[campo]} onChange={(e) => handleInputChange(campo, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" placeholder={`Ótimo: ${dicionarioExames[campo].min_ideal}-${dicionarioExames[campo].max_ideal}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-4 gap-3">
              {exameEmEdicao && (
                <button type="button" onClick={() => { setMostrarFormulario(false); limparFormulario(); }} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-bold py-3 px-6 rounded-xl transition duration-300">
                  Cancelar Edição
                </button>
              )}
              <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition duration-300 shadow-md disabled:opacity-50">
                {loading ? "Salvando..." : exameEmEdicao ? "Atualizar Exames" : "Salvar e Analisar Resultados"}
              </button>
            </div>
          </form>
        </div>

      ) : (

        <div className="space-y-6">
          {historicoExames.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-dashed border-gray-200">
              <p className="text-gray-500 text-lg font-medium">Nenhum exame lançado ainda.</p>
              <p className="text-gray-400 mt-2">Clique no botão verde acima para lançar os dados do exame de sangue.</p>
            </div>
          ) : (
            historicoExames.map((exame, index) => (
              <div key={exame.id} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500"></div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-6 pl-4 border-b border-gray-50 pb-4 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Exames Coletados em {formatarData(exame.data_exame)}
                    </h3>
                    {index === 0 && <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">EXAME MAIS RECENTE</span>}
                  </div>
                  
                  {/* NOVO: Botões de Editar e Excluir */}
                  <div className="flex gap-4 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditarClique(exame)} 
                      className="text-amber-500 hover:text-amber-700 font-semibold text-sm transition-colors"
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => handleExcluirExame(exame.id)} 
                      className="text-red-400 hover:text-red-600 font-semibold text-sm transition-colors"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>

                <div className="pl-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {Object.keys(dicionarioExames).map((campo) => {
                    const valor = exame[campo];
                    if (valor === null || valor === undefined) return null; 
                    
                    const analise = analisarResultado(campo, valor);
                    if (!analise) return null;

                    return (
                      <div key={campo} className={`rounded-xl p-4 border relative transition-all hover:shadow-md ${analise.cor.replace('text-', 'border-').split(' ')[2]} bg-white shadow-sm`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-gray-700">{dicionarioExames[campo].nome}</span>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${analise.cor}`}>
                            {analise.icone} {analise.status}
                          </span>
                        </div>
                        
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-2xl font-black text-gray-900">{valor}</span>
                          <span className="text-xs text-gray-500 font-medium">{dicionarioExames[campo].unidade}</span>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-600 leading-relaxed">
                          <span className="font-semibold block mb-1">Análise Clínica:</span>
                          {analise.texto}
                        </div>
                        
                        <div className="mt-2 text-[10px] text-gray-400 text-right">
                          Ideal: {dicionarioExames[campo].min_ideal} a {dicionarioExames[campo].max_ideal} {dicionarioExames[campo].unidade}
                        </div>
                      </div>
                    );
                  })}

                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DO LEITOR INTELIGENTE COM IA        */}
      {/* ========================================== */}
      {modalIaAberto && (
        <div 
          onClick={() => !carregandoIa && setModalIaAberto(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 animate-in fade-in zoom-in duration-150"
          >
            {/* Topo do Modal */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span>✨</span> Inteligência Artificial (Gemini 3.8 Flash)
                </span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  Leitor Automático de Exames
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  A IA lerá o laudo do paciente e preencherá os campos de resultados sozinha.
                </p>
              </div>
              <button 
                disabled={carregandoIa}
                onClick={() => setModalIaAberto(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-lg disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            {/* Alternador de Abas: Texto vs Arquivo */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setModoEntradaIa("texto")}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  modoEntradaIa === "texto"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                📝 Colar Texto do Exame
              </button>
              <button
                type="button"
                onClick={() => setModoEntradaIa("arquivo")}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  modoEntradaIa === "arquivo"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                📎 Anexar Foto ou PDF
              </button>
            </div>

            {/* Conteúdo da Aba: Texto */}
            {modoEntradaIa === "texto" && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Cole o texto copiado do laudo do laboratório:
                </label>
                <textarea
                  value={textoLaudo}
                  onChange={(e) => setTextoLaudo(e.target.value)}
                  disabled={carregandoIa}
                  rows={8}
                  placeholder="Exemplo:
GLICEMIA EM JEJUM: 88 mg/dL (VR: 70 a 99)
COLESTEROL TOTAL: 195 mg/dL (VR: inferior a 190)
HDL: 55 mg/dL
LDL: 110 mg/dL
TRIGLICERIDEOS: 115 mg/dL
TSH: 2.15 uUI/mL..."
                  className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none text-xs text-gray-800 leading-relaxed resize-none bg-gray-50 font-mono"
                />
              </div>
            )}

            {/* Conteúdo da Aba: Arquivo */}
            {modoEntradaIa === "arquivo" && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Foto ou PDF do exame:
                </label>
                <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-emerald-50/30 transition-all text-center">
                  <span className="text-3xl mb-2">📄</span>
                  <span className="text-sm font-bold text-gray-700">
                    {arquivoSelecionado ? arquivoSelecionado.name : "Clique para selecionar Foto ou PDF"}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    {arquivoSelecionado
                      ? `${(arquivoSelecionado.size / 1024).toFixed(1)} KB selecionados`
                      : "Suporta imagens (.png, .jpg, .webp) ou laudos em .pdf"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    disabled={carregandoIa}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setArquivoSelecionado(f);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={carregandoIa}
                onClick={() => setModalIaAberto(false)}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={carregandoIa}
                onClick={handleProcessarIa}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {carregandoIa ? (
                  <>
                    <span className="animate-spin inline-block">⏳</span> Analisando com IA...
                  </>
                ) : (
                  <>
                    <span>✨</span> Extrair Dados com IA
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}