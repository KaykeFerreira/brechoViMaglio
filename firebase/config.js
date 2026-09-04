import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfGA4qCTK1hMZrpZNdVrTQJdI6HA_XLDI",
  authDomain: "brechovimaglio.firebaseapp.com",
  projectId: "brechovimaglio",
  storageBucket: "brechovimaglio.firebasestorage.app",
  messagingSenderId: "409944624323",
  appId: "1:409944624323:web:d336270a45427ebe576676"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { app, db };
