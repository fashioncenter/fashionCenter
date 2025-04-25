import { collection, addDoc, doc, onSnapshot, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";
import { recommendationSystem } from './recommendation.js';

document.addEventListener('DOMContentLoaded', () => {

  // Utility: Escape HTML entities
  function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };
    return str.replace(/[&<>"'\/]/g, s => entityMap[s]);
  }

  // --- Cart & Product Functionality ---
  let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const slider = document.querySelector('.side_cart_view');
  let shippingData = {};
  let appliedCoupon = null; // Track applied coupon
  let isAuthenticated = false;

  // Show message within cart slider
  function showCartMessage(message) {
    let msgDiv = slider.querySelector('.cart-message');
    if (!msgDiv) {
      msgDiv = document.createElement('div');
      msgDiv.classList.add('cart-message');
      msgDiv.style.padding = '10px';
      msgDiv.style.textAlign = 'center';
      msgDiv.style.background = '#f0f0f0';
      msgDiv.style.margin = '10px 0';
      slider.insertBefore(msgDiv, slider.firstChild);
    }
    msgDiv.textContent = message;
    msgDiv.style.display = 'block';
  }

  function saveCart() {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }

  function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (!cartCount) return;
    const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    cartCount.textContent = totalCount;
  }

  function updateCartTotal() {
    const cartTotalElem = document.querySelector('.cart__total');
    if (!cartTotalElem) return;
    let totalPrice = cartItems.reduce((acc, item) => acc + item.price.discounted * item.quantity, 0);
    
    // Apply coupon discount if exists
    if (appliedCoupon) {
      const discount = (totalPrice * appliedCoupon.discount) / 100;
      totalPrice -= discount;
    }
    
    cartTotalElem.textContent = `Total: Rs. ${totalPrice.toFixed(2)}`;
  }

  function updateCartView() {
    let cartItemsContainer = slider.querySelector('.cart-items');
    if (!cartItemsContainer) {
      cartItemsContainer = document.createElement('div');
      cartItemsContainer.classList.add('cart-items');
      slider.insertBefore(cartItemsContainer, slider.querySelector('.cart__total'));
    }
    cartItemsContainer.innerHTML = '';

    if (cartItems.length === 0) {
      showCartMessage('Your cart is empty');
      return;
    }

    cartItems.forEach((product, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('cart-item');
      const lineTotal = product.price.discounted * product.quantity;
      itemDiv.innerHTML = `
        <div class="main_cart__cont">
          <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
          <div class="cart_view_products">
            <span class="product__name">${escapeHTML(product.name)}</span>
            <div class="product___priceses">
              <span class="product___price">Price: Rs. ${product.price.discounted.toFixed(2)}</span>
              <span class="product___price">Line Total: Rs. ${lineTotal.toFixed(2)}</span>
            </div>
            <div class="quantity-controls">
              <button data-index="${index}" class="decrease-item" type="button">-</button>
              <span class="quantity">${product.quantity}</span>
              <button data-index="${index}" class="increase-item" type="button">+</button>
            </div>
            <button data-index="${index}" class="remove-item" type="button">Remove</button>
          </div>
        </div>
      `;
      cartItemsContainer.appendChild(itemDiv);
    });

    // Update buy now button based on auth state
    const buyNowBtn = document.querySelector('.buy-now-btn');
    if (buyNowBtn) {
      buyNowBtn.textContent = isAuthenticated ? 'Buy Now' : 'Login to Order';
      buyNowBtn.disabled = !isAuthenticated;
    }

    // Attach control handlers
    cartItemsContainer.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'), 10);
      cartItems.splice(index, 1);
      refreshCart();
      });
    });

    cartItemsContainer.querySelectorAll('.increase-item').forEach(btn => {
      btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'), 10);
      cartItems[index].quantity++;
      refreshCart();
      });
    });

    cartItemsContainer.querySelectorAll('.decrease-item').forEach(btn => {
      btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'), 10);
        if (cartItems[index].quantity > 1) {
      cartItems[index].quantity--;
        } else {
          cartItems.splice(index, 1);
        }
      refreshCart();
      });
    });

    updateCartTotal();
    saveCart();
  }

  function refreshCart() {
    updateCartCount();
    updateCartView();
    updateCartTotal();
    saveCart();
  }

  function addToCart(product) {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cartItems.push({ ...product, quantity: 1 });
    }
    refreshCart();
    showCartMessage('Item added to cart');
  }

  // Initial render
  refreshCart();

  // Fetch and display products
  let products = []; // Make products array accessible globally
  fetch('products.json')
    .then(res => res.json())
    .then(productsData => {
      products = productsData; // Store products data
      const productsContainer = document.querySelector('.products');
      const searchBar = document.querySelector('.searchBar');

      // Add dynamic search placeholder
      function updateSearchPlaceholder() {
        const searchBar = document.querySelector('.searchBar');
        if (!searchBar) return;

        // Get random product names for suggestions
        const suggestions = products
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(product => product.name);

        let currentIndex = 0;
        
        function updatePlaceholder() {
          searchBar.placeholder = `Search for ${suggestions[currentIndex]}...`;
          currentIndex = (currentIndex + 1) % suggestions.length;
        }

        // Update placeholder every 3 seconds
        updatePlaceholder();
        setInterval(updatePlaceholder, 2000);
      }

      // Initialize dynamic placeholder
      updateSearchPlaceholder();

      // Add favorite functionality
      let favoriteItems = JSON.parse(localStorage.getItem('favoriteItems')) || [];

      // Enhanced Recommendation System
      class EnhancedRecommendationSystem {
        constructor() {
          this.userBehavior = {};
          this.productSimilarity = {};
          this.categoryPreferences = {};
          this.pricePreferences = {};
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
              purchases: 0,
              cartAdds: 0,
              lastInteraction: null
            };
          }
          
          this.userBehavior[userId][productId][action]++;
          this.userBehavior[userId][productId].lastInteraction = new Date();
          
          // Update category preferences
          const product = products.find(p => p.id === productId);
          if (product) {
            if (!this.categoryPreferences[userId]) {
              this.categoryPreferences[userId] = {};
            }
            this.categoryPreferences[userId][product.category] = 
              (this.categoryPreferences[userId][product.category] || 0) + 1;
          }
        }

        // Calculate product similarity
        calculateProductSimilarity(product1, product2) {
          let similarity = 0;
          
          // Category similarity
          if (product1.category === product2.category) {
            similarity += 0.4;
          }
          
          // Price range similarity
          const priceDiff = Math.abs(product1.price.discounted - product2.price.discounted);
          const maxPrice = Math.max(product1.price.discounted, product2.price.discounted);
          similarity += 0.3 * (1 - priceDiff / maxPrice);
          
          // Description similarity (simple keyword matching)
          const words1 = product1.description.toLowerCase().split(' ');
          const words2 = product2.description.toLowerCase().split(' ');
          const commonWords = words1.filter(word => words2.includes(word));
          similarity += 0.3 * (commonWords.length / Math.max(words1.length, words2.length));
          
          return similarity;
        }

        // Get personalized recommendations
        getPersonalizedRecommendations(userId, limit = 5) {
          if (!this.userBehavior[userId]) return [];
          
          const userProducts = this.userBehavior[userId];
          const recommendations = new Map();
          
          // Get user's preferred categories
          const preferredCategories = Object.entries(this.categoryPreferences[userId] || {})
            .sort((a, b) => b[1] - a[1])
            .map(([category]) => category);
          
          // Calculate recommendation scores
          products.forEach(product => {
            if (userProducts[product.id]) return; // Skip products user has already interacted with
            
            let score = 0;
            
            // Category preference score
            if (preferredCategories.includes(product.category)) {
              score += 0.4;
            }
            
            // Similarity score with user's favorite products
            Object.entries(userProducts).forEach(([productId, behavior]) => {
              if (behavior.favorites > 0) {
                const similarProduct = products.find(p => p.id === parseInt(productId));
                if (similarProduct) {
                  score += 0.3 * this.calculateProductSimilarity(product, similarProduct);
                }
              }
            });
            
            // Popularity score
            const popularity = Object.values(this.userBehavior)
              .filter(behavior => behavior[product.id])
              .length;
            score += 0.3 * (popularity / products.length);
            
            recommendations.set(product.id, score);
          });
          
          // Return top recommendations
          return Array.from(recommendations.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([productId]) => productId);
        }

        // Get trending products
        getTrendingProducts(limit = 5) {
          const productScores = new Map();
          
          products.forEach(product => {
            let score = 0;
            
            // Calculate score based on recent interactions
            Object.values(this.userBehavior).forEach(userBehavior => {
              if (userBehavior[product.id]) {
                const behavior = userBehavior[product.id];
                const timeWeight = this.getTimeWeight(behavior.lastInteraction);
                
                score += (behavior.views * 0.2 + 
                         behavior.favorites * 0.3 + 
                         behavior.purchases * 0.4 + 
                         behavior.cartAdds * 0.1) * timeWeight;
              }
            });
            
            productScores.set(product.id, score);
          });
          
          return Array.from(productScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([productId]) => productId);
        }

        // Get time weight for recent interactions
        getTimeWeight(lastInteraction) {
          if (!lastInteraction) return 0;
          
          const now = new Date();
          const hoursSinceInteraction = (now - lastInteraction) / (1000 * 60 * 60);
          
          // Exponential decay: more recent interactions have higher weight
          return Math.exp(-hoursSinceInteraction / 24); // 24-hour decay
        }
      }

      // Initialize enhanced recommendation system
      const enhancedRecommendationSystem = new EnhancedRecommendationSystem();

      // Update product display with recommendations
      function displayProducts(list) {
        productsContainer.innerHTML = '';
        
        // Get personalized recommendations if user is logged in
        let recommendedProducts = [];
        let trendingProducts = [];
        
        if (isAuthenticated && Clerk.user) {
          recommendedProducts = enhancedRecommendationSystem.getPersonalizedRecommendations(Clerk.user.id);
          trendingProducts = enhancedRecommendationSystem.getTrendingProducts();
        }

        list.forEach(product => {
          const isFavorite = favoriteItems.some(item => item.id === product.id);
          const isRecommended = recommendedProducts.includes(product.id);
          const isTrending = trendingProducts.includes(product.id);
          
          const card = document.createElement('div');
          card.classList.add('product-card');
          card.setAttribute('data-product-id', product.id);
          
          if (isRecommended) card.classList.add('recommended');
          if (isTrending) card.classList.add('trending');
          
          card.innerHTML = `
            <div class="badge">${escapeHTML(product.badge)}</div>
            ${isRecommended ? '<div class="recommendation-badge">Recommended</div>' : ''}
            ${isTrending ? '<div class="trending-badge">Trending</div>' : ''}
            <div class="product-tumb"><img src="${escapeHTML(product.image)}" alt=""></div>
            <div class="product-details">
              <span class="product-catagory">${escapeHTML(product.category)}</span>
              <h4><a href="#products/${product.id}">${escapeHTML(product.name)}</a></h4>
              <p>${escapeHTML(product.description)}</p>
              <div class="product-bottom-details">
                <div class="product-price"><small>PKR ${product.price.original.toFixed(2)}</small> PKR ${product.price.discounted.toFixed(2)}</div>
                <div class="product-links">
                  <a href="#" class="share-btn" data-product-id="${product.id}"><i class="ri-share-line"></i></a>
                  <a href="#" class="favorite-btn ${isFavorite ? 'active' : ''}" data-product-id="${product.id}">
                    <i class="ri-heart-${isFavorite ? 'fill' : 'line'}"></i>
                  </a>
                  <a href="#"><i class="ri-shopping-cart-line"></i></a>
                </div>
              </div>
            </div>
          `;
          
          // Add event listeners
          card.querySelector('.ri-shopping-cart-line').parentElement.addEventListener('click', e => { 
            e.preventDefault(); 
            addToCart(product);
            trackUserBehavior(product.id, 'cartAdds');
          });
          
          // Add share button functionality
          const shareBtn = card.querySelector('.share-btn');
          shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            shareProduct(product);
          });
          
          // Add favorite button functionality
          const favoriteBtn = card.querySelector('.favorite-btn');
          favoriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFavorite(product);
            trackUserBehavior(product.id, 'favorites');
          });

          // Track view when product is displayed
          trackUserBehavior(product.id, 'views');
          
          productsContainer.appendChild(card);
        });

        // Check if we need to navigate to a specific product
        handleProductNavigation();
      }

      displayProducts(products);
      if (searchBar) searchBar.addEventListener('input', () => {
        const q = searchBar.value.toLowerCase();
        displayProducts(products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
      });
    })
    .catch(err => console.error('Error fetching products:', err));

  // Cart icon toggle
  document.querySelector('#cart')?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    slider.classList.add('activate');
  });

  // Close cart button
  document.querySelector('.close-cart')?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    slider.classList.remove('activate');
  });

  // Close cart when clicking outside
  document.addEventListener('click', (e) => {
    // Check if the click is outside the cart and not on the cart icon
    if (!slider.contains(e.target) && !e.target.closest('#cart')) {
      slider.classList.remove('activate');
    }
  });

  // Prevent cart from closing when clicking inside
  slider.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
  });

  // Add touch event handling for mobile
  let touchStartX = 0;
  let touchEndX = 0;

  slider.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  slider.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  function handleSwipe() {
    const swipeThreshold = 100; // Minimum distance for swipe
    const swipeDistance = touchEndX - touchStartX;

    // If swiped left (negative distance) and cart is open
    if (swipeDistance < -swipeThreshold && slider.classList.contains('activate')) {
      slider.classList.remove('activate');
    }
  }

  // Add keyboard event handling
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && slider.classList.contains('activate')) {
      slider.classList.remove('activate');
    }
  });

  // Reference modals
  const shippingModal = document.getElementById('shippingDetailsModal');
  const paymentModal = document.getElementById('paymentModal');

  // Add authentication state listener
  window.addEventListener('load', async () => {
    await Clerk.load();
    
    Clerk.addListener(({ user }) => {
      isAuthenticated = !!user;
      updateAuthState();
    });
  });

  // Function to update UI based on auth state
  function updateAuthState() {
    const buyNowBtn = document.querySelector('.buy-now-btn');
    const authLinks = document.getElementById('auth-links');
    const userProfileDiv = document.getElementById('user-profile');
    const dashboardLink = document.getElementById('dashboardLink');

    if (isAuthenticated) {
      if (buyNowBtn) buyNowBtn.textContent = 'Buy Now';
      if (authLinks) authLinks.style.display = 'none';
      if (userProfileDiv) userProfileDiv.style.display = 'block';
      if (dashboardLink) dashboardLink.style.display = 'block';
    } else {
      if (buyNowBtn) buyNowBtn.textContent = 'Login to Order';
      if (authLinks) authLinks.style.display = 'flex';
      if (userProfileDiv) userProfileDiv.style.display = 'none';
      if (dashboardLink) dashboardLink.style.display = 'none';
    }
    
    // Refresh cart view to update UI
    refreshCart();
  }

  // Update the Buy Now button click handler
  document.querySelector('.buy-now-btn')?.addEventListener('click', () => {
    if (!cartItems.length) {
      return showCartMessage('Your cart is empty!');
    }
    
    // Check if user is logged in
    if (!isAuthenticated) {
      showCartMessage('Please login to place an order');
      Clerk.openSignIn({ redirectUrl: window.location.href });
      return;
    }

    if (shippingModal) {
      shippingModal.style.display = 'block';
    } else {
      showCartMessage('Unable to open shipping details. Please try again.');
    }
  });

  // Close modals
  document.querySelectorAll('.close').forEach(btn => btn.addEventListener('click', () => {
    const modal = document.getElementById(btn.dataset.modal);
    if (modal) modal.style.display = 'none';
  }));

  // Shipping form submit
  const shipForm = document.getElementById('shippingDetailsForm');
  shipForm?.addEventListener('submit', e => {
    e.preventDefault();
    shippingData = {
      name: shipForm.name.value,
      phone: shipForm.phone.value,
      email: shipForm.email.value,
      address: shipForm.address.value,
      city: shipForm.city.value,
      postal: shipForm.postal.value,
      additionalInfo: shipForm.additionalInfo.value
    };
    if (shippingModal) shippingModal.style.display = 'none';
    if (paymentModal) paymentModal.style.display = 'block';
  });

  // Payment method selection and form handling
  document.querySelectorAll('.payment-method-option').forEach(method => {
    method.addEventListener('click', () => {
      // Remove active class from all methods
      document.querySelectorAll('.payment-method-option').forEach(el => 
        el.classList.remove('active')
      );
      // Add active class to selected method
      method.classList.add('active');
      // Show relevant fields
      const paymentMethod = method.getAttribute('data-method');
      showPaymentFields(paymentMethod);
    });
  });

  function showPaymentFields(method) {
    const fields = {
      card: document.getElementById('card-fields'),
      easypaisa: document.getElementById('easypaisa-fields'),
      cod: document.getElementById('cod-fields')
    };

    // Hide all fields first
    Object.values(fields).forEach(field => {
      if (field) field.style.display = 'none';
    });

    // Show selected method's fields
    if (fields[method]) {
      fields[method].style.display = 'block';
    }
  }

  // Update the payment form submission
  document.querySelector('.payment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check login status
    if (!isAuthenticated) {
      showCartMessage('Please login to complete your order');
      Clerk.openSignIn({ redirectUrl: window.location.href });
      return;
    }

    const activeMethod = document.querySelector('.payment-method-option.active');
    if (!activeMethod) {
      showCartMessage('Please select a payment method');
      return;
    }

    const paymentMethod = activeMethod.getAttribute('data-method');
    try {
      await completeCheckout(paymentMethod);
      if (paymentModal) paymentModal.style.display = 'none';
    } catch (error) {
      console.error('Payment error:', error);
      showCartMessage('Payment failed. Please try again.');
    }
  });

  // Update the completeCheckout function
  async function completeCheckout(paymentMethod) {
    if (!isAuthenticated || !Clerk.user) {
      throw new Error('Authentication required');
    }

    const order = {
      cart: cartItems,
      shipping: shippingData,
      paymentMethod,
      total: cartItems.reduce((a, i) => a + i.price.discounted * i.quantity, 0),
      createdAt: new Date(),
      email: Clerk.user.primaryEmailAddress?.emailAddress,
      userId: Clerk.user.id,
      status: 'pending',
      coupon: appliedCoupon ? {
        code: appliedCoupon.code,
        discount: appliedCoupon.discount
      } : null
    };

    // Apply coupon discount if exists
    if (appliedCoupon) {
      order.total = order.total * (1 - appliedCoupon.discount / 100);
    }

    try {
      const orderRef = await addDoc(collection(window.db, 'orders'), order);
      cartItems = [];
      appliedCoupon = null; // Reset coupon after order
      refreshCart();
      showCartMessage('Thank you! Your order has been placed.');
      
      // Show order status modal
      showOrderStatusModal(orderRef.id);
    } catch (err) {
      console.error(err);
      showCartMessage('Error submitting order. Please try again.');
    }
  }

  // Add order status modal to the page
  const orderStatusModal = document.createElement('div');
  orderStatusModal.id = 'orderStatusModal';
  orderStatusModal.className = 'modal';
  orderStatusModal.style.display = 'none';
  orderStatusModal.innerHTML = `
    <button data-modal="orderStatusModal" class="close" type="button">×</button>
    <div class="modal-content">
    <div class="order-status-content">
      <h2>Order Status</h2>
      <div id="orderStatusDetails"></div>
      </div>
    </div>
  `;
  document.body.appendChild(orderStatusModal);

  // Function to show order status
  function showOrderStatusModal(orderId) {
    const modal = document.getElementById('orderStatusModal');
    const detailsDiv = document.getElementById('orderStatusDetails');
    
    // Listen for order status updates
    const unsubscribe = onSnapshot(doc(window.db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        const order = doc.data();
        const status = order.status || 'pending';
        const statusClass = `status-${status}`;
        
        detailsDiv.innerHTML = `          <p>Order #${orderId}</p>
          <div class="order-details">
            <h3>Order Information</h3>
            <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            <p><strong>Total:</strong> Rs. ${order.total.toFixed(2)}</p>
            
            <h3>Items</h3>
            <div class="order-items">
              ${order.cart.map(item => `
                <div class="order-item">
                  <img src="${item.image}" alt="${item.name}">
                  <div class="order-item-details">
                    <h4>${item.name}</h4>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: Rs. ${item.price.discounted.toFixed(2)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <h3>Shipping Details</h3>
            <p><strong>Name:</strong> ${order.shipping.name}</p>
            <p><strong>Address:</strong> ${order.shipping.address}</p>
            <p><strong>City:</strong> ${order.shipping.city}</p>
            <p><strong>Postal Code:</strong> ${order.shipping.postal}</p>
            ${order.shipping.phone ? `<p><strong>Phone:</strong> ${order.shipping.phone}</p>` : ''}
            ${order.shipping.email ? `<p><strong>Email:</strong> ${order.shipping.email}</p>` : ''}
            ${order.shipping.additionalInfo ? `<p><strong>Additional Info:</strong> ${order.shipping.additionalInfo}</p>` : ''}
          </div>
        `;
      }
    });

    modal.style.display = 'block';
    
    // Clean up listener when modal is closed
    modal.querySelector('.close').onclick = () => {
      modal.style.display = 'none';
      unsubscribe();
    };
  }

  // Add status styles
  const style = document.createElement('style');
  style.textContent = `
    .status-pending { color: orange; }
    .status-processing { color: blue; }
    .status-shipped { color: green; }
    .status-delivered { color: darkgreen; }
    .order-status-content { padding: 20px; }
    .order-status-content p { margin: 10px 0; }
  `;
  document.head.appendChild(style);

  // Add coupon functionality
  const couponInput = document.getElementById('couponInput');
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const couponMessage = document.getElementById('couponMessage');

  applyCouponBtn?.addEventListener('click', async () => {
    const code = couponInput.value.trim().toUpperCase();
    if (!code) {
      couponMessage.textContent = 'Please enter a coupon code';
      couponMessage.style.color = 'red';
      return;
    }

    try {
      // Check if coupon exists and is valid
      const couponsRef = collection(window.db, 'coupons');
      const q = query(couponsRef, where('code', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        couponMessage.textContent = 'Invalid coupon code';
        couponMessage.style.color = 'red';
        return;
      }

      const coupon = querySnapshot.docs[0].data();
      const expiryDate = new Date(coupon.expiry);
      
      if (expiryDate < new Date()) {
        couponMessage.textContent = 'Coupon has expired';
        couponMessage.style.color = 'red';
        return;
      }

      // Apply coupon
      appliedCoupon = coupon;
      couponMessage.textContent = `Coupon applied! ${coupon.discount}% off`;
      couponMessage.style.color = 'green';
      updateCartTotal();
    } catch (error) {
      console.error('Error applying coupon:', error);
      couponMessage.textContent = 'Error applying coupon';
      couponMessage.style.color = 'red';
    }
  });

  // Function to handle product sharing
  function shareProduct(product) {
    // Create a URL with the product ID in the hash
    const shareUrl = `${window.location.origin}${window.location.pathname}#products/${product.id}`;
    const shareText = `Check out this amazing ${product.name} at M. Fashion! Only $${product.price.discounted.toFixed(2)}`;
    
    // Create share modal
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
      <div class="share-modal-content">
        <h3>Share this product</h3>
        <div class="share-preview">
          <img src="${product.image}" alt="${product.name}">
          <div class="share-preview-info">
            <h4>${product.name}</h4>
            <p>${product.description}</p>
            <div class="share-product-details">
              <div class="share-price">
                <small>PKR ${product.price.original.toFixed(2)}</small>
                PKR ${product.price.discounted.toFixed(2)}
              </div>
              <div class="share-category">Category: ${product.category}</div>
              <div class="share-availability">In Stock</div>
            </div>
          </div>
        </div>
        <div class="share-buttons">
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="share-button facebook">
            <i class="ri-facebook-fill"></i> Facebook
          </a>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}" target="_blank" class="share-button twitter">
            <i class="ri-twitter-fill"></i> Twitter
          </a>
          <a href="https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}" target="_blank" class="share-button whatsapp">
            <i class="ri-whatsapp-fill"></i> WhatsApp
          </a>
          <button class="share-button copy-link" onclick="navigator.clipboard.writeText('${shareUrl}')">
            <i class="ri-link"></i> Copy Link
          </button>
        </div>
        <button class="close-share-modal">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);
    
    // Add event listener to close button
    modal.querySelector('.close-share-modal').addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.remove();
      }, 300);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        setTimeout(() => {
          modal.remove();
        }, 300);
      }
    });

    // Show success message when link is copied
    const copyButton = modal.querySelector('.copy-link');
    copyButton.addEventListener('click', () => {
      const originalText = copyButton.innerHTML;
      copyButton.innerHTML = '<i class="ri-check-line"></i> Copied!';
      setTimeout(() => {
        copyButton.innerHTML = originalText;
      }, 2000);
    });
  }

  // Function to handle product URL navigation
  function handleProductNavigation() {
    const hash = window.location.hash;
    if (hash.startsWith('#products/')) {
      const productId = parseInt(hash.split('/')[1]);
      // Find the product in the products array
      const product = products.find(p => p.id === productId);
      if (product) {
        // Scroll to the products section
        const productsSection = document.getElementById('products');
        if (productsSection) {
          productsSection.scrollIntoView({ behavior: 'smooth' });
        }
        // Highlight the product card
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (productCard) {
          productCard.classList.add('highlight');
          setTimeout(() => {
            productCard.classList.remove('highlight');
          }, 2000);
        }
      }
    }
  }

  // Add event listener for hash changes
  window.addEventListener('hashchange', handleProductNavigation);
  // Handle initial load
  handleProductNavigation();

  function toggleFavorite(product) {
    const index = favoriteItems.findIndex(item => item.id === product.id);
    if (index === -1) {
      favoriteItems.push(product);
      showCartMessage('Added to favorites');
    } else {
      favoriteItems.splice(index, 1);
      showCartMessage('Removed from favorites');
    }
    localStorage.setItem('favoriteItems', JSON.stringify(favoriteItems));
    updateFavoriteButton(product.id);
  }

  function updateFavoriteButton(productId) {
    const favoriteBtn = document.querySelector(`.favorite-btn[data-product-id="${productId}"]`);
    if (favoriteBtn) {
      const isFavorite = favoriteItems.some(item => item.id === productId);
      favoriteBtn.innerHTML = isFavorite ? '<i class="ri-heart-fill"></i>' : '<i class="ri-heart-line"></i>';
      favoriteBtn.classList.toggle('active', isFavorite);
    }
  }

  // Track user behavior
  function trackUserBehavior(productId, action) {
    if (isAuthenticated && Clerk.user) {
      enhancedRecommendationSystem.recordBehavior(Clerk.user.id, productId, action);
    }
  }

  // Store Tour Functionality
  class StoreTour {
    constructor() {
      this.steps = [
        {
          target: '.search',
          title: 'Search Products',
          content: 'Find your favorite products using our search feature.',
          position: 'bottom'
        },
        {
          target: '#cart',
          title: 'Shopping Cart',
          content: 'View and manage your shopping cart here.',
          position: 'left'
        },
        {
          target: '.products',
          title: 'Product Collection',
          content: 'Browse through our wide range of products.',
          position: 'top'
        },
        {
          target: '.product-card',
          title: 'Product Details',
          content: 'Click on a product to view details, add to cart, or save to favorites.',
          position: 'right'
        },
        {
          target: '.hero__buttons',
          title: 'Quick Actions',
          content: 'Use these buttons to start shopping or contact us.',
          position: 'bottom'
        }
      ];
      
      this.currentStep = 0;
      this.isFirstVisit = !localStorage.getItem('hasVisited');
      this.isTourActive = false;
      
      this.init();
    }
    
    init() {
      if (this.isFirstVisit) {
        this.createTourElements();
        // Delay tour start to ensure all elements are loaded
        setTimeout(() => this.startTour(), 1000);
      }
    }
    
    createTourElements() {
      // Create overlay
      this.overlay = document.createElement('div');
      this.overlay.className = 'tour-overlay';
      document.body.appendChild(this.overlay);
      
      // Create tooltip
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tour-tooltip';
      document.body.appendChild(this.tooltip);
      
      // Add close button to tooltip
      const closeButton = document.createElement('button');
      closeButton.className = 'tour-close';
      closeButton.innerHTML = '×';
      closeButton.addEventListener('click', () => this.endTour());
      this.tooltip.appendChild(closeButton);
      
      // Add event listeners
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.endTour();
        }
      });
    }
    
    startTour() {
      if (this.isTourActive) return;
      
      this.isTourActive = true;
      this.overlay.classList.add('active');
      this.showStep(0);
      
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    }
    
    showStep(index) {
      if (index >= this.steps.length) {
        this.endTour();
        return;
      }
      
      const step = this.steps[index];
      const target = document.querySelector(step.target);
      
      if (!target) {
        this.showStep(index + 1);
        return;
      }
      
      // Position tooltip
      const rect = target.getBoundingClientRect();
      this.tooltip.className = `tour-tooltip ${step.position}`;
      
      switch (step.position) {
        case 'top':
          this.tooltip.style.top = `${rect.top - this.tooltip.offsetHeight - 20}px`;
          this.tooltip.style.left = `${rect.left + rect.width / 2 - this.tooltip.offsetWidth / 2}px`;
          break;
        case 'bottom':
          this.tooltip.style.top = `${rect.bottom + 20}px`;
          this.tooltip.style.left = `${rect.left + rect.width / 2 - this.tooltip.offsetWidth / 2}px`;
          break;
        case 'left':
          this.tooltip.style.top = `${rect.top + rect.height / 2 - this.tooltip.offsetHeight / 2}px`;
          this.tooltip.style.left = `${rect.left - this.tooltip.offsetWidth - 20}px`;
          break;
        case 'right':
          this.tooltip.style.top = `${rect.top + rect.height / 2 - this.tooltip.offsetHeight / 2}px`;
          this.tooltip.style.left = `${rect.right + 20}px`;
          break;
      }
      
      // Update tooltip content
      this.tooltip.innerHTML = `
        <button class="tour-close">×</button>
        <h3>${step.title}</h3>
        <p>${step.content}</p>
        <div class="tour-buttons">
          ${index > 0 ? '<button class="tour-button secondary prev">Previous</button>' : ''}
          <button class="tour-button primary next">${index === this.steps.length - 1 ? 'Finish' : 'Next'}</button>
          <button class="tour-button skip">Skip Tour</button>
        </div>
        <div class="tour-progress">
          ${this.steps.map((_, i) => `
            <div class="tour-progress-dot ${i === index ? 'active' : ''}"></div>
          `).join('')}
        </div>
      `;
      
      this.tooltip.classList.add('active');
      
      // Add event listeners
      const nextBtn = this.tooltip.querySelector('.next');
      const prevBtn = this.tooltip.querySelector('.prev');
      const skipBtn = this.tooltip.querySelector('.skip');
      const closeBtn = this.tooltip.querySelector('.tour-close');
      
      nextBtn.addEventListener('click', () => this.showStep(index + 1));
      if (prevBtn) prevBtn.addEventListener('click', () => this.showStep(index - 1));
      skipBtn.addEventListener('click', () => this.endTour());
      closeBtn.addEventListener('click', () => this.endTour());
    }
    
    endTour() {
      this.isTourActive = false;
      this.overlay.classList.remove('active');
      this.tooltip.classList.remove('active');
      localStorage.setItem('hasVisited', 'true');
      
      // Restore body scrolling
      document.body.style.overflow = '';
      
      // Remove tour elements
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
        if (this.tooltip && this.tooltip.parentNode) {
          this.tooltip.parentNode.removeChild(this.tooltip);
        }
      }, 300);
    }
  }

  // Initialize store tour for new users
  const storeTour = new StoreTour();

});

