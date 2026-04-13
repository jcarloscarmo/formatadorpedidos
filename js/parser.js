// parser.js - Módulo de parsing de pedidos
// Extrai tipos de peças a partir de texto livre (baseado no código legado).

const TIPOS_PECAS = {
  'placa de carga': 'Placa de carga',
  'tampa': 'Tampa',
  'cola': 'Cola',
  'frontal': 'Tela',
  'tela': 'Tela',
  'lente': 'Lente',
  'câmera': 'Câmera',
  'camera': 'Câmera',
  'capa': 'Capa',
  'flex': 'Flex',
  'bateria': 'Bateria',
  'botão': 'Botão',
  'botao': 'Botão',
  'mic': 'Microfone',
  'microfone': 'Microfone',
  'dock': 'Dock',
  'conector': 'Conector',
  'película': 'Película',
  'pelicula': 'Película',
};

/**
 * Faz o parse de um texto de pedido e retorna a lista de itens estruturados
 * e o texto formatado pronto para envio via WhatsApp.
 *
 * @param {string} textoEntrada - Texto bruto colado pelo usuário
 * @returns {{ itens: Array<{tipo: string, nomeOriginal: string}>, textoFormatado: string, contadorTipos: object, total: number }}
 */
export function parsearPedido(textoEntrada) {
  // Limpa metadados de chat (timestamps, nomes de remetente, tags HTML, parênteses)
  let linhas = textoEntrada.split('\n').map(linha => linha.replace(/\[.*?\]\s*.*?:\s*/, ''));
  let mensagem = linhas.join(' ');
  mensagem = mensagem.replace(/<.*?>|\(.*?\)/g, '');

  const listaFormatada = [];
  const itens = [];
  let itemAtual = '';
  let tipoAtual = '';
  const contadorTipos = {};

  const palavras = mensagem.toLowerCase().split(/\s+/);

  for (let i = 0; i < palavras.length; i++) {
    // Tenta casar com tipos compostos (ex: "placa de carga") e simples
    const tipoEncontrado = Object.keys(TIPOS_PECAS).find(tipo => {
      const tipoPalavras = tipo.split(' ');
      return tipoPalavras.every((t, idx) => palavras[i + idx] === t);
    });

    if (tipoEncontrado) {
      if (itemAtual) {
        const nomeOriginal = (tipoAtual + ' ' + itemAtual.trim());
        listaFormatada.push(nomeOriginal);
        itens.push({ tipo: tipoAtual, nomeOriginal });
        contadorTipos[tipoAtual] = (contadorTipos[tipoAtual] || 0) + 1;
      }

      tipoAtual = TIPOS_PECAS[tipoEncontrado];
      itemAtual = '';
      i += tipoEncontrado.split(' ').length - 1;
    } else if (tipoAtual) {
      itemAtual += ' ' + palavras[i];
    }
  }

  // Último item pendente
  if (itemAtual) {
    const nomeOriginal = (tipoAtual + ' ' + itemAtual.trim());
    listaFormatada.push(nomeOriginal);
    itens.push({ tipo: tipoAtual, nomeOriginal });
    contadorTipos[tipoAtual] = (contadorTipos[tipoAtual] || 0) + 1;
  }

  const total = listaFormatada.length;
  const textoFormatado =
    'Olá, poderia separar por favor\n\n' +
    listaFormatada.join('\n') +
    `\n\nHá um total de ${total} peças, favor conferir por gentileza.`;

  return { itens, textoFormatado, contadorTipos, total };
}
