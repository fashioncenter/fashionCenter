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
  let favoriteItems = JSON.parse(localStorage.getItem('favoriteItems')) || [];
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
  function fetchAndDisplayProducts() {
    fetch('products.json')
        .then(res => res.json())
        .then(productsData => {
            const productsContainer = document.querySelector('.products-container');
            if (!productsContainer) {
                console.error('Products container not found');
                return;
            }

            productsContainer.innerHTML = ''; // Clear existing products

            productsData.forEach(product => {
                const card = document.createElement('div');
                card.classList.add('product-card');
                
                card.innerHTML = `
                    <div class="product-tumb">
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="product-details">
                        <span class="product-catagory">${product.category}</span>
                        <h4><a href="#">${product.name}</a></h4>
                        <p>${product.description}</p>
                        <div class="product-bottom-details">
                            <div class="product-price">
                                <small>PKR ${product.price.original.toFixed(2)}</small>
                                PKR ${product.price.discounted.toFixed(2)}
                            </div>
                            <div class="product-links">
                                <a href="#" class="share-btn" data-product-id="${product.id}">
                                    <i class="ri-share-line"></i>
                                </a>
                                <a href="#" class="favorite-btn" data-product-id="${product.id}">
                                    <i class="ri-heart-line"></i>
                                </a>
                                <a href="#" class="add-to-cart" data-product-id="${product.id}">
                                    <i class="ri-shopping-cart-line"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `;

                // Add event listeners
                const addToCartBtn = card.querySelector('.add-to-cart');
                addToCartBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    addToCart(product);
                });

                const favoriteBtn = card.querySelector('.favorite-btn');
                favoriteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    toggleFavorite(product);
                });

                const shareBtn = card.querySelector('.share-btn');
                shareBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    shareProduct(product);
                });

                productsContainer.appendChild(card);
            });

            // Initialize favorite buttons after products are loaded
            initializeFavoriteButtons();
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            const productsContainer = document.querySelector('.products-container');
            if (productsContainer) {
                productsContainer.innerHTML = '<p class="error-message">Failed to load products. Please try again later.</p>';
            }
        });
  }

  // Call the function when the page loads
  fetchAndDisplayProducts();

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
      showPaymentFields(method);
    });
  });

  function showPaymentFields(method) {
    const fields = {
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

  // Initialize favorite buttons for all products
  function initializeFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      const productId = btn.getAttribute('data-product-id');
      updateFavoriteButton(productId);
    });
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
        setTimeout(() => this.startTour(), 1500);
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
      
      // Scroll target into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Wait for scroll to complete
      setTimeout(() => {
        // Position tooltip
        const rect = target.getBoundingClientRect();
        this.tooltip.className = `tour-tooltip ${step.position}`;
        
        // Calculate position based on viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let tooltipLeft, tooltipTop;
        
        switch (step.position) {
          case 'top':
            tooltipLeft = Math.min(Math.max(rect.left + rect.width / 2 - 150, 20), viewportWidth - 320);
            tooltipTop = Math.max(rect.top - 180, 20);
            break;
          case 'bottom':
            tooltipLeft = Math.min(Math.max(rect.left + rect.width / 2 - 150, 20), viewportWidth - 320);
            tooltipTop = Math.min(rect.bottom + 20, viewportHeight - 200);
            break;
          case 'left':
            tooltipLeft = Math.max(rect.left - 320, 20);
            tooltipTop = Math.min(Math.max(rect.top + rect.height / 2 - 100, 20), viewportHeight - 200);
            break;
          case 'right':
            tooltipLeft = Math.min(rect.right + 20, viewportWidth - 320);
            tooltipTop = Math.min(Math.max(rect.top + rect.height / 2 - 100, 20), viewportHeight - 200);
            break;
        }
        
        this.tooltip.style.left = `${tooltipLeft}px`;
        this.tooltip.style.top = `${tooltipTop}px`;
        
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
      }, 500);
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

  // Announcement System
  class AnnouncementSystem {
    constructor() {
      this.announcement = {
        id: 'welcome',
        type: 'info',
        message: 'Welcome to M. Fashion! Check out our new collection.',
        icon: 'ri-megaphone-line',
        duration: 5000 // 5 seconds
      };
      
      this.announcementBar = document.querySelector('.announcement-bar');
      this.announcementText = document.querySelector('.announcement-text');
      this.announcementContent = document.querySelector('.announcement-content');
      this.closeButton = document.querySelector('.announcement-close');
      this.timeoutId = null;
      
      this.init();
    }
    
    init() {
      // Add event listener to close button
      this.closeButton.addEventListener('click', () => this.hideAnnouncement());
      
      // Show announcement immediately
      this.showAnnouncement();
    }
    
    showAnnouncement() {
      // Clear any existing timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      
      // Update announcement content
      this.announcementBar.className = `announcement-bar ${this.announcement.type}`;
      this.announcementContent.innerHTML = `
        <i class="${this.announcement.icon}"></i>
        <span class="announcement-text">${this.announcement.message}</span>
      `;
      
      // Show announcement
      this.announcementBar.classList.add('active', 'slide-down');
      
      // Set timeout to hide announcement
      this.timeoutId = setTimeout(() => this.hideAnnouncement(), this.announcement.duration);
    }
    
    hideAnnouncement() {
      this.announcementBar.classList.remove('slide-down');
      this.announcementBar.classList.add('slide-up');
      
      setTimeout(() => {
        this.announcementBar.classList.remove('active', 'slide-up');
      }, 300);
    }
    
    updateAnnouncement(newAnnouncement) {
      this.announcement = { ...this.announcement, ...newAnnouncement };
      this.showAnnouncement();
    }
  }

  // Initialize announcement system
  const announcementSystem = new AnnouncementSystem();

  // Example: Add a new announcement
  // announcementSystem.addAnnouncement({
  //   id: 'new-feature',
  //   type: 'info',
  //   message: 'New feature: Product sharing is now available!',
  //   icon: 'ri-share-line',
  //   duration: 0
  // });

  // Add placeholder animation for search
  const searchInput = document.querySelector('.searchBar');
  const placeholders = [
    'Search for fashion items...',
    'Looking for accessories?',
    'Find your style...',
    'Discover new trends...',
    'Search for shoes...',
    'Find the perfect outfit...',
    'Looking for jewelry?',
    'Search for bags...',
    'Find your favorite brands...',
    'Discover exclusive deals...'
  ];

  let currentPlaceholderIndex = 0;
  let placeholderInterval;

  function updatePlaceholder() {
    if (searchInput && !searchInput.value) {
      searchInput.placeholder = placeholders[currentPlaceholderIndex];
      currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
    }
  }

  // Initialize placeholder animation
  if (searchInput) {
    // Set initial placeholder
    searchInput.placeholder = placeholders[0];
    
    // Start the interval
    placeholderInterval = setInterval(updatePlaceholder, 2000);
    
    // Clear interval when user starts typing
    searchInput.addEventListener('input', () => {
      if (searchInput.value) {
        clearInterval(placeholderInterval);
      } else {
        placeholderInterval = setInterval(updatePlaceholder, 2000);
      }
    });
  }

});

