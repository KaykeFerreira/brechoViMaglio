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


// =====================================================
// CONFIGURAÇÕES
// =====================================================

const CORES_FALLBACK = ['g1', 'g2', 'g3', 'g4'];

let produtos = [];
let carrinho = [];
let editandoId = null;
let fotoSelecionada = null;


// =====================================================
// FILTROS DA VITRINE
// =====================================================

let categoriaAtual = 'todas';
let buscaAtual = '';
let ordenacaoAtual = 'recentes';


// =====================================================
// CARREGAR PRODUTOS DO FIRESTORE
// =====================================================

async function carregarProdutos() {

  const grid = document.getElementById('gridProdutos');

  try {

    grid.innerHTML = `
      <p style="color:var(--tinta-suave); grid-column:1/-1;">
        Carregando peças...
      </p>
    `;

    produtos = await buscarProdutos();

    renderGrid();

  } catch (erro) {

    console.error("Erro ao carregar produtos:", erro);

    grid.innerHTML = `
      <p style="color:var(--tinta-suave); grid-column:1/-1;">
        Não foi possível carregar os produtos.
      </p>
    `;

    alert(
      "Não consegui conectar ao banco de produtos. " +
      "Verifique a configuração do Firebase."
    );
  }
}


// =====================================================
// FORMATAÇÃO
// =====================================================

function formatar(v) {

  return 'R$ ' +
    Number(v).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

}


// =====================================================
// FOTO
// =====================================================

function thumbHtml(p) {

  return p.foto
    ? `<img src="${p.foto}" alt="${p.nome}">`
    : '';

}


// =====================================================
// OBTER PRODUTOS FILTRADOS
// =====================================================

function obterProdutosVisiveis() {

  let resultado = [...produtos];


  // ===================================================
  // FILTRO POR CATEGORIA
  // ===================================================

  if (categoriaAtual !== 'todas') {

    resultado = resultado.filter(p => {

      const categoria =
        String(p.cat || '').trim().toLowerCase();

      const filtro =
        categoriaAtual.trim().toLowerCase();

      return categoria === filtro;

    });

  }


  // ===================================================
  // BUSCA POR NOME OU CATEGORIA
  // ===================================================

  if (buscaAtual) {

    const busca =
      buscaAtual.toLowerCase().trim();

    resultado = resultado.filter(p => {

      const nome =
        String(p.nome || '').toLowerCase();

      const categoria =
        String(p.cat || '').toLowerCase();

      return (
        nome.includes(busca) ||
        categoria.includes(busca)
      );

    });

  }


  // ===================================================
  // ORDENAÇÃO
  // ===================================================

  if (ordenacaoAtual === 'menor-preco') {

    resultado.sort(
      (a, b) =>
        Number(a.preco) - Number(b.preco)
    );

  }


  else if (ordenacaoAtual === 'maior-preco') {

    resultado.sort(
      (a, b) =>
        Number(b.preco) - Number(a.preco)
    );

  }


  else if (ordenacaoAtual === 'az') {

    resultado.sort(
      (a, b) =>
        String(a.nome || '').localeCompare(
          String(b.nome || ''),
          'pt-BR'
        )
    );

  }


  else if (ordenacaoAtual === 'za') {

    resultado.sort(
      (a, b) =>
        String(b.nome || '').localeCompare(
          String(a.nome || ''),
          'pt-BR'
        )
    );

  }


  // "recentes" mantém a ordem original
  // recebida do Firestore.


  return resultado;

}


// =====================================================
// ATUALIZAR TEXTO DOS RESULTADOS
// =====================================================

function atualizarResultadoFiltros(total) {

  const resultadoEl =
    document.getElementById('resultadoFiltros');

  if (!resultadoEl) return;


  const existeFiltro =
    categoriaAtual !== 'todas' ||
    buscaAtual !== '';


  if (!existeFiltro) {

    resultadoEl.textContent = '';

    return;

  }


  if (total === 0) {

    resultadoEl.textContent =
      'Nenhuma peça encontrada.';

    return;

  }


  if (total === 1) {

    resultadoEl.textContent =
      '1 peça encontrada.';

    return;

  }


  resultadoEl.textContent =
    `${total} peças encontradas.`;

}


// =====================================================
// RENDERIZAR PRODUTOS
// =====================================================

function renderGrid() {

  const grid =
    document.getElementById('gridProdutos');


  const produtosVisiveis =
    obterProdutosVisiveis();


  atualizarResultadoFiltros(
    produtosVisiveis.length
  );


  // ===================================================
  // NENHUM PRODUTO ENCONTRADO
  // ===================================================

  if (produtosVisiveis.length === 0) {

    grid.innerHTML = `

      <div
        class="nenhum-produto"
        style="grid-column:1/-1;"
      >

        <strong>
          Nenhuma peça encontrada
        </strong>

        <span>
          Tente buscar por outro nome
          ou escolher outra categoria.
        </span>

      </div>

    `;


    // O botão de adicionar precisa continuar
    // aparecendo para o administrador.

    if (
      document.body.classList.contains('modo-admin')
    ) {

      grid.innerHTML += `

        <button
          class="card-nova"
          id="abrirNovoProduto"
        >

          <span>+</span>

          Adicionar peça

        </button>

      `;

      document
        .getElementById('abrirNovoProduto')
        ?.addEventListener(
          'click',
          () => abrirModal(null)
        );

    }

    return;

  }


  // ===================================================
  // PRODUTOS
  // ===================================================

  grid.innerHTML =
    produtosVisiveis.map(p => `

      <div class="card">

        <div
          class="card-thumb ${p.foto ? '' : p.cor || 'g1'}"
        >

          ${thumbHtml(p)}


          <span class="card-tag">
            ${p.cat || 'Novidade'}
          </span>


          <div class="card-admin-actions">

            <button
              class="editar-btn"
              data-id="${p.id}"
              aria-label="Editar ${p.nome}"
            >
              ✎
            </button>


            <button
              class="excluir-btn"
              data-id="${p.id}"
              aria-label="Excluir ${p.nome}"
            >
              ✕
            </button>

          </div>

        </div>


        <div class="card-body">

          <span class="card-cat">
            brechó · tamanho único
          </span>


          <h3 class="card-nome">
            ${p.nome}
          </h3>


          <div class="card-footer">

            <span class="card-preco">
              ${formatar(p.preco)}
            </span>


            <button
              class="add-btn"
              data-id="${p.id}"
              aria-label="Adicionar ${p.nome} à sacola"
            >
              +
            </button>

          </div>

        </div>

      </div>

    `).join('');


  // ===================================================
  // BOTÃO ADMIN
  // ===================================================

  if (
    document.body.classList.contains('modo-admin')
  ) {

    grid.innerHTML += `

      <button
        class="card-nova"
        id="abrirNovoProduto"
      >

        <span>+</span>

        Adicionar peça

      </button>

    `;

  }


  document
    .getElementById('abrirNovoProduto')
    ?.addEventListener(
      'click',
      () => abrirModal(null)
    );

}


// =====================================================
// FILTROS — CATEGORIAS
// =====================================================

const filtrosCategoria =
  document.querySelectorAll(
    '.filtro-categoria'
  );


filtrosCategoria.forEach(botao => {

  botao.addEventListener(
    'click',
    () => {

      categoriaAtual =
        botao.dataset.categoria ||
        'todas';


      // Remove seleção anterior

      filtrosCategoria.forEach(item => {

        item.classList.remove('selecionado');

      });


      // Seleciona botão atual

      botao.classList.add(
        'selecionado'
      );


      renderGrid();


      // Leva o usuário para os produtos

      document
        .getElementById('produtos')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    }
  );

});


// =====================================================
// BUSCA
// =====================================================

const campoBusca =
  document.getElementById(
    'campoBusca'
  );


if (campoBusca) {

  campoBusca.addEventListener(
    'input',
    () => {

      buscaAtual =
        campoBusca.value.trim();


      renderGrid();

    }
  );

}


// =====================================================
// ORDENAÇÃO
// =====================================================

const ordenarProdutos =
  document.getElementById(
    'ordenarProdutos'
  );


if (ordenarProdutos) {

  ordenarProdutos.addEventListener(
    'change',
    () => {

      ordenacaoAtual =
        ordenarProdutos.value;


      renderGrid();

    }
  );

}


// =====================================================
// VER TUDO
// =====================================================

const verTudo =
  document.getElementById(
    'verTudo'
  );


if (verTudo) {

  verTudo.addEventListener(
    'click',
    e => {

      e.preventDefault();


      categoriaAtual =
        'todas';

      buscaAtual =
        '';

      ordenacaoAtual =
        'recentes';


      if (campoBusca) {

        campoBusca.value = '';

      }


      if (ordenarProdutos) {

        ordenarProdutos.value =
          'recentes';

      }


      filtrosCategoria.forEach(botao => {

        botao.classList.remove(
          'selecionado'
        );

      });


      const todas =
        document.querySelector(
          '.filtro-categoria[data-categoria="todas"]'
        );


      todas?.classList.add(
        'selecionado'
      );


      renderGrid();


      document
        .getElementById('produtos')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    }
  );

}


// =====================================================
// CARRINHO
// =====================================================

function renderCarrinho() {

  const container =
    document.getElementById('drawerItens');

  const badge =
    document.getElementById('cartBadge');

  const subtotalEl =
    document.getElementById('subtotalValor');


  badge.textContent =
    carrinho.length;


  container.innerHTML =
    carrinho.length === 0

      ? `
        <p class="item-vazio">
          Sua sacola está vazia.
          Que tal dar uma olhada nas novidades?
        </p>
      `

      : carrinho.map((item, i) => `

        <div class="item">

          <div
            class="item-thumb ${item.foto ? '' : item.cor || 'g1'}"
          >

            ${
              item.foto
                ? `<img src="${item.foto}" alt="">`
                : ''
            }

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
              data-index="${i}"
            >
              remover
            </button>

          </div>

        </div>

      `).join('');


  subtotalEl.textContent =
    formatar(
      carrinho.reduce(
        (s, i) => s + Number(i.preco),
        0
      )
    );

}


// =====================================================
// DRAWER DO CARRINHO
// =====================================================

const drawer =
  document.getElementById('drawer');

const overlay =
  document.getElementById('overlay');


function abrirDrawer() {

  drawer.classList.add('aberto');

  overlay.classList.add('aberto');

}


function fecharDrawer() {

  drawer.classList.remove('aberto');

  overlay.classList.remove('aberto');

}


document
  .getElementById('abrirCarrinho')
  .addEventListener(
    'click',
    abrirDrawer
  );


document
  .getElementById('fecharCarrinho')
  .addEventListener(
    'click',
    fecharDrawer
  );


overlay.addEventListener(
  'click',
  fecharDrawer
);


// =====================================================
// CLIQUES NOS PRODUTOS
// =====================================================

document
  .getElementById('gridProdutos')
  .addEventListener(
    'click',
    async (e) => {

      const addBtn =
        e.target.closest('.add-btn');

      const editBtn =
        e.target.closest('.editar-btn');

      const delBtn =
        e.target.closest('.excluir-btn');


      // -----------------------------------------------
      // ADICIONAR AO CARRINHO
      // -----------------------------------------------

      if (addBtn) {

        const p =
          produtos.find(
            x => x.id === addBtn.dataset.id
          );

        if (!p) return;

        carrinho.push(p);

        renderCarrinho();

        abrirDrawer();

        return;
      }


      // -----------------------------------------------
      // EDITAR
      // -----------------------------------------------

      if (
        editBtn &&
        document.body.classList.contains('modo-admin')
      ) {

        const produto =
          produtos.find(
            x => x.id === editBtn.dataset.id
          );

        if (produto) {

          abrirModal(produto);

        }

        return;
      }


      // -----------------------------------------------
      // EXCLUIR
      // -----------------------------------------------

      if (
        delBtn &&
        document.body.classList.contains('modo-admin')
      ) {

        const id =
          delBtn.dataset.id;

        const produto =
          produtos.find(
            x => x.id === id
          );

        if (!produto) return;


        if (
          confirm(
            `Remover "${produto.nome}" da loja?`
          )
        ) {

          try {

            await excluirProduto(id);

            produtos =
              produtos.filter(
                x => x.id !== id
              );

            renderGrid();

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
      }
    }
  );


// =====================================================
// REMOVER DO CARRINHO
// =====================================================

document
  .getElementById('drawerItens')
  .addEventListener(
    'click',
    e => {

      const btn =
        e.target.closest('.remover-btn');

      if (!btn) return;

      carrinho.splice(
        Number(btn.dataset.index),
        1
      );

      renderCarrinho();

    }
  );


// =====================================================
// FINALIZAR COMPRA
// =====================================================

document
  .getElementById('finalizarBtn')
  .addEventListener(
    'click',
    () => {

      if (carrinho.length === 0) return;

      alert(
        'Aqui vai entrar o pagamento de verdade ' +
        '(Pix / cartão) quando conectarmos o backend. ' +
        'Por enquanto isso é uma demonstração visual!'
      );

    }
  );


// =====================================================
// MODO ADMIN — FIREBASE AUTHENTICATION
// =====================================================

document
  .getElementById('abrirAreaLoja')
  .addEventListener(
    'click',
    async e => {

      e.preventDefault();


      const email =
        prompt(
          'E-mail da loja:'
        );

      if (email === null) return;


      const senha =
        prompt(
          'Senha da loja:'
        );

      if (senha === null) return;


      const sucesso =
        await fazerLogin(
          email.trim(),
          senha
        );


      if (sucesso) {

        document.body.classList.add(
          'modo-admin'
        );

        alert(
          'Login realizado com sucesso!'
        );

        renderGrid();

      } else {

        document.body.classList.remove(
          'modo-admin'
        );

        alert(
          'E-mail ou senha incorretos.'
        );

      }

    }
  );


// =====================================================
// OBSERVAR ESTADO DO LOGIN
// =====================================================

observarLogin(
  usuario => {

    if (usuario) {

      document.body.classList.add(
        'modo-admin'
      );

    } else {

      document.body.classList.remove(
        'modo-admin'
      );

    }

    renderGrid();

  }
);


// =====================================================
// SAIR DA ÁREA ADMIN
// =====================================================

document
  .getElementById('sairAdmin')
  .addEventListener(
    'click',
    async () => {

      try {

        await sair();

        document.body.classList.remove(
          'modo-admin'
        );

        renderGrid();

      } catch (erro) {

        console.error(
          'Erro ao sair:',
          erro
        );

        alert(
          'Não foi possível sair da área da loja.'
        );

      }

    }
  );


// =====================================================
// MODAL
// =====================================================

const modalOverlay =
  document.getElementById('modalOverlay');

const campoNome =
  document.getElementById('campoNome');

const campoCategoria =
  document.getElementById('campoCategoria');

const campoPreco =
  document.getElementById('campoPreco');

const campoFoto =
  document.getElementById('campoFoto');

const previewFoto =
  document.getElementById('previewFoto');


// =====================================================
// MÁSCARA DE PREÇO
// =====================================================

let valorDigitado = '';


// =====================================================
// FORMATAR PREÇO DO CAMPO
// =====================================================

function atualizarMascaraPreco() {

  if (!valorDigitado) {

    campoPreco.value = '';

    return;
  }


  let partes =
    valorDigitado.split(',');


  let reais =
    partes[0].replace(/\D/g, '');


  let centavos =
    partes[1]
      ? partes[1].replace(/\D/g, '').slice(0, 2)
      : null;


  if (!reais) {

    reais = '0';

  }


  reais =
    String(
      Number(reais)
    );


  const reaisFormatados =
    Number(reais).toLocaleString(
      'pt-BR'
    );


  if (partes.length > 1) {

    campoPreco.value =
      'R$ ' +
      reaisFormatados +
      ',' +
      (centavos || '');

  } else {

    campoPreco.value =
      'R$ ' +
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

campoPreco.addEventListener(
  'keydown',
  e => {

    if (
      e.ctrlKey ||
      e.metaKey
    ) {

      return;
    }


    if (
      [
        'Tab',
        'Escape',
        'Enter'
      ].includes(e.key)
    ) {

      return;
    }


    // -----------------------------------------------
    // BACKSPACE
    // -----------------------------------------------

    if (e.key === 'Backspace') {

      e.preventDefault();


      if (
        valorDigitado.includes(',')
      ) {

        const partes =
          valorDigitado.split(',');


        if (
          partes[1] &&
          partes[1].length > 0
        ) {

          partes[1] =
            partes[1].slice(0, -1);

          valorDigitado =
            partes.join(',');

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


    // -----------------------------------------------
    // VÍRGULA
    // -----------------------------------------------

    if (e.key === ',') {

      e.preventDefault();


      if (
        !valorDigitado.includes(',')
      ) {

        valorDigitado += ',';

        atualizarMascaraPreco();

      }

      return;
    }


    // -----------------------------------------------
    // PONTO
    // -----------------------------------------------

    if (e.key === '.') {

      e.preventDefault();


      if (
        !valorDigitado.includes(',')
      ) {

        valorDigitado += ',';

        atualizarMascaraPreco();

      }

      return;
    }


    // -----------------------------------------------
    // NÚMEROS
    // -----------------------------------------------

    if (/^\d$/.test(e.key)) {

      e.preventDefault();


      const partes =
        valorDigitado.split(',');


      if (
        partes.length > 1
      ) {

        if (
          partes[1].length < 2
        ) {

          partes[1] += e.key;

          valorDigitado =
            partes.join(',');

        }

      }


      else {

        partes[0] += e.key;

        valorDigitado =
          partes[0];

      }


      atualizarMascaraPreco();

    }

  }
);


// =====================================================
// COLAR PREÇO
// =====================================================

campoPreco.addEventListener(
  'paste',
  e => {

    e.preventDefault();


    const texto =
      e.clipboardData.getData('text');


    let valor =
      texto
        .replace(/^R\$\s?/i, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.]/g, '');


    const numero =
      Number(valor);


    if (
      isNaN(numero)
    ) {

      return;

    }


    valorDigitado =
      String(numero)
        .replace('.', ',');


    if (
      valorDigitado.includes(',')
    ) {

      const partes =
        valorDigitado.split(',');

      valorDigitado =
        partes[0] +
        ',' +
        partes[1].slice(0, 2);

    }


    atualizarMascaraPreco();

  }
);


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
    'modalTitulo'
  ).textContent =
    produto
      ? 'Editar peça'
      : 'Nova peça';


  campoNome.value =
    produto
      ? produto.nome
      : '';


  campoCategoria.value =
    produto
      ? produto.cat || ''
      : '';


  // -----------------------------------------------
  // PREÇO
  // -----------------------------------------------

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
          .replace('.', ',');

    }


    atualizarMascaraPreco();

  } else {

    valorDigitado = '';

    campoPreco.value = '';

  }


  campoFoto.value = '';


  if (fotoSelecionada) {

    previewFoto.src =
      fotoSelecionada;

    previewFoto.style.display =
      'block';

  } else {

    previewFoto.src = '';

    previewFoto.style.display =
      'none';

  }


  modalOverlay.classList.add(
    'aberto'
  );

}


// =====================================================
// FECHAR MODAL
// =====================================================

function fecharModal() {

  modalOverlay.classList.remove(
    'aberto'
  );

}


// =====================================================
// CANCELAR MODAL
// =====================================================

document
  .getElementById('cancelarModal')
  .addEventListener(
    'click',
    fecharModal
  );


// =====================================================
// CLICAR FORA DO MODAL
// =====================================================

modalOverlay.addEventListener(
  'click',
  e => {

    if (
      e.target === modalOverlay
    ) {

      fecharModal();

    }

  }
);


// =====================================================
// SELECIONAR FOTO
// =====================================================

campoFoto.addEventListener(
  'change',
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
        'block';

    };


    leitor.readAsDataURL(
      arquivo
    );

  }
);


// =====================================================
// SALVAR PRODUTO
// =====================================================

document
  .getElementById('salvarModal')
  .addEventListener(
    'click',
    async () => {

      const nome =
        campoNome.value.trim();


      const cat =
        campoCategoria.value.trim() ||
        'Novidade';


      // -----------------------------------------------
      // CONVERTER PREÇO
      // -----------------------------------------------

      const valorParaSalvar =
        valorDigitado
          .replace(/\./g, '')
          .replace(',', '.');


      const preco =
        Number(valorParaSalvar);


      // -----------------------------------------------
      // VALIDAÇÃO
      // -----------------------------------------------

      if (
        !nome ||
        !valorDigitado ||
        isNaN(preco)
      ) {

        alert(
          'Preencha ao menos o nome e o preço da peça.'
        );

        return;
      }


      // -----------------------------------------------
      // DESABILITAR BOTÃO
      // -----------------------------------------------

      const botao =
        document.getElementById(
          'salvarModal'
        );


      botao.disabled =
        true;


      botao.textContent =
        'Salvando...';


      try {

        // =================================================
        // EDITAR PRODUTO
        // =================================================

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
              x =>
                x.id === editandoId
            );


          if (indice !== -1) {

            produtos[indice] = {

              ...produtos[indice],

              ...dadosAtualizados

            };

          }


        }


        // =================================================
        // NOVO PRODUTO
        // =================================================

        else {

          const novoProduto = {

            nome,

            cat,

            preco,

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


        // -----------------------------------------------
        // ATUALIZAR TELA
        // -----------------------------------------------

        renderGrid();

        fecharModal();


      } catch (erro) {

        console.error(
          'Erro ao salvar produto:',
          erro
        );


        alert(
          'Não consegui salvar o produto no Firebase.\n\n' +
          'Confira as regras do Firestore e a conexão com o Firebase.'
        );


      } finally {

        botao.disabled =
          false;

        botao.textContent =
          'Salvar peça';

      }

    }
  );


// =====================================================
// INICIAR
// =====================================================

carregarProdutos();

renderCarrinho();
