// storage.js - Módulo de persistência (localStorage)
// Todas as operações de CRUD no localStorage ficam isoladas aqui.

const STORAGE_KEY = 'lojacell_pedidos';

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function _ler() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function _gravar(pedidos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos));
}

/**
 * Gera um ID no formato DDMM-SXX.
 * DD = dia, MM = mês, S = abreviação do dia da semana, XX = sequencial do dia.
 * Ex: 1304-SEG01 (primeiro pedido de segunda-feira 13/04)
 */
function _gerarId() {
  const agora = new Date();
  const dd = String(agora.getDate()).padStart(2, '0');
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  const prefixoData = dd + mm;
  const diaSemana = DIAS_SEMANA[agora.getDay()];

  // Conta pedidos já existentes na mesma data (DDMM)
  const pedidos = _ler();
  const pedidosHoje = pedidos.filter(p => p.id.startsWith(prefixoData + '-'));
  const seq = String(pedidosHoje.length + 1).padStart(2, '0');

  return `${prefixoData}-${diaSemana}${seq}`;
}

/**
 * Extrai o sufixo de exibição de um ID completo.
 * Ex: "1304-SEG01" → "SEG01"
 */
export function extrairSufixoId(idCompleto) {
  const partes = idCompleto.split('-');
  return partes.length >= 2 ? partes[1] : idCompleto;
}

// ─── API pública ────────────────────────────────────────────

/** Retorna todos os pedidos */
export function listarPedidos() {
  return _ler();
}

/** Retorna pedidos filtrados por status */
export function listarPorStatus(status) {
  return _ler().filter(p => p.status === status);
}

/** Busca um pedido pelo id */
export function buscarPedido(id) {
  return _ler().find(p => p.id === id) || null;
}

/**
 * Cria um novo pedido com status AGUARDANDO.
 * @param {Array} itens - Array de objetos { tipo, nomeOriginal }
 * @returns {object} O pedido criado
 */
export function criarPedido(itens) {
  const pedidos = _ler();
  const novo = {
    id: _gerarId(),
    dataCriacao: Date.now(),
    dataFaturamento: null,
    status: 'AGUARDANDO',
    custoFrete: 0,
    itens: itens.map(item => ({
      tipo: item.tipo,
      nomeOriginal: item.nomeOriginal,
      recebido: true,
      valorUnitario: 0,
      divergencia: false,
      devolvido: false
    }))
  };
  pedidos.push(novo);
  _gravar(pedidos);
  return novo;
}

/**
 * Atualiza um pedido existente (merge parcial).
 * Se o status estiver mudando para FATURADO, grava dataFaturamento automaticamente.
 * @param {string} id
 * @param {object} dados - Campos a atualizar
 * @returns {object|null} O pedido atualizado ou null
 */
export function atualizarPedido(id, dados) {
  const pedidos = _ler();
  const idx = pedidos.findIndex(p => p.id === id);
  if (idx === -1) return null;

  // Grava timestamp de faturamento automaticamente
  if (dados.status === 'FATURADO' && pedidos[idx].status !== 'FATURADO') {
    dados.dataFaturamento = Date.now();
  }

  pedidos[idx] = { ...pedidos[idx], ...dados };
  _gravar(pedidos);
  return pedidos[idx];
}

/**
 * Remove um pedido pelo id.
 * @param {string} id
 */
export function removerPedido(id) {
  const pedidos = _ler().filter(p => p.id !== id);
  _gravar(pedidos);
}

/** Apaga todos os pedidos (reset completo). */
export function zerarMemoria() {
  localStorage.clear();
}

/**
 * Busca o último preço pago por uma peça (pelo nomeOriginal exato).
 * Varre apenas pedidos FATURADO, do mais recente ao mais antigo.
 * @param {string} nomeOriginal - Nome exato da peça (ex: "Tela iphone 11")
 * @returns {number|null} O valor unitário encontrado ou null
 */
export function getLastPrice(nomeOriginal) {
  const faturados = _ler()
    .filter(p => p.status === 'FATURADO')
    .sort((a, b) => (b.dataFaturamento || b.dataCriacao) - (a.dataFaturamento || a.dataCriacao));

  for (const pedido of faturados) {
    const item = pedido.itens.find(
      i => i.nomeOriginal === nomeOriginal && i.recebido && !i.divergencia && i.valorUnitario > 0
    );
    if (item) return item.valorUnitario;
  }
  return null;
}

/**
 * Retorna pedidos FATURADO dentro de um intervalo de datas.
 * @param {number} tsInicio - Timestamp início (00:00 do dia)
 * @param {number} tsFim - Timestamp fim (23:59 do dia)
 * @returns {Array} Pedidos filtrados
 */
export function listarFaturadosPorPeriodo(tsInicio, tsFim) {
  return _ler().filter(p => {
    if (p.status !== 'FATURADO') return false;
    const dataFat = p.dataFaturamento || p.dataCriacao;
    return dataFat >= tsInicio && dataFat <= tsFim;
  });
}
