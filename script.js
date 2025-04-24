import { collection, addDoc, doc, onSnapshot, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

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
  fetch('products.json')
    .then(res => res.json())
    .then(products => {
      const productsContainer = document.querySelector('.products');
      const searchBar = document.querySelector('.searchBar');

      function displayProducts(list) {
        productsContainer.innerHTML = '';
        list.forEach(product => {
          const card = document.createElement('div');
          card.classList.add('product-card');
          card.innerHTML = `
            <div class="badge">${escapeHTML(product.badge)}</div>
            <div class="product-tumb"><img src="${escapeHTML(product.image)}" alt=""></div>
            <div class="product-details">
              <span class="product-catagory">${escapeHTML(product.category)}</span>
              <h4><a href="#">${escapeHTML(product.name)}</a></h4>
              <p>${escapeHTML(product.description)}</p>
              <div class="product-bottom-details">
                <div class="product-price"><small>$${product.price.original.toFixed(2)}</small> $${product.price.discounted.toFixed(2)}</div>
                <div class="product-links">
                  <a href="#"><i class="ri-heart-line"></i></a>
                  <a href="#"><i class="ri-shopping-cart-line"></i></a>
                </div>
              </div>
            </div>
          `;
          card.querySelector('.ri-shopping-cart-line').parentElement.addEventListener('click', e => { e.preventDefault(); addToCart(product); });
          productsContainer.appendChild(card);
        });
      }

      displayProducts(products);
      if (searchBar) searchBar.addEventListener('input', () => {
        const q = searchBar.value.toLowerCase();
        displayProducts(products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
      });
    })
    .catch(err => console.error('Error fetching products:', err));

  // Cart icon toggle
  document.querySelector('#cart')?.addEventListener('click', () => {
    slider.classList.add('activate');
  });

  // Close cart button
  document.querySelector('.close-cart')?.addEventListener('click', () => {
    slider.classList.remove('activate');
  });

  // Close cart when clicking outside
  document.addEventListener('click', (e) => {
    if (!slider.contains(e.target) && !e.target.closest('#cart')) {
      slider.classList.remove('activate');
    }
  });

  // Reference modals
  const shippingModal = document.getElementById('shippingDetailsModal');
  const paymentModal = document.getElementById('paymentModal');

  // Buy Now button click handler
  document.querySelector('.buy-now-btn')?.addEventListener('click', () => {
    if (!cartItems.length) {
      return showCartMessage('Your cart is empty!');
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

  // Payment form submission
  document.querySelector('.payment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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

  // Complete checkout: Firestore write
  async function completeCheckout(paymentMethod) {
    const order = {
      cart: cartItems,
      shipping: shippingData,
      paymentMethod,                      
      total: cartItems.reduce((a, i) => a + i.price.discounted * i.quantity, 0),
      createdAt: new Date(),
      email: Clerk.user?.primaryEmailAddress?.emailAddress || 'guest',
      status: 'pending',
      coupon: appliedCoupon ? {
        code: appliedCoupon.code,
        discount: appliedCoupon.discount
      } : null
    };
    
    // Apply coupon discount to total if exists
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
        
        detailsDiv.innerHTML = `
          <p>Order #${orderId}</p>
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

});