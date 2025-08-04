// Função para alternar entre tema claro e escuro
function toggleTheme() {
    const root = document.documentElement; // Pega o elemento raiz do HTML
    const currentTheme = root.getAttribute('data-theme'); // Verifica o tema atual
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'; // Alterna o tema
    root.setAttribute('data-theme', newTheme); // Define o novo tema
    localStorage.setItem('theme', newTheme); // Salva o tema escolhido no navegador
}

// Carrega o tema salvo anteriormente, se existir
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Função principal para formatar o pedido
function formatarPedido() {
    let mensagem = document.getElementById("entrada").value; // Pega o texto do textarea
    if (!mensagem.trim()) {
        mostrarToast("Por favor, insira algum texto para formatar");
        return;
    }
    
    // Dicionário para identificar tipos de peças e padronizar nomes
    const tiposPecas = {
        "placa de carga": "Placa de carga",
        "tampa": "Tampa",
        "cola": "Cola",
        "frontal": "Tela",
        "tela": "Tela",
        "lente": "Lente",
        "câmera": "Câmera",
        "capa": "Capa",
        "flex": "Flex",
        "bateria": "Bateria",
        "botão": "Botão",
        "mic": "Microfone",
        "dock": "Dock",
        "conector": "Conector",
        "película": "Película 3D",
        "botao": "Botão",
        "camera": "Câmera",
        'dock': "Placa de carga",
        'usb': "USB",
        '3d': "Película 3D",
    };

    // Remove prefixos e caracteres especiais das linhas
    let linhas = mensagem.split("\n").map(linha => linha.replace(/\[.*?\]\s*.*?:\s*/, ""));
    mensagem = linhas.join(" ");
    mensagem = mensagem.replace(/<.*?>|\(.*?\)/g, "");

    let listaFormatada = []; // Lista final formatada
    let itemAtual = "";      // Texto do item atual
    let tipoAtual = "";      // Tipo da peça atual
    let contadorTipos = {};  // Contador de cada tipo de peça

    // Separa todas as palavras do texto
    let palavras = mensagem.toLowerCase().split(/\s+/);

    // Percorre todas as palavras para identificar tipos e itens
    for (let i = 0; i < palavras.length; i++) {
        let palavra = palavras[i].trim();

        // Procura se a palavra atual corresponde a algum tipo de peça
        let tipoEncontrado = Object.keys(tiposPecas).find(tipo => {
            const tipoPalavras = tipo.split(" ");
            return tipoPalavras.every((t, idx) => palavras[i + idx] === t);
        });

        if (tipoEncontrado) {
            // Se já estava montando um item, adiciona ele à lista
            if (itemAtual) {
                listaFormatada.push(tipoAtual + " " + itemAtual.trim());
                contadorTipos[tipoAtual] = (contadorTipos[tipoAtual] || 0) + 1;
            }

            // Atualiza o tipo atual e zera o item atual
            tipoAtual = tiposPecas[tipoEncontrado];
            itemAtual = "";

            // Pula as palavras que já foram usadas para identificar o tipo
            i += tipoEncontrado.split(" ").length - 1;
        } else if (tipoAtual) {
            // Se já tem um tipo, adiciona a palavra ao item atual
            itemAtual += " " + palavra;
        }
    }

    // Adiciona o último item, se existir
    if (itemAtual) {
        listaFormatada.push(tipoAtual + " " + itemAtual.trim());
        contadorTipos[tipoAtual] = (contadorTipos[tipoAtual] || 0) + 1;
    }

    // Monta a mensagem final para exibir
    let total = listaFormatada.length;
    let mensagemFinal = "Olá, poderia separar por favor\n\n" + listaFormatada.join("\n") + `\n\nHá um total de ${total} peças, favor conferir por gentileza.`;

    document.getElementById("resultado").innerText = mensagemFinal;
    
    // Monta o resumo das estatísticas
    let estatisticasHtml = `<strong>Resumo do Pedido:</strong><br>`;
    estatisticasHtml += `Total de peças: ${total}<br>`;
    for (let tipo in contadorTipos) {
        estatisticasHtml += `${tipo}: ${contadorTipos[tipo]}<br>`;
    }
    document.getElementById("estatisticas").innerHTML = estatisticasHtml;
    
    mostrarToast("Pedido formatado com sucesso!");
}

// Limpa todos os campos da tela
function limparCampos() {
    document.getElementById("entrada").value = "";
    document.getElementById("resultado").innerText = "";
    document.getElementById("estatisticas").innerHTML = "";
    mostrarToast("Campos limpos!");
}

// Copia o resultado e as estatísticas para a área de transferência
function copiarTexto() {
    let resultado = document.getElementById("resultado").innerText;
    let estatisticas = document.getElementById("estatisticas").innerText;
    if (!resultado) {
        mostrarToast("Não há texto para copiar!");
        return;
    }
    // Formata o resultado para WhatsApp (primeira letra maiúscula)
    let resultadoFormatado = resultado.split('\n').map(linha => {
        return linha.split(' ').map(palavra => {
            if (palavra) {
                return palavra.charAt(0).toUpperCase() + palavra.slice(1);
            }
            return palavra;
        }).join(' ');
    }).join('\n');

    // Formata as estatísticas para WhatsApp (negrito)
    let estatisticasFormatado = estatisticas
        .replace('Resumo do Pedido:', '*Resumo do Pedido:*')
        .replace('Total de peças:', '*Total de Peças:*')
        .split('\n')
        .map(linha => linha.replace(/^([^:]+):/, '*$1:*'))
        .join('\n');

    let textoCompleto = resultadoFormatado + '\n\n' + estatisticasFormatado;
    navigator.clipboard.writeText(textoCompleto).then(() => {
        mostrarToast("Texto copiado com sucesso!");
    }).catch(err => {
        mostrarToast("Erro ao copiar o texto!");
        console.error("Erro ao copiar o texto: ", err);
    });
}

// Baixa o resultado como um arquivo .txt
function baixarTexto() {
    let texto = document.getElementById("resultado").innerText;
    if (!texto) {
        mostrarToast("Não há texto para baixar!");
        return;
    }
    
    let blob = new Blob([texto], { type: 'text/plain' }); // Cria um arquivo de texto
    let url = window.URL.createObjectURL(blob); // Cria uma URL temporária
    let a = document.createElement('a'); // Cria um link
    a.href = url;
    a.download = 'pedido_formatado.txt'; // Nome do arquivo
    document.body.appendChild(a);
    a.click(); // Clica no link para baixar
    window.URL.revokeObjectURL(url); // Remove a URL temporária
    document.body.removeChild(a);
    
    mostrarToast("Arquivo baixado com sucesso!");
}

// Mostra uma mensagem temporária na tela (toast)
function mostrarToast(mensagem) {
    const toast = document.getElementById("toast");
    toast.textContent = mensagem;
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000); // Esconde após 3 segundos
}