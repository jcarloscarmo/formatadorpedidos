function toggleTheme() {
            const root = document.documentElement;
            const currentTheme = root.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        }

        // Carregar tema salvo
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        function formatarPedido() {
            let mensagem = document.getElementById("entrada").value;
            if (!mensagem.trim()) {
                mostrarToast("Por favor, insira algum texto para formatar");
                return;
            }
            
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
                "película": "Película",
                "botao": "Botão",
            };

            let linhas = mensagem.split("\n").map(linha => linha.replace(/\[.*?\]\s*.*?:\s*/, ""));
            mensagem = linhas.join(" ");
            mensagem = mensagem.replace(/<.*?>|\(.*?\)/g, "");

            let listaFormatada = [];
            let itemAtual = "";
            let tipoAtual = "";
            let contadorTipos = {};

            let palavras = mensagem.toLowerCase().split(/\s+/);

            for (let i = 0; i < palavras.length; i++) {
                let palavra = palavras[i].trim();

                let tipoEncontrado = Object.keys(tiposPecas).find(tipo => {
                    const tipoPalavras = tipo.split(" ");
                    return tipoPalavras.every((t, idx) => palavras[i + idx] === t);
                });

                if (tipoEncontrado) {
                    if (itemAtual) {
                        listaFormatada.push(tipoAtual + " " + itemAtual.trim());
                        contadorTipos[tipoAtual] = (contadorTipos[tipoAtual] || 0) + 1;
                    }

                    tipoAtual = tiposPecas[tipoEncontrado];
                    itemAtual = "";

                    i += tipoEncontrado.split(" ").length - 1;
                } else if (tipoAtual) {
                    itemAtual += " " + palavra;
                }
            }

            if (itemAtual) {
                listaFormatada.push(tipoAtual + " " + itemAtual.trim());
                contadorTipos[tipoAtual] = (contadorTipos[tipoAtual] || 0) + 1;
            }

            let total = listaFormatada.length;
            let mensagemFinal = "Olá, poderia separar por favor\n\n" + listaFormatada.join("\n") + `\n\nHá um total de ${total} peças, favor conferir por gentileza.`;

            document.getElementById("resultado").innerText = mensagemFinal;
            
            // Atualiza estatísticas
            let estatisticasHtml = `<strong>Resumo do Pedido:</strong><br>`;
            estatisticasHtml += `Total de peças: ${total}<br>`;
            for (let tipo in contadorTipos) {
                estatisticasHtml += `${tipo}: ${contadorTipos[tipo]}<br>`;
            }
            document.getElementById("estatisticas").innerHTML = estatisticasHtml;
            
            mostrarToast("Pedido formatado com sucesso!");
        }

        function limparCampos() {
            document.getElementById("entrada").value = "";
            document.getElementById("resultado").innerText = "";
            document.getElementById("estatisticas").innerHTML = "";
            mostrarToast("Campos limpos!");
        }

        function copiarTexto() {
            let resultado = document.getElementById("resultado").innerText;
            let estatisticas = document.getElementById("estatisticas").innerText;
            if (!resultado) {
                mostrarToast("Não há texto para copiar!");
                return;
            }
            // Formata o resultado para WhatsApp
            let resultadoFormatado = resultado.split('\n').map(linha => {
                return linha.split(' ').map(palavra => {
                    if (palavra) {
                        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
                    }
                    return palavra;
                }).join(' ');
            }).join('\n');

            // Formata as estatísticas para WhatsApp
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

        function baixarTexto() {
            let texto = document.getElementById("resultado").innerText;
            if (!texto) {
                mostrarToast("Não há texto para baixar!");
                return;
            }
            
            let blob = new Blob([texto], { type: 'text/plain' });
            let url = window.URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'pedido_formatado.txt';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            mostrarToast("Arquivo baixado com sucesso!");
        }

        function mostrarToast(mensagem) {
            const toast = document.getElementById("toast");
            toast.textContent = mensagem;
            toast.style.display = "block";
            
            setTimeout(() => {
                toast.style.display = "none";
            }, 3000);
        }