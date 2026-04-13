# LojaCell Pedidos

Sistema SPA para gestão de pedidos de peças com persistência local em `localStorage`.

## Stack

- HTML5
- CSS3
- JavaScript Vanilla com módulos ES6
- Persistência em `localStorage`

## Fluxo Atual

1. `Novo Pedido`
   Cole o texto bruto do pedido.
   O sistema identifica as peças, cria o pedido e gera a mensagem formatada para WhatsApp.

2. `Fila`
   Mostra pedidos aguardando conferência.

3. `Conferência`
   Permite validar recebimento, definir preço por peça e informar frete.
   Ao faturar, o pedido vai para o relatório.

4. `Relatório`
   Mostra pedidos faturados, total acumulado e divergências.
   Também permite edição rápida de pedidos faturados.

5. `Revisão`
   Mostra as peças do período selecionado.
   Nessa etapa é possível marcar peças como `devolvido`.

6. `Visualização`
   Prévia final pronta para impressão.
   O salvamento em PDF é feito pelo próprio navegador via `window.print()`.

## Edição Rápida no Relatório

Na tela de relatório, clique em um pedido faturado para expandir a edição.

Você pode:

- editar frete
- editar tipo, nome e valor da peça
- marcar `Recebida`
- marcar `Divergência`
- marcar `Devolvido`
- incluir nova peça já com preço
- excluir peça
- salvar alterações
- excluir o pedido inteiro

## Persistência

Os pedidos ficam salvos no navegador usando `localStorage`.

Chave principal usada pelo sistema original:

- `lojacell_pedidos`

Observação:

- o botão `Zerar Memória` atualmente usa `localStorage.clear()` e limpa todo o armazenamento local do navegador para este domínio.

## IDs de Pedido

Formato:

- `DDMM-SXX`

Exemplo:

- `1304-SEG01`

Na interface é exibido apenas o sufixo:

- `SEG01`

## Flags dos Itens

Cada item pode carregar os seguintes estados:

- `recebido`
- `divergencia`
- `devolvido`

Regras:

- item com `divergencia` não entra no total
- item com `devolvido` é abatido do total

## Geração de PDF

A geração direta por biblioteca foi substituída por uma prévia imprimível.

Fluxo recomendado:

1. abrir a prévia do relatório
2. revisar devoluções
3. abrir visualização
4. usar `Salvar em PDF / Imprimir`

## Ajuda na Interface

O sistema possui botões `(?)` com explicações rápidas em balões nas telas principais e nas áreas mais importantes do fluxo.

No desktop, o balão aparece ao passar o mouse.

No mobile, o balão pode ser aberto com toque.

## Fluxo Guiado

As etapas de relatório agora exibem um indicador visual de progresso:

1. `Relatório`
2. `Revisão`
3. `Visualização`

Isso ajuda a deixar claro em qual ponto do processo você está antes de imprimir ou salvar em PDF.

## Desenvolvimento Local

Abra o projeto em servidor local, por exemplo:

- Live Server
- `http-server`
- outro servidor estático simples

Evite abrir por `file://`.
