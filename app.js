// app.js - Entry point do sistema de gestão de pedidos
// Faz o wiring entre os módulos de storage, parser e UI.

import * as storage from './js/storage.js';
import { parsearPedido } from './js/parser.js';
import {
  navegarPara,
  atualizarBadgeFila,
  renderTelaEntrada,
  renderFilaEspera,
  renderConferencia,
  renderRelatorio,
  renderRevisao,
  renderVisualizacao,
  gerarPdf,
} from './js/ui.js';

// ─── Tema (dark/light) ─────────────────────────────────────

function initTema() {
  const saved = localStorage.getItem('theme');
  const btnTema = document.getElementById('btn-tema');
  
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    atualizarIconeTema(saved);
  }

  btnTema.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    atualizarIconeTema(next);
  });
}

function atualizarIconeTema(tema) {
  const btnTema = document.getElementById('btn-tema');
  const icon = btnTema.querySelector('i');
  if (tema === 'dark') {
    icon.className = 'fas fa-sun';
  } else {
    icon.className = 'fas fa-moon';
  }
}

// ─── Navegação por Abas ─────────────────────────────────────

function initNavegacao() {
  // Bottom navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const secao = btn.dataset.secao;
      navegarPara(secao);
      atualizarTela(secao);
      
      // Atualiza estado ativo da bottom nav
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.secao === secao);
      });
    });
  });
}

function initHelpBadges() {
  document.addEventListener('click', (event) => {
    const badge = event.target.closest('.help-badge');
    const badges = document.querySelectorAll('.help-badge.is-open');

    if (!badge) {
      badges.forEach(el => el.classList.remove('is-open'));
      return;
    }

    event.preventDefault();
    const wasOpen = badge.classList.contains('is-open');
    badges.forEach(el => el.classList.remove('is-open'));
    if (!wasOpen) badge.classList.add('is-open');
  });
}

// ─── Estado de sessão ───────────────────────────────────────

let pedidoEmConferenciaId = null;

// ─── Atualização de telas sob demanda ───────────────────────

function atualizarTela(secaoId) {
  switch (secaoId) {
    case 'tela-entrada':
      // Entrada já tem listeners permanentes, nada a re-renderizar
      break;
    case 'tela-fila': {
      // Retorna eventuais pedidos abandonados em CONFERENCIA para a fila
      const emConferencia = storage.listarPorStatus('CONFERENCIA');
      emConferencia.forEach(p => storage.atualizarPedido(p.id, { status: 'AGUARDANDO' }));
      pedidoEmConferenciaId = null;
      
      // Limpa a tela de conferência
      document.getElementById('conferencia-conteudo').innerHTML = '<p class="empty-state">Selecione um pedido na Fila para iniciar a conferência.</p>';
      
      renderFilaEspera(storage.listarPorStatus('AGUARDANDO'), iniciarConferencia);
      break;
    }
    case 'tela-conferencia':
      // Se não há pedido em conferência, limpa a tela
      if (!pedidoEmConferenciaId) {
        document.getElementById('conferencia-conteudo').innerHTML = '<p class="empty-state">Selecione um pedido na Fila para iniciar a conferência.</p>';
      }
      break;
    case 'tela-relatorio':
      renderRelatorio(
        storage.listarPorStatus('FATURADO'),
        zerarMemoria,
        filtrarPorPeriodo,
        abrirRevisao,
        salvarEdicaoPedido,
        excluirPedidoFaturado
      );
      break;
    case 'tela-revisao':
      // Renderizada on-demand ao clicar "Gerar Relatório PDF"
      break;
    case 'tela-visualizacao':
      // Renderizada on-demand ao confirmar a revisão
      break;
  }
}

// ─── Ações ──────────────────────────────────────────────────

function processarPedido(texto) {
  const resultado = parsearPedido(texto);
  if (resultado.itens.length === 0) return null;

  storage.criarPedido(resultado.itens);
  
  // Atualiza badge da fila
  const aguardando = storage.listarPorStatus('AGUARDANDO');
  atualizarBadgeFila(aguardando.length);
  
  return resultado;
}

function formatarPedido(texto) {
  const resultado = parsearPedido(texto);
  return resultado.itens.length === 0 ? null : resultado;
}

function iniciarConferencia(pedidoId) {
  const pedido = storage.buscarPedido(pedidoId);
  if (!pedido) return;

  pedidoEmConferenciaId = pedidoId;

  // Atualiza status para CONFERENCIA
  storage.atualizarPedido(pedidoId, { status: 'CONFERENCIA' });
  const pedidoAtualizado = storage.buscarPedido(pedidoId);

  // Monta mapa de preços históricos para cada item
  const precosHistoricos = {};
  pedidoAtualizado.itens.forEach(item => {
    precosHistoricos[item.nomeOriginal] = storage.getLastPrice(item.nomeOriginal);
  });

  navegarPara('tela-conferencia');
  renderConferencia(pedidoAtualizado, precosHistoricos, faturarPedido, voltarParaFila);
}

function faturarPedido(pedidoId, dados) {
  storage.atualizarPedido(pedidoId, dados);
  pedidoEmConferenciaId = null;
  
  // Limpa a tela de conferência
  document.getElementById('conferencia-conteudo').innerHTML = '<p class="empty-state">Selecione um pedido na Fila para iniciar a conferência.</p>';
  
  navegarPara('tela-relatorio');
  atualizarTela('tela-relatorio');
}

function voltarParaFila() {
  // Retorna o pedido em conferência para AGUARDANDO
  if (pedidoEmConferenciaId) {
    storage.atualizarPedido(pedidoEmConferenciaId, { status: 'AGUARDANDO' });
    pedidoEmConferenciaId = null;
  }
  
  // Limpa a tela de conferência
  document.getElementById('conferencia-conteudo').innerHTML = '<p class="empty-state">Selecione um pedido na Fila para iniciar a conferência.</p>';
  
  navegarPara('tela-fila');
  atualizarTela('tela-fila');
}

function zerarMemoria() {
  storage.zerarMemoria();
  navegarPara('tela-entrada');
  atualizarTela('tela-entrada');
  // Limpa visuais residuais
  document.getElementById('input-pedido').value = '';
  document.getElementById('resultado-formatado').textContent = '';
  document.getElementById('resultado-formatado').classList.add('hidden');
  document.getElementById('resumo-pedido').innerHTML = '';
  document.getElementById('resumo-pedido').classList.add('hidden');
  document.getElementById('btn-copiar').classList.add('hidden');
  document.getElementById('btn-processar').classList.add('hidden');
  document.getElementById('conferencia-conteudo').innerHTML = '<p class="empty-state">Selecione um pedido na Fila para iniciar a conferência.</p>';
  document.getElementById('relatorio-conteudo').innerHTML = '';
  document.getElementById('revisao-conteudo').innerHTML = '';
  document.getElementById('visualizacao-conteudo').innerHTML = '';
  pedidoEmConferenciaId = null;
}

/** Callback para filtrar pedidos faturados por período */
function filtrarPorPeriodo(tsInicio, tsFim) {
  return storage.listarFaturadosPorPeriodo(tsInicio, tsFim);
}

/**
 * Abre a tela de revisão com os pedidos filtrados.
 * Substitui a geração direta de PDF — agora passa pela revisão primeiro.
 */
function abrirRevisao(pedidosFiltrados, dataInicio, dataFim) {
  navegarPara('tela-revisao');
  renderRevisao(
    pedidosFiltrados,
    dataInicio,
    dataFim,
    abrirVisualizacao,
    voltarParaRelatorio,
    salvarDevolucoes
  );
}

/** Volta da revisão para o relatório */
function voltarParaRelatorio() {
  navegarPara('tela-relatorio');
  atualizarTela('tela-relatorio');
}

/** Persiste as marcações de devolução no localStorage */
function salvarDevolucoes(pedidosComDevolucoes) {
  pedidosComDevolucoes.forEach(pedidoRevisado => {
    // Lê pedido atual do storage para preservar todos os campos
    const pedidoAtual = storage.buscarPedido(pedidoRevisado.id);
    if (!pedidoAtual) return;
    
    // Atualiza apenas devolvido e loja (loja é limpa se devolvido)
    const itensAtualizados = pedidoAtual.itens.map((itemAtual, idx) => {
      const itemRevisado = pedidoRevisado.itens[idx];
      if (!itemRevisado) return itemAtual;
      
      return {
        ...itemAtual,
        devolvido: itemRevisado.devolvido || false,
        loja: itemRevisado.devolvido ? null : itemAtual.loja
      };
    });
    
    storage.atualizarPedido(pedidoRevisado.id, { itens: itensAtualizados });
  });
}

function salvarEdicaoPedido(pedidoId, dados) {
  storage.atualizarPedido(pedidoId, dados);
  atualizarTela('tela-relatorio');
}

function excluirPedidoFaturado(pedidoId) {
  storage.removerPedido(pedidoId);
  atualizarTela('tela-relatorio');
}

/** Abre a visualização final após revisão */
function abrirVisualizacao(pedidosRevisados, dataInicio, dataFim) {
  navegarPara('tela-visualizacao');
  renderVisualizacao(
    pedidosRevisados,
    dataInicio,
    dataFim,
    () => abrirRevisao(pedidosRevisados, dataInicio, dataFim),
    gerarPdf
  );
}

// ─── Bootstrap ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTema();
  initNavegacao();
  initHelpBadges();
  renderTelaEntrada(formatarPedido, processarPedido);
  navegarPara('tela-entrada');
  
  // Atualiza badge da fila ao carregar
  const aguardando = storage.listarPorStatus('AGUARDANDO');
  atualizarBadgeFila(aguardando.length);
});
