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

// Guarda somente os números digitados no preço.
// Exemplo: "1500" = R$ 1.500,00
let precoNumeros = '';


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
// FORMATAÇÃO DE PREÇO DOS PRODUTOS
// =====================================================

function formatar(v) {

  return 'R$ ' +
    Number(v).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

}


// =====================================================
// FORMATAR CAMPO DE PREÇO
// =====================================================

function formatarPrecoInput() {

  if (!precoNumeros) {

    campoPreco.value = '';

    return;
  }

  const numero = Number(precoNumeros);

  campoPreco.value =
    'R$ ' +
    numero.toLocaleString('pt-BR', {
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
// RENDERIZAR PRODUTOS
// =====================================================

function renderGrid() {

  const grid = document.getElementById('gridProdutos');

  grid.innerHTML = produtos.map(p => `

    <div class="card">

      <div class="card-thumb ${p.foto ? '' : p.cor || 'g1'}">

        ${thumbHtml(p)}

        <span class="card-tag">
          ${p.cat || 'Novidade'}
        </span>

        <div class="card-admin-actions">

          <button
            class="editar-btn"
            data-id="${p.id}"
            aria-label="Editar ${p.nome}">
            ✎
          </button>

          <button
            class="excluir-btn"
            data-id="${p.id}"
            aria-label="Excluir ${p.nome}">
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
            aria-label="Adicionar ${p.nome} à sacola">
            +
          </button>

        </div>

      </div>

    </div>

  `).join('') + `

    <button class="card-nova" id="abrirNovoProduto">

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

          <div class="item-thumb ${item.foto ? '' : item.cor || 'g1'}">

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
              data-index="${i}">
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

campoPreco.addEventListener(
  'keydown',
  e => {

    // Permite atalhos como Ctrl+A, Ctrl+C, Ctrl+V
    if (
      e.ctrlKey ||
      e.metaKey
    ) {

      // Ctrl+A será tratado quando o próximo
      // número for digitado.
      if (
        e.key.toLowerCase() === 'a'
      ) {
        return;
      }

      return;
    }


    // Permitir teclas de navegação
    if (
      [
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End'
      ].includes(e.key)
    ) {
      return;
    }


    // BACKSPACE
    if (e.key === 'Backspace') {

      e.preventDefault();

      if (
        campoPreco.selectionStart !==
        campoPreco.selectionEnd
      ) {

        precoNumeros = '';

      } else {

        precoNumeros =
          precoNumeros.slice(0, -1);

      }

      formatarPrecoInput();

      return;
    }


    // DELETE
    if (e.key === 'Delete') {

      e.preventDefault();

      precoNumeros = '';

      formatarPrecoInput();

      return;
    }


    // SOMENTE NÚMEROS
    if (/^\d$/.test(e.key)) {

      e.preventDefault();


      // Se o usuário selecionou tudo,
      // começa um novo preço.
      if (
        campoPreco.selectionStart !==
        campoPreco.selectionEnd
      ) {

        precoNumeros = '';

      }


      precoNumeros += e.key;


      // Limita para evitar números absurdamente grandes
      if (precoNumeros.length > 12) {

        precoNumeros =
          precoNumeros.slice(0, 12);

      }


      formatarPrecoInput();

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

    const numeros =
      texto.replace(/\D/g, '');

    if (!numeros) return;

    precoNumeros =
      numeros.slice(0, 12);

    formatarPrecoInput();

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

    precoNumeros =
      String(
        Math.round(
          Number(produto.preco)
        )
      );

    formatarPrecoInput();

  } else {

    precoNumeros = '';

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
      // PREÇO
      // -----------------------------------------------

      const preco =
        Number(precoNumeros);


      // -----------------------------------------------
      // VALIDAÇÃO
      // -----------------------------------------------

      if (
        !nome ||
        !precoNumeros ||
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


        } else {


          // =================================================
          // NOVO PRODUTO
          // =================================================

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
