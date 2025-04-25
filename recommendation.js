// Recommendation System using Collaborative Filtering
class RecommendationSystem {
  constructor() {
    this.userBehavior = {};
    this.productSimilarity = {};
    this.initializeFromStorage();
  }

  // Initialize data from localStorage
  initializeFromStorage() {
    const storedBehavior = localStorage.getItem('userBehavior');
    if (storedBehavior) {
      this.userBehavior = JSON.parse(storedBehavior);
    }
  }

  // Save data to localStorage
  saveToStorage() {
    localStorage.setItem('userBehavior', JSON.stringify(this.userBehavior));
  }

  // Record user behavior
  recordBehavior(userId, productId, action) {
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
    this.saveToStorage();
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
}

// Export the recommendation system
export const recommendationSystem = new RecommendationSystem(); 