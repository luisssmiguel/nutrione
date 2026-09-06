"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function AgendaPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);

  // Dados do banco
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);

  // NOVO: Estado para controlar qual consulta está aberta no Modal/Pop-up
  const [consultaSelecionada, setConsultaSelecionada] = useState<any | null>(null);

  // ==========================================
  // LÓGICA DO CALENDÁRIO
  // ==========================================
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [mesAtual, setMesAtual] = useState(new Date().getMonth());
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiroDiaDoMes = new Date(anoAtual, mesAtual, 1).getDay(); 

  const dias = [];
  for (let i = 0; i < primeiroDiaDoMes; i++) dias.push(null);
  for (let i = 1; i <= diasNoMes; i++) dias.push(i);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const mesAnterior = () => {
    if (mesAtual === 0) { 
      setMesAtual(11); 
      setAnoAtual(anoAtual - 1); 
    } else { 
      setMesAtual(mesAtual - 1); 
    }
  };

  const mesProximo = () => {
    if (mesAtual === 11) { 
      setMesAtual(0); 
      setAnoAtual(anoAtual + 1); 
    } else { 
      setMesAtual(mesAtual + 1); 
    }
  };

  const stringDataSelecionada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dataSelecionada.getDate()).padStart(2, '0')}`;

  const agendamentosDoDia = agendamentos.filter(
    (a) => a.data_consulta === stringDataSelecionada
  );

  // ==========================================
  // ESTADOS DO FORMULÁRIO
  // ==========================================
  const [pacienteId, setPacienteId] = useState("");
  const [horaConsulta, setHoraConsulta] = useState("");
  const [tipoConsulta, setTipoConsulta] = useState("Primeira Consulta");
  const [observacoes, setObservacoes] = useState("");

  const carregarDados = async () => {
    setCarregandoDados(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: dataPacientes } = await supabase
      .from("pacientes")
      .select(`id, perfis(nome_completo)`)
      .eq("nutricionista_id", user.id);

    if (dataPacientes) setPacientes(dataPacientes);

    const { data: dataAgendamentos } = await supabase
      .from("agendamentos")
      .select(`
        id, data_consulta, hora_consulta, tipo_consulta, status, observacoes, paciente_id,
        pacientes ( perfis (nome_completo, email) )
      `)
      .eq("nutricionista_id", user.id)
      .order("hora_consulta", { ascending: true });

    if (dataAgendamentos) setAgendamentos(dataAgendamentos);
    setCarregandoDados(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId) return alert("Selecione um paciente!");

    const horarioOcupado = agendamentosDoDia.some(
      (agenda) => agenda.hora_consulta.substring(0, 5) === horaConsulta
    );

    if (horarioOcupado) {
      alert("Ops! Esse horário já está reservado. Por favor, escolha um horário diferente.");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("agendamentos").insert({
      nutricionista_id: user?.id,
      paciente_id: pacienteId,
      data_consulta: stringDataSelecionada,
      hora_consulta: horaConsulta,
      tipo_consulta: tipoConsulta,
      observacoes: observacoes,
    });

    if (error) {
      alert("Erro ao agendar: " + error.message);
    } else {
      setPacienteId(""); 
      setHoraConsulta(""); 
      setObservacoes(""); 
      setTipoConsulta("Primeira Consulta");
      carregarDados();
    }
    setLoading(false);
  };

  const handleCancelarAgendamento = async (id: string) => {
    if (window.confirm("Deseja realmente cancelar esta consulta?")) {
      await supabase.from("agendamentos").delete().eq("id", id);
      if (consultaSelecionada?.id === id) {
        setConsultaSelecionada(null);
      }
      carregarDados();
    }
  };

  const formatarHora = (horaSql: string) => horaSql.substring(0, 5);

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case "Primeira Consulta": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Retorno": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Avaliação Física": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (carregandoDados) {
    return (
      <div className="p-12 text-emerald-700 font-medium text-center mt-20">
        Carregando agenda...
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800">Agenda do Consultório</h1>
        <p className="text-gray-500 mt-1">Gerencie seus horários e acompanhe os pacientes do dia.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: Formulário de Agendamento */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span>📅</span> Novo Agendamento
            </h2>
            
            <form onSubmit={handleAgendar} className="space-y-5">
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100 text-center font-bold text-sm">
                Agendando para: {dataSelecionada.getDate()} de {meses[dataSelecionada.getMonth()]} de {dataSelecionada.getFullYear()}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Paciente</label>
                <select 
                  value={pacienteId} 
                  onChange={(e) => setPacienteId(e.target.value)} 
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none bg-white"
                >
                  <option value="" disabled>Selecione o paciente...</option>
                  {pacientes.map((pac) => (
                    <option key={pac.id} value={pac.id}>{pac.perfis?.nome_completo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário</label>
                <input 
                  type="time" 
                  value={horaConsulta} 
                  onChange={(e) => setHoraConsulta(e.target.value)} 
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Consulta</label>
                <select 
                  value={tipoConsulta} 
                  onChange={(e) => setTipoConsulta(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none bg-white"
                >
                  <option value="Primeira Consulta">Primeira Consulta</option>
                  <option value="Retorno">Retorno</option>
                  <option value="Avaliação Física">Avaliação Física</option>
                  <option value="Dúvidas / Rápida">Dúvidas / Rápida</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observações (Opcional)</label>
                <textarea 
                  value={observacoes} 
                  onChange={(e) => setObservacoes(e.target.value)} 
                  placeholder="Ex: Trazer exames recentes..." 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-300 outline-none resize-none h-24 text-sm"
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition duration-300 shadow-md disabled:opacity-50 mt-2"
              >
                {loading ? "Agendando..." : "+ Confirmar Agendamento"}
              </button>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: Calendário e Lista */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* O Calendário */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 capitalize">{meses[mesAtual]} {anoAtual}</h2>
              <div className="flex gap-2">
                <button onClick={mesAnterior} className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors font-bold text-gray-600">&lt;</button>
                <button onClick={mesProximo} className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors font-bold text-gray-600">&gt;</button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="text-xs font-bold text-gray-400">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {dias.map((dia, index) => {
                if (!dia) return <div key={`empty-${index}`} className="p-2"></div>;

                const dataDesteQuadrado = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const temConsulta = agendamentos.some((a) => a.data_consulta === dataDesteQuadrado);
                const isSelecionado = stringDataSelecionada === dataDesteQuadrado;
                
                const dataHoje = new Date();
                const isHoje = dia === dataHoje.getDate() && mesAtual === dataHoje.getMonth() && anoAtual === dataHoje.getFullYear();

                return (
                  <button
                    key={dia}
                    onClick={() => {
                      setDataSelecionada(new Date(anoAtual, mesAtual, dia));
                    }}
                    className={`
                      relative p-3 rounded-xl text-sm font-semibold transition-all flex flex-col items-center justify-center
                      ${isSelecionado ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700 bg-white border border-transparent hover:border-gray-200'}
                      ${isHoje && !isSelecionado ? 'border-emerald-200 text-emerald-700 bg-emerald-50/50' : ''}
                    `}
                  >
                    {dia}
                    {temConsulta && (
                      <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelecionado ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Consultas */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-2">
            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-50 pb-4 mb-4">
              Consultas do dia {dataSelecionada.getDate()}
            </h2>

            {agendamentosDoDia.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                O consultório está livre neste dia.
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentosDoDia.map((agenda) => (
                  <div 
                    key={agenda.id} 
                    onClick={() => setConsultaSelecionada(agenda)}
                    className="bg-gray-50 hover:bg-emerald-50/40 p-4 rounded-xl border border-gray-100 hover:border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 text-center shadow-sm">
                        <div className="text-lg font-black text-emerald-700">{formatarHora(agenda.hora_consulta)}</div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-800 transition-colors">
                          {agenda.pacientes?.perfis?.nome_completo}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getBadgeColor(agenda.tipo_consulta)}`}>
                            {agenda.tipo_consulta}
                          </span>
                          {agenda.observacoes && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 font-medium bg-white px-2 py-0.5 rounded border border-gray-200">
                              💬 Ver anotações
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 justify-end border-t border-gray-200 sm:border-t-0 pt-3 sm:pt-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Evita abrir o modal ao clicar no botão direto
                          window.location.href = `/dashboard/pacientes/${agenda.paciente_id}`;
                        }}
                        className="text-emerald-700 font-semibold text-xs bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Prontuário
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Evita abrir o modal ao clicar no botão direto
                          handleCancelarAgendamento(agenda.id);
                        }}
                        className="text-red-600 font-semibold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ========================================== */}
      {/* NOVO: MODAL / POP-UP DE DETALHES DA CONSULTA */}
      {/* ========================================== */}
      {consultaSelecionada && (
        <div 
          onClick={() => setConsultaSelecionada(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-gray-100 space-y-6 animate-in fade-in zoom-in duration-150"
          >
            {/* Cabeçalho do Pop-up */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Detalhes do Agendamento
                </span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  {consultaSelecionada.pacientes?.perfis?.nome_completo}
                </h3>
              </div>
              <button 
                onClick={() => setConsultaSelecionada(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Informações Principais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block mb-1">Horário & Data</span>
                <p className="text-gray-800 font-bold text-lg">
                  {formatarHora(consultaSelecionada.hora_consulta)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dataSelecionada.getDate()} de {meses[dataSelecionada.getMonth()]}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block mb-1">Tipo de Atendimento</span>
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md border mt-1 ${getBadgeColor(consultaSelecionada.tipo_consulta)}`}>
                  {consultaSelecionada.tipo_consulta}
                </span>
              </div>
            </div>

            {/* Seção de Observações */}
            <div>
              <span className="text-sm font-bold text-gray-700 block mb-2">
                📝 Observações da Consulta
              </span>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 min-h-[90px] text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {consultaSelecionada.observacoes ? (
                  consultaSelecionada.observacoes
                ) : (
                  <span className="text-gray-400 italic">Nenhuma observação informada para este agendamento.</span>
                )}
              </div>
            </div>

            {/* Rodapé e Ações */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => setConsultaSelecionada(null)}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Fechar
              </button>
              <button 
                onClick={() => window.location.href = `/dashboard/pacientes/${consultaSelecionada.paciente_id}`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                Abrir Prontuário ➔
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}