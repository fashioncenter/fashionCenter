// Recommendation System using Collaborative Filtering
import { getDatabase, ref, set, get, update, child } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";

class RecommendationSystem {
  constructor() {
    this.userBehavior = {};
    this.productSimilarity = {};
    this.db = null;
    this.dbRef = null;
    
    // Firebase configuration
    this.firebaseConfig = {
      apiKey: "AIzaSyApjH4ppFf8UEpe1GpTq7CoHjV5T-rxlBQ",
      authDomain: "mfashion-20874.firebaseapp.com",
      databaseURL: "https://mfashion-20874-default-rtdb.firebaseio.com",
      projectId: "mfashion-20874",
      storageBucket: "mfashion-20874.firebasestorage.app",
      messagingSenderId: "339078516901",
      appId: "1:339078516901:web:589193af5fb650f5773d4c",
      measurementId: "G-SM73TL9NKE"
    };
    
    // Initialize Firebase and then load data
    this.initFirebase().then(() => {
      this.loadFromFirebase();
    }).catch(error => {
      console.error("Failed to initialize Firebase:", error);
      // Fall back to localStorage if Firebase fails
      this.loadFromLocalStorage();
    });
  }

  // Initialize Firebase
  async initFirebase() {
    try {
      const app = initializeApp(this.firebaseConfig);
      this.db = getDatabase(app);
      this.dbRef = ref(this.db);
      console.log("Firebase Realtime Database initialized for recommendations");
      return true;
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      return false;
    }
  }

  // Load data from Firebase
  async loadFromFirebase() {
    try {
      if (!this.db) {
        console.warn("Firebase not initialized, can't load data");
        return false;
      }

      // Get user behavior data
      const behaviorSnapshot = await get(child(this.dbRef, 'userBehavior'));
      if (behaviorSnapshot.exists()) {
        this.userBehavior = behaviorSnapshot.val();
        console.log("Loaded user behavior from Firebase");
      } else {
        console.log("No user behavior found in Firebase");
        this.userBehavior = {};
      }

      return true;
    } catch (error) {
      console.error("Error loading from Firebase:", error);
      return false;
    }
  }

  // Save data to Firebase
  async saveToFirebase() {
    try {
      if (!this.db) {
        console.warn("Firebase not initialized, can't save data");
        return false;
      }
      
      // Save user behavior data
      await set(ref(this.db, 'userBehavior'), this.userBehavior);
      
      console.log("Data saved to Firebase successfully");
      return true;
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      return false;
    }
  }

  // Fallback: Load from localStorage
  loadFromLocalStorage() {
    try {
      const storedBehavior = localStorage.getItem('userBehavior');
      if (storedBehavior) {
        this.userBehavior = JSON.parse(storedBehavior);
      }
      console.log("Loaded data from localStorage as fallback");
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.userBehavior = {};
    }
  }

  // Fallback: Save to localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('userBehavior', JSON.stringify(this.userBehavior));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  // Record user behavior
  async recordBehavior(userId, productId, action) {
    if (!userId || !productId || !action) {
      console.error('Invalid parameters for recordBehavior');
      return false;
    }
    
    try {
      if (!this.userBehavior[userId]) {
        this.userBehavior[userId] = {};
      }
      if (!this.userBehavior[userId][productId]) {
        this.userBehavior[userId][productId] = {
          views: 0,
          favorites: 0,
          purchases: 0
        };
      }
      
      this.userBehavior[userId][productId][action]++;
      
      // Try to save to Firebase first
      const firebaseSaved = await this.saveToFirebase();
      
      // If Firebase fails, save to localStorage as backup
      if (!firebaseSaved) {
        return this.saveToLocalStorage();
      }
      
      return true;
    } catch (error) {
      console.error('Error recording behavior:', error);
      return false;
    }
  }
  
  // Calculate similarity between products
  calculateProductSimilarity(productId1, productId2) {
    let similarity = 0;
    let totalUsers = 0;

    // Compare user behavior for both products
    for (const userId in this.userBehavior) {
      const behavior1 = this.userBehavior[userId][productId1];
      const behavior2 = this.userBehavior[userId][productId2];

      if (behavior1 && behavior2) {
        // Calculate similarity based on user behavior
        const viewsSimilarity = Math.min(behavior1.views, behavior2.views) / Math.max(behavior1.views, behavior2.views);
        const favoritesSimilarity = Math.min(behavior1.favorites, behavior2.favorites) / Math.max(behavior1.favorites, behavior2.favorites);
        const purchasesSimilarity = Math.min(behavior1.purchases, behavior2.purchases) / Math.max(behavior1.purchases, behavior2.purchases);

        // Weight the different types of behavior
        similarity += (viewsSimilarity * 0.3 + favoritesSimilarity * 0.4 + purchasesSimilarity * 0.3);
        totalUsers++;
      }
    }

    return totalUsers > 0 ? similarity / totalUsers : 0;
  }

  // Get similar products
  getSimilarProducts(productId, limit = 5) {
    const similarities = [];
    
    // Calculate similarity with all other products
    for (const userId in this.userBehavior) {
      for (const otherProductId in this.userBehavior[userId]) {
        if (otherProductId !== productId) {
          const similarity = this.calculateProductSimilarity(productId, otherProductId);
          similarities.push({ productId: otherProductId, similarity });
        }
      }
    }

    // Sort by similarity and return top N products
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.productId);
  }

  // Get personalized recommendations for a user
  getPersonalizedRecommendations(userId, limit = 5) {
    const userProducts = this.userBehavior[userId] || {};
    const recommendations = new Map();

    // For each product the user has interacted with
    for (const productId in userProducts) {
      // Get similar products
      const similarProducts = this.getSimilarProducts(productId);
      
      // Add to recommendations with weighted score
      similarProducts.forEach(similarProductId => {
        const currentScore = recommendations.get(similarProductId) || 0;
        const similarity = this.calculateProductSimilarity(productId, similarProductId);
        const userInterest = userProducts[productId].views * 0.3 + 
                           userProducts[productId].favorites * 0.4 + 
                           userProducts[productId].purchases * 0.3;
        
        recommendations.set(similarProductId, currentScore + (similarity * userInterest));
      });
    }

    // Convert to array and sort by score
    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([productId]) => productId);
  }
  
  // Rank products based on user behavior and other factors
  rankProducts(products, userId = null) {
    // Make a copy to avoid modifying original array
    const rankedProducts = [...products];
    
    // Calculate score for each product
    const productsWithScores = rankedProducts.map(product => {
      // Base score (0-5) - now based only on popularity and user personalization
      let score = 0;
      
      // Popularity factor based on interactions (0-2)
      let interactionCount = 0;
      for (const uid in this.userBehavior) {
        if (this.userBehavior[uid][product.id]) {
          interactionCount++;
        }
      }
      const popularityFactor = Math.min(2, interactionCount / 5);
      
      // Price factor - more discount means higher score (0-1)
      const discountPercentage = product.price.original > 0 ? 
        (product.price.original - product.price.discounted) / product.price.original : 0;
      const priceFactor = discountPercentage;
      
      // User personalization if userId is provided
      let personalizationFactor = 0;
      if (userId && this.userBehavior[userId] && this.userBehavior[userId][product.id]) {
        const behavior = this.userBehavior[userId][product.id];
        // Calculate based on views, favorites and purchases (0-2)
        personalizationFactor = (behavior.views * 0.1 + 
                                behavior.favorites * 0.5 + 
                                behavior.purchases * 1.0);
        personalizationFactor = Math.min(2, personalizationFactor);
      }
      
      // Final weighted score combines all factors
      const finalScore = (popularityFactor * 1) + 
                        (priceFactor * 0.5) + 
                        (personalizationFactor * 1.5);
      
      return {
        ...product,
        score: finalScore
      };
    });
    
    // Sort by score in descending order
    return productsWithScores
      .sort((a, b) => b.score - a.score)
      .map(product => {
        // Remove score from the returned object
        const { score, ...cleanProduct } = product;
        return cleanProduct;
      });
  }
}

// Export the recommendation system
export const recommendationSystem = new RecommendationSystem(); 