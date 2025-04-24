import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwcdBRc5bpkxu_k-u6blRl2pVycko1I1o",
  authDomain: "ecommerce-f550e.firebaseapp.com",
  projectId: "ecommerce-f550e",
  storageBucket: "ecommerce-f550e.appspot.com",
  messagingSenderId: "915902882423",
  appId: "1:915902882423:web:21a28ce957f594d1eadc72"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Make db globally accessible
window.db = db;

export { db };