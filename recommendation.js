// Advanced Recommendation System using Hybrid Filtering (Collaborative + Content-Based)
import { getDatabase, ref, set, get, update, child } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";

class RecommendationSystem {
  constructor() {
    // Core data structures
    this.userBehavior = {};
    this.productSimilarity = {};
    this.userPreferences = {};
    this.productFeatures = {};
    this.seasonalTrends = {};
    
    // Weights for different factors
    this.weights = {
      collaborative: 0.4,
      contentBased: 0.3,
      seasonal: 0.15,
      trending: 0.15
    };

    // Initialize tracking metrics
    this.metrics = {
      viewCount: {},
      purchaseCount: {},
      cartAdditions: {},
      timeSpent: {},
      lastViewed: {}
    };

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
    
    // Initialize systems
    this.initFirebase().then(() => {
      Promise.all([
        this.loadFromFirebase(),
        this.initializeSeasonalTrends(),
        this.loadUserPreferences()
      ]).catch(error => {
        console.error("Error during initialization:", error);
        this.fallbackToLocalStorage();
      });
    }).catch(error => {
      console.error("Failed to initialize Firebase:", error);
      this.fallbackToLocalStorage();
    });
  }

  // Initialize Firebase

  async initializeSeasonalTrends() {
    const currentDate = new Date();
    const season = this.getCurrentSeason(currentDate);
    
    try {
      const seasonalData = await get(child(this.dbRef, 'seasonalTrends/' + season));
      if (seasonalData.exists()) {
        this.seasonalTrends = seasonalData.val();
      } else {
        // Initialize with default seasonal preferences
        this.seasonalTrends = this.getDefaultSeasonalTrends(season);
        await set(ref(this.db, 'seasonalTrends/' + season), this.seasonalTrends);
      }
    } catch (error) {
      console.error('Error loading seasonal trends:', error);
    }
  }

  getCurrentSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  getDefaultSeasonalTrends(season) {
    const trends = {
      spring: ['floral', 'pastels', 'light-fabrics', 'casual-wear'],
      summer: ['beachwear', 'cotton', 'bright-colors', 'shorts'],
      autumn: ['layering', 'knitwear', 'earth-tones', 'boots'],
      winter: ['outerwear', 'wool', 'dark-colors', 'sweaters']
    };
    return trends[season] || [];
  }

  async loadUserPreferences() {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      const userPrefsSnapshot = await get(child(this.dbRef, `userPreferences/${userId}`));
      if (userPrefsSnapshot.exists()) {
        this.userPreferences[userId] = userPrefsSnapshot.val();
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  async getRecommendations(userId, currentProduct = null) {
    const recommendations = [];
    
    try {
      // Get collaborative filtering recommendations
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId);
      
      // Get content-based recommendations
      const contentBasedRecs = await this.getContentBasedRecommendations(userId, currentProduct);
      
      // Get seasonal recommendations
      const seasonalRecs = await this.getSeasonalRecommendations();
      
      // Get trending items
      const trendingRecs = await this.getTrendingItems();
      
      // Combine and weight all recommendations
      const allRecs = {
        collaborative: collaborativeRecs,
        contentBased: contentBasedRecs,
        seasonal: seasonalRecs,
        trending: trendingRecs
      };
      
      // Apply weights and merge recommendations
      recommendations.push(
        ...this.mergeAndWeightRecommendations(allRecs)
      );
      
      // Update recommendation metrics
      await this.updateRecommendationMetrics(userId, recommendations);
      
      return recommendations;
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  async getCollaborativeRecommendations(userId) {
    // Implement collaborative filtering using user behavior patterns
    const userBehavior = this.userBehavior[userId] || {};
    const similarUsers = await this.findSimilarUsers(userId);
    return this.getRecommendationsFromSimilarUsers(similarUsers);
  }

  async getContentBasedRecommendations(userId, currentProduct) {
    // Generate recommendations based on product features and user preferences
    const userPrefs = this.userPreferences[userId] || {};
    return this.findSimilarProducts(currentProduct, userPrefs);
  }

  async getSeasonalRecommendations() {
    const currentSeason = this.getCurrentSeason(new Date());
    return this.seasonalTrends[currentSeason] || [];
  }

  async getTrendingItems() {
    // Calculate trending items based on recent views, purchases, and cart additions
    const trending = Object.entries(this.metrics.viewCount)
      .map(([productId, count]) => ({
        productId,
        score: this.calculateTrendingScore(productId)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.productId);
    
    return trending;
  }

  calculateTrendingScore(productId) {
    const views = this.metrics.viewCount[productId] || 0;
    const purchases = this.metrics.purchaseCount[productId] || 0;
    const cartAdds = this.metrics.cartAdditions[productId] || 0;
    
    // Weight different actions
    return (views * 1) + (cartAdds * 2) + (purchases * 3);
  }

  mergeAndWeightRecommendations(recommendations) {
    const merged = new Map();
    
    // Apply weights to each recommendation type
    Object.entries(recommendations).forEach(([type, recs]) => {
      recs.forEach(productId => {
        const currentScore = merged.get(productId) || 0;
        merged.set(productId, currentScore + (this.weights[type] || 0));
      });
    });
    
    // Sort by score and return top recommendations
    return Array.from(merged.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([productId]) => productId);
  }

  async updateRecommendationMetrics(userId, recommendations) {
    const timestamp = Date.now();
    
    // Update view count and last viewed time
    recommendations.forEach(productId => {
      this.metrics.viewCount[productId] = (this.metrics.viewCount[productId] || 0) + 1;
      this.metrics.lastViewed[productId] = timestamp;
    });
    
    // Save metrics to Firebase
    try {
      await update(ref(this.db, 'metrics'), this.metrics);
    } catch (error) {
      console.error('Error updating recommendation metrics:', error);
    }
  }

  getCurrentUserId() {
    // Get current user ID from authentication system
    return window.Clerk?.user?.id || localStorage.getItem('userId') || null;
  }

  fallbackToLocalStorage() {
    // Implement fallback data loading from localStorage
    try {
      this.userBehavior = JSON.parse(localStorage.getItem('userBehavior')) || {};
      this.productSimilarity = JSON.parse(localStorage.getItem('productSimilarity')) || {};
      this.metrics = JSON.parse(localStorage.getItem('recommendationMetrics')) || this.metrics;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  // Initialize Firebase
  async findSimilarUsers(userId) {
    const currentUserBehavior = this.userBehavior[userId] || {};
    const otherUsers = Object.keys(this.userBehavior).filter(id => id !== userId);
    
    // Calculate similarity scores
    const similarUsers = otherUsers.map(otherId => {
      const otherBehavior = this.userBehavior[otherId];
      const similarity = this.calculateUserSimilarity(currentUserBehavior, otherBehavior);
      return { userId: otherId, similarity };
    });
    
    // Sort by similarity and return top users
    return similarUsers
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(user => user.userId);
  }

  calculateUserSimilarity(behavior1, behavior2) {
    const allProducts = new Set([
      ...Object.keys(behavior1),
      ...Object.keys(behavior2)
    ]);
    
    let similarity = 0;
    allProducts.forEach(productId => {
      const rating1 = behavior1[productId]?.rating || 0;
      const rating2 = behavior2[productId]?.rating || 0;
      similarity += Math.abs(rating1 - rating2);
    });
    
    return allProducts.size === 0 ? 0 : 1 - (similarity / (allProducts.size * 5));
  }

  async getRecommendationsFromSimilarUsers(similarUsers) {
    const recommendations = new Map();
    
    for (const userId of similarUsers) {
      const userBehavior = this.userBehavior[userId] || {};
      
      // Get highly rated products from similar users
      Object.entries(userBehavior)
        .filter(([, behavior]) => behavior.rating >= 4)
        .forEach(([productId, behavior]) => {
          const currentScore = recommendations.get(productId) || 0;
          recommendations.set(productId, currentScore + behavior.rating);
        });
    }
    
    // Sort and return top recommendations
    return Array.from(recommendations.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([productId]) => productId);
  }

  async findSimilarProducts(product, userPrefs) {
    if (!product) return [];
    
    const allProducts = await this.getAllProducts();
    const similarities = allProducts
      .filter(p => p.id !== product.id)
      .map(p => ({
        id: p.id,
        score: this.calculateProductSimilarity(product, p, userPrefs)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => p.id);
    
    return similarities;
  }

  calculateProductSimilarity(product1, product2, userPrefs) {
    let score = 0;
    
    // Compare categories
    if (product1.category === product2.category) score += 0.3;
    
    // Compare tags
    const commonTags = (product1.tags || []).filter(tag => 
      (product2.tags || []).includes(tag)
    );
    score += (commonTags.length * 0.2);
    
    // Compare price range
    const priceDiff = Math.abs(product1.price - product2.price);
    const maxPrice = Math.max(product1.price, product2.price);
    score += 0.2 * (1 - (priceDiff / maxPrice));
    
    // Consider user preferences
    if (userPrefs) {
      const prefScore = this.calculatePreferenceMatch(product2, userPrefs);
      score += 0.3 * prefScore;
    }
    
    return score;
  }

  calculatePreferenceMatch(product, userPrefs) {
    let score = 0;
    const totalPrefs = Object.keys(userPrefs).length;
    
    if (totalPrefs === 0) return 0;
    
    // Check each preference against product attributes
    Object.entries(userPrefs).forEach(([pref, value]) => {
      if (product[pref] === value) score++;
    });
    
    return score / totalPrefs;
  }

  async getAllProducts() {
    try {
      const productsSnapshot = await get(child(this.dbRef, 'products'));
      return productsSnapshot.exists() ? Object.values(productsSnapshot.val()) : [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

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