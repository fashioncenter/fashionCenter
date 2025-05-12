import { collection, addDoc, doc, onSnapshot, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";
import { recommendationSystem } from './recommendation.js';

document.addEventListener('DOMContentLoaded', () => {
  let firebaseReady = false;

  function checkFirebaseConnection() {
    if (typeof window.db === 'undefined') {
      console.error('Firebase DB is not initialized');
      showGlobalMessage('Service unavailable. Please try again later.', 'error');
      return false;
    }

    if (!navigator.onLine) {
      console.error('Browser reports offline status');
      showGlobalMessage('No internet connection. Please check your network.', 'error');
      return false;
    }
    
    firebaseReady = true;
    return true;
  }

  function showGlobalMessage(message, type = 'info') {
    // Create or get message element
    let msgEl = document.getElementById('global-message');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.id = 'global-message';
      msgEl.style.position = 'fixed';
      msgEl.style.top = '10px';
      msgEl.style.left = '50%';
      msgEl.style.transform = 'translateX(-50%)';
      msgEl.style.padding = '10px 20px';
      msgEl.style.borderRadius = '5px';
      msgEl.style.zIndex = '9999';
      document.body.appendChild(msgEl);
    }

    if (type === 'error') {
      msgEl.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      msgEl.style.color = 'white';
    } else if (type === 'success') {
      msgEl.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
      msgEl.style.color = 'white';
    } else {
      msgEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      msgEl.style.color = 'white';
    }
    
    msgEl.textContent = message;
    msgEl.style.display = 'block';

    setTimeout(() => {
      msgEl.style.display = 'none';
    }, 5000);
  }

  setTimeout(() => {
    if (checkFirebaseConnection()) {
      console.log('Firebase connection confirmed');
    } else {
      console.error('Firebase connection failed');
    }
  }, 1000);

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

  let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  let favoriteItems = JSON.parse(localStorage.getItem('favoriteItems')) || [];
  const slider = document.querySelector('.side_cart_view');
  let shippingData = {};
  let appliedCoupon = null; // Track applied coupon
  let isAuthenticated = false;

  function showCartMessage(message) {
    let msgDiv = slider.querySelector('.cart-message');
    if (!msgDiv) {
      msgDiv = document.createElement('div');
      msgDiv.classList.add('cart-message');
      msgDiv.style.padding = '10px';
      msgDiv.style.textAlign = 'center';
      msgDiv.style.background = '#f0f0f0';
      msgDiv.style.margin = '10px 0';
      slider.insertBefore(msgDiv, slider.querySelector('.cart__total'));
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

    const buyNowBtn = document.querySelector('.buy-now-btn');
    if (buyNowBtn) {
      buyNowBtn.textContent = 'Buy Now';
      buyNowBtn.disabled = !isAuthenticated;
    }

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

  refreshCart();

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
  let allProducts = []; // Store all products for filtering

  function updatePlaceholder() {
    if (searchInput && !searchInput.value) {
      searchInput.placeholder = placeholders[currentPlaceholderIndex];
      currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
    }
  }

  // Function to filter products based on search query
  function searchProducts(query) {
    if (!query) {
      // If search is empty, display all products
      displayProducts(allProducts);
      return;
    }
    
    query = query.toLowerCase().trim();
    const filteredProducts = allProducts.filter(product => {
      // Search in name, description, and category
      return product.name.toLowerCase().includes(query) || 
             product.description.toLowerCase().includes(query) || 
             product.category.toLowerCase().includes(query);
    });
    
    displayProducts(filteredProducts);
    
    // Show message if no products found
    const productsContainer = document.querySelector('.products-container');
    if (filteredProducts.length === 0 && productsContainer) {
      productsContainer.innerHTML = '<p class="no-results">No products found. Try a different search term.</p>';
    }
  }

  // Function to display products
  function displayProducts(products) {
    let productsContainer = document.querySelector('.products-container');
    let productsSection = document.querySelector('.products-section');
    
    // Create products section if it doesn't exist
    if (!productsSection) {
      productsSection = document.createElement('div');
      productsSection.className = 'products-section';
      document.querySelector('.products').appendChild(productsSection);
    }

    // Create products container if it doesn't exist
    if (!productsContainer) {
      productsContainer = document.createElement('div');
      productsContainer.className = 'products-container';
      productsSection.appendChild(productsContainer);

      // Add navigation buttons
      const prevButton = document.createElement('button');
      prevButton.className = 'products-nav prev';
      prevButton.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
      prevButton.setAttribute('aria-label', 'Previous products');

      const nextButton = document.createElement('button');
      nextButton.className = 'products-nav next';
      nextButton.innerHTML = '<i class="ri-arrow-right-s-line"></i>';
      nextButton.setAttribute('aria-label', 'Next products');

      // Function to scroll to the next/previous set of products
      const scrollProducts = (direction) => {
        const containerWidth = productsContainer.offsetWidth;
        const cardWidth = 320; // Card width + gap
        const visibleCards = Math.floor(containerWidth / cardWidth);
        const scrollAmount = cardWidth * visibleCards;

        productsContainer.scrollBy({
          left: direction === 'next' ? scrollAmount : -scrollAmount,
          behavior: 'smooth'
        });
      };

      // Function to update button visibility
      const updateNavButtons = () => {
        const isAtStart = productsContainer.scrollLeft <= 1;
        const isAtEnd = productsContainer.scrollLeft >= productsContainer.scrollWidth - productsContainer.offsetWidth - 1;

        prevButton.style.opacity = isAtStart ? '0' : '';
        prevButton.style.pointerEvents = isAtStart ? 'none' : '';
        nextButton.style.opacity = isAtEnd ? '0' : '';
        nextButton.style.pointerEvents = isAtEnd ? 'none' : '';
      };

      // Add click handlers
      prevButton.addEventListener('click', () => scrollProducts('prev'));
      nextButton.addEventListener('click', () => scrollProducts('next'));

      // Add scroll listener
      productsContainer.addEventListener('scroll', () => {
        requestAnimationFrame(updateNavButtons);
      });

      // Add buttons to the DOM
      productsSection.insertBefore(prevButton, productsContainer);
      productsSection.appendChild(nextButton);

      // Initial button state
      updateNavButtons();
    }

    productsContainer.innerHTML = '';
    
    try {
      // Display products with recommendation system if available
      displayProductsWithRecommendations(products, productsContainer);
    } catch(error) {
      console.error('Error displaying products with recommendations:', error);
      // Fall back to basic product display
      displayBasicProducts(products, productsContainer);
    }
    
    // Apply filters based on URL parameters
    handleProductFilters();

    // Initialize product event handlers
    setTimeout(initializeFavoriteButtons, 100);
  }
  
  // Function to display products with recommendation system integration
  function displayProductsWithRecommendations(products, productsContainer) {
    // Import the recommendation system to get real-time ratings
    import('./recommendation.js')
      .then(module => {
        const recommendationSystem = module.recommendationSystem;
        
        // Clear any existing products
        productsContainer.innerHTML = '';
        
        // Render each product with recommendations
        products.forEach(product => {
          // Get real-time rating from recommendation system
          const realRating = recommendationSystem.getAverageRating(product.id);
          const ratingCount = recommendationSystem.productRatings[product.id]?.ratingCount || 0;
                
          const productCard = document.createElement('div');
          productCard.classList.add('product-card');
        
        // Create image carousel HTML
        // Determine whether to show carousel or single image
        const productImages = product.images && product.images.length > 1 ? product.images : [product.image];
        const showCarousel = productImages.length > 1;

        const imagesHTML = `
            <div class="${showCarousel ? 'product-image-carousel' : 'product-image'}">
                ${showCarousel ? `
                    <button class="carousel-arrow prev" aria-label="Previous image">
                        <i class="ri-arrow-left-line"></i>
                    </button>
                    <button class="carousel-arrow next" aria-label="Next image">
                        <i class="ri-arrow-right-line"></i>
                    </button>
                    <div class="swipe-hint">
                        <i class="ri-drag-move-line"></i>
                        <span>Swipe to view more</span>
                    </div>
                ` : ''}
                <div class="carousel-container">
                    ${productImages.map((img, imgIndex) => `
                        <img src="${escapeHTML(img)}" alt="${escapeHTML(product.name)}" class="clickable-product-image" data-index="${imgIndex}">
                    `).join('')}
                </div>
                ${showCarousel ? `
                    <div class="carousel-dots">
                        ${productImages.map((_, index) => `
                            <span class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>`;

        productCard.innerHTML = `
            ${imagesHTML}
            <div class="product-badges">
                ${product.isNew ? '<span class="badge new-badge">New</span>' : ''}
                ${product.discount > 0 ? `<span class="badge discount-badge">-${product.discount}%</span>` : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${escapeHTML(product.category || 'Uncategorized')}</div>
                <h3 class="product-name">${escapeHTML(product.name)}</h3>
                <p class="product-description">${escapeHTML(product.description || 'No description available')}</p>
                <div class="product-price">
                    <span class="original-price">Rs. ${product.price.original.toFixed(2)}</span>
                    <span class="discounted-price">Rs. ${product.price.discounted.toFixed(2)}</span>
                </div>
                <div class="product-rating">
                    ${realRating > 0 ? generateRatingStars(realRating) : ''}
                    <span class="rating-count">${ratingCount > 0 ? `(${ratingCount})` : ''}</span>
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" data-product-id="${product.id}">
                        <i class="ri-shopping-cart-line"></i>
                        Add to Cart
                    </button>
                    <button class="buy-now-direct-btn" data-product-id="${product.id}">
                        <i class="ri-shopping-bag-line"></i>
                        Buy Now
                    </button>
                    <button class="favorite-btn" data-product-id="${product.id}">
                        <i class="ri-heart-line"></i>
                    </button>
                    <button class="share-btn" data-product-id="${product.id}">
                        <i class="ri-share-line"></i>
                    </button>
                </div>
            </div>
        `;
        if (product.images && product.images.length > 1) {
            const carousel = productCard.querySelector('.carousel-container');
            const dots = productCard.querySelectorAll('.dot');
            const prevButton = productCard.querySelector('.carousel-arrow.prev');
            const nextButton = productCard.querySelector('.carousel-arrow.next');
            const swipeHint = productCard.querySelector('.swipe-hint');
            
            if (!carousel) return;
            
            let currentIndex = 0;
            let isDragging = false;
            let startX, startScrollLeft, lastX;
            let scrollSpeed = 0;
            let animationId;
            const totalImages = product.images.length;
            
            // Function to scroll to a specific image
            const scrollToImage = (index) => {
                if (index < 0) index = 0;
                if (index > totalImages - 1) index = totalImages - 1;
                
                currentIndex = index;
                const imageWidth = carousel.offsetWidth;
                
                carousel.scrollTo({
                    left: index * imageWidth,
                    behavior: 'smooth'
                });
                
                // Update active dot
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
                
                // Show/hide navigation arrows
                if (prevButton && nextButton) {
                    prevButton.style.opacity = index === 0 ? '0.3' : '1';
                    prevButton.style.pointerEvents = index === 0 ? 'none' : 'auto';
                    
                    nextButton.style.opacity = index === totalImages - 1 ? '0.3' : '1';
                    nextButton.style.pointerEvents = index === totalImages - 1 ? 'none' : 'auto';
                }
                
                // Hide swipe hint after first interaction
                if (swipeHint) {
                    swipeHint.style.display = 'none';
                }
            };
            
            // Momentum scrolling function
            const momentumScroll = () => {
                if (Math.abs(scrollSpeed) > 0.5) {
                    carousel.scrollLeft += scrollSpeed;
                    scrollSpeed *= 0.95; // Gradually reduce speed
                    animationId = requestAnimationFrame(momentumScroll);
                } else {
                    cancelAnimationFrame(animationId);
                }
            };
            
            // Add click listeners to arrow buttons
            if (prevButton) {
                prevButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToImage(currentIndex - 1);
                });
            }
            
            if (nextButton) {
                nextButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToImage(currentIndex + 1);
                });
            }
            
            // Add click listeners to dots
            dots.forEach((dot, index) => {
                dot.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToImage(index);
                });
            });
            
            // Function to end dragging
            const endDrag = () => {
                if (!isDragging) return;
                
                isDragging = false;
                carousel.style.cursor = 'grab';
                
                // Apply momentum scrolling
                if (Math.abs(scrollSpeed) > 1) {
                    animationId = requestAnimationFrame(momentumScroll);
                }
                
                // Snap to nearest image
                const imageWidth = carousel.offsetWidth;
                const index = Math.round(carousel.scrollLeft / imageWidth);
                scrollToImage(index);
            };
            
            // Mouse events for desktop
            carousel.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = lastX = e.pageX;
                startScrollLeft = carousel.scrollLeft;
                carousel.style.cursor = 'grabbing';
                cancelAnimationFrame(animationId);
                
                if (swipeHint) swipeHint.style.display = 'none';
                e.preventDefault();
            });
            
            carousel.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                e.preventDefault();
                const x = e.pageX;
                const delta = startX - x;
                scrollSpeed = lastX - x;
                lastX = x;
                carousel.scrollLeft = startScrollLeft + delta;
            });
            
            carousel.addEventListener('mouseup', endDrag);
            carousel.addEventListener('mouseleave', endDrag);
            
            // Touch events for mobile
            carousel.addEventListener('touchstart', (e) => {
                isDragging = true;
                startX = lastX = e.touches[0].pageX;
                startScrollLeft = carousel.scrollLeft;
                cancelAnimationFrame(animationId);
                
                if (swipeHint) swipeHint.style.display = 'none';
            }, { passive: true });
            
            carousel.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                
                const x = e.touches[0].pageX;
                const delta = startX - x;
                scrollSpeed = lastX - x;
                lastX = x;
                carousel.scrollLeft = startScrollLeft + delta;
            }, { passive: true });
            
            carousel.addEventListener('touchend', endDrag);
            
            // Sync UI when scrolling manually
            carousel.addEventListener('scroll', () => {
                if (isDragging) return; // Skip during active drag
                
                const imageWidth = carousel.offsetWidth;
                const index = Math.round(carousel.scrollLeft / imageWidth);
                
                if (index !== currentIndex) {
                    currentIndex = index;
                    
                    // Update navigation state
                    dots.forEach((dot, i) => {
                        dot.classList.toggle('active', i === index);
                    });
                    
                    if (prevButton && nextButton) {
                        prevButton.style.opacity = index === 0 ? '0.3' : '1';
                        prevButton.style.pointerEvents = index === 0 ? 'none' : 'auto';
                        
                        nextButton.style.opacity = index === totalImages - 1 ? '0.3' : '1';
                        nextButton.style.pointerEvents = index === totalImages - 1 ? 'none' : 'auto';
                    }
                }
            });
            
            // Add a class to enable zoom effect on product cards
            productCard.classList.add('has-zoom-effect');
        }

        // No need for the additional initialization here since
        // it's already handled in the initial carousel setup

        // Add a class to enable zoom effect on product cards
        productCard.classList.add('has-zoom-effect');
        
        // Add event handlers for action buttons
        const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
        addToCartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(product);
        });

        const buyNowBtn = productCard.querySelector('.buy-now-direct-btn');
        buyNowBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            buyNowDirect(product);
        });

        const favoriteBtn = productCard.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(product);
        });

        const shareBtn = productCard.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shareProduct(product);
        });
        
        // Add click events to product images for preview
        productCard.querySelectorAll('.clickable-product-image').forEach(img => {
            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Get all images from this product card's carousel
                const cardElement = img.closest('.product-card');
                if (!cardElement) return;
                
                const allImages = Array.from(cardElement.querySelectorAll('.carousel-container img'));
                const imageUrls = allImages.map(imgEl => imgEl.src);
                const clickedIndex = parseInt(img.dataset.index, 10) || 0;
                
                // Open image preview modal with the clicked image and all product images
                openImagePreview(img.src, imageUrls, clickedIndex);
            });
            
            // Add visual cue that image is clickable
            img.style.cursor = 'zoom-in';
        });
        
        productsContainer.appendChild(productCard);
    });

    // Apply filters based on URL parameters
    handleProductFilters();

    // Initialize product event handlers
    setTimeout(initializeFavoriteButtons, 100);
        // Setup event listeners for the clickable product images after rendering all products
        document.querySelectorAll('.clickable-product-image').forEach(img => {
          img.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Get all images from this product card's carousel
            const productCard = img.closest('.product-card');
            if (!productCard) return;
            
            const allImages = Array.from(productCard.querySelectorAll('.carousel-container img'));
            const imageUrls = allImages.map(img => img.src);
            const clickedIndex = parseInt(img.dataset.index, 10) || 0;
            
            // Open image preview modal with the clicked image and all product images
            openImagePreview(img.src, imageUrls, clickedIndex);
          });
          
          // Add visual cue that image is clickable
          img.style.cursor = 'zoom-in';
        });
      })
      .catch(error => {
        console.error('Error loading recommendation system for ratings:', error);
        // Fall back to basic product display
        displayBasicProducts(products, productsContainer);
      });
  }
  
  // Function to display products without recommendation system
  function displayBasicProducts(products, productsContainer) {
    // Clear existing products
    productsContainer.innerHTML = '';
    
    // Render each product with basic info
    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.classList.add('product-card');
      
      // Determine product images
      const productImages = product.images && product.images.length > 1 ? product.images : [product.image];
      
      // If we have multiple images, create a carousel, otherwise use a single image
      const useCarousel = productImages.length > 1;
      const imagesHTML = useCarousel ? `
        <div class="product-image-carousel">
          <button class="carousel-arrow prev" aria-label="Previous image">
            <i class="ri-arrow-left-line"></i>
          </button>
          <button class="carousel-arrow next" aria-label="Next image">
            <i class="ri-arrow-right-line"></i>
          </button>
          <div class="carousel-container">
            ${productImages.map((img, idx) => `
              <img src="${escapeHTML(img)}" alt="${escapeHTML(product.name)}" class="clickable-product-image" data-index="${idx}">
            `).join('')}
          </div>
          <div class="carousel-dots">
            ${productImages.map((_, idx) => `
              <span class="dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="product-image">
          <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" class="clickable-product-image" data-index="0">
        </div>
      `;

      productCard.innerHTML = `
        ${imagesHTML}
        <div class="product-badges">
          ${product.isNew ? '<span class="badge new-badge">New</span>' : ''}
          ${product.discount > 0 ? `<span class="badge discount-badge">-${product.discount}%</span>` : ''}
        </div>
        <div class="product-info">
          <div class="product-category">${escapeHTML(product.category || 'Uncategorized')}</div>
          <h3 class="product-name">${escapeHTML(product.name)}</h3>
          <p class="product-description">${escapeHTML(product.description || 'No description available').substring(0, 60)}${product.description && product.description.length > 60 ? '...' : ''}</p>
          <div class="product-price">
            <span class="original-price">Rs. ${product.price.original.toFixed(2)}</span>
            <span class="discounted-price">Rs. ${product.price.discounted.toFixed(2)}</span>
          </div>
          <div class="product-rating">
            <!-- No ratings shown in fallback mode -->
          </div>
          <div class="product-actions">
            <button class="add-to-cart-btn" data-product-id="${product.id}">
              <i class="ri-shopping-cart-line"></i>
              Add to Cart
            </button>
            <button class="buy-now-direct-btn" data-product-id="${product.id}">
              <i class="ri-shopping-bag-line"></i>
              Buy Now
            </button>
            <button class="favorite-btn" data-product-id="${product.id}">
              <i class="ri-heart-line"></i>
            </button>
            <button class="share-btn" data-product-id="${product.id}">
              <i class="ri-share-line"></i>
            </button>
          </div>
        </div>
      `;

      // Add event handlers for action buttons
      const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
      addToCartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(product);
      });

      const buyNowBtn = productCard.querySelector('.buy-now-direct-btn');
      buyNowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        buyNowDirect(product);
      });

      const favoriteBtn = productCard.querySelector('.favorite-btn');
      favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(product);
      });

      const shareBtn = productCard.querySelector('.share-btn');
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        shareProduct(product);
      });
      
      productsContainer.appendChild(productCard);
    });
    
    // Initialize carousel functionality for product images
    initializeProductCarousels();
    
    // Set up click events for product images
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
      const productImages = Array.from(card.querySelectorAll('.clickable-product-image')).map(img => img.src);
      
      card.querySelectorAll('.clickable-product-image').forEach(img => {
        img.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Get the index of this image within its product's images
          const clickedIndex = parseInt(img.dataset.index) || 0;
          // Open the preview with all images from this product
          openImagePreview(img.src, productImages, clickedIndex);
        });
        
        // Add visual cue that image is clickable
        img.style.cursor = 'zoom-in';
      });
    });
    
    // Initialize favorite buttons
    initializeFavoriteButtons();
  }

  // Initialize carousels for product images
  function initializeProductCarousels() {
    // Find all product carousels on the page
    document.querySelectorAll('.product-image-carousel').forEach(carousel => {
      const container = carousel.querySelector('.carousel-container');
      const dots = carousel.querySelectorAll('.dot');
      const prevBtn = carousel.querySelector('.carousel-arrow.prev');
      const nextBtn = carousel.querySelector('.carousel-arrow.next');
      
      if (!container || !dots.length) return;
      
      // Current image index for this carousel
      let currentIndex = 0;
      const totalImages = dots.length;
      
      // Function to show a specific image
      const showImage = (index) => {
        // Validate index
        if (index < 0) index = totalImages - 1;
        if (index >= totalImages) index = 0;
        
        // Update current index
        currentIndex = index;
        
        // Scroll to the image
        const images = container.querySelectorAll('img');
        if (images[index]) {
          container.scrollTo({
            left: images[index].offsetLeft,
            behavior: 'smooth'
          });
        }
        
        // Update dots
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      };
      
      // Navigate to next/previous image
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showImage(currentIndex - 1);
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showImage(currentIndex + 1);
        });
      }
      
      // Add click handlers to dots
      dots.forEach((dot, i) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showImage(i);
        });
      });
      
      // Add touch swipe functionality for mobile
      let touchStartX = 0;
      let touchEndX = 0;
      
      container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });
      
      container.addEventListener('touchmove', (e) => {
        touchEndX = e.touches[0].clientX;
      }, { passive: true });
      
      container.addEventListener('touchend', () => {
        if (!touchStartX || !touchEndX) return;
        
        const swipeDistance = touchEndX - touchStartX;
        if (Math.abs(swipeDistance) > 50) {
          if (swipeDistance > 0) {
            // Swiped right, show previous
            showImage(currentIndex - 1);
          } else {
            // Swiped left, show next
            showImage(currentIndex + 1);
          }
        }
        
        // Reset values
        touchStartX = 0;
        touchEndX = 0;
      });
      
      // Initialize with first image
      showImage(0);
    });
  }
  
  // Helper function to generate rating stars
  function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="ri-star-fill"></i>';
    }
    
    // Add half star if needed
    if (halfStar) {
      starsHTML += '<i class="ri-star-half-line"></i>';
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="ri-star-line"></i>';
    }
    
    return starsHTML;
  }

  // Function to share product
  function shareProduct(product) {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description || `Check out this ${product.name} at Fashion Center`,
        url: `${window.location.origin}?id=${product.id}`
      })
      .then(() => showMessage('Product shared successfully'))
      .catch((error) => console.error('Error sharing product:', error));
    } else {
      // Fallback for browsers that don't support Web Share API
      const shareURL = `${window.location.origin}?id=${product.id}`;
      
      // Create a modal for sharing options
      const modal = document.createElement('div');
      modal.className = 'share-modal';
      modal.innerHTML = `
          <div class="share-modal-content">
              <button class="share-close-btn">&times;</button>
              <h3>Share this product</h3>
              <div class="share-product-info">
                  <img src="${product.image}" alt="${product.name}">
                  <div>
                      <h4>${product.name}</h4>
                      <p class="share-price">Rs. ${product.price.discounted.toFixed(2)}</p>
                  </div>
              </div>
              <div class="share-options">
                  <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareURL)}" target="_blank" class="share-option facebook">
                      <i class="ri-facebook-fill"></i>
                      <span>Facebook</span>
                  </a>
                  <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name)}&url=${encodeURIComponent(shareURL)}" target="_blank" class="share-option twitter">
                      <i class="ri-twitter-x-fill"></i>
                      <span>Twitter</span>
                  </a>
                  <a href="https://wa.me/?text=${encodeURIComponent(product.name + ': ' + shareURL)}" target="_blank" class="share-option whatsapp">
                      <i class="ri-whatsapp-fill"></i>
                      <span>WhatsApp</span>
                  </a>
                  <button class="share-option copy" id="copyShareLink">
                      <i class="ri-link"></i>
                      <span>Copy Link</span>
                  </button>
              </div>
          </div>
      `;
      
      document.body.appendChild(modal);
      
      // Close button functionality
      modal.querySelector('.share-close-btn').addEventListener('click', () => {
          modal.remove();
      });
      
      // Copy link functionality
      modal.querySelector('#copyShareLink').addEventListener('click', () => {
          const textArea = document.createElement('textarea');
          textArea.value = shareURL;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          const copyBtn = modal.querySelector('#copyShareLink span');
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
              copyBtn.textContent = originalText;
          }, 2000);
      });
      
      // Close when clicking outside the modal content
      modal.addEventListener('click', (e) => {
          if (e.target === modal) {
              modal.remove();
          }
      });
    }
  }

  // Modified fetchAndDisplayProducts function
  function fetchAndDisplayProducts() {
    fetch('products.json')
        .then(res => res.json())
        .then(productsData => {
            allProducts = productsData; // Store all products
            
            // Import the recommendation system
            import('./recommendation.js')
              .then(module => {
                // Get current user ID if available
                const userId = localStorage.getItem('userId');
                
                // Use recommendation system to rank products
                const rankedProducts = module.recommendationSystem.rankProducts(productsData, userId);
                displayProducts(rankedProducts);
              })
              .catch(error => {
                console.error('Error importing recommendation module:', error);
                // Fallback to unranked display
                displayProducts(productsData);
              });
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            const productsContainer = document.querySelector('.products-container');
            if (productsContainer) {
                productsContainer.innerHTML = '<p class="error-message">Failed to load products. Please try again later.</p>';
            }
        });
  }

  // Call function to load products
  fetchAndDisplayProducts();
  
  // Initialize the image preview modal
  initImagePreviewModal();

  // Initialize placeholder animation
  if (searchInput) {
    // Set initial placeholder
    searchInput.placeholder = placeholders[0];
    
    // Start the interval
    placeholderInterval = setInterval(updatePlaceholder, 2000);
    
    // Add search functionality
    searchInput.addEventListener('input', () => {
      if (searchInput.value) {
        clearInterval(placeholderInterval);
        searchProducts(searchInput.value);
      } else {
        placeholderInterval = setInterval(updatePlaceholder, 2000);
        displayProducts(allProducts); // Show all products when search is cleared
      }
    });
  }

  document.querySelector('#cart')?.addEventListener('click', (e) => {
    e.stopPropagation();
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
      if (buyNowBtn) buyNowBtn.textContent = 'Buy Now';
      if (authLinks) authLinks.style.display = 'flex';
      if (userProfileDiv) userProfileDiv.style.display = 'none';
      if (dashboardLink) dashboardLink.style.display = 'none';
    }
    
    // Refresh cart view to update UI
    refreshCart();
  }

  // Update the Buy Now button click handler
  document.querySelector('.buy-now-btn')?.addEventListener('click', () => {
    try {
      // Check if cart is empty
      if (!cartItems || cartItems.length === 0) {
        return showCartMessage('Your cart is empty!');
      }
      
      // Check Firebase connectivity first
      if (!firebaseReady && !checkFirebaseConnection()) {
        showCartMessage('Service unavailable. Please try again later.');
        return;
      }
      
      // Check if user is logged in
      if (!isAuthenticated) {
        showCartMessage('Please login to place an order');
        // Make sure Clerk is available
        if (typeof Clerk !== 'undefined' && Clerk) {
          Clerk.openSignIn({ redirectUrl: window.location.href });
        } else {
          console.error('Clerk authentication is not available');
          showCartMessage('Authentication service unavailable. Please try again later.');
        }
        return;
      }

      // Check if shipping modal exists
      if (!shippingModal) {
        console.error('Shipping modal not found');
        showCartMessage('Unable to proceed with checkout. Please try again later.');
        return;
      }

      // Show shipping details modal
      shippingModal.style.display = 'block';
    } catch (error) {
      console.error('Error handling buy now click:', error);
      showCartMessage('An error occurred. Please try again later.');
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
  const paymentForm = document.querySelector('.payment-form');
  const bankDetailsPreview = document.getElementById('bank-details-preview');
  
  document.querySelectorAll('.payment-method-option').forEach(method => {
    method.addEventListener('click', () => {
      // Remove active class from all methods
      document.querySelectorAll('.payment-method-option').forEach(el => 
        el.classList.remove('active')
      );
      // Add active class to selected method
      method.classList.add('active');
      
      // Show bank details immediately if bank transfer is selected
      const selectedMethod = method.getAttribute('data-method');
      if (selectedMethod === 'bank-transfer') {
        // Hide any COD fields
        if (document.getElementById('cod-fields')) {
          document.getElementById('cod-fields').style.display = 'none';
        }
        
        // Hide the COD button container
        const codButtonContainer = document.getElementById('cod-button-container');
        if (codButtonContainer) {
          codButtonContainer.style.display = 'none';
        }
        
        // Remove COD button if it exists
        const codBtn = document.getElementById('complete-cod-payment');
        if (codBtn) {
          codBtn.remove();
        }
        
        // Update the bank transfer amount
        const previewAmount = document.getElementById('preview-amount');
        const transferAmount = document.getElementById('transfer-amount');
        if (previewAmount) {
          let totalPrice = cartItems.reduce((acc, item) => acc + item.price.discounted * item.quantity, 0);
          if (appliedCoupon) {
            const discount = (totalPrice * appliedCoupon.discount) / 100;
            totalPrice -= discount;
          }
          previewAmount.textContent = `Rs. ${totalPrice.toFixed(2)}`;
        }
        if (transferAmount) {
          let totalPrice = cartItems.reduce((acc, item) => acc + item.price.discounted * item.quantity, 0);
          if (appliedCoupon) {
            const discount = (totalPrice * appliedCoupon.discount) / 100;
            totalPrice -= discount;
          }
          transferAmount.textContent = `Rs. ${totalPrice.toFixed(2)}`;
        }
        
        // Show the bank details preview
        if (bankDetailsPreview) {
          bankDetailsPreview.style.display = 'block';
        }
        
        // Add a complete payment button if it doesn't exist
        if (!document.getElementById('complete-bank-payment')) {
          const completeBtn = document.createElement('button');
          completeBtn.id = 'complete-bank-payment';
          completeBtn.className = 'payment-btn';
          completeBtn.textContent = 'Complete Payment';
          completeBtn.addEventListener('click', proceedWithBankPayment);
          
          // Add the button after the bank details
          if (bankDetailsPreview.nextElementSibling) {
            bankDetailsPreview.parentNode.insertBefore(completeBtn, bankDetailsPreview.nextElementSibling);
          } else {
            bankDetailsPreview.parentNode.appendChild(completeBtn);
          }
        }
      } else if (selectedMethod === 'cod') {
        // Hide bank details if COD is selected
        if (bankDetailsPreview) {
          bankDetailsPreview.style.display = 'none';
        }
        
        // Update the COD amount
        updateCodAmount();
        
        // Remove complete bank payment button if it exists
        const bankBtn = document.getElementById('complete-bank-payment');
        if (bankBtn) {
          bankBtn.remove();
        }
        
        // Add a COD button if it doesn't exist
        if (!document.getElementById('complete-cod-payment')) {
          const codBtn = document.createElement('button');
          codBtn.id = 'complete-cod-payment';
          codBtn.className = 'payment-btn';
          codBtn.textContent = 'Continue with Cash on Delivery';
          codBtn.addEventListener('click', proceedWithCodPayment);
          
          // Add the button to the dedicated COD button container
          const codButtonContainer = document.getElementById('cod-button-container');
          if (codButtonContainer) {
            // Clear any existing content
            codButtonContainer.innerHTML = '';
            codButtonContainer.appendChild(codBtn);
            codButtonContainer.style.display = 'block';
          }
        } else {
          // Make sure the button is visible
          document.getElementById('complete-cod-payment').style.display = 'block';
          document.getElementById('cod-button-container').style.display = 'block';
        }
      }
    });
  });
  
  // Function to handle bank payment submission
  function proceedWithBankPayment() {
    // Validate and update customer IBAN if needed
    showOrderForm('bank-transfer');
  }
  
  // Function to handle COD payment submission
  function proceedWithCodPayment() {
    try {
      console.log('COD payment selected');
      
      // Make sure the active method is set to COD
      document.querySelectorAll('.payment-method-option').forEach(el => {
        if (el.getAttribute('data-method') === 'cod') {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      
      // Show the COD order form
      showOrderForm('cod');
      
      // Hide any existing payment buttons
      const bankBtn = document.getElementById('complete-bank-payment');
      const codBtn = document.getElementById('complete-cod-payment');
      if (bankBtn) bankBtn.style.display = 'none';
      if (codBtn) codBtn.style.display = 'none';
      
      // Update the COD amount
      updateCodAmount();
      
      // Make the form visible and scroll to it
      const paymentForm = document.querySelector('.payment-form');
      if (paymentForm) {
        paymentForm.style.display = 'block';
        
        // Add direct event listener to the Complete Payment button
        const completeBtn = document.getElementById('complete-payment-btn');
        if (completeBtn) {
          completeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Complete Payment button clicked');
            completeCheckout('cod');
          });
        }
        
        // Scroll to the form
        paymentForm.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error in COD payment processing:', error);
      showCartMessage('An error occurred. Please try again.');
    }
  }
  
  // Function to show the full order form
  function showOrderForm(paymentMethod) {
    // Show the payment form with the right fields
    if (paymentForm) {
      paymentForm.style.display = 'block';
      showPaymentFields(paymentMethod);
      
      // Hide the preview buttons
      const bankBtn = document.getElementById('complete-bank-payment');
      const codBtn = document.getElementById('complete-cod-payment');
      if (bankBtn) bankBtn.style.display = 'none';
      if (codBtn) codBtn.style.display = 'none';
      
      // Hide the preview section
      if (bankDetailsPreview) bankDetailsPreview.style.display = 'none';
    }
  }

  // Function to show payment fields
  function showPaymentFields(method) {
    const fields = {
      'bank-transfer': document.getElementById('bank-transfer-fields'),
      cod: document.getElementById('cod-fields')
    };

    // Hide all fields first
    Object.values(fields).forEach(field => {
      if (field) field.style.display = 'none';
    });

    // Show selected method's fields
    if (fields[method]) {
      fields[method].style.display = 'block';
      
      // Update appropriate amount displays
      if (method === 'bank-transfer') {
        updateTransferAmount();
      } else if (method === 'cod') {
        updateCodAmount();
      }
    }
  }
  
  // Function to update the transfer amount displayed in the bank transfer form
  function updateTransferAmount() {
    const transferAmountElement = document.getElementById('transfer-amount');
    if (!transferAmountElement) return;
    
    let totalPrice = cartItems.reduce((acc, item) => acc + item.price.discounted * item.quantity, 0);

    if (appliedCoupon) {
      const discount = (totalPrice * appliedCoupon.discount) / 100;
      totalPrice -= discount;
    }
    
    transferAmountElement.textContent = `Rs. ${totalPrice.toFixed(2)}`;
  }
  
  // Function to update the COD amount displayed in the COD form
  function updateCodAmount() {
    const codAmountElement = document.getElementById('cod-amount');
    if (!codAmountElement) return;
    
    let totalPrice = cartItems.reduce((acc, item) => acc + item.price.discounted * item.quantity, 0);

    if (appliedCoupon) {
      const discount = (totalPrice * appliedCoupon.discount) / 100;
      totalPrice -= discount;
    }
    
    codAmountElement.textContent = `Rs. ${totalPrice.toFixed(2)}`;
  }
  
  // Function to copy text to clipboard
  function copyToClipboard(elementId) {
    let text;
    let button;

    if (elementId === 'account-no') {
      // Get the account number from the specific element
      const accountItems = document.querySelectorAll('.info-item');
      let accountElement = null;
      
      // Find the element containing "Account No" label
      for (const item of accountItems) {
        const label = item.querySelector('.info-label');
        if (label && label.textContent.includes('Account No')) {
          accountElement = item.querySelector('.info-value');
          button = item.querySelector('.copy-btn');
          break;
        }
      }
      
      if (!accountElement) return;
      text = accountElement.textContent;
    } else {
      const element = document.getElementById(elementId);
      if (!element) return;
      text = element.textContent;
      button = element.parentNode.querySelector('.copy-btn');
    }
    
    if (!button) return;
    
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show a temporary success message
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="ri-check-line"></i>';
        button.classList.add('copied');
        
        // Show a global success message
        showGlobalMessage('Copied to clipboard!', 'success');
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.classList.remove('copied');
        }, 2000);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        showGlobalMessage('Failed to copy to clipboard', 'error');
      });
  }
  
  // Make the copyToClipboard function globally available
  window.copyToClipboard = copyToClipboard;
  
  // Image Preview Modal Functionality
  let currentImageIndex = 0;
  let currentProductImages = [];
  
  function openImagePreview(imageUrl, productImages, index = 0) {
    const modal = document.getElementById('imagePreviewModal');
    const previewImage = document.getElementById('previewImage');
    const prevBtn = document.getElementById('prevImageBtn');
    const nextBtn = document.getElementById('nextImageBtn');
    const imageCounter = document.getElementById('imageCounter');
    const thumbnailsWrapper = document.getElementById('imageThumbnailsWrapper');
    
    // Clear any existing thumbnails
    if (thumbnailsWrapper) {
      thumbnailsWrapper.innerHTML = '';
    }
    
    // Set the initial image
    previewImage.src = imageUrl;
    currentImageIndex = index;
    currentProductImages = productImages || [imageUrl];
    
    // Update image counter
    if (imageCounter) {
      imageCounter.textContent = `${currentImageIndex + 1}/${currentProductImages.length}`;
    }
    
    // Generate thumbnails for all images
    if (thumbnailsWrapper && currentProductImages.length > 0) {
      currentProductImages.forEach((imgSrc, idx) => {
        const thumbnail = document.createElement('img');
        thumbnail.className = 'image-thumbnail';
        thumbnail.src = imgSrc;
        thumbnail.alt = 'Product thumbnail';
        thumbnail.dataset.index = idx;
        
        // Mark the current image as active
        if (idx === currentImageIndex) {
          thumbnail.classList.add('active');
        }
        
        // Add click event to select this image
        thumbnail.addEventListener('click', () => {
          selectImage(idx);
        });
        
        thumbnailsWrapper.appendChild(thumbnail);
      });
    }
    
    // Show/hide navigation buttons based on number of images
    if (currentProductImages.length <= 1) {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      if (imageCounter) imageCounter.style.display = 'none';
      if (thumbnailsWrapper) thumbnailsWrapper.parentElement.style.display = 'none';
    } else {
      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';
      if (imageCounter) imageCounter.style.display = 'block';
      if (thumbnailsWrapper) thumbnailsWrapper.parentElement.style.display = 'block';
    }
    
    // Enable touch swipe for mobile devices
    enableImageSwipe();
    
    // Display the modal
    modal.style.display = 'block';
  }
  
  function closeImagePreview() {
    const modal = document.getElementById('imagePreviewModal');
    modal.style.display = 'none';
    
    // Remove swipe events when closing
    disableImageSwipe();
  }
  
  // Function to select a specific image by index
  function selectImage(index) {
    if (index < 0 || index >= currentProductImages.length) return;
    
    // Update current index
    currentImageIndex = index;
    
    // Update main image with smooth transition
    const previewImage = document.getElementById('previewImage');
    if (previewImage) {
      // Add a subtle fade effect when changing images
      previewImage.style.opacity = '0.5';
      setTimeout(() => {
        previewImage.src = currentProductImages[currentImageIndex];
        // Once the new image is loaded, fade it back in
        previewImage.onload = () => {
          previewImage.style.opacity = '1';
        };
      }, 200);
    }
    
    // Update counter
    const imageCounter = document.getElementById('imageCounter');
    if (imageCounter) {
      imageCounter.textContent = `${currentImageIndex + 1}/${currentProductImages.length}`;
    }
    
    // Update active thumbnail with scrolling
    const thumbnailsWrapper = document.getElementById('imageThumbnailsWrapper');
    const thumbnails = document.querySelectorAll('.image-thumbnail');
    
    if (thumbnails.length > 0) {
      // Remove active class from all thumbnails
      thumbnails.forEach(thumb => thumb.classList.remove('active'));
      
      // Find the active thumbnail
      const activeThumb = document.querySelector(`.image-thumbnail[data-index="${currentImageIndex}"]`);
      if (activeThumb) {
        // Add active class
        activeThumb.classList.add('active');
        
        // Scroll the thumbnail into view if it's not already visible
        if (thumbnailsWrapper) {
          const thumbRect = activeThumb.getBoundingClientRect();
          const wrapperRect = thumbnailsWrapper.getBoundingClientRect();
          
          // Check if thumbnail is outside the visible area
          if (thumbRect.right > wrapperRect.right || thumbRect.left < wrapperRect.left) {
            activeThumb.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center'
            });
          }
        }
      }
    }
  }
  
  function showNextImage() {
    if (currentProductImages.length <= 1) return;
    selectImage((currentImageIndex + 1) % currentProductImages.length);
  }
  
  function showPrevImage() {
    if (currentProductImages.length <= 1) return;
    selectImage((currentImageIndex - 1 + currentProductImages.length) % currentProductImages.length);
  }
  
  // Touch swipe functionality for image preview
  let imageSwipeStartX = 0;
  let imageSwipeEndX = 0;
  
  function enableImageSwipe() {
    const previewImage = document.getElementById('previewImage');
    if (!previewImage) return;
    
    previewImage.addEventListener('touchstart', handleImageTouchStart, false);
    previewImage.addEventListener('touchmove', handleImageTouchMove, false);
    previewImage.addEventListener('touchend', handleImageTouchEnd, false);
  }
  
  function disableImageSwipe() {
    const previewImage = document.getElementById('previewImage');
    if (!previewImage) return;
    
    previewImage.removeEventListener('touchstart', handleImageTouchStart);
    previewImage.removeEventListener('touchmove', handleImageTouchMove);
    previewImage.removeEventListener('touchend', handleImageTouchEnd);
  }
  
  function handleImageTouchStart(event) {
    imageSwipeStartX = event.touches[0].clientX;
  }
  
  function handleImageTouchMove(event) {
    imageSwipeEndX = event.touches[0].clientX;
  }
  
  function handleImageTouchEnd() {
    if (!imageSwipeStartX || !imageSwipeEndX) return;
    
    // Calculate swipe distance
    const swipeDistance = imageSwipeEndX - imageSwipeStartX;
    const minSwipeDistance = 50; // Minimum distance to consider it a swipe
    
    if (Math.abs(swipeDistance) >= minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swiped right - show previous image
        showPrevImage();
      } else {
        // Swiped left - show next image
        showNextImage();
      }
    }
    
    // Reset values
    imageSwipeStartX = 0;
    imageSwipeEndX = 0;
  }
  
  // Initialize image preview modal when DOM is loaded
  function initImagePreviewModal() {
    // Add click event listeners for modal navigation
    document.getElementById('prevImageBtn')?.addEventListener('click', showPrevImage);
    document.getElementById('nextImageBtn')?.addEventListener('click', showNextImage);
    document.querySelector('#imagePreviewModal .close')?.addEventListener('click', closeImagePreview);
    
    // Add keyboard navigation for the image preview modal
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('imagePreviewModal');
      if (modal && modal.style.display === 'block') {
        if (e.key === 'ArrowLeft') {
          showPrevImage();
          e.preventDefault(); // Prevent page scrolling
        } else if (e.key === 'ArrowRight') {
          showNextImage();
          e.preventDefault(); // Prevent page scrolling
        } else if (e.key === 'Escape') {
          closeImagePreview();
          e.preventDefault();
        }
      }
    });
    
    // Close modal when clicking outside the image
    document.getElementById('imagePreviewModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'imagePreviewModal') {
        closeImagePreview();
      }
    });
  }
  
  // Make the openImagePreview function globally available
  window.openImagePreview = openImagePreview;

  // Update the payment form submission
  document.querySelector('.payment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Payment form submitted');
    
    try {
      // Check login status
      if (!isAuthenticated) {
        showCartMessage('Please login to complete your order');
        if (typeof Clerk !== 'undefined' && Clerk) {
          Clerk.openSignIn({ redirectUrl: window.location.href });
        } else {
          console.error('Clerk authentication is not available');
          showCartMessage('Authentication service unavailable. Please try again later.');
        }
        return;
      }

      // Validate cart
      if (!cartItems || cartItems.length === 0) {
        showCartMessage('Your cart is empty. Please add items before checkout.');
        return;
      }

      // Validate shipping info
      if (!shippingData || !shippingData.name || !shippingData.address) {
        showCartMessage('Please complete your shipping information first');
        if (shippingModal) {
          paymentModal.style.display = 'none';
          shippingModal.style.display = 'block';
        }
        return;
      }

      // Find active payment method
      const activeMethod = document.querySelector('.payment-method-option.active');
      if (!activeMethod) {
        showCartMessage('Please select a payment method');
        return;
      }

      const paymentMethod = activeMethod.getAttribute('data-method');
      console.log('Selected payment method:', paymentMethod);
      
      // For bank transfer, we need to collect and validate the customer's IBAN
      if (paymentMethod === 'bank-transfer') {
        // Verify the elements exist to avoid errors
        const storeIban = document.getElementById('store-iban');
        const transferAmount = document.getElementById('transfer-amount');
        const customerIban = document.getElementById('customer-iban');
        
        if (!storeIban || !transferAmount) {
          showCartMessage('Error loading payment information. Please try again.');
          return;
        }
        
        // Validate customer IBAN
        if (!customerIban || !customerIban.value.trim()) {
          showCartMessage('Please enter your IBAN number to continue');
          customerIban.focus();
          return;
        }
        
        // Basic IBAN validation
        if (customerIban.value.trim().length < 10 || customerIban.value.trim().length > 34) {
          showCartMessage('Please enter a valid IBAN number (10-34 characters)');
          customerIban.focus();
          return;
        }
        
        // Add a confirmation message
        const confirmProceed = confirm('Have you completed the bank transfer using the IBAN and amount shown? Your order will be processed after payment verification.');
        if (!confirmProceed) {
          return;
        }
      } else if (paymentMethod === 'cod') {
        // For COD, we optionally validate alternate phone if provided
        const alternatePhone = document.getElementById('alternate-phone');
        if (alternatePhone && alternatePhone.value.trim()) {
          // Optional basic phone number validation (if needed)
          const phonePattern = /^\d{10,15}$/;
          if (alternatePhone.value.trim().length > 0 && !phonePattern.test(alternatePhone.value.trim().replace(/[\s()-]/g, ''))) {
            showCartMessage('Please enter a valid phone number');
            alternatePhone.focus();
            return;
          }
        }
      }

      showCartMessage('Processing your order...');
      
      try {
        // Await the checkout completion
        await completeCheckout(paymentMethod);
        
        // Success message and UI updates
        showCartMessage('Payment successful! Your order has been placed.', 'success');
        
        // Close all modals
        if (paymentModal) paymentModal.style.display = 'none';
        if (shippingModal) shippingModal.style.display = 'none';
        
        // Reset background scroll lock
        document.body.style.overflow = 'auto';
        
        // Clear form fields
        if (paymentMethod === 'bank-transfer') {
          const customerIban = document.getElementById('customer-iban');
          if (customerIban) customerIban.value = '';
        } else if (paymentMethod === 'cod') {
          const alternatePhone = document.getElementById('alternate-phone');
          const deliveryInstructions = document.getElementById('delivery-instructions');
          if (alternatePhone) alternatePhone.value = '';
          if (deliveryInstructions) deliveryInstructions.value = '';
        }
        
        // Show order success UI or redirect to confirmation page
        setTimeout(() => {
          // Clear cart after successful order
          clearCart();
          
          // Create and show an order confirmation page
          if (paymentMethod === 'cod') {
            showOrderConfirmation(paymentMethod);
          }
        }, 1000);
      } catch (error) {
        console.error('Payment error:', error);
        showCartMessage('Payment failed: ' + (error.message || 'Please try again.'));
      }
    } catch (error) {
      console.error('Error in payment submission:', error);
      showCartMessage('An error occurred. Please try again later.');
    }
  });

  // Update the completeCheckout function
  async function completeCheckout(paymentMethod) {
    if (!isAuthenticated || !Clerk.user) {
      throw new Error('Authentication required');
    }

    try {
      // Check for internet connectivity
      if (!navigator.onLine) {
        console.error('No internet connection detected');
        showCartMessage('No internet connection. Please check your network and try again.');
        return;
      }

      // Check if Firebase is initialized
      if (!window.db) {
        console.error('Firebase DB is not initialized');
        showCartMessage('Service unavailable. Please try again later.');
        return;
      }

      // Validate cart items and shipping data
      if (!cartItems || cartItems.length === 0) {
        showCartMessage('Your cart is empty. Please add items before checkout.');
        return;
      }

      if (!shippingData || !shippingData.name || !shippingData.address) {
        showCartMessage('Invalid shipping information. Please fill all required fields.');
        return;
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
      
      // Add the customer's IBAN number if bank transfer payment method is selected
      if (paymentMethod === 'bank-transfer') {
        const customerIban = document.getElementById('customer-iban');
        if (customerIban && customerIban.value.trim()) {
          order.customerIban = customerIban.value.trim();
        }
      }
      
      // Add delivery instructions and alternate phone if COD is selected
      if (paymentMethod === 'cod') {
        const alternatePhone = document.getElementById('alternate-phone');
        const deliveryInstructions = document.getElementById('delivery-instructions');
        
        if (alternatePhone && alternatePhone.value.trim()) {
          order.alternatePhone = alternatePhone.value.trim();
        }
        
        if (deliveryInstructions && deliveryInstructions.value.trim()) {
          order.deliveryInstructions = deliveryInstructions.value.trim();
        }
      }

      // Apply coupon discount if exists
      if (appliedCoupon) {
        order.total = order.total * (1 - appliedCoupon.discount / 100);
      }

      // Use a try/catch specifically for the Firestore operation
      try {
        // Add an additional Firebase connectivity test
        if (!testFirebaseConnection()) {
          showCartMessage('Unable to connect to our services. Please try again later.');
          return;
        }

        const ordersCollection = collection(window.db, 'orders');
        const orderRef = await addDoc(ordersCollection, order);
        
        // Clear cart and reset coupon after successful order
        cartItems = [];
        appliedCoupon = null;
        refreshCart();
        showCartMessage('Thank you! Your order has been placed.');
        
        // Show order status modal
        showOrderStatusModal(orderRef.id);
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        
        // Provide more specific error messages based on the error code
        if (firestoreError.code === 'permission-denied') {
          showCartMessage('Permission denied. Please try logging in again.');
        } else if (firestoreError.code === 'unavailable' || firestoreError.code === 'resource-exhausted') {
          showCartMessage('Service temporarily unavailable. Please try again later.');
        } else if (firestoreError.code === 'network-request-failed') {
          showCartMessage('Network error. Please check your connection and try again.');
        } else {
          showCartMessage('Error submitting order. Please try again.');
        }
      }
    } catch (err) {
      console.error('Checkout error:', err);
      showCartMessage('Error processing your order. Please try again.');
    }
  }

  // Function to test Firebase connection
  function testFirebaseConnection() {
    try {
      // Basic check if Firebase is available
      if (!window.db) {
        console.error('Firebase DB not available');
        return false;
      }
      
      // Check if we're online
      if (!navigator.onLine) {
        console.error('Browser reports offline status');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error testing Firebase connection:', error);
      return false;
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
    if (!couponInput) {
      console.error('Coupon input element not found');
      return;
    }

    if (!couponMessage) {
      console.error('Coupon message element not found');
      return;
    }

    const code = couponInput.value.trim().toUpperCase();
    if (!code) {
      couponMessage.textContent = 'Please enter a coupon code';
      couponMessage.style.color = 'red';
      return;
    }

    couponMessage.textContent = 'Checking coupon...';
    couponMessage.style.color = 'blue';

    try {
      // Check internet connectivity
      if (!navigator.onLine) {
        console.error('No internet connection detected');
        couponMessage.textContent = 'No internet connection. Please check your network.';
        couponMessage.style.color = 'red';
        return;
      }

      // Check if Firebase is initialized
      if (!window.db) {
        console.error('Firebase DB is not initialized');
        couponMessage.textContent = 'Service unavailable. Please try again later.';
        couponMessage.style.color = 'red';
        return;
      }

      // Test Firebase connection before proceeding
      if (!testFirebaseConnection()) {
        couponMessage.textContent = 'Unable to connect to our services. Please try again later.';
        couponMessage.style.color = 'red';
        return;
      }

      // Check if coupon exists and is valid
      const couponsRef = collection(window.db, 'coupons');
      const q = query(couponsRef, where('code', '==', code));
      
      try {
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
      } catch (firestoreError) {
        console.error('Firestore error when checking coupon:', firestoreError);
        
        // Provide more specific error messages based on the error code
        if (firestoreError.code === 'unavailable' || firestoreError.code === 'resource-exhausted') {
          couponMessage.textContent = 'Service temporarily unavailable. Please try again later.';
        } else if (firestoreError.code === 'network-request-failed') {
          couponMessage.textContent = 'Network error. Please check your connection.';
        } else {
          couponMessage.textContent = 'Error checking coupon. Please try again.';
        }
        couponMessage.style.color = 'red';
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      couponMessage.textContent = 'Error applying coupon';
      couponMessage.style.color = 'red';
    }
  });

  // Function to show order confirmation after successful payment
  function showOrderConfirmation(paymentMethod) {
    // Create a confirmation modal
    const confirmationModal = document.createElement('div');
    confirmationModal.id = 'orderConfirmationModal';
    confirmationModal.className = 'modal';
    confirmationModal.style.display = 'block';
    
    // Get the current date for estimated delivery (5-7 days from now)
    const currentDate = new Date();
    const deliveryDate = new Date(currentDate);
    deliveryDate.setDate(currentDate.getDate() + 5); // 5 days minimum
    const maxDeliveryDate = new Date(currentDate);
    maxDeliveryDate.setDate(currentDate.getDate() + 7); // 7 days maximum
    
    // Format dates
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedMinDate = deliveryDate.toLocaleDateString('en-US', options);
    const formattedMaxDate = maxDeliveryDate.toLocaleDateString('en-US', options);
    
    // Generate a random order ID
    const orderId = 'MF' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    
    // Create modal content
    const modalContent = `
      <div class="order-confirmation-container">
        <div class="order-confirmation-header">
          <i class="ri-checkbox-circle-fill success-icon"></i>
          <h2>Order Confirmed!</h2>
          <p>Thank you for your order. We're processing it now.</p>
        </div>
        
        <div class="order-confirmation-details">
          <div class="confirmation-item">
            <h3>Order Information</h3>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', options)}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}</p>
            <p><strong>Amount:</strong> PKR ${cartItems.reduce((a, i) => a + i.price.discounted * i.quantity, 0).toFixed(2)}</p>
          </div>
          
          <div class="confirmation-item">
            <h3>Delivery Information</h3>
            <p><strong>Estimated Delivery:</strong> ${formattedMinDate} - ${formattedMaxDate}</p>
            <p><strong>Shipping Address:</strong> ${shippingData.address}, ${shippingData.city}, ${shippingData.postal}</p>
            <p><strong>Contact:</strong> ${shippingData.phone}</p>
          </div>
          
          ${paymentMethod === 'cod' ? `
          <div class="confirmation-item cod-instructions">
            <h3>Cash on Delivery Instructions</h3>
            <p>Please have the exact amount ready when the delivery arrives.</p>
            <p>Our delivery partner will contact you before delivery.</p>
          </div>` : ''}
          
          <div class="confirmation-actions">
            <button id="view-dashboard-btn" class="primary-btn">View My Orders</button>
            <button id="continue-shopping-btn" class="secondary-btn">Continue Shopping</button>
          </div>
        </div>
      </div>
    `;
    
    // Set the modal content
    confirmationModal.innerHTML = modalContent;
    
    // Add the modal to the page
    document.body.appendChild(confirmationModal);
    
    // Add the CSS for the confirmation modal
    const style = document.createElement('style');
    style.textContent = `
      .order-confirmation-container {
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        margin: 5% auto;
        box-shadow: 0 5px 30px rgba(0, 0, 0, 0.15);
        animation: fadeInUp 0.5s ease-out;
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .order-confirmation-header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .success-icon {
        font-size: 60px;
        color: #28a745;
        margin-bottom: 15px;
        display: block;
      }
      
      .order-confirmation-header h2 {
        font-size: 28px;
        margin-bottom: 10px;
        color: #333;
      }
      
      .order-confirmation-header p {
        color: #666;
        font-size: 16px;
      }
      
      .order-confirmation-details {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .confirmation-item {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid #e4cd00;
      }
      
      .confirmation-item h3 {
        font-size: 18px;
        margin-bottom: 15px;
        color: #333;
      }
      
      .confirmation-item p {
        margin-bottom: 8px;
        color: #555;
      }
      
      .cod-instructions {
        border-left-color: #e4cd00;
        background-color: #fff8e1;
      }
      
      .confirmation-actions {
        display: flex;
        gap: 15px;
        margin-top: 25px;
        justify-content: center;
      }
      
      .primary-btn, .secondary-btn {
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      
      .primary-btn {
        background: #e4cd00;
        color: #333;
      }
      
      .secondary-btn {
        background: #f1f1f1;
        color: #333;
      }
      
      .primary-btn:hover {
        background: #d4be00;
      }
      
      .secondary-btn:hover {
        background: #e5e5e5;
      }
      
      @media (min-width: 768px) {
        .order-confirmation-details {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .cod-instructions {
          grid-column: span 2;
        }
        
        .confirmation-actions {
          grid-column: span 2;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    // Add event listeners to buttons
    document.getElementById('view-dashboard-btn').addEventListener('click', () => {
      window.location.href = 'user-dashboard.html';
    });
    
    document.getElementById('continue-shopping-btn').addEventListener('click', () => {
      confirmationModal.remove();
      style.remove();
    });
  }
  
  // Function to handle product URL navigation
  function handleProductNavigation() {
    // Check for hash-based navigation
    const hash = window.location.hash;
    let productId = null;
    
    if (hash.startsWith('#products/')) {
      productId = parseInt(hash.split('/')[1]);
    }
    
    // Check for id query parameter from shared links
    const urlParams = new URLSearchParams(window.location.search);
    const queryProductId = urlParams.get('id');
    if (queryProductId) {
      productId = parseInt(queryProductId);
    }
    
    // If we have a product ID, highlight that product
    if (productId) {
      // Scroll to the products section
      const productsSection = document.getElementById('products');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
      }
      
      // Highlight the product card
      const productCard = document.querySelector(`[data-product-id="${productId}"]`);
      if (productCard) {
        // Add highlight class to the product card
        productCard.classList.add('highlight-product');
        
        // Scroll the product into view
        productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after a delay
        setTimeout(() => {
          productCard.classList.remove('highlight-product');
        }, 3000);
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
      recommendationSystem.recordBehavior(Clerk.user.id, productId, action);
    }
  }

  // Store Tour Functionality
  class StoreTour {
    constructor(tourType = 'main') {
      // Default main tour steps
      this.mainTourSteps = [
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
      
      // Payment tour steps
      this.paymentTourSteps = [
        {
          target: '.payment-methods',
          title: 'Payment Options',
          content: 'Choose between Bank Transfer or Cash on Delivery for your purchase.',
          position: 'top'
        },
        {
          target: '[data-method="bank-transfer"]',
          title: 'Bank Transfer',
          content: 'Pay via bank transfer using our IBAN details. Convenient for online banking users.',
          position: 'bottom'
        },
        {
          target: '[data-method="cod"]',
          title: 'Cash on Delivery',
          content: 'Pay when your order arrives. Perfect if you prefer to pay with cash.',
          position: 'bottom'
        },
        {
          target: '#cod-button-container',
          title: 'Proceed with COD',
          content: 'Click here to proceed with Cash on Delivery payment and enter delivery details.',
          position: 'bottom'
        },
        {
          target: '#cod-fields',
          title: 'COD Information',
          content: 'Review the payment amount and provide any special delivery instructions.',
          position: 'right'
        },
        {
          target: '#complete-payment-btn',
          title: 'Complete Your Order',
          content: 'Finalize your purchase and receive an order confirmation.',
          position: 'top'
        }
      ];
      
      // Set appropriate steps based on tour type
      this.tourType = tourType;
      this.steps = (tourType === 'payment') ? this.paymentTourSteps : this.mainTourSteps;
      
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

  // Initialize main store tour for first-time visitors
  const mainStoreTour = new StoreTour('main');
  
  // Function to start the payment tour when user gets to payment screen
  function startPaymentTour() {
    // Check if the user has seen the payment tour before
    if (!localStorage.getItem('hasSeenPaymentTour')) {
      const paymentTour = new StoreTour('payment');
      paymentTour.createTourElements();
      
      // Add a small delay to ensure payment modal is fully visible
      setTimeout(() => {
        paymentTour.startTour();
        // Set flag that user has seen the payment tour
        localStorage.setItem('hasSeenPaymentTour', 'true');
      }, 800);
    }
  }
  
  // Manual trigger for payment tour via help button
  function manuallyStartPaymentTour() {
    console.log('Starting payment tour manually');
    // Force a new payment tour regardless of whether user has seen it before
    const paymentTour = new StoreTour('payment');
    paymentTour.createTourElements();
    setTimeout(() => paymentTour.startTour(), 300);
  }
  
  // Global direct event handler for the payment guide button
  window.startPaymentGuide = function() {
    console.log('Payment guide button clicked');
    manuallyStartPaymentTour();
    return false; // Prevent default action
  };
  
  // Add event listeners for tours
  document.addEventListener('DOMContentLoaded', function() {
    // Automatic tour when shipping form is submitted
    const shipForm = document.getElementById('shippingDetailsForm');
    if (shipForm) {
      shipForm.addEventListener('submit', function(e) {
        // Wait for payment modal to be shown before starting tour
        setTimeout(startPaymentTour, 500);
      });
    }
    
    // Add direct event listener to payment guide button if it exists
    const guideButton = document.getElementById('view-payment-guide');
    if (guideButton) {
      guideButton.addEventListener('click', manuallyStartPaymentTour);
    }
  });
  
  // Add a mutation observer to handle dynamically added payment guide buttons
  const bodyObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === 1) { // Only process Element nodes
            const guideButton = node.id === 'view-payment-guide' ? node : node.querySelector('#view-payment-guide');
            if (guideButton) {
              guideButton.addEventListener('click', manuallyStartPaymentTour);
              console.log('Added event listener to payment guide button');
            }
          }
        }
      }
    });
  });
  
  // Start observing the body for changes
  bodyObserver.observe(document.body, { childList: true, subtree: true });

  // Announcement System
  class AnnouncementSystem {
    constructor() {
      // Default announcement
      this.announcement = {
        id: 'payment-update',
        type: 'success',
        message: 'NEW! Enhanced Cash on Delivery now available with better checkout experience!',
        icon: 'ri-money-dollar-box-line',
        duration: 12000, // 12 seconds
        actionText: 'Learn More',
        actionUrl: '#payment-methods'
      };
      
      // Get DOM elements - we'll wait for document ready
      document.addEventListener('DOMContentLoaded', () => {
        this.setupDomElements();
        this.init();
      });
      
      // Try to initialize immediately as well
      this.setupDomElements();
      this.init();
    }
    
    setupDomElements() {
      this.announcementBar = document.querySelector('.announcement-bar');
      this.announcementContent = document.querySelector('.announcement-content');
      this.announcementText = document.querySelector('.announcement-text');
      this.closeButton = document.querySelector('.announcement-close');
      this.timeoutId = null;
    }
    
    init() {
      // Only proceed if the announcement bar exists or can be created
      if (!this.announcementBar) {
        return;
      }
      
      // Create and update the DOM structure if needed
      this.createDOMStructure();
      
      // Add event listener to close button if it exists
      if (this.closeButton) {
        this.closeButton.addEventListener('click', () => this.dismiss());
      }
      
      // Check if this announcement has been dismissed before
      const dismissedAnnouncements = this.getDismissedAnnouncements();
      if (!dismissedAnnouncements.includes(this.announcement.id)) {
        // Show announcement if not dismissed
        this.showAnnouncement();
      }
    }
    
    // Create or update the announcement bar structure in the DOM
    createDOMStructure() {
      try {
        // If we couldn't find the announcement bar in the DOM, create it
        if (!this.announcementBar) {
          console.log('Creating announcement bar');
          this.announcementBar = document.createElement('div');
          this.announcementBar.className = 'announcement-bar';
          
          const container = document.createElement('div');
          container.className = 'announcement-container';
          
          this.announcementContent = document.createElement('div');
          this.announcementContent.className = 'announcement-content';
          
          this.closeButton = document.createElement('button');
          this.closeButton.className = 'announcement-close';
          this.closeButton.setAttribute('aria-label', 'Close announcement');
          this.closeButton.innerHTML = '&times;';
          
          container.appendChild(this.announcementContent);
          container.appendChild(this.closeButton);
          this.announcementBar.appendChild(container);
          
          // Make sure body exists before inserting
          if (document.body) {
            document.body.insertBefore(this.announcementBar, document.body.firstChild);
          } else {
            // If body isn't ready, try again after a short delay
            setTimeout(() => {
              if (document.body) {
                document.body.insertBefore(this.announcementBar, document.body.firstChild);
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error creating announcement bar:', error);
      }
    }
    
    // Get dismissed announcements from localStorage
    getDismissedAnnouncements() {
      return JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
    }
    
    // Save dismissed announcement to localStorage
    saveDismissedAnnouncement(id) {
      const dismissed = this.getDismissedAnnouncements();
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissed));
      }
    }
    
    // Show announcement with improved UI
    showAnnouncement() {
      try {
        // Ensure we have the required DOM elements
        if (!this.announcementBar || !this.announcementContent) {
          console.log('DOM elements not ready, trying to set up...');
          this.setupDomElements();
          this.createDOMStructure();
          
          // If still missing DOM elements, return
          if (!this.announcementBar || !this.announcementContent) {
            console.error('Cannot show announcement: DOM elements not available');
            return;
          }
        }
        
        // Clear any existing timeout
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }
        
        // Update announcement content with action button if provided
        this.announcementBar.className = `announcement-bar ${this.announcement.type}`;
        
        let actionButton = '';
        if (this.announcement.actionText && this.announcement.actionUrl) {
          actionButton = `<a href="${this.announcement.actionUrl}" class="announcement-action">${this.announcement.actionText}</a>`;
        }
        
        this.announcementContent.innerHTML = `
          <i class="${this.announcement.icon}"></i>
          <span class="announcement-text">${this.announcement.message}</span>
          ${actionButton}
        `;
        
        // Force a reflow to trigger animation properly
        void this.announcementBar.offsetWidth;
        
        // Show announcement with animation
        this.announcementBar.classList.add('active', 'slide-down');
        console.log('Announcement bar displayed');
        
        // Set timeout to hide announcement after duration
        if (this.announcement.duration > 0) {
          this.timeoutId = setTimeout(() => this.hideAnnouncement(), this.announcement.duration);
        }
      } catch (error) {
        console.error('Error showing announcement:', error);
      }
    }
    
    // Hide announcement with animation
    hideAnnouncement() {
      try {
        if (!this.announcementBar) return;
        
        this.announcementBar.classList.remove('slide-down');
        this.announcementBar.classList.add('slide-up');
        
        setTimeout(() => {
          if (this.announcementBar) {
            this.announcementBar.classList.remove('active', 'slide-up');
          }
        }, 300);
      } catch (error) {
        console.error('Error hiding announcement:', error);
      }
    }
    
    // Dismiss announcement and save preference
    dismiss() {
      try {
        // Save this announcement as dismissed
        this.saveDismissedAnnouncement(this.announcement.id);
        
        // Hide the announcement
        this.hideAnnouncement();
        
        console.log('Announcement dismissed and preference saved');
      } catch (error) {
        console.error('Error dismissing announcement:', error);
      }
    }
    
    // Update or show a new announcement
    updateAnnouncement(newAnnouncement) {
      this.announcement = { ...this.announcement, ...newAnnouncement };
      
      // Only show if not previously dismissed
      const dismissed = this.getDismissedAnnouncements();
      if (!dismissed.includes(this.announcement.id)) {
        this.showAnnouncement();
      }
    }
  }

  // Initialize announcement system
  const announcementSystem = new AnnouncementSystem();

  // Force initialization after a short delay to ensure DOM is ready
  setTimeout(() => {
    if (announcementSystem) {
      // Force the announcement to show
      announcementSystem.setupDomElements();
      announcementSystem.createDOMStructure();
      announcementSystem.showAnnouncement();
      console.log('Forced announcement display');
    }
  }, 500);

  // Example: Add a new announcement
  // announcementSystem.addAnnouncement({
  //   id: 'new-feature',
  //   type: 'info',
  //   message: 'New feature: Product sharing is now available!',
  //   icon: 'ri-share-line',
  //   duration: 0
  // });

  // Function to initiate direct buy for a product
  function buyNowDirect(product) {
    // Check Firebase connectivity first
    if (!firebaseReady && !checkFirebaseConnection()) {
      showGlobalMessage('Service unavailable. Please try again later.', 'error');
      return;
    }
    
    // Check if user is logged in
    if (!isAuthenticated) {
      showGlobalMessage('Please login to place an order', 'error');
      // Make sure Clerk is available
      if (typeof Clerk !== 'undefined' && Clerk) {
        Clerk.openSignIn({ redirectUrl: window.location.href });
      } else {
        console.error('Clerk authentication is not available');
        showGlobalMessage('Authentication service unavailable. Please try again later.', 'error');
      }
      return;
    }

    // Create a cart with just this product
    cartItems = [{...product, quantity: 1}];
    refreshCart();
    
    // Check if shipping modal exists
    if (!shippingModal) {
      console.error('Shipping modal not found');
      showGlobalMessage('Unable to proceed with checkout. Please try again later.', 'error');
      return;
    }

    // Show shipping details modal
    shippingModal.style.display = 'block';
  }

  // Function to open the rating modal
  function openRatingModal(product) {
    console.log("Rating functionality has been removed from this version");
    showGlobalMessage('Rating functionality is not available in this version.', 'info');
    return;
  }

  // Export the placeholder function
  window.openRatingModal = openRatingModal;
  if (typeof globalThis !== 'undefined') {
    globalThis.openRatingModal = openRatingModal;
  }

});