import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyApjH4ppFf8UEpe1GpTq7CoHjV5T-rxlBQ",
  authDomain: "mfashion-20874.firebaseapp.com",
  databaseURL: "https://mfashion-20874-default-rtdb.firebaseio.com",
  projectId: "mfashion-20874",
  storageBucket: "mfashion-20874.firebasestorage.app",
  messagingSenderId: "339078516901",
  appId: "1:339078516901:web:589193af5fb650f5773d4c",
  measurementId: "G-SM73TL9NKE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add admin
async function addAdmin(email, password) {
  try {
    console.log(`Attempting to add admin: ${email}`);
    const result = await addDoc(collection(db, 'admins'), {
      email,
      password, // In production, always hash passwords
      createdAt: serverTimestamp()
    });
    console.log('Admin added successfully! Document ID:', result.id);
    return result;
  } catch (error) {
    console.error('Error adding admin:', error);
    throw error;
  }
}

// Add your admin email here
const adminEmail = 'your-admin-email@example.com';
addAdmin(adminEmail); 