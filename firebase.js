import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

// Firebase configuration
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

// Check for internet connectivity
function checkConnectivity() {
  return navigator.onLine;
}

// Notify user about connection status
function notifyConnectionStatus() {
  const isOnline = checkConnectivity();
  if (!isOnline) {
    console.error("No internet connection detected");
    showConnectionAlert("No internet connection. Please check your network and try again.");
    return false;
  }
  return true;
}

// Show connection alert
function showConnectionAlert(message) {
  // Create or find the alert element
  let alertEl = document.getElementById('connection-alert');
  if (!alertEl) {
    alertEl = document.createElement('div');
    alertEl.id = 'connection-alert';
    alertEl.style.position = 'fixed';
    alertEl.style.top = '10px';
    alertEl.style.left = '50%';
    alertEl.style.transform = 'translateX(-50%)';
    alertEl.style.padding = '10px 20px';
    alertEl.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    alertEl.style.color = 'white';
    alertEl.style.borderRadius = '5px';
    alertEl.style.zIndex = '9999';
    document.body.appendChild(alertEl);
  }
  
  alertEl.textContent = message;
  alertEl.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    alertEl.style.display = 'none';
  }, 5000);
}

// Initialize Firebase with retry mechanism
async function initializeFirebase() {
  if (!checkConnectivity()) {
    notifyConnectionStatus();
    return null;
  }
  
  let retries = 3;
  while (retries > 0) {
    try {
      console.log("Initializing Firebase...");
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      
      // Make db globally accessible
      window.db = db;
      console.log("Firebase initialized successfully");
      
      // Test the connection
      console.log("Testing Firebase connection...");
      const testTimestamp = new Date().toISOString();
      console.log("Connection test timestamp:", testTimestamp);
      
      // Add event listeners for online/offline status
      window.addEventListener('online', () => {
        console.log('App is now online');
        showConnectionAlert('Connection restored. You can now place orders.');
      });
      
      window.addEventListener('offline', () => {
        console.error('App is now offline');
        showConnectionAlert('No internet connection. Some features may not work.');
      });
      
      return db;
    } catch (error) {
      console.error(`Error initializing Firebase (retry ${4-retries}/3):`, error);
      retries--;
      
      if (retries === 0) {
        showConnectionAlert("Failed to connect to our services. Please try again later.");
        return null;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null;
}

// Create a db variable at module scope for export
let db = null;

// Execute initialization
try {
  db = initializeFirebase();
} catch (error) {
  console.error("Critical error initializing Firebase:", error);
  showConnectionAlert("Service unavailable. Please try again later.");
}

export { db };