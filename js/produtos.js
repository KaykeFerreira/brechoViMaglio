import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import { db } from "./config.js";

const produtosRef = collection(db, "produtos");


// =====================================================
// BUSCAR PRODUTOS
// =====================================================

export async function buscarProdutos() {
  const snapshot = await getDocs(produtosRef);

  const produtos = [];

  snapshot.forEach((documento) => {
    produtos.push({
      id: documento.id,
      ...documento.data()
    });
  });

  return produtos;
}


// =====================================================
// ADICIONAR PRODUTO
// =====================================================

export async function adicionarProduto(produto) {
  const documento = await addDoc(produtosRef, produto);

  return {
    id: documento.id,
    ...produto
  };
}


// =====================================================
// EDITAR PRODUTO
// =====================================================

export async function editarProduto(id, dados) {
  const produtoRef = doc(db, "produtos", id);

  await updateDoc(produtoRef, dados);
}


// =====================================================
// EXCLUIR PRODUTO
// =====================================================

export async function excluirProduto(id) {
  const produtoRef = doc(db, "produtos", id);

  await deleteDoc(produtoRef);
}
