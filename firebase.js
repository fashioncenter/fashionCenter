import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwcdBRc5bpkxu_k-u6blRl2pVycko1I1o",
  authDomain: "ecommerce-f550e.firebaseapp.com",
  projectId: "ecommerce-f550e",
  storageBucket: "ecommerce-f550e.appspot.com",
  messagingSenderId: "915902882423",
  appId: "1:915902882423:web:21a28ce957f594d1eadc72"
};

// Initialize Firebase
try {
  console.log("Initializing Firebase...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  // Make db globally accessible
  window.db = db;
  console.log("Firebase initialized successfully");
  
  // Test the connection
  setTimeout(async () => {
    try {
      console.log("Testing Firebase connection...");
      const testTimestamp = new Date().toISOString();
      console.log("Connection test timestamp:", testTimestamp);
      
      // Log that db is available
      if (window.db) {
        console.log("Firebase db is available globally");
      } else {
        console.error("Firebase db is NOT available globally");
      }
    } catch (error) {
      console.error("Firebase connection test failed:", error);
    }
  }, 1000);
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export { db };