import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBXPZUGg-VQILgxhxwFQQSNL_MlPeGtYvw",
    authDomain: "mfashion-20874.firebaseapp.com",
    projectId: "mfashion-20874",
    storageBucket: "mfashion-20874.appspot.com",
    messagingSenderId: "1093211804266",
    appId: "1:1093211804266:web:c7e0f4c5c4d2c5d9c5d2c5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleProduct = {
    name: 'Premium Denim Jacket',
    description: 'Stylish denim jacket with modern cut and premium finish. Features a comfortable fit and durable construction.',
    category: 'Men\'s Fashion',
    image: 'Assets/denim-jacket.jpg',
    video: 'Assets/denim-jacket-360.mp4',
    price: {
        original: 4999,
        discounted: 3999
    },
    inStock: true,
    createdAt: serverTimestamp()
};

try {
    const docRef = await addDoc(collection(db, 'products'), sampleProduct);
    console.log('Product added with ID: ', docRef.id);
} catch (error) {
    console.error('Error adding product: ', error);
} 