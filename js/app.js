import {
  buscarProdutos,
  adicionarProduto,
  editarProduto,
  excluirProduto
} from "./produtos.js";

import {
  fazerLogin,
  sair,
  observarLogin
} from "./admin.js";

import {
  runTransaction,
  doc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import { db } from "../firebase/config.js";


// =====================================================
// CONFIGURAÇÕES
// =====================================================

const CORES_FALLBACK = ["g1", "g2", "g3", "g4"];

let produtos = [];
let carrinho = [];
let editandoId = null;
let fotoSelecionada = null;

let categoriaAtual = "todas";
let buscaAtual = "";
let ordenacaoAtual = "recentes";


// =====================================================
// STATUS DO PRODUTO
// =====================================================

function produtoDisponivel(produto) {
  return !produto.status || produto.status === "disponivel";
}

function produtoVendido(produto) {
  return produto.status === "vendido";
}


// =====================================================
// CARREGAR PRODUTOS
// =====================================================

async function carregarProdutos() {
  const grid = document.getElementById("gridProdutos");

  try {
    if (grid) {
      grid.innerHTML = `
        <p class="mensagem-produtos">
          Carregando peças...
        </p>
      `;
    }

    produtos = await buscarProdutos();

    renderGrid();
    renderVendidos();

  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);

    if (grid) {
      grid.innerHTML = `
        <p class="mensagem-produtos">
          Não foi possível carregar os produtos.
        </p>
      `;
    }

    alert(
      "Não consegui conectar ao banco de produtos. " +
      "Verifique a configuração do Firebase."
    );
  }
}


// =====================================================
// FORMATAÇÃO
// =====================================================

function formatar(valor) {
  return (
    "R$ " +
    Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}


// =====================================================
// FOTO
// =====================================================

function thumbHtml(produto) {
  if (!produto.foto) return "";

  return `<img src="${produto.foto}" alt="${produto.nome || ""}">`;
}


// =====================================================
// PRODUTOS VISÍVEIS
// =====================================================

function obterProdutosVisiveis() {
  let resultado = produtos.filter(produtoDisponivel);

  if (categoriaAtual !== "todas") {
    resultado = resultado.filter((produto) => {
      const categoria = String(produto.cat || "")
        .trim()
        .toLowerCase();

      const filtro = categoriaAtual
        .trim()
        .toLowerCase();

      return categoria === filtro;
    });
  }

  if (buscaAtual) {
    const busca = buscaAtual
      .toLowerCase()
      .trim();

    resultado = resultado.filter((produto) => {
      const nome = String(produto.nome || "")
        .toLowerCase();

      const categoria = String(produto.cat || "")
        .toLowerCase();

      return (
        nome.includes(busca) ||
        categoria.includes(busca)
      );
    });
  }

  if (ordenacaoAtual === "menor-preco") {
    resultado.sort(
      (a, b) => Number(a.preco) - Number(b.preco)
    );
  }

  if (ordenacaoAtual === "maior-preco") {
    resultado.sort(
      (a, b) => Number(b.preco) - Number(a.preco)
    );
  }

  if (ordenacaoAtual === "az") {
    resultado.sort((a, b) =>
      String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      )
    );
  }

  if (ordenacaoAtual === "za") {
    resultado.sort((a, b) =>
      String(b.nome || "").localeCompare(
        String(a.nome || ""),
        "pt-BR"
      )
    );
  }

  return resultado;
}


// =====================================================
// RESULTADO DOS FILTROS
// =====================================================

function atualizarResultadoFiltros(total) {
  const elemento = document.getElementById("resultadoFiltros");

  if (!elemento) return;

  const existeFiltro =
    categoriaAtual !== "todas" ||
    buscaAtual !== "";

  if (!existeFiltro) {
    elemento.textContent = "";
    return;
  }

  if (total === 0) {
    elemento.textContent = "Nenhuma peça encontrada.";
    return;
  }

  if (total === 1) {
    elemento.textContent = "1 peça encontrada.";
    return;
  }

  elemento.textContent = `${total} peças encontradas.`;
}


// =====================================================
// RENDERIZAR VITRINE
// =====================================================

function renderGrid() {
  const grid = document.getElementById("gridProdutos");

  if (!grid) return;

  const produtosVisiveis = obterProdutosVisiveis();

  atualizarResultadoFiltros(produtosVisiveis.length);

  const adminAtivo =
    document.body.classList.contains("modo-admin");

  if (produtosVisiveis.length === 0) {
    grid.innerHTML = `
      <div class="nenhum-produto">
        <strong>Nenhuma peça encontrada</strong>
        <span>
          Tente buscar por outro nome
          ou escolher outra categoria.
        </span>
      </div>
    `;

    if (adminAtivo) {
      grid.innerHTML += `
        <button class="card-nova" id="abrirNovoProduto">
          <span>+</span>
          Adicionar peça
        </button>
      `;

      document
        .getElementById("abrirNovoProduto")
        ?.addEventListener("click", () => {
          abrirModal(null);
        });
    }

    return;
  }

  let html = "";

  produtosVisiveis.forEach((produto) => {
    const classeCor =
      produto.foto
        ? ""
        : produto.cor || "g1";

    let botoesAdmin = "";

    if (adminAtivo) {
      botoesAdmin = `
        <div class="card-admin-actions">
          <button
            class="editar-btn"
            data-id="${produto.id}"
            aria-label="Editar ${produto.nome}"
          >
            ✎
          </button>

          <button
            class="excluir-btn"
            data-id="${produto.id}"
            aria-label="Excluir ${produto.nome}"
          >
            ✕
          </button>
        </div>
      `;
    }

    let botaoVendido = "";

    if (adminAtivo) {
      botaoVendido = `
        <button
          class="marcar-vendido-btn"
          data-id="${produto.id}"
          type="button"
        >
          ✓ Marcar como vendido
        </button>
      `;
    }

    html += `
      <div class="card">

        <div class="card-thumb ${classeCor}">

          ${thumbHtml(produto)}

          <span class="card-tag">
            ${produto.cat || "Novidade"}
          </span>

          ${botoesAdmin}

        </div>

        <div class="card-body">

          <span class="card-cat">
            brechó · tamanho único
          </span>

          <h3 class="card-nome">
            ${produto.nome}
          </h3>

          <div class="card-footer">

            <span class="card-preco">
              ${formatar(produto.preco)}
            </span>

            <button
              class="add-btn"
              data-id="${produto.id}"
              aria-label="Adicionar ${produto.nome} à sacola"
            >
              +
            </button>

          </div>

          ${botaoVendido}

        </div>

      </div>
    `;
  });

  if (adminAtivo) {
    html += `
      <button
        class="card-nova"
        id="abrirNovoProduto"
      >
        <span>+</span>
        Adicionar peça
      </button>
    `;
  }

  grid.innerHTML = html;

  document
    .getElementById("abrirNovoProduto")
    ?.addEventListener("click", () => {
      abrirModal(null);
    });
}


// =====================================================
// RENDERIZAR VENDIDOS
// =====================================================

function renderVendidos() {
  const grid = document.getElementById("gridVendidos");

  if (!grid) return;

  const vendidos =
    produtos.filter(produtoVendido);

  if (vendidos.length === 0) {
    grid.innerHTML = `
      <p class="mensagem-produtos">
        Ainda não temos peças vendidas por aqui.
      </p>
    `;

    return;
  }

  const adminAtivo =
    document.body.classList.contains("modo-admin");

  let html = "";

  vendidos.forEach((produto) => {
    const classeCor =
      produto.foto
        ? ""
        : produto.cor || "g1";

    let botao = "";

    if (adminAtivo) {
      botao = `
        <button
          class="voltar-disponivel-btn"
          data-id="${produto.id}"
          type="button"
        >
          ↺ Voltar para disponível
        </button>
      `;
    }

    html += `
      <div class="card vendido-card">

        <div class="card-thumb ${classeCor}">

          ${thumbHtml(produto)}

          <span class="card-tag">
            ${produto.cat || "Peça"}
          </span>

        </div>

        <div class="card-body">

          <span class="card-cat">
            peça · vendida
          </span>

          <h3 class="card-nome">
            ${produto.nome}
          </h3>

          <div class="card-footer">

            <span class="card-preco">
              ${formatar(produto.preco)}
            </span>

          </div>

          ${botao}

        </div>

      </div>
    `;
  });

  grid.innerHTML = html;
}


// =====================================================
// FILTROS DE CATEGORIA
// =====================================================

const filtrosCategoria =
  document.querySelectorAll(".filtro-categoria");

filtrosCategoria.forEach((botao) => {
  botao.addEventListener("click", () => {
    categoriaAtual =
      botao.dataset.categoria || "todas";

    filtrosCategoria.forEach((item) => {
      item.classList.remove("selecionado");
    });

    botao.classList.add("selecionado");

    renderGrid();

    document
      .getElementById("produtos")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  });
});


// =====================================================
// BUSCA
// =====================================================

const campoBusca =
  document.getElementById("campoBusca");

if (campoBusca) {
  campoBusca.addEventListener("input", () => {
    buscaAtual =
      campoBusca.value.trim();

    renderGrid();
  });
}


// =====================================================
// ORDENAÇÃO
// =====================================================

const ordenarProdutos =
  document.getElementById("ordenarProdutos");

if (ordenarProdutos) {
  ordenarProdutos.addEventListener("change", () => {
    ordenacaoAtual =
      ordenarProdutos.value;

    renderGrid();
  });
}


// =====================================================
// VER TUDO
// =====================================================

const verTudo =
  document.getElementById("verTudo");

if (verTudo) {
  verTudo.addEventListener("click", (e) => {
    e.preventDefault();

    categoriaAtual = "todas";
    buscaAtual = "";
    ordenacaoAtual = "recentes";

    if (campoBusca) {
      campoBusca.value = "";
    }

    if (ordenarProdutos) {
      ordenarProdutos.value = "recentes";
    }

    filtrosCategoria.forEach((botao) => {
      botao.classList.remove("selecionado");
    });

    document
      .querySelector(
        '.filtro-categoria[data-categoria="todas"]'
      )
      ?.classList.add("selecionado");

    renderGrid();

    document
      .getElementById("produtos")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  });
}


// =====================================================
// CARRINHO
// =====================================================

function renderCarrinho() {
  const container =
    document.getElementById("drawerItens");

  const badge =
    document.getElementById("cartBadge");

  const subtotalEl =
    document.getElementById("subtotalValor");

  if (!container || !badge || !subtotalEl) return;

  badge.textContent = carrinho.length;

  if (carrinho.length === 0) {
    container.innerHTML = `
      <p class="item-vazio">
        Sua sacola está vazia.
        Que tal dar uma olhada nas novidades?
      </p>
    `;
  } else {
    let html = "";

    carrinho.forEach((item, indice) => {
      const classeCor =
        item.foto
          ? ""
          : item.cor || "g1";

      const imagem =
        item.foto
          ? `<img src="${item.foto}" alt="">`
          : "";

      html += `
        <div class="item">

          <div class="item-thumb ${classeCor}">
            ${imagem}
          </div>

          <div class="item-info">

            <div class="nome">
              ${item.nome}
            </div>

            <div class="preco">
              ${formatar(item.preco)}
            </div>

            <button
              class="remover-btn"
              data-index="${indice}"
            >
              remover
            </button>

          </div>

        </div>
      `;
    });

    container.innerHTML = html;
  }

  const subtotal =
    carrinho.reduce(
      (total, item) =>
        total + Number(item.preco),
      0
    );

  subtotalEl.textContent =
    formatar(subtotal);
}


// =====================================================
// DRAWER
// =====================================================

const drawer =
  document.getElementById("drawer");

const overlay =
  document.getElementById("overlay");

function abrirDrawer() {
  drawer?.classList.add("aberto");
  overlay?.classList.add("aberto");
}

function fecharDrawer() {
  drawer?.classList.remove("aberto");
  overlay?.classList.remove("aberto");
}

document
  .getElementById("abrirCarrinho")
  ?.addEventListener("click", abrirDrawer);

document
  .getElementById("fecharCarrinho")
  ?.addEventListener("click", fecharDrawer);

overlay?.addEventListener("click", fecharDrawer);


// =====================================================
// CLIQUES NOS PRODUTOS
// =====================================================

document
  .getElementById("gridProdutos")
  ?.addEventListener("click", async (e) => {

    const addBtn =
      e.target.closest(".add-btn");

    const editBtn =
      e.target.closest(".editar-btn");

    const delBtn =
      e.target.closest(".excluir-btn");

    const vendidoBtn =
      e.target.closest(".marcar-vendido-btn");


    // =================================================
    // ADICIONAR AO CARRINHO
    // =================================================

    if (addBtn) {
      const produto =
        produtos.find(
          (item) =>
            item.id === addBtn.dataset.id
        );

      if (!produto) return;

      if (!produtoDisponivel(produto)) {
        alert("Essa peça já foi vendida.");
        return;
      }

      const jaExiste =
        carrinho.some(
          (item) => item.id === produto.id
        );

      if (jaExiste) {
        alert(
          "Essa peça já está na sua sacola."
        );

        abrirDrawer();
        return;
      }

      carrinho.push(produto);

      renderCarrinho();
      abrirDrawer();

      return;
    }


    // =================================================
    // MARCAR COMO VENDIDO
    // =================================================

    if (
      vendidoBtn &&
      document.body.classList.contains("modo-admin")
    ) {

      const id =
        vendidoBtn.dataset.id;

      const produto =
        produtos.find(
          (item) => item.id === id
        );

      if (!produto) return;

      const confirmar =
        confirm(
          `Marcar "${produto.nome}" como vendida?`
        );

      if (!confirmar) return;

      try {

        await editarProduto(id, {
          status: "vendido"
        });

        produtos =
          produtos.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                status: "vendido"
              };
            }

            return item;
          });

        carrinho =
          carrinho.filter(
            (item) => item.id !== id
          );

        renderGrid();
        renderVendidos();
        renderCarrinho();

        alert(
          `"${produto.nome}" foi marcada como vendida.`
        );

      } catch (erro) {

        console.error(
          "Erro ao marcar como vendido:",
          erro
        );

        alert(
          "Não foi possível marcar a peça como vendida."
        );
      }

      return;
    }


    // =================================================
    // EDITAR
    // =================================================

    if (
      editBtn &&
      document.body.classList.contains("modo-admin")
    ) {

      const produto =
        produtos.find(
          (item) => item.id === editBtn.dataset.id
        );

      if (produto) {
        abrirModal(produto);
      }

      return;
    }


    // =================================================
    // EXCLUIR
    // =================================================

    if (
      delBtn &&
      document.body.classList.contains("modo-admin")
    ) {

      const id =
        delBtn.dataset.id;

      const produto =
        produtos.find(
          (item) => item.id === id
        );

      if (!produto) return;

      if (
        !confirm(
          `Remover "${produto.nome}" da loja?`
        )
      ) {
        return;
      }

      try {

        await excluirProduto(id);

        produtos =
          produtos.filter(
            (item) => item.id !== id
          );

        carrinho =
          carrinho.filter(
            (item) => item.id !== id
          );

        renderGrid();
        renderVendidos();
        renderCarrinho();

      } catch (erro) {

        console.error(
          "Erro ao excluir produto:",
          erro
        );

        alert(
          "Não foi possível excluir o produto."
        );
      }
    }
  });


// =====================================================
// REMOVER DO CARRINHO
// =====================================================

document
  .getElementById("drawerItens")
  ?.addEventListener("click", (e) => {

    const botao =
      e.target.closest(".remover-btn");

    if (!botao) return;

    carrinho.splice(
      Number(botao.dataset.index),
      1
    );

    renderCarrinho();
  });


// =====================================================
// VOLTAR PARA DISPONÍVEL
// =====================================================

document
  .getElementById("gridVendidos")
  ?.addEventListener("click", async (e) => {

    const botao =
      e.target.closest(
        ".voltar-disponivel-btn"
      );

    if (!botao) return;

    if (
      !document.body.classList.contains(
        "modo-admin"
      )
    ) {
      return;
    }

    const id =
      botao.dataset.id;

    const produto =
      produtos.find(
        (item) => item.id === id
      );

    if (!produto) return;

    if (
      !confirm(
        `Voltar "${produto.nome}" para a vitrine?`
      )
    ) {
      return;
    }

    try {

      await editarProduto(id, {
        status: "disponivel"
      });

      produtos =
        produtos.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              status: "disponivel"
            };
          }

          return item;
        });

      renderGrid();
      renderVendidos();

    } catch (erro) {

      console.error(
        "Erro ao voltar produto:",
        erro
      );

      alert(
        "Não foi possível voltar a peça para disponível."
      );
    }
  });


// =====================================================
// FINALIZAR COMPRA
// =====================================================

document
  .getElementById("finalizarBtn")
  ?.addEventListener("click", async () => {

    if (carrinho.length === 0) {
      return;
    }

    const botao =
      document.getElementById(
        "finalizarBtn"
      );

    botao.disabled = true;

    botao.textContent =
      "Verificando disponibilidade...";


    try {

      await runTransaction(
        db,
        async (transaction) => {

          const referencias = [];

          // ---------------------------------------------
          // PRIMEIRO LÊ TODOS OS PRODUTOS
          // ---------------------------------------------

          for (const item of carrinho) {

            const referencia =
              doc(
                db,
                "produtos",
                item.id
              );

            referencias.push({
              referencia,
              item
            });
          }


          const snapshots = [];

          for (const item of referencias) {

            const snapshot =
              await transaction.get(
                item.referencia
              );

            snapshots.push({
              snapshot,
              item
            });
          }


          // ---------------------------------------------
          // VERIFICAR STATUS
          // ---------------------------------------------

          for (const item of snapshots) {

            if (!item.snapshot.exists()) {

              throw new Error(
                `A peça "${item.item.nome}" não existe mais.`
              );
            }

            const dados =
              item.snapshot.data();

            if (dados.status === "vendido") {

              throw new Error(
                `A peça "${item.item.nome}" acabou de ser vendida por outra pessoa.`
              );
            }
          }


          // ---------------------------------------------
          // MARCAR TODAS COMO VENDIDAS
          // ---------------------------------------------

          for (const item of snapshots) {

            transaction.update(
              item.item.referencia,
              {
                status: "vendido"
              }
            );
          }
        }
      );


      // =================================================
      // ATUALIZAR TELA
      // =================================================

      const idsVendidos =
        carrinho.map(
          (item) => item.id
        );

      produtos =
        produtos.map((produto) => {

          if (
            idsVendidos.includes(
              produto.id
            )
          ) {
            return {
              ...produto,
              status: "vendido"
            };
          }

          return produto;
        });

      carrinho = [];

      renderCarrinho();
      renderGrid();
      renderVendidos();

      fecharDrawer();

      alert(
        "Compra registrada com sucesso! 🎉\n\n" +
        "As peças foram marcadas como vendidas."
      );

    } catch (erro) {

      console.error(
        "Erro ao finalizar compra:",
        erro
      );

      try {
        produtos =
          await buscarProdutos();
      } catch (erroBanco) {
        console.error(
          "Erro ao atualizar produtos:",
          erroBanco
        );
      }

      carrinho =
        carrinho.filter((item) => {

          const produtoAtual =
            produtos.find(
              (produto) =>
                produto.id === item.id
            );

          return (
            produtoAtual &&
            produtoDisponivel(
              produtoAtual
            )
          );
        });

      renderCarrinho();
      renderGrid();
      renderVendidos();

      alert(
        erro.message ||
        "Não foi possível finalizar a compra."
      );

    } finally {

      botao.disabled = false;

      botao.textContent =
        "Finalizar compra";
    }
  });


// =====================================================
// ÁREA DA LOJA
// =====================================================

document
  .getElementById("abrirAreaLoja")
  ?.addEventListener("click", async (e) => {

    e.preventDefault();

    const email =
      prompt("E-mail da loja:");

    if (email === null) return;

    const senha =
      prompt("Senha da loja:");

    if (senha === null) return;

    const sucesso =
      await fazerLogin(
        email.trim(),
        senha
      );

    if (sucesso) {

      document.body.classList.add(
        "modo-admin"
      );

      alert(
        "Login realizado com sucesso!"
      );

      renderGrid();
      renderVendidos();

    } else {

      document.body.classList.remove(
        "modo-admin"
      );

      alert(
        "E-mail ou senha incorretos."
      );
    }
  });


// =====================================================
// OBSERVAR LOGIN
// =====================================================

observarLogin((usuario) => {

  if (usuario) {
    document.body.classList.add(
      "modo-admin"
    );
  } else {
    document.body.classList.remove(
      "modo-admin"
    );
  }

  renderGrid();
  renderVendidos();
});


// =====================================================
// SAIR DO ADMIN
// =====================================================

document
  .getElementById("sairAdmin")
  ?.addEventListener("click", async () => {

    try {

      await sair();

      document.body.classList.remove(
        "modo-admin"
      );

      renderGrid();
      renderVendidos();

    } catch (erro) {

      console.error(
        "Erro ao sair:",
        erro
      );

      alert(
        "Não foi possível sair da área da loja."
      );
    }
  });


// =====================================================
// MODAL
// =====================================================

const modalOverlay =
  document.getElementById("modalOverlay");

const campoNome =
  document.getElementById("campoNome");

const campoCategoria =
  document.getElementById("campoCategoria");

const campoPreco =
  document.getElementById("campoPreco");

const campoFoto =
  document.getElementById("campoFoto");

const previewFoto =
  document.getElementById("previewFoto");


// =====================================================
// PREÇO
// =====================================================

let valorDigitado = "";

function atualizarMascaraPreco() {

  if (!valorDigitado) {

    campoPreco.value = "";

    return;
  }

  const partes =
    valorDigitado.split(",");

  let reais =
    partes[0].replace(/\D/g, "");

  let centavos =
    partes[1]
      ? partes[1]
          .replace(/\D/g, "")
          .slice(0, 2)
      : null;

  if (!reais) {
    reais = "0";
  }

  reais =
    String(Number(reais));

  const reaisFormatados =
    Number(reais).toLocaleString(
      "pt-BR"
    );

  if (partes.length > 1) {

    campoPreco.value =
      "R$ " +
      reaisFormatados +
      "," +
      (centavos || "");

  } else {

    campoPreco.value =
      "R$ " +
      reaisFormatados;
  }

  const posicao =
    campoPreco.value.length;

  campoPreco.setSelectionRange(
    posicao,
    posicao
  );
}


// =====================================================
// DIGITAÇÃO DO PREÇO
// =====================================================

if (campoPreco) {

  campoPreco.addEventListener(
    "keydown",
    (e) => {

      if (
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }

      if (
        [
          "Tab",
          "Escape",
          "Enter"
        ].includes(e.key)
      ) {
        return;
      }

      if (e.key === "Backspace") {

        e.preventDefault();

        if (
          valorDigitado.includes(",")
        ) {

          const partes =
            valorDigitado.split(",");

          if (
            partes[1] &&
            partes[1].length > 0
          ) {

            partes[1] =
              partes[1].slice(0, -1);

            valorDigitado =
              partes.join(",");

          } else {

            valorDigitado =
              partes[0];
          }

        } else {

          valorDigitado =
            valorDigitado.slice(0, -1);
        }

        atualizarMascaraPreco();

        return;
      }

      if (
        e.key === "," ||
        e.key === "."
      ) {

        e.preventDefault();

        if (
          !valorDigitado.includes(",")
        ) {

          valorDigitado += ",";

          atualizarMascaraPreco();
        }

        return;
      }

      if (
        /^\d$/.test(e.key)
      ) {

        e.preventDefault();

        const partes =
          valorDigitado.split(",");

        if (
          partes.length > 1
        ) {

          if (
            partes[1].length < 2
          ) {

            partes[1] += e.key;

            valorDigitado =
              partes.join(",");
          }

        } else {

          partes[0] += e.key;

          valorDigitado =
            partes[0];
        }

        atualizarMascaraPreco();
      }
    }
  );


  // ===================================================
  // COLAR PREÇO
  // ===================================================

  campoPreco.addEventListener(
    "paste",
    (e) => {

      e.preventDefault();

      const texto =
        e.clipboardData.getData("text");

      let valor =
        texto
          .replace(/^R\$\s?/i, "")
          .replace(/\./g, "")
          .replace(",", ".")
          .replace(/[^\d.]/g, "");

      const numero =
        Number(valor);

      if (isNaN(numero)) {
        return;
      }

      valorDigitado =
        String(numero)
          .replace(".", ",");

      if (
        valorDigitado.includes(",")
      ) {

        const partes =
          valorDigitado.split(",");

        valorDigitado =
          partes[0] +
          "," +
          partes[1].slice(0, 2);
      }

      atualizarMascaraPreco();
    }
  );
}


// =====================================================
// ABRIR MODAL
// =====================================================

function abrirModal(produto) {

  editandoId =
    produto
      ? produto.id
      : null;

  fotoSelecionada =
    produto
      ? produto.foto || null
      : null;

  document.getElementById(
    "modalTitulo"
  ).textContent =
    produto
      ? "Editar peça"
      : "Nova peça";

  campoNome.value =
    produto
      ? produto.nome
      : "";

  campoCategoria.value =
    produto
      ? produto.cat || ""
      : "";

  if (produto) {

    const valor =
      Number(produto.preco);

    if (
      Number.isInteger(valor)
    ) {

      valorDigitado =
        String(valor);

    } else {

      valorDigitado =
        valor
          .toFixed(2)
          .replace(".", ",");
    }

    atualizarMascaraPreco();

  } else {

    valorDigitado = "";

    campoPreco.value = "";
  }

  campoFoto.value = "";

  if (fotoSelecionada) {

    previewFoto.src =
      fotoSelecionada;

    previewFoto.style.display =
      "block";

  } else {

    previewFoto.src = "";

    previewFoto.style.display =
      "none";
  }

  modalOverlay.classList.add(
    "aberto"
  );
}


// =====================================================
// FECHAR MODAL
// =====================================================

function fecharModal() {

  modalOverlay.classList.remove(
    "aberto"
  );
}


// =====================================================
// CANCELAR
// =====================================================

document
  .getElementById("cancelarModal")
  ?.addEventListener(
    "click",
    fecharModal
  );


// =====================================================
// CLICAR FORA
// =====================================================

modalOverlay?.addEventListener(
  "click",
  (e) => {

    if (
      e.target === modalOverlay
    ) {
      fecharModal();
    }
  }
);


// =====================================================
// FOTO
// =====================================================

if (campoFoto) {

  campoFoto.addEventListener(
    "change",
    () => {

      const arquivo =
        campoFoto.files[0];

      if (!arquivo) return;

      const leitor =
        new FileReader();

      leitor.onload = () => {

        fotoSelecionada =
          leitor.result;

        previewFoto.src =
          fotoSelecionada;

        previewFoto.style.display =
          "block";
      };

      leitor.readAsDataURL(
        arquivo
      );
    }
  );
}


// =====================================================
// SALVAR PRODUTO
// =====================================================

document
  .getElementById("salvarModal")
  ?.addEventListener(
    "click",
    async () => {

      const nome =
        campoNome.value.trim();

      const cat =
        campoCategoria.value.trim() ||
        "Novidade";

      const valorParaSalvar =
        valorDigitado
          .replace(/\./g, "")
          .replace(",", ".");

      const preco =
        Number(valorParaSalvar);

      if (
        !nome ||
        !valorDigitado ||
        isNaN(preco)
      ) {

        alert(
          "Preencha ao menos o nome e o preço da peça."
        );

        return;
      }

      const botao =
        document.getElementById(
          "salvarModal"
        );

      botao.disabled = true;

      botao.textContent =
        "Salvando...";

      try {

        // =============================================
        // EDITAR
        // =============================================

        if (editandoId) {

          const dadosAtualizados = {
            nome,
            cat,
            preco
          };

          if (fotoSelecionada) {
            dadosAtualizados.foto =
              fotoSelecionada;
          }

          await editarProduto(
            editandoId,
            dadosAtualizados
          );

          const indice =
            produtos.findIndex(
              (produto) =>
                produto.id === editandoId
            );

          if (indice !== -1) {

            produtos[indice] = {
              ...produtos[indice],
              ...dadosAtualizados
            };
          }

        }

        // =============================================
        // NOVO
        // =============================================

        else {

          const novoProduto = {

            nome,

            cat,

            preco,

            status: "disponivel",

            cor:
              CORES_FALLBACK[
                produtos.length %
                CORES_FALLBACK.length
              ],

            foto:
              fotoSelecionada || null
          };

          const produtoCriado =
            await adicionarProduto(
              novoProduto
            );

          produtos.push(
            produtoCriado
          );
        }

        renderGrid();
        renderVendidos();

        fecharModal();

      } catch (erro) {

        console.error(
          "Erro ao salvar produto:",
          erro
        );

        alert(
          "Não consegui salvar o produto no Firebase.\n\n" +
          "Confira as regras do Firestore e a conexão com o Firebase."
        );

      } finally {

        botao.disabled = false;

        botao.textContent =
          "Salvar peça";
      }
    }
  );


// =====================================================
// INICIAR
// =====================================================

carregarProdutos();

renderCarrinho();
