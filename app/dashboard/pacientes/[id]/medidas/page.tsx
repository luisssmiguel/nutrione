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
  const alturaM = (paciente?.altura_cm || 0) / 100;
  const imc = alturaM > 0 ? pesoNum / (alturaM * alturaM) : 0;
  
  let idade = 0;
  if (paciente?.data_nascimento) {
    const hoje = new Date();
    const nasc = new Date(paciente.data_nascimento);
    idade = hoje.getFullYear() - nasc.getFullYear();
  }

  let calcGordura = 0;
  let calcMusculo = 0;
  if (imc > 0 && idade > 0) {
    calcGordura = (1.20 * imc) + (0.23 * idade) - 10.8;
    if (calcGordura < 5) calcGordura = 5;
    if (calcGordura > 60) calcGordura = 60;
    
    const massaLivre = pesoNum - (pesoNum * (calcGordura / 100));
    calcMusculo = massaLivre * 0.45;
  }

  const cinturaNum = parseFloat(circCintura.toString().replace(',', '.')) || 0;
  let calcVisceral = 0;
  if (cinturaNum > 0) {
    calcVisceral = Math.max(1, (cinturaNum / 10) - 2);
  }

  const handleSalvarMedidas = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const parseNum = (val: string | number) => val ? parseFloat(val.toString().replace(',', '.')) : null;

    let finalPeso = parseNum(peso) || paciente.peso_kg;
    let finalGordura = parseNum(percentualGordura);
    let finalMusculo = parseNum(massaMuscular);
    let finalVisceral = parseNum(gorduraVisceral);

    // Usa o cálculo ao vivo se o campo estiver vazio na hora de salvar
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
    <div className="p-8 md:p-12 max-w-6xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/dashboard/pacientes/${id}`)} 
            className="text-gray-500 hover:text-emerald-700 bg-white p-2 rounded-lg shadow-sm border border-gray-200 transition-colors"
          >
            ← Voltar
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Avaliação Antropométrica</h1>
            <p className="text-emerald-600 font-medium mt-1">
              Paciente: <span className="text-gray-600">{paciente?.perfis?.nome_completo || "Carregando..."}</span>
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (mostrarFormulario) limparFormulario();
            setMostrarFormulario(!mostrarFormulario);
          }}
          className={`px-6 py-3 rounded-xl font-semibold shadow-sm transition-colors ${mostrarFormulario ? "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
        >
          {mostrarFormulario ? "Cancelar" : "+ Nova Avaliação"}
        </button>
      </div>

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
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-bold bg-emerald-100/50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
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
                <button type="button" onClick={() => { setMostrarFormulario(false); limparFormulario(); }} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-bold py-3 px-6 rounded-xl transition duration-300">
                  Cancelar Edição
                </button>
              )}
              <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition duration-300 shadow-md disabled:opacity-50">
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
                      className="text-amber-500 hover:text-amber-700 font-semibold text-sm transition-colors"
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => handleExcluirMedida(medida.id)} 
                      className="text-red-400 hover:text-red-600 font-semibold text-sm transition-colors"
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