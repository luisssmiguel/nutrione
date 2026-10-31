"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../../../lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

export default function MedidasPacientePage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [paciente, setPaciente] = useState<any>(null);
  const [historicoMedidas, setHistoricoMedidas] = useState<any[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const [medidaEmEdicao, setMedidaEmEdicao] = useState<string | null>(null);

  const [dataAvaliacao, setDataAvaliacao] = useState(new Date().toISOString().split('T')[0]);
  const [peso, setPeso] = useState("");
  const [percentualGordura, setPercentualGordura] = useState("");
  const [massaMuscular, setMassaMuscular] = useState("");
  const [gorduraVisceral, setGorduraVisceral] = useState("");
  
  const [circCintura, setCircCintura] = useState("");
  const [circAbdomen, setCircAbdomen] = useState("");
  const [circQuadril, setCircQuadril] = useState("");
  const [circBraco, setCircBraco] = useState("");
  const [circCoxa, setCircCoxa] = useState("");
  const [circPanturrilha, setCircPanturrilha] = useState("");

  // ==========================================
  // NOVO: ESTADOS DA CALCULADORA DE TMB & GET
  // ==========================================
  const [calculadoraAberta, setCalculadoraAberta] = useState(true);
  const [sexoBio, setSexoBio] = useState<"F" | "M">("F");
  const [formulaTmb, setFormulaTmb] = useState<"mifflin" | "harris">("mifflin");
  const [fatorAtividade, setFatorAtividade] = useState<number>(1.375);
  const [estrategiaObjetivo, setEstrategiaObjetivo] = useState<"emagrecimento" | "manutencao" | "hipertrofia">("emagrecimento");
  const [ajusteCaloricoCustom, setAjusteCaloricoCustom] = useState<number>(-400);
  const [proteinaGKg, setProteinaGKg] = useState<number>(2.0);
  const [gorduraGKg, setGorduraGKg] = useState<number>(0.9);
  const [copiadoCalculadora, setCopiadoCalculadora] = useState(false);

  const carregarDados = async () => {
    const { data: dataPacientes } = await supabase
      .from("pacientes")
      .select(`id, peso_kg, altura_cm, data_nascimento, perfis (nome_completo)`)
      .eq("id", id)
      .single();
    
    if (dataPacientes) {
      setPaciente(dataPacientes);
      if (dataPacientes.peso_kg && !medidaEmEdicao && !mostrarFormulario) {
        setPeso(dataPacientes.peso_kg.toString());
      }
    }

    const { data: dataMedidas } = await supabase
      .from("medidas_paciente")
      .select("*")
      .eq("paciente_id", id)
      .order("data_avaliacao", { ascending: false });

    if (dataMedidas) setHistoricoMedidas(dataMedidas);
  };

  useEffect(() => {
    carregarDados();
  }, [id]);

  const limparFormulario = () => {
    setMedidaEmEdicao(null);
    setDataAvaliacao(new Date().toISOString().split('T')[0]);
    setPercentualGordura(""); setMassaMuscular(""); setGorduraVisceral("");
    setCircCintura(""); setCircAbdomen(""); setCircQuadril(""); setCircBraco(""); setCircCoxa(""); setCircPanturrilha("");
    if (paciente?.peso_kg) setPeso(paciente.peso_kg.toString());
    else setPeso("");
  };

  const handleEditarClique = (medida: any) => {
    setMedidaEmEdicao(medida.id);
    setDataAvaliacao(medida.data_avaliacao);
    setPeso(medida.peso_kg ? medida.peso_kg.toString() : "");
    setPercentualGordura(medida.percentual_gordura ? medida.percentual_gordura.toString() : "");
    setMassaMuscular(medida.massa_muscular_kg ? medida.massa_muscular_kg.toString() : "");
    setGorduraVisceral(medida.gordura_visceral ? medida.gordura_visceral.toString() : "");
    
    setCircCintura(medida.circ_cintura ? medida.circ_cintura.toString() : "");
    setCircAbdomen(medida.circ_abdomen ? medida.circ_abdomen.toString() : "");
    setCircQuadril(medida.circ_quadril ? medida.circ_quadril.toString() : "");
    setCircBraco(medida.circ_braco ? medida.circ_braco.toString() : "");
    setCircCoxa(medida.circ_coxa ? medida.circ_coxa.toString() : "");
    setCircPanturrilha(medida.circ_panturrilha ? medida.circ_panturrilha.toString() : "");
    
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // LÓGICA DE CÁLCULOS AO VIVO (LIVE REACTIVITY)
  // ==========================================
  const pesoNum = parseFloat(peso.toString().replace(',', '.')) || paciente?.peso_kg || 0;
  const alturaCm = paciente?.altura_cm || 170;
  const alturaM = alturaCm / 100;
  const imc = alturaM > 0 ? pesoNum / (alturaM * alturaM) : 0;
  
  let idade = 30;
  if (paciente?.data_nascimento) {
    const hoje = new Date();
    const nasc = new Date(paciente.data_nascimento);
    idade = hoje.getFullYear() - nasc.getFullYear();
    if (hoje.getMonth() - nasc.getMonth() < 0 || (hoje.getMonth() - nasc.getMonth() === 0 && hoje.getDate() < nasc.getDate())) idade--;
  }

  let calcGordura = 0;
  let calcMusculo = 0;
  if (imc > 0 && idade > 0) {
    calcGordura = (1.20 * imc) + (0.23 * idade) - (sexoBio === "M" ? 16.2 : 5.4);
    if (calcGordura < 5) calcGordura = 5;
    if (calcGordura > 60) calcGordura = 60;
    
    const massaLivre = pesoNum - (pesoNum * (calcGordura / 100));
    calcMusculo = massaLivre * 0.45;
  }

  const cinturaNum = parseFloat(circCintura.toString().replace(',', '.')) || 0;
  let calcVisceral = 0;
  if (cinturaNum > 0) {
    calcVisceral = Math.max(1, (cinturaNum / 10) - (sexoBio === "M" ? 2 : 3));
  }

  // ==========================================
  // CÁLCULO CIENTÍFICO DA TMB, GET E MACROS
  // ==========================================
  let tmb = 0;
  if (pesoNum > 0 && alturaCm > 0 && idade > 0) {
    if (formulaTmb === "mifflin") {
      // Mifflin-St Jeor (Padrão Ouro ADA)
      if (sexoBio === "M") {
        tmb = (10 * pesoNum) + (6.25 * alturaCm) - (5 * idade) + 5;
      } else {
        tmb = (10 * pesoNum) + (6.25 * alturaCm) - (5 * idade) - 161;
      }
    } else {
      // Harris-Benedict (Revisada)
      if (sexoBio === "M") {
        tmb = 66.5 + (13.75 * pesoNum) + (5.003 * alturaCm) - (6.75 * idade);
      } else {
        tmb = 655.1 + (9.563 * pesoNum) + (1.850 * alturaCm) - (4.676 * idade);
      }
    }
  }

  const get = tmb * fatorAtividade;
  
  let deltaObjetivo = 0;
  if (estrategiaObjetivo === "emagrecimento") deltaObjetivo = ajusteCaloricoCustom < 0 ? ajusteCaloricoCustom : -400;
  else if (estrategiaObjetivo === "hipertrofia") deltaObjetivo = ajusteCaloricoCustom > 0 ? ajusteCaloricoCustom : 350;
  else deltaObjetivo = 0;

  const metaCaloricaTotal = Math.max(1000, Math.round(get + deltaObjetivo));

  // Macronutrientes
  const protG = Math.round(pesoNum * proteinaGKg);
  const protKcal = protG * 4;

  const gordG = Math.round(pesoNum * gorduraGKg);
  const gordKcal = gordG * 9;

  const carbKcal = Math.max(0, metaCaloricaTotal - protKcal - gordKcal);
  const carbG = Math.round(carbKcal / 4);
  const carbGKg = pesoNum > 0 ? (carbG / pesoNum).toFixed(1) : "0";

  const percProt = metaCaloricaTotal > 0 ? Math.round((protKcal / metaCaloricaTotal) * 100) : 0;
  const percGord = metaCaloricaTotal > 0 ? Math.round((gordKcal / metaCaloricaTotal) * 100) : 0;
  const percCarb = Math.max(0, 100 - percProt - percGord);

  const handleCopiarMetas = () => {
    const texto = `📊 *Metas Nutricionais & Gasto Energético - NutriOne*\n` +
      `Paciente: ${paciente?.perfis?.nome_completo || "Paciente"}\n` +
      `• Peso: ${pesoNum} kg | Altura: ${alturaCm} cm | Idade: ${idade} anos\n` +
      `• TMB (${formulaTmb === "mifflin" ? "Mifflin-St Jeor" : "Harris-Benedict"}): ${Math.round(tmb)} kcal\n` +
      `• GET (Gasto Energético Total): ${Math.round(get)} kcal\n` +
      `• Objetivo: ${estrategiaObjetivo === "emagrecimento" ? "Emagrecimento (Déficit)" : estrategiaObjetivo === "hipertrofia" ? "Hipertrofia (Superávit)" : "Manutenção"}\n` +
      `🎯 *Meta Calórica Diária:* ${metaCaloricaTotal} kcal\n\n` +
      `*Divisão de Macronutrientes:*\n` +
      `🍗 Proteínas: ${protG}g (${proteinaGKg}g/kg) - ${percProt}%\n` +
      `🥑 Gorduras: ${gordG}g (${gorduraGKg}g/kg) - ${percGord}%\n` +
      `🍚 Carboidratos: ${carbG}g (${carbGKg}g/kg) - ${percCarb}%\n\n` +
      `_NutriOne Consultoria Nutricional_`;

    navigator.clipboard.writeText(texto);
    setCopiadoCalculadora(true);
    setTimeout(() => setCopiadoCalculadora(false), 2500);
  };

  const handleSalvarMedidas = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const parseNum = (val: string | number) => val ? parseFloat(val.toString().replace(',', '.')) : null;

    let finalPeso = parseNum(peso) || paciente.peso_kg;
    let finalGordura = parseNum(percentualGordura);
    let finalMusculo = parseNum(massaMuscular);
    let finalVisceral = parseNum(gorduraVisceral);

    if (finalGordura === null && calcGordura > 0) finalGordura = parseFloat(calcGordura.toFixed(1));
    if (finalMusculo === null && calcMusculo > 0) finalMusculo = parseFloat(calcMusculo.toFixed(1));
    if (finalVisceral === null && calcVisceral > 0) finalVisceral = parseFloat(calcVisceral.toFixed(1));

    const payload = {
      paciente_id: id,
      nutricionista_id: user?.id,
      data_avaliacao: dataAvaliacao,
      peso_kg: finalPeso,
      percentual_gordura: finalGordura,
      massa_muscular_kg: finalMusculo,
      gordura_visceral: finalVisceral,
      circ_cintura: parseNum(circCintura),
      circ_abdomen: parseNum(circAbdomen),
      circ_quadril: parseNum(circQuadril),
      circ_braco: parseNum(circBraco),
      circ_coxa: parseNum(circCoxa),
      circ_panturrilha: parseNum(circPanturrilha)
    };

    let error;
    if (medidaEmEdicao) {
      const { error: updateError } = await supabase.from("medidas_paciente").update(payload).eq("id", medidaEmEdicao);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("medidas_paciente").insert(payload);
      error = insertError;
    }

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      if (finalPeso !== paciente.peso_kg) {
        await supabase.from("pacientes").update({ peso_kg: finalPeso }).eq("id", id);
      }
      setMostrarFormulario(false);
      limparFormulario();
      carregarDados();
    }
    setLoading(false);
  };

  const handleExcluirMedida = async (idMedida: string) => {
    if (window.confirm("Deseja excluir esta avaliação?")) {
      await supabase.from("medidas_paciente").delete().eq("id", idMedida);
      carregarDados();
    }
  };

  const formatarData = (dataSql: string) => {
    const [ano, mes, dia] = dataSql.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-6xl mx-auto space-y-8">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/dashboard/pacientes/${id}`)} 
            className="text-gray-500 hover:text-emerald-700 bg-white p-2 rounded-lg shadow-sm border border-gray-200 transition-colors cursor-pointer"
          >
            ← Voltar
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Avaliação Antropométrica</h1>
            <p className="text-emerald-600 font-medium mt-1 text-sm sm:text-base">
              Paciente: <span className="text-gray-600">{paciente?.perfis?.nome_completo || "Carregando..."}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setCalculadoraAberta(!calculadoraAberta)}
            className="w-full sm:w-auto px-4 py-3 rounded-xl font-bold text-sm border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>🧮</span> {calculadoraAberta ? "Ocultar TMB & GET" : "Calculadora TMB & GET"}
          </button>

          <button 
            onClick={() => {
              if (mostrarFormulario) limparFormulario();
              setMostrarFormulario(!mostrarFormulario);
            }}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-colors text-center cursor-pointer ${mostrarFormulario ? "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
          >
            {mostrarFormulario ? "Cancelar" : "+ Nova Avaliação"}
          </button>
        </div>
      </div>

      {/* ========================================================
          CARD DA CALCULADORA DE GASTO ENERGÉTICO (TMB & GET)
      ======================================================== */}
      {calculadoraAberta && (
        <div className="bg-gradient-to-br from-white via-white to-emerald-50/40 p-6 sm:p-8 rounded-3xl shadow-sm border border-emerald-100 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>🧮</span> Fórmulas Científicas de Dietoterapia
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">
                Gasto Energético & Metas de Macronutrientes
              </h2>
            </div>
            
            <button
              onClick={handleCopiarMetas}
              className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiadoCalculadora ? "✅ Metas Copiadas!" : "📋 Copiar Metas"}
            </button>
          </div>

          {/* Controles de Configuração da Fórmula */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sexo Biológico */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Sexo Biológico</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSexoBio("F")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    sexoBio === "F" ? "bg-white text-emerald-700 shadow-2xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Feminino ♀
                </button>
                <button
                  type="button"
                  onClick={() => setSexoBio("M")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    sexoBio === "M" ? "bg-white text-emerald-700 shadow-2xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Masculino ♂
                </button>
              </div>
            </div>

            {/* Fórmula de TMB */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Equação Preditiva</label>
              <select
                value={formulaTmb}
                onChange={(e: any) => setFormulaTmb(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none text-xs text-gray-800 bg-white"
              >
                <option value="mifflin">Mifflin-St Jeor (Padrão Ouro ADA)</option>
                <option value="harris">Harris-Benedict (Revisada)</option>
              </select>
            </div>

            {/* Fator de Atividade Física */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Atividade Física (GET)</label>
              <select
                value={fatorAtividade}
                onChange={(e) => setFatorAtividade(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none text-xs text-gray-800 bg-white"
              >
                <option value={1.2}>Sedentário (1.20)</option>
                <option value={1.375}>Leve - 1 a 3x/sem (1.375)</option>
                <option value={1.55}>Moderado - 3 a 5x/sem (1.55)</option>
                <option value={1.725}>Intenso - 6 a 7x/sem (1.725)</option>
                <option value={1.9}>Muito Intenso / Atleta (1.90)</option>
              </select>
            </div>

            {/* Objetivo / Estratégia */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Objetivo Dietoterápico</label>
              <select
                value={estrategiaObjetivo}
                onChange={(e: any) => {
                  const val = e.target.value;
                  setEstrategiaObjetivo(val);
                  if (val === "emagrecimento") setAjusteCaloricoCustom(-400);
                  else if (val === "hipertrofia") setAjusteCaloricoCustom(350);
                  else setAjusteCaloricoCustom(0);
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none text-xs text-gray-800 bg-white"
              >
                <option value="emagrecimento">Emagrecimento (Déficit -400 kcal)</option>
                <option value="manutencao">Manutenção Normocalórica</option>
                <option value="hipertrofia">Hipertrofia (Superávit +350 kcal)</option>
              </select>
            </div>
          </div>

          {/* Cards de Resultados Numéricos ao Vivo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 block mb-1">Taxa Metabólica Basal (TMB)</span>
              <p className="text-3xl font-black text-gray-800">
                {Math.round(tmb)} <span className="text-sm font-normal text-gray-400">kcal/dia</span>
              </p>
              <span className="text-[11px] text-gray-400 mt-1 block">Calorias gastas em repouso absoluto</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 block mb-1">Gasto Energético Total (GET)</span>
              <p className="text-3xl font-black text-emerald-700">
                {Math.round(get)} <span className="text-sm font-normal text-gray-400">kcal/dia</span>
              </p>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                TMB × fator {fatorAtividade}
              </span>
            </div>

            <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-md">
              <span className="text-xs font-semibold text-emerald-100 block mb-1">Meta Calórica Recomendada</span>
              <p className="text-3xl font-black text-white">
                {metaCaloricaTotal} <span className="text-sm font-normal text-emerald-200">kcal/dia</span>
              </p>
              <span className="text-[11px] text-emerald-100 mt-1 block">
                {deltaObjetivo === 0 ? "Manutenção" : `${deltaObjetivo > 0 ? "+" : ""}${deltaObjetivo} kcal de ajuste`}
              </span>
            </div>
          </div>

          {/* Seção de Macronutrientes */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <span>🥗</span> Distribuição Sugerida de Macronutrientes
              </h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <label className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">Proteína:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.5"
                    value={proteinaGKg}
                    onChange={(e) => setProteinaGKg(parseFloat(e.target.value) || 2.0)}
                    className="w-14 px-2 py-1 rounded border border-gray-300 text-center font-bold text-gray-800"
                  />
                  <span>g/kg</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">Gordura:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="2.0"
                    value={gorduraGKg}
                    onChange={(e) => setGorduraGKg(parseFloat(e.target.value) || 0.9)}
                    className="w-14 px-2 py-1 rounded border border-gray-300 text-center font-bold text-gray-800"
                  />
                  <span>g/kg</span>
                </label>
              </div>
            </div>

            {/* Barra de Distribuição Percentual */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100">
              <div style={{ width: `${percProt}%` }} className="bg-blue-500 transition-all" title={`Proteína: ${percProt}%`} />
              <div style={{ width: `${percCarb}%` }} className="bg-amber-500 transition-all" title={`Carboidrato: ${percCarb}%`} />
              <div style={{ width: `${percGord}%` }} className="bg-rose-500 transition-all" title={`Gordura: ${percGord}%`} />
            </div>

            {/* Cards dos 3 Macros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Proteína */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-900">Proteínas ({percProt}%)</span>
                  <span className="text-[11px] text-blue-700 font-semibold">{proteinaGKg} g/kg</span>
                </div>
                <p className="text-2xl font-black text-blue-900">{protG}g</p>
                <span className="text-[11px] text-blue-700 font-medium">{protKcal} kcal</span>
              </div>

              {/* Carboidratos */}
              <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-amber-900">Carboidratos ({percCarb}%)</span>
                  <span className="text-[11px] text-amber-700 font-semibold">{carbGKg} g/kg</span>
                </div>
                <p className="text-2xl font-black text-amber-900">{carbG}g</p>
                <span className="text-[11px] text-amber-700 font-medium">{carbKcal} kcal</span>
              </div>

              {/* Gorduras */}
              <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-rose-900">Gorduras ({percGord}%)</span>
                  <span className="text-[11px] text-rose-700 font-semibold">{gorduraGKg} g/kg</span>
                </div>
                <p className="text-2xl font-black text-rose-900">{gordG}g</p>
                <span className="text-[11px] text-rose-700 font-medium">{gordKcal} kcal</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FORMULÁRIO DE NOVA AVALIAÇÃO / EDIÇÃO
      ======================================================== */}
      {mostrarFormulario ? (
        
        <div className={`bg-white p-8 rounded-2xl shadow-sm border mb-8 animate-in fade-in slide-in-from-top-4 transition-colors ${medidaEmEdicao ? "border-amber-200 bg-amber-50/30" : "border-gray-100"}`}>
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {medidaEmEdicao ? "✏️ Editando Avaliação" : "Cadastrar Novas Medidas"}
            </h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-100 hidden md:inline-block">
              💡 Dica: Apague o valor das caixas para forçar o recálculo automático.
            </span>
          </div>
          
          <form onSubmit={handleSalvarMedidas} className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Data da Avaliação</label>
              <input type="date" value={dataAvaliacao} onChange={(e) => setDataAvaliacao(e.target.value)} required className="px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none w-full md:w-1/3 bg-white" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              
              <div className="space-y-4 bg-white md:bg-gray-50 p-0 md:p-6 rounded-2xl md:border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-emerald-800 flex items-center gap-2">📊 Composição Corporal</h3>
                  <button 
                    type="button" 
                    onClick={() => { setPercentualGordura(""); setMassaMuscular(""); setGorduraVisceral(""); }} 
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-bold bg-emerald-100/50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  >
                    🔄 Forçar Recálculo
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Peso (kg)</label>
                    <input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">% Gordura</label>
                    <input type="number" step="0.1" value={percentualGordura} onChange={(e) => setPercentualGordura(e.target.value)} placeholder={calcGordura ? `Auto: ${calcGordura.toFixed(1)}` : "Calculando..."} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white placeholder-emerald-400 font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Massa Musc.</label>
                    <input type="number" step="0.1" value={massaMuscular} onChange={(e) => setMassaMuscular(e.target.value)} placeholder={calcMusculo ? `Auto: ${calcMusculo.toFixed(1)}` : "Calculando..."} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white placeholder-emerald-400 font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Visceral</label>
                    <input type="number" step="0.1" value={gorduraVisceral} onChange={(e) => setGorduraVisceral(e.target.value)} placeholder={calcVisceral ? `Auto: ${calcVisceral.toFixed(1)}` : "Calculando..."} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white placeholder-emerald-400 font-medium" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-white md:bg-gray-50 p-0 md:p-6 rounded-2xl md:border border-gray-100">
                <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2 h-[30px]">📏 Circunferências (cm)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cintura</label>
                    <input type="number" step="0.1" value={circCintura} onChange={(e) => setCircCintura(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Abdômen</label>
                    <input type="number" step="0.1" value={circAbdomen} onChange={(e) => setCircAbdomen(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Quadril</label>
                    <input type="number" step="0.1" value={circQuadril} onChange={(e) => setCircQuadril(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Braço</label>
                    <input type="number" step="0.1" value={circBraco} onChange={(e) => setCircBraco(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Coxa</label>
                    <input type="number" step="0.1" value={circCoxa} onChange={(e) => setCircCoxa(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Panturrilha</label>
                    <input type="number" step="0.1" value={circPanturrilha} onChange={(e) => setCircPanturrilha(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 bg-white" />
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-4 gap-3">
              {medidaEmEdicao && (
                <button type="button" onClick={() => { setMostrarFormulario(false); limparFormulario(); }} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-bold py-3 px-6 rounded-xl transition duration-300 cursor-pointer">
                  Cancelar Edição
                </button>
              )}
              <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition duration-300 shadow-md disabled:opacity-50 cursor-pointer">
                {loading ? "Salvando..." : medidaEmEdicao ? "Atualizar Avaliação" : "Salvar Avaliação Inteligente"}
              </button>
            </div>
          </form>
        </div>

      ) : (

        <div className="space-y-6">
          {historicoMedidas.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-dashed border-gray-200">
              <p className="text-gray-500 text-lg font-medium">Nenhuma avaliação encontrada.</p>
              <p className="text-gray-400 mt-2">Clique no botão verde acima para registrar a primeira avaliação antropométrica deste paciente.</p>
            </div>
          ) : (
            historicoMedidas.map((medida, index) => (
              <div key={medida.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500"></div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-6 pl-4 border-b border-gray-50 pb-4 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Avaliação de {formatarData(medida.data_avaliacao)}
                    </h3>
                    {index === 0 && <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">ÚLTIMA AVALIAÇÃO</span>}
                  </div>
                  
                  <div className="flex gap-4 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditarClique(medida)} 
                      className="text-amber-500 hover:text-amber-700 font-semibold text-sm transition-colors cursor-pointer"
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => handleExcluirMedida(medida.id)} 
                      className="text-red-400 hover:text-red-600 font-semibold text-sm transition-colors cursor-pointer"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>

                <div className="pl-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Composição Corporal</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-500 font-medium">Peso</span>
                        <p className="font-bold text-gray-800 text-lg">{medida.peso_kg || '--'} <span className="text-xs font-normal text-gray-400">kg</span></p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-500 font-medium">% Gordura</span>
                        <p className="font-bold text-gray-800 text-lg">{medida.percentual_gordura || '--'} <span className="text-xs font-normal text-gray-400">%</span></p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-500 font-medium">Massa Musc.</span>
                        <p className="font-bold text-gray-800 text-lg">{medida.massa_muscular_kg || '--'} <span className="text-xs font-normal text-gray-400">kg</span></p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-500 font-medium">Gord. Visceral</span>
                        <p className="font-bold text-gray-800 text-lg">{medida.gordura_visceral || '--'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Circunferências (cm)</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="border-l-2 border-emerald-100 pl-2">
                        <span className="text-xs text-gray-500 block">Cintura</span>
                        <span className="font-bold text-gray-700">{medida.circ_cintura || '--'}</span>
                      </div>
                      <div className="border-l-2 border-emerald-100 pl-2">
                        <span className="text-xs text-gray-500 block">Abdômen</span>
                        <span className="font-bold text-gray-700">{medida.circ_abdomen || '--'}</span>
                      </div>
                      <div className="border-l-2 border-emerald-100 pl-2">
                        <span className="text-xs text-gray-500 block">Quadril</span>
                        <span className="font-bold text-gray-700">{medida.circ_quadril || '--'}</span>
                      </div>
                      <div className="border-l-2 border-emerald-100 pl-2">
                        <span className="text-xs text-gray-500 block">Braço</span>
                        <span className="font-bold text-gray-700">{medida.circ_braco || '--'}</span>
                      </div>
                      <div className="border-l-2 border-emerald-100 pl-2">
                        <span className="text-xs text-gray-500 block">Coxa</span>
                        <span className="font-bold text-gray-700">{medida.circ_coxa || '--'}</span>
                      </div>
                      <div className="border-l-2 border-emerald-100 pl-2">
                        <span className="text-xs text-gray-500 block">Panturrilha</span>
                        <span className="font-bold text-gray-700">{medida.circ_panturrilha || '--'}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
