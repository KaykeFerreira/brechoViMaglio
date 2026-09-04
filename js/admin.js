import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { app } from "../firebase/config.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const auth = getAuth(app);

export async function fazerLogin(email, senha) {
  try {
    await signInWithEmailAndPassword(auth, email, senha);
    return true;
  } catch (erro) {
    console.error("Erro no login:", erro);
    return false;
  }
}

export async function sair() {
  await signOut(auth);
}

export function observarLogin(callback) {
  onAuthStateChanged(auth, callback);
}

export { auth };
