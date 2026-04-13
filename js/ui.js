// ui.js - Módulo de renderização do DOM
// Responsável por montar e atualizar todas as 6 telas.
// NÃO acessa localStorage diretamente – recebe dados via callbacks/parâmetros.

import { extrairSufixoId } from './storage.js';

// ─── Helpers ────────────────────────────────────────────────

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function mostrarToast(msg, tipo = 'success') {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + tipo;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

/** Alterna visibilidade das seções. Mostra apenas a seção com o id informado. */
function navegarPara(secaoId) {
  $$('.secao').forEach(s => s.classList.add('hidden'));
  const alvo = $('#' + secaoId);
  if (alvo) alvo.classList.remove('hidden');

  // Atualiza abas ativas
  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.secao === secaoId);
  });
}

// ─── Tela 1: Entrada de Pedido ─────────────────────────────

function renderTelaEntrada(onFormatar, onProcessar) {
  const btnColar = $('#btn-colar');
  const btnFormatar = $('#btn-formatar');
  const btn = $('#btn-processar');
  const textarea = $('#input-pedido');
  const resultadoDiv = $('#resultado-formatado');
  const btnCopiar = $('#btn-copiar');

  const mostrarResultado = (resultado) => {
    resultadoDiv.textContent = resultado.textoFormatado;
    resultadoDiv.classList.remove('hidden');
    btnCopiar.classList.remove('hidden');
  };

  btnColar.onclick = async () => {
    try {
      const texto = await navigator.clipboard.readText();
      if (!texto) {
        mostrarToast('A área de transferência está vazia.', 'error');
        return;
      }
      textarea.value = texto;
      mostrarToast('Texto colado com sucesso!');
    } catch {
      mostrarToast('Não foi possível colar da área de transferência.', 'error');
    }
  };

  btnFormatar.onclick = () => {
    const texto = textarea.value.trim();
    if (!texto) {
      mostrarToast('Insira o texto do pedido.', 'error');
      return;
    }
    const resultado = onFormatar(texto);
    if (resultado) {
      mostrarResultado(resultado);
      mostrarToast(`Mensagem formatada com ${resultado.total} peça(s)!`);
    }
  };

  btn.onclick = () => {
    const texto = textarea.value.trim();
    if (!texto) {
      mostrarToast('Insira o texto do pedido.', 'error');
      return;
    }
    const resultado = onProcessar(texto);
    if (resultado) {
      mostrarResultado(resultado);
      mostrarToast(`Pedido registrado com ${resultado.total} peça(s)!`);
      textarea.value = '';
    }
  };

  btnCopiar.onclick = () => {
    const texto = resultadoDiv.textContent;
    if (!texto) return;
    navigator.clipboard.writeText(texto).then(() => {
      mostrarToast('Copiado para a área de transferência!');
    }).catch(() => {
      mostrarToast('Erro ao copiar.', 'error');
    });
  };
}

// ─── Tela 2: Fila de Espera ────────────────────────────────

function renderFilaEspera(pedidosAguardando, onIniciarConferencia) {
  const lista = $('#lista-fila');
  lista.innerHTML = '';

  if (pedidosAguardando.length === 0) {
    lista.innerHTML = '<p class="empty-state">Nenhum pedido na fila.</p>';
    return;
  }

  pedidosAguardando.forEach(pedido => {
    const dataStr = new Date(pedido.dataCriacao).toLocaleString('pt-BR');
    const sufixo = extrairSufixoId(pedido.id);
    const card = document.createElement('div');
    card.className = 'pedido-card';
    card.innerHTML = `
      <div class="pedido-card-info">
        <span class="pedido-id">#${sufixo}</span>
        <span class="pedido-data">${dataStr}</span>
        <span class="pedido-qtd">${pedido.itens.length} peça(s)</span>
      </div>
      <button class="btn btn-primary btn-sm" data-id="${pedido.id}">Iniciar Conferência</button>
    `;
    card.querySelector('button').onclick = () => onIniciarConferencia(pedido.id);
    lista.appendChild(card);
  });
}

// ─── Tela 3: Conferência ───────────────────────────────────

/**
 * @param {object} pedido - Pedido em conferência
 * @param {object} precosHistoricos - Mapa { nomeOriginal: valorUnitario|null }
 * @param {Function} onFaturar
 * @param {Function} onVoltar
 */
function renderConferencia(pedido, precosHistoricos, onFaturar, onVoltar) {
  const container = $('#conferencia-conteudo');
  const dataStr = new Date(pedido.dataCriacao).toLocaleString('pt-BR');
  const sufixo = extrairSufixoId(pedido.id);

  let itensHtml = '';
  pedido.itens.forEach((item, idx) => {
    const precoHist = precosHistoricos[item.nomeOriginal];
    // Se não há valor definido e existe histórico, preenche com o histórico
    const valorExibido = item.valorUnitario > 0 ? item.valorUnitario : (precoHist || '');
    const temHistorico = precoHist !== null && precoHist !== undefined;

    itensHtml += `
      <div class="item-conferencia" data-idx="${idx}">
        <div class="item-info">
          <span class="item-tipo">${item.tipo}</span>
          <span class="item-nome">${item.nomeOriginal}</span>
          ${temHistorico ? `<span class="item-historico">Último preço: R$ ${precoHist.toFixed(2)}</span>` : '<span class="item-historico sem-historico">Sem histórico</span>'}
        </div>
        <div class="item-controles">
          <div class="campo-valor">
            <label>Valor (R$)</label>
            <input type="number" class="input-valor" step="0.01" min="0" value="${valorExibido}" placeholder="0,00" data-idx="${idx}">
          </div>
          <div class="campo-check">
            <label>
              <input type="checkbox" class="check-recebido" data-idx="${idx}" ${item.recebido ? 'checked' : ''}>
              Recebida
            </label>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="conferencia-header">
      <h3>Pedido #${sufixo}</h3>
      <span class="pedido-data">${dataStr}</span>
    </div>
    <div class="campo-frete">
      <label for="input-frete">Valor do Frete (R$)</label>
      <input type="number" id="input-frete" step="0.01" min="0" value="${pedido.custoFrete || ''}" placeholder="0,00">
    </div>
    <div class="itens-lista">
      ${itensHtml}
    </div>
    <div class="conferencia-resumo" id="conferencia-resumo"></div>
    <div class="conferencia-acoes">
      <button class="btn btn-secondary" id="btn-voltar-fila">Voltar</button>
      <button class="btn btn-success" id="btn-faturar">Faturar Pedido</button>
    </div>
  `;

  // Atualiza resumo em tempo real
  const atualizarResumo = () => {
    let totalPecas = 0;
    let qtdValidas = 0;
    container.querySelectorAll('.item-conferencia').forEach(el => {
      const check = el.querySelector('.check-recebido');
      const input = el.querySelector('.input-valor');
      if (check.checked) {
        totalPecas += parseFloat(input.value) || 0;
        qtdValidas++;
      }
      // Visual de divergência
      el.classList.toggle('divergencia', !check.checked);
    });
    const frete = parseFloat($('#input-frete').value) || 0;
    const total = totalPecas + frete;
    $('#conferencia-resumo').innerHTML = `
      <p>Peças válidas: <strong>${qtdValidas}</strong> | Custo peças: <strong>R$ ${totalPecas.toFixed(2)}</strong></p>
      <p>Frete: <strong>R$ ${frete.toFixed(2)}</strong></p>
      <p class="total-grande">Total: <strong>R$ ${total.toFixed(2)}</strong></p>
    `;
  };

  // Event listeners
  container.querySelectorAll('.input-valor, .check-recebido, #input-frete').forEach(el => {
    el.addEventListener('input', atualizarResumo);
    el.addEventListener('change', atualizarResumo);
  });
  atualizarResumo();

  // Botão Faturar
  $('#btn-faturar').onclick = () => {
    const custoFrete = parseFloat($('#input-frete').value) || 0;
    const itensAtualizados = pedido.itens.map((item, idx) => {
      const el = container.querySelector(`.item-conferencia[data-idx="${idx}"]`);
      const recebido = el.querySelector('.check-recebido').checked;
      const valorUnitario = parseFloat(el.querySelector('.input-valor').value) || 0;
      return {
        ...item,
        recebido,
        valorUnitario: recebido ? valorUnitario : 0,
        divergencia: !recebido
      };
    });

    onFaturar(pedido.id, { custoFrete, itens: itensAtualizados, status: 'FATURADO' });
    mostrarToast('Pedido faturado com sucesso!');
  };

  // Botão Voltar
  $('#btn-voltar-fila').onclick = () => onVoltar();
}

// ─── Tela 4: Relatório / Painel ────────────────────────────

/**
 * @param {Array} pedidosFaturados - Todos os pedidos FATURADO (sem filtro)
 * @param {Function} onZerarMemoria
 * @param {Function} onFiltrarPorPeriodo - (tsInicio, tsFim) => Array de pedidos
 * @param {Function} onGerarPdf - (pedidosFiltrados, dataInicio, dataFim) => void
 * @param {Function} onSalvarEdicaoPedido - (pedidoId, dados) => void
 * @param {Function} onExcluirPedido - (pedidoId) => void
 */
function renderRelatorio(
  pedidosFaturados,
  onZerarMemoria,
  onFiltrarPorPeriodo,
  onGerarPdf,
  onSalvarEdicaoPedido,
  onExcluirPedido
) {
  const container = $('#relatorio-conteudo');

  // ── Cálculos gerais (todos os faturados) ──
  let totalGeral = 0;
  let divergencias = [];

  pedidosFaturados.forEach(pedido => {
    let subtotal = pedido.custoFrete || 0;
    pedido.itens.forEach(item => {
      if (item.recebido && !item.divergencia && !item.devolvido) {
        subtotal += item.valorUnitario;
      }
      if (item.divergencia) {
        divergencias.push({ pedidoId: pedido.id, dataPedido: pedido.dataCriacao, ...item });
      }
    });
    totalGeral += subtotal;
  });

  // ── Pedidos HTML ──
  let pedidosHtml = '';
  pedidosFaturados.forEach(pedido => {
    const dataStr = new Date(pedido.dataFaturamento || pedido.dataCriacao).toLocaleString('pt-BR');
    const sufixo = extrairSufixoId(pedido.id);
    let subtotalPecas = 0;
    pedido.itens.forEach(item => {
      if (item.recebido && !item.divergencia && !item.devolvido) subtotalPecas += item.valorUnitario;
    });
    const subtotal = subtotalPecas + (pedido.custoFrete || 0);
    const itensHtml = pedido.itens.map((item, idx) => `
      <div class="edicao-item" data-idx="${idx}">
        <div class="edicao-item-grid">
          <input type="text" class="edicao-item-tipo" value="${item.tipo}" placeholder="Tipo">
          <input type="text" class="edicao-item-nome" value="${item.nomeOriginal}" placeholder="Nome da peça">
          <input type="number" class="edicao-item-valor" step="0.01" min="0" value="${item.valorUnitario || 0}">
        </div>
        <div class="edicao-item-flags">
          <label><input type="checkbox" class="edicao-item-recebido" ${item.recebido ? 'checked' : ''}> Recebida</label>
          <label><input type="checkbox" class="edicao-item-divergencia" ${item.divergencia ? 'checked' : ''}> Divergência</label>
          <label><input type="checkbox" class="edicao-item-devolvido" ${item.devolvido ? 'checked' : ''}> Devolvido</label>
          <button class="btn btn-danger btn-sm btn-remover-item" type="button">Excluir peça</button>
        </div>
      </div>
    `).join('');

    pedidosHtml += `
      <div class="relatorio-pedido" data-pedido-id="${pedido.id}">
        <div class="relatorio-pedido-header">
          <button class="relatorio-pedido-toggle" type="button" data-pedido-id="${pedido.id}">
            <span class="pedido-id">#${sufixo}</span>
            <span class="pedido-data">${dataStr}</span>
            <span class="relatorio-subtotal">R$ ${subtotal.toFixed(2)}</span>
          </button>
        </div>
        <div class="relatorio-edicao hidden" data-edicao-id="${pedido.id}">
          <div class="campo-frete">
            <label>Frete <button class="help-badge" type="button" data-help="Edite o valor do frete desse pedido. O novo total será refletido após salvar as alterações.">?</button></label>
            <input type="number" class="edicao-frete" step="0.01" min="0" value="${pedido.custoFrete || 0}">
          </div>
          <div class="edicao-ajuda">
            <span>Peças do pedido <button class="help-badge" type="button" data-help="Edite tipo, nome, valor e flags. Você também pode incluir novas peças ou excluir peças existentes.">?</button></span>
          </div>
          <div class="edicao-itens">${itensHtml}</div>
          <div class="edicao-acoes-inline">
            <button class="btn btn-secondary btn-sm btn-adicionar-item" type="button">Incluir peça</button>
            <button class="btn btn-success btn-sm btn-salvar-pedido" type="button">Salvar alterações</button>
            <button class="btn btn-danger btn-sm btn-excluir-pedido" type="button">Excluir pedido</button>
          </div>
        </div>
      </div>
    `;
  });

  // ── Divergências HTML ──
  let divergenciasHtml = '';
  if (divergencias.length > 0) {
    divergenciasHtml = `
      <div class="divergencias-secao">
        <h3>Itens com Divergência (cobrar fornecedor)</h3>
        <div class="divergencias-lista">
          ${divergencias.map(d => {
            const sufixo = extrairSufixoId(d.pedidoId);
            return `
            <div class="divergencia-item">
              <span class="item-tipo">${d.tipo}</span>
              <span class="item-nome">${d.nomeOriginal}</span>
              <span class="pedido-data">Pedido #${sufixo} - ${new Date(d.dataPedido).toLocaleDateString('pt-BR')}</span>
            </div>
          `;}).join('')}
        </div>
      </div>
    `;
  }

  // ── Render completo ──
  container.innerHTML = `
    <div class="flow-steps">
      <div class="flow-step is-active"><span>1</span><strong>Relatório</strong></div>
      <div class="flow-step"><span>2</span><strong>Revisão</strong></div>
      <div class="flow-step"><span>3</span><strong>Visualização</strong></div>
    </div>

    <div class="relatorio-total">
      <h3>Total Faturado Acumulado</h3>
      <p class="total-grande">R$ ${totalGeral.toFixed(2)}</p>
      <span>${pedidosFaturados.length} pedido(s) faturado(s)</span>
    </div>

    <div class="filtro-periodo">
      <h3>Abrir Prévia do Relatório <button class="help-badge" type="button" data-help="Escolha o intervalo de datas faturadas. Depois passe pela revisão e abra a prévia pronta para imprimir ou salvar em PDF.">?</button></h3>
      <div class="filtro-periodo-campos">
        <div class="campo-data">
          <label for="filtro-inicio">Data Início</label>
          <input type="date" id="filtro-inicio">
        </div>
        <div class="campo-data">
          <label for="filtro-fim">Data Fim</label>
          <input type="date" id="filtro-fim">
        </div>
      </div>
      <button class="btn btn-primary" id="btn-gerar-pdf">Abrir Prévia do Relatório</button>
    </div>

    <div class="relatorio-lista">
      <h3>Pedidos Faturados <button class="help-badge" type="button" data-help="Clique em um pedido para abrir a edição rápida. Você pode editar frete, peças, preços, devoluções e até excluir o pedido.">?</button></h3>
      ${pedidosFaturados.length > 0 ? pedidosHtml : '<p class="empty-state">Nenhum pedido faturado ainda.</p>'}
    </div>
    ${divergenciasHtml}
    <div class="acoes-destrutivas">
      <button class="btn btn-danger" id="btn-zerar">Zerar Memória</button>
    </div>
  `;

  // ── Preenche filtros com mês atual por padrão ──
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  $('#filtro-inicio').value = _formatDateInput(primeiroDia);
  $('#filtro-fim').value = _formatDateInput(hoje);

  // ── Botão Gerar PDF ──
  $('#btn-gerar-pdf').onclick = () => {
    const inicioStr = $('#filtro-inicio').value;
    const fimStr = $('#filtro-fim').value;

    if (!inicioStr || !fimStr) {
      mostrarToast('Selecione as datas de início e fim.', 'error');
      return;
    }

    const tsInicio = new Date(inicioStr + 'T00:00:00').getTime();
    const tsFim = new Date(fimStr + 'T23:59:59').getTime();

    if (tsInicio > tsFim) {
      mostrarToast('Data de início deve ser anterior à data fim.', 'error');
      return;
    }

    const pedidosFiltrados = onFiltrarPorPeriodo(tsInicio, tsFim);

    if (pedidosFiltrados.length === 0) {
      mostrarToast('Nenhum pedido faturado nesse período.', 'error');
      return;
    }

    onGerarPdf(pedidosFiltrados, inicioStr, fimStr);
  };

  // ── Botão Zerar ──
  $('#btn-zerar').onclick = () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os pedidos permanentemente. Deseja continuar?')) {
      onZerarMemoria();
      mostrarToast('Memória zerada com sucesso.');
    }
  };

  container.querySelectorAll('.relatorio-pedido-toggle').forEach(btn => {
    btn.onclick = () => {
      const pedidoId = btn.dataset.pedidoId;
      const alvo = container.querySelector(`[data-edicao-id="${pedidoId}"]`);
      if (alvo) alvo.classList.toggle('hidden');
    };
  });

  container.querySelectorAll('.btn-adicionar-item').forEach(btn => {
    btn.onclick = () => {
      const bloco = btn.closest('.relatorio-edicao');
      const lista = bloco.querySelector('.edicao-itens');
      const item = document.createElement('div');
      item.className = 'edicao-item';
      item.innerHTML = `
        <div class="edicao-item-grid">
          <input type="text" class="edicao-item-tipo" placeholder="Tipo">
          <input type="text" class="edicao-item-nome" placeholder="Nome da peça">
          <input type="number" class="edicao-item-valor" step="0.01" min="0" value="0">
        </div>
        <div class="edicao-item-flags">
          <label><input type="checkbox" class="edicao-item-recebido" checked> Recebida</label>
          <label><input type="checkbox" class="edicao-item-divergencia"> Divergência</label>
          <label><input type="checkbox" class="edicao-item-devolvido"> Devolvido</label>
          <button class="btn btn-danger btn-sm btn-remover-item" type="button">Excluir peça</button>
        </div>
      `;
      lista.appendChild(item);
      item.querySelector('.btn-remover-item').onclick = () => item.remove();
    };
  });

  container.querySelectorAll('.btn-remover-item').forEach(btn => {
    btn.onclick = () => {
      const item = btn.closest('.edicao-item');
      if (item) item.remove();
    };
  });

  container.querySelectorAll('.btn-salvar-pedido').forEach(btn => {
    btn.onclick = () => {
      const bloco = btn.closest('.relatorio-edicao');
      const pedidoId = bloco.dataset.edicaoId;
      const custoFrete = parseFloat(bloco.querySelector('.edicao-frete').value) || 0;
      const itens = Array.from(bloco.querySelectorAll('.edicao-item')).map(itemEl => {
        const recebido = itemEl.querySelector('.edicao-item-recebido').checked;
        const divergencia = itemEl.querySelector('.edicao-item-divergencia').checked;
        return {
          tipo: itemEl.querySelector('.edicao-item-tipo').value.trim() || 'Peça',
          nomeOriginal: itemEl.querySelector('.edicao-item-nome').value.trim() || 'Peça sem nome',
          valorUnitario: parseFloat(itemEl.querySelector('.edicao-item-valor').value) || 0,
          recebido,
          divergencia,
          devolvido: itemEl.querySelector('.edicao-item-devolvido').checked,
        };
      });

      onSalvarEdicaoPedido(pedidoId, { custoFrete, itens, status: 'FATURADO' });
      mostrarToast('Pedido atualizado com sucesso!');
    };
  });

  container.querySelectorAll('.btn-excluir-pedido').forEach(btn => {
    btn.onclick = () => {
      const bloco = btn.closest('.relatorio-edicao');
      const pedidoId = bloco.dataset.edicaoId;
      if (!confirm('Deseja excluir este pedido faturado?')) return;
      onExcluirPedido(pedidoId);
      mostrarToast('Pedido excluído com sucesso!');
    };
  });
}

/** Formata Date para "YYYY-MM-DD" (valor de input[type=date]) */
function _formatDateInput(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _coletarDadosRelatorio(pedidos) {
  let totalGeral = 0;
  const divergencias = [];
  const devolvidos = [];
  const resumoPedidos = [];

  pedidos.forEach(pedido => {
    const sufixo = extrairSufixoId(pedido.id);
    const dataFat = new Date(pedido.dataFaturamento || pedido.dataCriacao).toLocaleDateString('pt-BR');
    let subtotalPecas = 0;
    let valorDevolvidos = 0;
    const itensValidos = [];

    pedido.itens.forEach(item => {
      if (item.divergencia) {
        divergencias.push({ pedidoId: pedido.id, dataFat, ...item });
        return;
      }
      if (!item.recebido) return;
      if (item.devolvido) {
        valorDevolvidos += item.valorUnitario;
        devolvidos.push({ pedidoId: pedido.id, dataFat, ...item });
        return;
      }
      subtotalPecas += item.valorUnitario;
      itensValidos.push(item);
    });

    const subtotal = subtotalPecas + (pedido.custoFrete || 0);
    totalGeral += subtotal;
    resumoPedidos.push({
      pedidoId: pedido.id,
      sufixo,
      dataFat,
      subtotalPecas,
      frete: pedido.custoFrete || 0,
      subtotal,
      valorDevolvidos,
      itensValidos,
    });
  });

  return { totalGeral, divergencias, devolvidos, resumoPedidos };
}

// ─── Tela 5: Revisão (pré-PDF) ─────────────────────────────

/**
 * Renderiza a tela de revisão que unifica todos os pedidos do período,
 * permitindo marcar peças como devolvidas antes de gerar o PDF final.
 * @param {Array} pedidos - Pedidos faturados filtrados pelo período
 * @param {string} dataInicio - "YYYY-MM-DD"
 * @param {string} dataFim - "YYYY-MM-DD"
 * @param {Function} onConfirmarPdf - (pedidosComDevolvidos, dataInicio, dataFim) => void
 * @param {Function} onVoltar - Volta para a tela de relatório
 * @param {Function} onSalvarDevolucoes - (pedidosAtualizados) => void – persiste devoluções
 */
function renderRevisao(pedidos, dataInicio, dataFim, onConfirmarPdf, onVoltar, onSalvarDevolucoes) {
  const container = $('#revisao-conteudo');
  const inicioFmt = _formatarDataBR(dataInicio);
  const fimFmt = _formatarDataBR(dataFim);

  // Monta HTML: um bloco por pedido com todas as peças
  let pedidosHtml = '';
  pedidos.forEach((pedido, pIdx) => {
    const sufixo = extrairSufixoId(pedido.id);
    const dataFat = new Date(pedido.dataFaturamento || pedido.dataCriacao).toLocaleDateString('pt-BR');

    let itensHtml = '';
    pedido.itens.forEach((item, iIdx) => {
      // Só mostra itens recebidos (não-divergência)
      if (!item.recebido || item.divergencia) return;

      const devolvido = item.devolvido || false;
      itensHtml += `
        <div class="revisao-item ${devolvido ? 'revisao-devolvido' : ''}" data-pidx="${pIdx}" data-iidx="${iIdx}">
          <div class="revisao-item-info">
            <span class="item-tipo">${item.tipo}</span>
            <span class="item-nome">${item.nomeOriginal}</span>
          </div>
          <div class="revisao-item-valor">R$ ${item.valorUnitario.toFixed(2)}</div>
          <div class="campo-check">
            <label>
              <input type="checkbox" class="check-devolvido" data-pidx="${pIdx}" data-iidx="${iIdx}" ${devolvido ? 'checked' : ''}>
              Devolvido
            </label>
          </div>
        </div>
      `;
    });

    // Calcula subtotal do pedido (sem devolvidos)
    let subtotalPecas = 0;
    pedido.itens.forEach(item => {
      if (item.recebido && !item.divergencia && !item.devolvido) {
        subtotalPecas += item.valorUnitario;
      }
    });
    const subtotal = subtotalPecas + (pedido.custoFrete || 0);

    pedidosHtml += `
      <div class="revisao-pedido" data-pidx="${pIdx}">
        <div class="revisao-pedido-header">
          <span class="pedido-id">#${sufixo}</span>
          <span class="pedido-data">${dataFat}</span>
          <span class="revisao-pedido-subtotal" data-pidx="${pIdx}">R$ ${subtotal.toFixed(2)}</span>
        </div>
        <div class="revisao-frete">Frete: R$ ${(pedido.custoFrete || 0).toFixed(2)}</div>
        <div class="revisao-itens">
          ${itensHtml || '<p class="empty-state">Sem peças válidas neste pedido.</p>'}
        </div>
      </div>
    `;
  });

  // Calcula total geral (sem devolvidos)
  let totalGeral = 0;
  pedidos.forEach(pedido => {
    let sub = pedido.custoFrete || 0;
    pedido.itens.forEach(item => {
      if (item.recebido && !item.divergencia && !item.devolvido) {
        sub += item.valorUnitario;
      }
    });
    totalGeral += sub;
  });

  container.innerHTML = `
    <div class="flow-steps">
      <div class="flow-step"><span>1</span><strong>Relatório</strong></div>
      <div class="flow-step is-active"><span>2</span><strong>Revisão</strong></div>
      <div class="flow-step"><span>3</span><strong>Visualização</strong></div>
    </div>

    <div class="revisao-periodo">
      <strong>Período:</strong> ${inicioFmt} a ${fimFmt} &mdash; ${pedidos.length} pedido(s)
    </div>

    <div class="revisao-total" id="revisao-total">
      <h3>Total do Período <button class="help-badge" type="button" data-help="Esse total já muda em tempo real quando você marca uma peça como devolvida.">?</button></h3>
      <p class="total-grande">R$ ${totalGeral.toFixed(2)}</p>
    </div>

    <div class="revisao-instrucao">
      Marque como <strong>"Devolvido"</strong> as peças que foram devolvidas ao fornecedor.
      O valor será subtraído automaticamente dos totais e refletido no PDF.
    </div>

    <div class="revisao-pedidos">
      ${pedidosHtml}
    </div>

    <div class="conferencia-acoes">
      <button class="btn btn-secondary" id="btn-revisao-voltar">Voltar ao Relatório</button>
      <button class="btn btn-success" id="btn-revisao-confirmar">Confirmar e Visualizar</button>
    </div>
  `;

  // ── Recalcula totais em tempo real ao alternar "Devolvido" ──
  const recalcularTotais = () => {
    let novoTotalGeral = 0;

    pedidos.forEach((pedido, pIdx) => {
      let subtotalPecas = 0;
      pedido.itens.forEach((item, iIdx) => {
        if (!item.recebido || item.divergencia) return;
        const checkEl = container.querySelector(`.check-devolvido[data-pidx="${pIdx}"][data-iidx="${iIdx}"]`);
        const devolvido = checkEl ? checkEl.checked : false;
        // Atualiza no objeto em memória
        item.devolvido = devolvido;
        // Visual
        const itemEl = container.querySelector(`.revisao-item[data-pidx="${pIdx}"][data-iidx="${iIdx}"]`);
        if (itemEl) {
          itemEl.classList.toggle('revisao-devolvido', devolvido);
        }
        if (!devolvido) {
          subtotalPecas += item.valorUnitario;
        }
      });
      const subtotal = subtotalPecas + (pedido.custoFrete || 0);
      novoTotalGeral += subtotal;

      // Atualiza subtotal visual do pedido
      const subtotalEl = container.querySelector(`.revisao-pedido-subtotal[data-pidx="${pIdx}"]`);
      if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
    });

    // Atualiza total geral
    const totalEl = container.querySelector('#revisao-total .total-grande');
    if (totalEl) totalEl.textContent = `R$ ${novoTotalGeral.toFixed(2)}`;
  };

  container.querySelectorAll('.check-devolvido').forEach(cb => {
    cb.addEventListener('change', recalcularTotais);
  });

  // ── Botão Voltar ──
  $('#btn-revisao-voltar').onclick = () => onVoltar();

  // ── Botão Confirmar e Gerar PDF ──
  $('#btn-revisao-confirmar').onclick = () => {
    // Sincroniza os checkboxes com os objetos pedido
    pedidos.forEach((pedido, pIdx) => {
      pedido.itens.forEach((item, iIdx) => {
        if (!item.recebido || item.divergencia) return;
        const checkEl = container.querySelector(`.check-devolvido[data-pidx="${pIdx}"][data-iidx="${iIdx}"]`);
        item.devolvido = checkEl ? checkEl.checked : false;
      });
    });

    // Persiste devoluções no localStorage
    onSalvarDevolucoes(pedidos);

    // Abre a visualização com devoluções refletidas
    onConfirmarPdf(pedidos, dataInicio, dataFim);
  };
}

// ─── Tela 6: Visualização do Relatório ─────────────────────

function renderVisualizacao(pedidos, dataInicio, dataFim, onVoltar, onImprimir) {
  const container = $('#visualizacao-conteudo');
  const inicioFmt = _formatarDataBR(dataInicio);
  const fimFmt = _formatarDataBR(dataFim);
  const { totalGeral, divergencias, devolvidos, resumoPedidos } = _coletarDadosRelatorio(pedidos);

  const pedidosHtml = resumoPedidos.map(resumo => `
    <div class="preview-pedido">
      <div class="preview-pedido-header">
        <span class="pedido-id">#${resumo.sufixo}</span>
        <span class="pedido-data">${resumo.dataFat}</span>
        <span class="relatorio-subtotal">R$ ${resumo.subtotal.toFixed(2)}</span>
      </div>
      <div class="preview-pedido-meta">
        <span>Peças: R$ ${resumo.subtotalPecas.toFixed(2)}</span>
        <span>Frete: R$ ${resumo.frete.toFixed(2)}</span>
        ${resumo.valorDevolvidos > 0 ? `<span class="preview-devolvido">Devolvido: -R$ ${resumo.valorDevolvidos.toFixed(2)}</span>` : ''}
      </div>
      <div class="preview-itens">
        ${resumo.itensValidos.length > 0 ? resumo.itensValidos.map(item => `
          <div class="preview-item">
            <span class="item-tipo">${item.tipo}</span>
            <span class="item-nome">${item.nomeOriginal}</span>
            <span class="preview-valor">R$ ${item.valorUnitario.toFixed(2)}</span>
          </div>
        `).join('') : '<p class="empty-state">Sem peças válidas neste pedido.</p>'}
      </div>
    </div>
  `).join('');

  const devolvidosHtml = devolvidos.length > 0 ? `
    <div class="preview-secao">
      <h3>Peças Devolvidas</h3>
      <div class="preview-lista-simples">
        ${devolvidos.map(item => `
          <div class="preview-item preview-item-devolvido">
            <span class="pedido-id">#${extrairSufixoId(item.pedidoId)}</span>
            <span class="item-tipo">${item.tipo}</span>
            <span class="item-nome">${item.nomeOriginal}</span>
            <span class="preview-valor">R$ ${item.valorUnitario.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const divergenciasHtml = divergencias.length > 0 ? `
    <div class="preview-secao">
      <h3>Divergências do Período</h3>
      <div class="preview-lista-simples">
        ${divergencias.map(item => `
          <div class="preview-item">
            <span class="pedido-id">#${extrairSufixoId(item.pedidoId)}</span>
            <span class="item-tipo">${item.tipo}</span>
            <span class="item-nome">${item.nomeOriginal}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="flow-steps no-print">
      <div class="flow-step"><span>1</span><strong>Relatório</strong></div>
      <div class="flow-step"><span>2</span><strong>Revisão</strong></div>
      <div class="flow-step is-active"><span>3</span><strong>Visualização</strong></div>
    </div>

    <div class="preview-acoes no-print">
      <button class="btn btn-secondary" id="btn-preview-voltar">Voltar à Revisão</button>
      <button class="btn btn-success" id="btn-preview-imprimir">Salvar em PDF / Imprimir</button>
    </div>

    <article class="preview-relatorio print-area" id="print-area">
      <header class="preview-header">
        <h1>Relatório de Pedidos Faturados</h1>
        <p>${inicioFmt} a ${fimFmt}</p>
      </header>

      <section class="preview-total">
        <h3>Total Geral do Período</h3>
        <p class="total-grande">R$ ${totalGeral.toFixed(2)}</p>
        <span>${pedidos.length} pedido(s)</span>
      </section>

      <section class="preview-secao">
        <h3>Pedidos Faturados <button class="help-badge no-print" type="button" data-help="Revise o conteúdo final antes de imprimir. O navegador abrirá a caixa de impressão para salvar como PDF.">?</button></h3>
        <div class="preview-pedidos">
          ${pedidosHtml || '<p class="empty-state">Nenhum pedido faturado no período.</p>'}
        </div>
      </section>

      ${devolvidosHtml}
      ${divergenciasHtml}
    </article>
  `;

  $('#btn-preview-voltar').onclick = () => onVoltar();
  $('#btn-preview-imprimir').onclick = () => onImprimir();
}

// ─── Impressão / Salvar PDF ────────────────────────────────

/**
 * Gera o HTML do relatório e invoca html2pdf para produzir o download.
 * @param {Array} pedidos - Pedidos faturados filtrados
 * @param {string} dataInicio - "YYYY-MM-DD"
 * @param {string} dataFim - "YYYY-MM-DD"
 */
function gerarPdf() {
  window.print();
}

/** Converte "YYYY-MM-DD" → "DD/MM/YYYY" */
function _formatarDataBR(isoStr) {
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Exports ────────────────────────────────────────────────

export {
  navegarPara,
  mostrarToast,
  renderTelaEntrada,
  renderFilaEspera,
  renderConferencia,
  renderRelatorio,
  renderRevisao,
  renderVisualizacao,
  gerarPdf,
};
