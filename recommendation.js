// Recommendation System using Collaborative Filtering
class RecommendationSystem {
  constructor() {
    this.userBehavior = {};
    this.productSimilarity = {};
    this.productRatings = {};
    this.initializeFromStorage();
  }

  // Initialize data from localStorage
  initializeFromStorage() {
    const storedBehavior = localStorage.getItem('userBehavior');
    if (storedBehavior) {
      this.userBehavior = JSON.parse(storedBehavior);
    }
    
    const storedRatings = localStorage.getItem('productRatings');
    if (storedRatings) {
      this.productRatings = JSON.parse(storedRatings);
    }
  }

  // Save data to localStorage
  saveToStorage() {
    localStorage.setItem('userBehavior', JSON.stringify(this.userBehavior));
    localStorage.setItem('productRatings', JSON.stringify(this.productRatings));
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
  
  // Record a product rating
  recordRating(userId, productId, rating) {
    if (!this.productRatings[productId]) {
      this.productRatings[productId] = {
        totalRating: 0,
        ratingCount: 0,
        userRatings: {}
      };
    }
    
    // If user already rated, adjust the total
    if (this.productRatings[productId].userRatings[userId]) {
      this.productRatings[productId].totalRating -= this.productRatings[productId].userRatings[userId];
    } else {
      // Otherwise increment the count for new ratings
      this.productRatings[productId].ratingCount++;
    }
    
    // Add the new rating
    this.productRatings[productId].userRatings[userId] = rating;
    this.productRatings[productId].totalRating += rating;
    
    this.saveToStorage();
  }
  
  // Get average rating for a product
  getAverageRating(productId) {
    if (!this.productRatings[productId] || this.productRatings[productId].ratingCount === 0) {
      return 0;
    }
    
    return this.productRatings[productId].totalRating / this.productRatings[productId].ratingCount;
  }
  
  // Rank products based on ratings and other factors
  rankProducts(products, userId = null) {
    // Make a copy to avoid modifying original array
    const rankedProducts = [...products];
    
    // Calculate score for each product
    const productsWithScores = rankedProducts.map(product => {
      // Base score from average rating (scale 0-5)
      let score = this.getAverageRating(product.id) || 0;
      
      // Popularity factor based on number of ratings (0-2)
      const ratingCount = this.productRatings[product.id]?.ratingCount || 0;
      const popularityFactor = Math.min(2, ratingCount / 10);
      
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
      const finalScore = (score * 2) + // Rating has highest weight
                          (popularityFactor * 1) + 
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
    
    // Also consider ratings similarity if available
    if (this.productRatings[productId1] && this.productRatings[productId2]) {
      const rating1 = this.getAverageRating(productId1);
      const rating2 = this.getAverageRating(productId2);
      
      if (rating1 > 0 && rating2 > 0) {
        const ratingSimilarity = 1 - (Math.abs(rating1 - rating2) / 5); // Normalize to 0-1
        similarity += ratingSimilarity;
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