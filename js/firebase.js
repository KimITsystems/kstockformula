import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYsSvRxeJPgS1tOpw1TagozaFwcuykUwo",
  authDomain: "kstockformula.firebaseapp.com",
  projectId: "kstockformula",
  storageBucket: "kstockformula.firebasestorage.app",
  messagingSenderId: "127687686071",
  appId: "1:127687686071:web:6ef5d3a0c6276aa7095a32",
  measurementId: "G-YHFNDM01J0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
