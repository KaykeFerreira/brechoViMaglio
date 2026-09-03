/* Vimaglio — aplicação principal
 * Etapa 1: o código original foi separado do HTML sem alterar a lógica.
 * Na próxima etapa, produtos/carrinho/admin serão extraídos para módulos.
 */
const CORES_FALLBACK = ['g1','g2','g3','g4'];
  const SEED = [
    {id:1, nome:"Vestido midi floral", cat:"Vestidos", preco:89.90, cor:"g1", foto:null},
    {id:2, nome:"Blusa de linho off-white", cat:"Blusas", preco:49.90, cor:"g4", foto:null},
    {id:3, nome:"Saia plissê verde", cat:"Saias", preco:64.90, cor:"g2", foto:null},
    {id:4, nome:"Casaco de lã caramelo", cat:"Casacos", preco:129.90, cor:"g3", foto:null},
    {id:5, nome:"Camisa xadrez unissex", cat:"Masculino", preco:59.90, cor:"g4", foto:null},
    {id:6, nome:"Vestido de festa vinho", cat:"Vestidos", preco:139.90, cor:"g1", foto:null},
  ];

  let produtos = [];
  let carrinho = [];
  let editandoId = null;
  let fotoSelecionada = null;

  async function carregarProdutos(){
    try{
      const res = await window.storage.get('produtos', true);
      produtos = JSON.parse(res.value);
    }catch(e){
      produtos = SEED;
      await salvarProdutos();
    }
    renderGrid();
  }

  async function salvarProdutos(){
    try{
      await window.storage.set('produtos', JSON.stringify(produtos), true);
    }catch(e){
      console.error('erro ao salvar produtos', e);
      alert('Não consegui salvar agora. Tenta de novo em instantes.');
    }
  }

  function formatar(v){ return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }

  function thumbHtml(p){
    return p.foto
      ? `<img src="${p.foto}" alt="${p.nome}">`
      : '';
  }

  function renderGrid(){
    const grid = document.getElementById('gridProdutos');
    grid.innerHTML = produtos.map(p => `
      <div class="card">
        <div class="card-thumb ${p.foto ? '' : p.cor}">
          ${thumbHtml(p)}
          <span class="card-tag">${p.cat}</span>
          <div class="card-admin-actions">
            <button class="editar-btn" data-id="${p.id}" aria-label="Editar ${p.nome}">✎</button>
            <button class="excluir-btn" data-id="${p.id}" aria-label="Excluir ${p.nome}">✕</button>
          </div>
        </div>
        <div class="card-body">
          <span class="card-cat">brechó · tamanho único</span>
          <h3 class="card-nome">${p.nome}</h3>
          <div class="card-footer">
            <span class="card-preco">${formatar(p.preco)}</span>
            <button class="add-btn" data-id="${p.id}" aria-label="Adicionar ${p.nome} à sacola">+</button>
          </div>
        </div>
      </div>
    `).join('') + `
      <button class="card-nova" id="abrirNovoProduto"><span>+</span>Adicionar peça</button>
    `;
    document.getElementById('abrirNovoProduto')?.addEventListener('click', () => abrirModal(null));
  }

  function renderCarrinho(){
    const container = document.getElementById('drawerItens');
    const badge = document.getElementById('cartBadge');
    const subtotalEl = document.getElementById('subtotalValor');
    badge.textContent = carrinho.length;
    container.innerHTML = carrinho.length === 0
      ? '<p class="item-vazio">Sua sacola está vazia. Que tal dar uma olhada nas novidades?</p>'
      : carrinho.map((item, i) => `
        <div class="item">
          <div class="item-thumb ${item.foto ? '' : item.cor}">${item.foto ? `<img src="${item.foto}" alt="">` : ''}</div>
          <div class="item-info">
            <div class="nome">${item.nome}</div>
            <div class="preco">${formatar(item.preco)}</div>
            <button class="remover-btn" data-index="${i}">remover</button>
          </div>
        </div>
      `).join('');
    subtotalEl.textContent = formatar(carrinho.reduce((s, i) => s + i.preco, 0));
  }

  // carrinho: abrir/fechar
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('overlay');
  function abrirDrawer(){ drawer.classList.add('aberto'); overlay.classList.add('aberto'); }
  function fecharDrawer(){ drawer.classList.remove('aberto'); overlay.classList.remove('aberto'); }
  document.getElementById('abrirCarrinho').addEventListener('click', abrirDrawer);
  document.getElementById('fecharCarrinho').addEventListener('click', fecharDrawer);
  overlay.addEventListener('click', fecharDrawer);

  document.getElementById('gridProdutos').addEventListener('click', e => {
    const addBtn = e.target.closest('.add-btn');
    const editBtn = e.target.closest('.editar-btn');
    const delBtn = e.target.closest('.excluir-btn');
    if(addBtn){
      const p = produtos.find(x => x.id === Number(addBtn.dataset.id));
      carrinho.push(p);
      renderCarrinho();
      abrirDrawer();
    }
    if(editBtn && document.body.classList.contains('modo-admin')){
      abrirModal(produtos.find(x => x.id === Number(editBtn.dataset.id)));
    }
    if(delBtn && document.body.classList.contains('modo-admin')){
      if(confirm('Remover essa peça da loja?')){
        produtos = produtos.filter(x => x.id !== Number(delBtn.dataset.id));
        salvarProdutos();
        renderGrid();
      }
    }
  });

  document.getElementById('drawerItens').addEventListener('click', e => {
    const btn = e.target.closest('.remover-btn');
    if(!btn) return;
    carrinho.splice(Number(btn.dataset.index), 1);
    renderCarrinho();
  });

  document.getElementById('finalizarBtn').addEventListener('click', () => {
    if(carrinho.length === 0) return;
    alert('Aqui vai entrar o pagamento de verdade (Pix / cartão) quando conectarmos o backend. Por enquanto isso é só uma demonstração visual!');
  });

  // modo loja (admin)
  const SENHA_DEMO = 'vimaglio123';
  document.getElementById('abrirAreaLoja').addEventListener('click', e => {
    e.preventDefault();
    const senha = prompt('Senha da área da loja:');
    if(senha === null) return;
    if(senha === SENHA_DEMO){
      document.body.classList.add('modo-admin');
    } else {
      alert('Senha incorreta.');
    }
  });
  document.getElementById('sairAdmin').addEventListener('click', () => {
    document.body.classList.remove('modo-admin');
  });

  // modal de adicionar/editar peça
  const modalOverlay = document.getElementById('modalOverlay');
  const campoNome = document.getElementById('campoNome');
  const campoCategoria = document.getElementById('campoCategoria');
  const campoPreco = document.getElementById('campoPreco');
  const campoFoto = document.getElementById('campoFoto');
  const previewFoto = document.getElementById('previewFoto');

  function abrirModal(produto){
    editandoId = produto ? produto.id : null;
    fotoSelecionada = produto ? produto.foto : null;
    document.getElementById('modalTitulo').textContent = produto ? 'Editar peça' : 'Nova peça';
    campoNome.value = produto ? produto.nome : '';
    campoCategoria.value = produto ? produto.cat : '';
    campoPreco.value = produto ? produto.preco : '';
    campoFoto.value = '';
    if(fotoSelecionada){
      previewFoto.src = fotoSelecionada;
      previewFoto.style.display = 'block';
    } else {
      previewFoto.style.display = 'none';
    }
    modalOverlay.classList.add('aberto');
  }
  function fecharModal(){ modalOverlay.classList.remove('aberto'); }

  document.getElementById('cancelarModal').addEventListener('click', fecharModal);
  modalOverlay.addEventListener('click', e => { if(e.target === modalOverlay) fecharModal(); });

  campoFoto.addEventListener('change', () => {
    const arquivo = campoFoto.files[0];
    if(!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      fotoSelecionada = leitor.result;
      previewFoto.src = fotoSelecionada;
      previewFoto.style.display = 'block';
    };
    leitor.readAsDataURL(arquivo);
  });

  document.getElementById('salvarModal').addEventListener('click', async () => {
    const nome = campoNome.value.trim();
    const cat = campoCategoria.value.trim() || 'Novidade';
    const preco = parseFloat(campoPreco.value);
    if(!nome || isNaN(preco)){
      alert('Preencha ao menos o nome e o preço da peça.');
      return;
    }
    if(editandoId){
      const p = produtos.find(x => x.id === editandoId);
      p.nome = nome; p.cat = cat; p.preco = preco;
      if(fotoSelecionada) p.foto = fotoSelecionada;
    } else {
      produtos.push({
        id: Date.now(),
        nome, cat, preco,
        cor: CORES_FALLBACK[produtos.length % CORES_FALLBACK.length],
        foto: fotoSelecionada
      });
    }
    await salvarProdutos();
    renderGrid();
    fecharModal();
  });

  carregarProdutos();
  renderCarrinho();
