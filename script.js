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

  // Firebase configuration and initialization
  const firebaseConfig = {
    apiKey: "AIzaSyCwcdBRc5bpkxu_k-u6blRl2pVycko1I1o",
    authDomain: "ecommerce-f550e.firebaseapp.com",
    projectId: "ecommerce-f550e",
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();
  const db = firebase.firestore();

  // --- Cart & Product Functionality ---
  let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const slider = document.querySelector('.side_cart_view');

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
    const totalPrice = cartItems.reduce((acc, item) => acc + item.price.discounted * item.quantity, 0);
    cartTotalElem.textContent = `Total: $${totalPrice.toFixed(2)}`;
  }

  function updateCartView() {
    let cartItemsContainer = slider.querySelector('.cart-items');
    if (!cartItemsContainer) {
      cartItemsContainer = document.createElement('div');
      cartItemsContainer.classList.add('cart-items');
      slider.appendChild(cartItemsContainer);
    }
    cartItemsContainer.innerHTML = '';

    cartItems.forEach((product, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('cart-item');
      const lineTotal = product.price.discounted * product.quantity;
      itemDiv.innerHTML = `
        <div class="main_cart__cont">
          <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" style="width:100px;height:100px;padding: 0 10px; object-fit:cover;">
          <div class="cart_view_products">
            <span class="product__name">${escapeHTML(product.name)}</span>
            <div class="product___priceses">
              <span class="product___price">Price: $${product.price.discounted.toFixed(2)}</span>
              <span class="product___price">Line Total: $${lineTotal.toFixed(2)}</span>
            </div>
            <div class="quantity-controls">
              <button data-index="${index}" class="decrease-item">-</button>
              <span class="quantity">${product.quantity}</span>
              <button data-index="${index}" class="increase-item">+</button>
            </div>
            <button data-index="${index}" class="remove-item">Remove</button>
          </div>
        </div>
      `;
      cartItemsContainer.appendChild(itemDiv);
    });

    cartItemsContainer.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        cartItems.splice(index, 1);
        updateCartCount();
        updateCartView();
        updateCartTotal();
        saveCart();
      });
    });
    cartItemsContainer.querySelectorAll('.increase-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        cartItems[index].quantity++;
        updateCartCount();
        updateCartView();
        updateCartTotal();
        saveCart();
      });
    });
    cartItemsContainer.querySelectorAll('.decrease-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        cartItems[index].quantity--;
        if (cartItems[index].quantity <= 0) {
          cartItems.splice(index, 1);
        }
        updateCartCount();
        updateCartView();
        updateCartTotal();
        saveCart();
      });
    });
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
    updateCartCount();
    updateCartView();
    saveCart();
  }

  updateCartCount();
  updateCartView();

  // Fetch and display products from products.json
  fetch('products.json')
    .then(response => response.json())
    .then(products => {
      const productsContainer = document.querySelector('.products');
      const searchBar = document.querySelector('.searchBar');

      function displayProducts(filteredProducts) {
        productsContainer.innerHTML = '';
        filteredProducts.forEach(product => {
          const card = document.createElement('div');
          card.classList.add('product-card');
          card.innerHTML = `
            <div class="badge">${escapeHTML(product.badge)}</div>
            <div class="product-tumb">
              <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
            </div>
            <div class="product-details">
              <span class="product-catagory">${escapeHTML(product.category)}</span>
              <h4><a href="#">${escapeHTML(product.name)}</a></h4>
              <p>${escapeHTML(product.description)}</p>
              <div class="product-bottom-details">
                <div class="product-price">
                  <small>$${product.price.original.toFixed(2)}</small>
                  $${product.price.discounted.toFixed(2)}
                </div>
                <div class="product-links">
                  <a href="#"><i class="ri-heart-line"></i></a>
                  <a href="#"><i class="ri-shopping-cart-line"></i></a>
                </div>
              </div>
            </div>
          `;
          const addCartBtn = card.querySelector('.product-links a:nth-child(2)');
          addCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addToCart(product);
          });
          productsContainer.appendChild(card);
        });
      }

      displayProducts(products);

      if (searchBar) {
        searchBar.addEventListener('input', () => {
          const query = searchBar.value.toLowerCase();
          const filteredProducts = products.filter(product =>
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query)
          );
          displayProducts(filteredProducts);
        });
      }
    })
    .catch(error => console.error('Error fetching products:', error));

  // Toggle cart view on cart icon click
  const cartIcon = document.querySelector('#cart');
  if (cartIcon) {
    cartIcon.addEventListener('click', () => {
      slider.classList.toggle('activate');
    });
  }

  // Create and append the Buy Now button
  const buyNowBtn = document.createElement('button');
  buyNowBtn.textContent = "Buy Now";
  buyNowBtn.classList.add('buy-now-btn');
  slider.appendChild(buyNowBtn);
  buyNowBtn.addEventListener('click', () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    document.getElementById('shippingDetailsModal').style.display = 'block';
  });

  // Close modals on clicking .close elements
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modalId = closeBtn.getAttribute('data-modal');
      const modalEl = document.getElementById(modalId);
      if (modalEl) modalEl.style.display = 'none';
    });
  });

  // Shipping Details Form Submission
  const shippingDetailsForm = document.getElementById('shippingDetailsForm');
  shippingDetailsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const province = document.getElementById('province').value;
    const city = document.getElementById('city').value;
    const zone = document.getElementById('zone').value;
    const address = document.getElementById('address').value;
    const user = firebase.auth().currentUser;
    if (!user) {
      alert('Please sign in or create an account to complete checkout.');
      document.getElementById('shippingDetailsModal').style.display = 'none';
      document.getElementById('loginModal').style.display = 'block';
      return;
    }
    db.collection('users').doc(user.uid).set({
      fullName, phoneNumber, province, city, zone, address
    }, { merge: true })
    .then(() => {
      alert("Shipping details saved. Proceeding to payment selection.");
      document.getElementById('shippingDetailsModal').style.display = 'none';
      document.getElementById('paymentModal').style.display = 'block';
    })
    .catch(error => {
      console.error("Error saving shipping details: ", error);
      alert("Error saving shipping details. Please try again.");
    });
  });

  // Payment Modal Selection Buttons
  document.getElementById('selectCardPayment').addEventListener('click', () => {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('cardPaymentModal').style.display = 'block';
  });
  document.getElementById('selectEasypaisaPayment').addEventListener('click', () => {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('easypaisaPaymentModal').style.display = 'block';
  });
  document.getElementById('selectCODPayment').addEventListener('click', () => {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('codPaymentModal').style.display = 'block';
  });

  // Card Payment Form Submission
  const cardPaymentForm = document.getElementById('cardPaymentForm');
  cardPaymentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cardHolderName = document.getElementById('cardHolderName').value;
    const cardNumber = document.getElementById('cardNumber').value;
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCVV = document.getElementById('cardCVV').value;
    // Insert your card payment integration (e.g., Stripe) here
    alert(`Card Payment processed for ${cardHolderName}!`);
    completeCheckout();
    document.getElementById('cardPaymentModal').style.display = 'none';
  });

  // Easypaisa Payment Form Submission
  const easypaisaPaymentForm = document.getElementById('easypaisaPaymentForm');
  easypaisaPaymentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const easypaisaMobile = document.getElementById('easypaisaMobile').value;
    const easypaisaTransactionId = document.getElementById('easypaisaTransactionId').value;
    // Insert your Easypaisa API integration here
    alert(`Easypaisa Payment processed for mobile ${easypaisaMobile}!`);
    completeCheckout();
    document.getElementById('easypaisaPaymentModal').style.display = 'none';
  });

  // Cash on Delivery (COD) Payment Form Submission
  const codPaymentForm = document.getElementById('codPaymentForm');
  codPaymentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert("Your Cash on Delivery order has been confirmed!");
    completeCheckout();
    document.getElementById('codPaymentModal').style.display = 'none';
  });

  // completeCheckout() records the order in Firestore
  function completeCheckout() {
    const user = firebase.auth().currentUser;
    const orderData = {
      userEmail: user ? user.email : 'Guest',
      items: cartItems,
      total: cartItems.reduce((acc, item) => acc + item.price.discounted * item.quantity, 0),
      status: 'Pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('orders').add(orderData)
      .then(() => {
        alert("Checkout complete! Thank you for your purchase.");
        cartItems = [];
        updateCartCount();
        updateCartView();
        updateCartTotal();
        saveCart();
      })
      .catch(error => {
        console.error("Error recording order: ", error);
        alert("Error recording your order. Please try again.");
      });
  }

  // Coupon functionality
  const couponInput = document.getElementById('couponInput');
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const couponMessage = document.getElementById('couponMessage');

  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', () => {
      const couponCode = couponInput.value.trim();
      if (!couponCode) {
        couponMessage.textContent = "Please enter a coupon code.";
        return;
      }
      db.collection('coupons').doc(couponCode).get()
        .then((doc) => {
          if (doc.exists) {
            const data = doc.data();
            const discount = data.discount;
            const expiration = data.expiration;
            const today = new Date().toISOString().split('T')[0];
            if (expiration < today) {
              couponMessage.textContent = "This coupon has expired.";
              return;
            }
            const currentTotal = cartItems.reduce((acc, item) => acc + item.price.discounted * item.quantity, 0);
            const discountAmount = (discount / 100) * currentTotal;
            const newTotal = (currentTotal - discountAmount).toFixed(2);
            const cartTotalElem = document.querySelector('.cart__total');
            if (cartTotalElem) {
              cartTotalElem.textContent = `Total: $${newTotal}`;
            }
            couponMessage.textContent = `Coupon applied! You saved ${discount}% ($${discountAmount.toFixed(2)}).`;
          } else {
            couponMessage.textContent = "Invalid coupon code.";
          }
        })
        .catch((error) => {
          console.error("Error applying coupon:", error);
          couponMessage.textContent = "Error applying coupon. Please try again.";
        });
    });
  }

  // --- Authentication & Modal Logic ---
  const loginModal = document.getElementById('loginModal');
  const signupModal = document.getElementById('signupModal');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      loginModal.style.display = 'block';
    });
  }
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      signupModal.style.display = 'block';
    });
  }
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      const modalEl = document.getElementById(modalId);
      if (modalEl) modalEl.style.display = 'none';
    });
  });

  // Signup Form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const fakeDomains = ['mailinator.com', 'tempmail.com', '10minutemail.com', 'fakeemail.com'];
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (fakeDomains.includes(emailDomain)) {
        alert("Please use a valid email address. Fake emails are not allowed.");
        return;
      }
      auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => userCredential.user.updateProfile({ displayName: name }))
        .then(() => {
          alert('Sign up successful!');
          signupForm.reset();
          signupModal.style.display = 'none';
        })
        .catch(error => {
          console.error("Error during sign up:", error);
          alert(error.message);
        });
    });
  }

  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      auth.signInWithEmailAndPassword(email, password)
        .then(() => {
          alert('Login successful!');
          loginForm.reset();
          loginModal.style.display = 'none';
        })
        .catch(error => {
          console.error("Error during login:", error);
          alert(error.message);
        });
    });
  }

  // Admin Login Form (if applicable)
  const adminLoginModal = document.getElementById('adminLoginModal');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const adminEmail = document.getElementById('adminEmail').value;
      const adminPassword = document.getElementById('adminPassword').value;
      auth.signInWithEmailAndPassword(adminEmail, adminPassword)
        .then(userCredential => {
          const allowedAdminEmails = ['alet8319@gmail.com'];
          if (allowedAdminEmails.includes(userCredential.user.email.toLowerCase())) {
            window.location.href = 'admin.html';
          } else {
            auth.signOut();
            alert('Unauthorized access. You are not an admin.');
          }
        })
        .catch(error => {
          console.error("Error during admin login:", error);
          alert(error.message);
        });
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut()
        .then(() => { alert('Logged out successfully!'); })
        .catch(error => { console.error("Error during logout:", error); alert(error.message); });
    });
  }

  // Update UI on auth state change and fetch order tracking info for signed-in users
  auth.onAuthStateChanged(user => {
    if (user) {
      logoutBtn.style.display = 'block';
      loginBtn.style.display = 'none';
      signupBtn.style.display = 'none';
      fetchUserOrders();
    } else {
      logoutBtn.style.display = 'none';
      loginBtn.style.display = 'inline-block';
      signupBtn.style.display = 'inline-block';
      document.getElementById('orderStatusContainer').innerHTML = '<p>Please sign in to view your order tracking information.</p>';
    }
  });

  // --- Order Tracking Functionality ---
  function fetchUserOrders() {
    const user = firebase.auth().currentUser;
    if (user) {
      db.collection('orders')
        .where('userEmail', '==', user.email)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
          let ordersHtml = '';
          snapshot.forEach(doc => {
            const order = doc.data();
            ordersHtml += `
              <div class="order-status">
                <h3>Order ID: ${doc.id}</h3>
                <p>Status: ${order.status}</p>
                ${order.trackingId 
                  ? `<p>Tracking ID: ${order.trackingId}</p><p>Your package is on the way!</p>`
                  : `<p>Waiting for processing...</p>`
                }
              </div>
              <hr>
            `;
          });
          document.getElementById('orderStatusContainer').innerHTML = ordersHtml;
        }, error => {
          console.error("Error fetching user orders: ", error);
        });
    } else {
      document.getElementById('orderStatusContainer').innerHTML = '<p>Please sign in to view your order tracking information.</p>';
    }
  }
});
