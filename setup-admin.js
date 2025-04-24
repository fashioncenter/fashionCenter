import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

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

// Add admin
async function addAdmin(email) {
  try {
    await addDoc(collection(db, 'admins'), {
      email,
      createdAt: new Date()
    });
    console.log('Admin added successfully!');
  } catch (error) {
    console.error('Error adding admin:', error);
  }
}

// Add your admin email here
const adminEmail = 'your-admin-email@example.com';
addAdmin(adminEmail); 