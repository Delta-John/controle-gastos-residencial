import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import './App.css';

interface Pessoa {
  id: string;
  nome: string;
  idade: number;
}

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'Receita' | 'Despesa';
  pessoaId: string;
  nomePessoa: string;
  data: string;
}

interface PessoaTotal {
  id: string;
  nome: string;
  idade: number;
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  ultimaMovimentacao: string;
}

interface RelatorioTotais {
  pessoas: PessoaTotal[];
  totalReceitasGeral: number;
  totalDespesasGeral: number;
  saldoLiquidoGeral: number;
}

interface AlertMsg {
  id: number;
  text: string;
  type: 'success' | 'danger' | 'warning';
}

const API_BASE_URL = 'http://localhost:5027/api';

const Icon = ({ children, size = 20 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const getInitials = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const parseDataBr = (data: string) => {
  const [dia, mes, ano] = data.split('/').map(Number);
  return new Date(ano, mes - 1, dia).getTime();
};

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

export default function App() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [relatorioTotais, setRelatorioTotais] = useState<RelatorioTotais>({
    pessoas: [],
    totalReceitasGeral: 0,
    totalDespesasGeral: 0,
    saldoLiquidoGeral: 0,
  });

  const [pessoaNome, setPessoaNome] = useState('');
  const [pessoaIdade, setPessoaIdade] = useState('');

  const [transacaoDescricao, setTransacaoDescricao] = useState('');
  const [transacaoValor, setTransacaoValor] = useState('');
  const [transacaoTipo, setTransacaoTipo] = useState<'Receita' | 'Despesa'>('Despesa');
  const [transacaoPessoaId, setTransacaoPessoaId] = useState('');
  const [transacaoData, setTransacaoData] = useState('');

  const [alerts, setAlerts] = useState<AlertMsg[]>([]);
  const [loading, setLoading] = useState(false);

  const transacoesOrdenadas = useMemo(
    () =>
      [...transacoes].sort((a, b) => {
        try {
          return parseDataBr(b.data) - parseDataBr(a.data);
        } catch {
          return 0;
        }
      }),
    [transacoes],
  );

  useEffect(() => {
    carregarDados();
  }, []);

  const exibirAlerta = (text: string, type: AlertMsg['type']) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 6000);
  };

  const fecharAlerta = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resPessoas, resTransacoes, resTotais] = await Promise.all([
        fetch(`${API_BASE_URL}/pessoas`),
        fetch(`${API_BASE_URL}/transacoes`),
        fetch(`${API_BASE_URL}/totais`),
      ]);

      if (resPessoas.ok && resTransacoes.ok && resTotais.ok) {
        setPessoas(await resPessoas.json());
        setTransacoes(await resTransacoes.json());
        setRelatorioTotais(await resTotais.json());
      } else {
        exibirAlerta('Erro ao carregar dados do servidor.', 'danger');
      }
    } catch (error) {
      console.error(error);
      exibirAlerta('Não foi possível conectar ao backend. Verifique se a API está em execução.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handlePessoaNomeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    if (/^[a-zA-ZÀ-ÿ\s]*$/.test(valor)) {
      setPessoaNome(valor);
    } else {
      exibirAlerta('O nome aceita apenas letras e espaços.', 'warning');
    }
  };

  const handlePessoaIdadeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    if (/^\d{0,3}$/.test(valor)) {
      setPessoaIdade(valor);
    } else {
      exibirAlerta('A idade aceita apenas números de até 3 dígitos.', 'warning');
    }
  };

  const handleTransacaoDataChange = (e: ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const apenasNumeros = valor.replace(/\D/g, '').slice(0, 8);

    let formatada = apenasNumeros;
    if (apenasNumeros.length > 2) {
      formatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
    }
    if (apenasNumeros.length > 4) {
      formatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4)}`;
    }

    setTransacaoData(formatada);
  };

  const handleCadastrarPessoa = async (e: FormEvent) => {
    e.preventDefault();

    if (!pessoaNome.trim()) {
      exibirAlerta('O nome da pessoa é obrigatório.', 'warning');
      return;
    }

    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(pessoaNome)) {
      exibirAlerta('O nome aceita apenas letras e espaços.', 'danger');
      return;
    }

    if (!pessoaIdade.trim()) {
      exibirAlerta('A idade da pessoa é obrigatória.', 'warning');
      return;
    }

    if (!/^\d{1,3}$/.test(pessoaIdade)) {
      exibirAlerta('Informe uma idade válida de até 3 dígitos.', 'danger');
      return;
    }

    const idadeNum = parseInt(pessoaIdade, 10);
    if (isNaN(idadeNum) || idadeNum < 0 || idadeNum > 999) {
      exibirAlerta('A idade deve estar entre 0 e 999.', 'danger');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/pessoas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: pessoaNome.trim(), idade: idadeNum }),
      });

      const data = await response.json();

      if (response.ok) {
        exibirAlerta(`Pessoa "${data.nome}" cadastrada com sucesso.`, 'success');
        setPessoaNome('');
        setPessoaIdade('');
        carregarDados();
      } else {
        exibirAlerta(data.mensagem || 'Falha ao cadastrar pessoa.', 'danger');
      }
    } catch (error) {
      console.error(error);
      exibirAlerta('Erro de conexão ao cadastrar pessoa.', 'danger');
    }
  };

  const handleDeletarPessoa = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir ${nome}? Todas as transações vinculadas também serão removidas.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/pessoas/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        exibirAlerta(data.mensagem || 'Pessoa excluída com sucesso.', 'success');
        if (transacaoPessoaId === id) {
          setTransacaoPessoaId('');
        }
        carregarDados();
      } else {
        exibirAlerta(data.mensagem || 'Falha ao deletar pessoa.', 'danger');
      }
    } catch (error) {
      console.error(error);
      exibirAlerta('Erro de conexão ao deletar pessoa.', 'danger');
    }
  };

  const handleCadastrarTransacao = async (e: FormEvent) => {
    e.preventDefault();

    if (!transacaoDescricao.trim()) {
      exibirAlerta('A descrição da transação é obrigatória.', 'warning');
      return;
    }

    const valorNum = parseFloat(transacaoValor);
    if (isNaN(valorNum) || valorNum <= 0) {
      exibirAlerta('Informe um valor positivo maior que zero.', 'warning');
      return;
    }

    if (!transacaoPessoaId) {
      exibirAlerta('Selecione a pessoa responsável pela transação.', 'warning');
      return;
    }

    if (!transacaoData.trim()) {
      exibirAlerta('A data da transação é obrigatória.', 'warning');
      return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(transacaoData)) {
      exibirAlerta('Use o formato DD/MM/AAAA (ex: 04/07/2026).', 'danger');
      return;
    }

    const [dia, mes, ano] = transacaoData.split('/').map(Number);
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 1900 || ano > 2100) {
      exibirAlerta('Informe uma data válida.', 'danger');
      return;
    }

    const pessoaResponsavel = pessoas.find(p => p.id === transacaoPessoaId);
    if (pessoaResponsavel && pessoaResponsavel.idade < 18 && transacaoTipo === 'Receita') {
      exibirAlerta(
        `${pessoaResponsavel.nome} é menor de 18 anos. Apenas despesas são permitidas.`,
        'danger',
      );
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/transacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: transacaoDescricao,
          valor: valorNum,
          tipo: transacaoTipo,
          pessoaId: transacaoPessoaId,
          data: transacaoData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        exibirAlerta(`Transação "${data.descricao}" registrada com sucesso.`, 'success');
        setTransacaoDescricao('');
        setTransacaoValor('');
        setTransacaoData('');
        carregarDados();
      } else {
        exibirAlerta(data.mensagem || 'Falha ao cadastrar transação.', 'danger');
      }
    } catch (error) {
      console.error(error);
      exibirAlerta('Erro de conexão ao cadastrar transação.', 'danger');
    }
  };

  const pessoaSelecionada = pessoas.find(p => p.id === transacaoPessoaId);
  const isPessoaMenorDeIdade = pessoaSelecionada ? pessoaSelecionada.idade < 18 : false;

  const alertTitle = (type: AlertMsg['type']) => {
    if (type === 'success') return 'Sucesso';
    if (type === 'warning') return 'Atenção';
    return 'Erro';
  };

  return (
    <>
      <div className="toast-container" aria-live="polite">
        {alerts.map(alert => (
          <div key={alert.id} className={`toast toast-${alert.type}`} role="alert">
            <div className="toast-icon">
              <Icon size={14}>
                {alert.type === 'success' ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : alert.type === 'warning' ? (
                  <>
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </>
                )}
              </Icon>
            </div>
            <div className="toast-content">
              <div className="toast-title">{alertTitle(alert.type)}</div>
              <div className="toast-message">{alert.text}</div>
            </div>
            <button type="button" className="toast-close" onClick={() => fecharAlerta(alert.id)} aria-label="Fechar notificação">
              <Icon size={16}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </Icon>
            </button>
          </div>
        ))}
      </div>

      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <Icon size={22}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </Icon>
            </div>
            <div className="brand-text">
              <h1>DomusFin</h1>
              <p>Controle financeiro residencial</p>
            </div>
          </div>

        </header>

        <section className="kpi-grid fade-in" aria-label="Resumo financeiro">
          <article className={`kpi-card kpi-receitas ${loading ? 'loading' : ''}`}>
            <div className="kpi-top">
              <span className="kpi-label">Total receitas</span>
              <span className="kpi-icon">
                <Icon size={18}>
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </Icon>
              </span>
            </div>
            <div className="kpi-value">{formatarMoeda(relatorioTotais.totalReceitasGeral)}</div>
          </article>

          <article className={`kpi-card kpi-despesas ${loading ? 'loading' : ''}`}>
            <div className="kpi-top">
              <span className="kpi-label">Total despesas</span>
              <span className="kpi-icon">
                <Icon size={18}>
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </Icon>
              </span>
            </div>
            <div className="kpi-value">{formatarMoeda(relatorioTotais.totalDespesasGeral)}</div>
          </article>

          <article
            className={`kpi-card kpi-saldo ${relatorioTotais.saldoLiquidoGeral >= 0 ? 'positive' : 'negative'} ${loading ? 'loading' : ''}`}
          >
            <div className="kpi-top">
              <span className="kpi-label">Saldo líquido</span>
              <span className="kpi-icon">
                <Icon size={18}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </Icon>
              </span>
            </div>
            <div className="kpi-value">{formatarMoeda(relatorioTotais.saldoLiquidoGeral)}</div>
          </article>
        </section>

        <main className="dashboard-grid">
          <section className="panel fade-in">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="panel-icon">
                  <Icon size={18}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </Icon>
                </span>
                <div>
                  <h2 className="panel-title">Pessoas</h2>
                  <p className="panel-subtitle">Membros da residência</p>
                </div>
              </div>
              <span className="panel-badge">{pessoas.length}</span>
            </div>

            <div className="panel-body">
              <form onSubmit={handleCadastrarPessoa} className="form-stack">
                <span className="section-label">Nova pessoa</span>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="pessoa-nome">Nome completo</label>
                    <input
                      id="pessoa-nome"
                      type="text"
                      className="form-input"
                      placeholder="Ex: João Silva"
                      value={pessoaNome}
                      onChange={handlePessoaNomeChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pessoa-idade">Idade</label>
                    <input
                      id="pessoa-idade"
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      placeholder="Ex: 28"
                      value={pessoaIdade}
                      onChange={handlePessoaIdadeChange}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-full">
                  <Icon size={16}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </Icon>
                  Adicionar pessoa
                </button>
              </form>

              <div>
                <span className="section-label">Cadastradas</span>
                {pessoas.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: '0.75rem' }}>
                    <div className="empty-state-icon">
                      <Icon size={22}>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </Icon>
                    </div>
                    <p>Nenhuma pessoa cadastrada. Adicione o primeiro membro acima.</p>
                  </div>
                ) : (
                  <div className="item-list people-list" style={{ marginTop: '0.75rem' }}>
                    {pessoas.map(p => (
                      <div key={p.id} className="list-item">
                        <div className="list-item-main">
                          <span className="avatar avatar-person">{getInitials(p.nome)}</span>
                          <div className="item-info">
                            <div className="item-title">{p.nome}</div>
                            <div className="item-meta">
                              {p.idade} {p.idade === 1 ? 'ano' : 'anos'}
                              {p.idade < 18 ? ' · menor de idade' : ''}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletarPessoa(p.id, p.nome)}
                          className="btn btn-ghost-danger"
                          title="Excluir pessoa e transações"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel fade-in">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="panel-icon">
                  <Icon size={18}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </Icon>
                </span>
                <div>
                  <h2 className="panel-title">Transações</h2>
                  <p className="panel-subtitle">Receitas e despesas da casa</p>
                </div>
              </div>
              <span className="panel-badge">{transacoes.length}</span>
            </div>

            <div className="panel-body">
              <form onSubmit={handleCadastrarTransacao} className="form-stack">
                <span className="section-label">Novo lançamento</span>

                <div className="form-group">
                  <label className="form-label" htmlFor="transacao-descricao">Descrição</label>
                  <input
                    id="transacao-descricao"
                    type="text"
                    className="form-input"
                    placeholder="Ex: Supermercado, aluguel, salário"
                    value={transacaoDescricao}
                    onChange={e => setTransacaoDescricao(e.target.value)}
                  />
                </div>

                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="transacao-valor">Valor (R$)</label>
                    <input
                      id="transacao-valor"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input"
                      placeholder="0,00"
                      value={transacaoValor}
                      onChange={e => setTransacaoValor(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="transacao-tipo">Tipo</label>
                    <select
                      id="transacao-tipo"
                      className="form-select"
                      value={transacaoTipo}
                      onChange={e => setTransacaoTipo(e.target.value as 'Receita' | 'Despesa')}
                    >
                      <option value="Despesa">Despesa</option>
                      <option value="Receita">Receita</option>
                    </select>
                  </div>
                </div>

                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="transacao-pessoa">Responsável</label>
                    <select
                      id="transacao-pessoa"
                      className="form-select"
                      value={transacaoPessoaId}
                      onChange={e => setTransacaoPessoaId(e.target.value)}
                    >
                      <option value="">Selecione uma pessoa</option>
                      {pessoas.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.idade} anos)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="transacao-data">Data</label>
                    <input
                      id="transacao-data"
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      placeholder="DD/MM/AAAA"
                      value={transacaoData}
                      onChange={handleTransacaoDataChange}
                    />
                  </div>
                </div>

                {isPessoaMenorDeIdade && (
                  <div className="notice notice-warning">
                    <Icon size={16}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </Icon>
                    <span>
                      <strong>{pessoaSelecionada?.nome}</strong> é menor de 18 anos. Apenas despesas
                      serão aceitas para esta pessoa.
                    </span>
                  </div>
                )}

                <button type="submit" className="btn btn-full">
                  <Icon size={16}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </Icon>
                  Registrar transação
                </button>
              </form>

              <div>
                <span className="section-label">Histórico recente</span>
                {transacoesOrdenadas.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: '0.75rem' }}>
                    <div className="empty-state-icon">
                      <Icon size={22}>
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </Icon>
                    </div>
                    <p>Nenhuma transação registrada. Lance a primeira movimentação acima.</p>
                  </div>
                ) : (
                  <div className="item-list history-list" style={{ marginTop: '0.75rem' }}>
                    {transacoesOrdenadas.map(t => (
                      <div key={t.id} className="list-item">
                        <div className="list-item-main">
                          <span className="avatar avatar-transaction">
                            <Icon size={16}>
                              {t.tipo === 'Receita' ? (
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                              ) : (
                                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                              )}
                            </Icon>
                          </span>
                          <div className="item-info">
                            <div className="item-title">{t.descricao}</div>
                            <div className="item-meta">
                              {t.nomePessoa} · {t.data}
                            </div>
                          </div>
                        </div>
                        <div className="item-end">
                          <span className={`amount ${t.tipo === 'Receita' ? 'amount-receita' : 'amount-despesa'}`}>
                            {t.tipo === 'Receita' ? '+' : '−'} {formatarMoeda(t.valor)}
                          </span>
                          <span className={`badge ${t.tipo === 'Receita' ? 'badge-receita' : 'badge-despesa'}`}>
                            {t.tipo}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel panel-full fade-in">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="panel-icon">
                  <Icon size={18}>
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </Icon>
                </span>
                <div>
                  <h2 className="panel-title">Relatório consolidado</h2>
                  <p className="panel-subtitle">Totais individuais e saldo por membro</p>
                </div>
              </div>
            </div>

            <div className="panel-body">
              {relatorioTotais.pessoas.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Icon size={22}>
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </Icon>
                  </div>
                  <p>Cadastre pessoas e registre transações para visualizar o demonstrativo.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Idade</th>
                        <th>Receitas</th>
                        <th>Despesas</th>
                        <th>Saldo</th>
                        <th>Último lançamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioTotais.pessoas.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div className="name-cell">
                              <span className="avatar avatar-person">{getInitials(p.nome)}</span>
                              {p.nome}
                            </div>
                          </td>
                          <td>{p.idade} anos</td>
                          <td className="text-success">{formatarMoeda(p.totalReceitas)}</td>
                          <td className="text-danger">{formatarMoeda(p.totalDespesas)}</td>
                          <td className={p.saldo >= 0 ? 'text-info' : 'text-danger'}>
                            {formatarMoeda(p.saldo)}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.ultimaMovimentacao}</td>
                        </tr>
                      ))}
                      <tr className="table-footer">
                        <td>Total geral</td>
                        <td>—</td>
                        <td className="text-success">{formatarMoeda(relatorioTotais.totalReceitasGeral)}</td>
                        <td className="text-danger">{formatarMoeda(relatorioTotais.totalDespesasGeral)}</td>
                        <td className={relatorioTotais.saldoLiquidoGeral >= 0 ? 'text-info' : 'text-danger'}>
                          {formatarMoeda(relatorioTotais.saldoLiquidoGeral)}
                        </td>
                        <td>—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="app-footer">
          DomusFin · Controle de gastos residenciais
        </footer>
      </div>
    </>
  );
}
