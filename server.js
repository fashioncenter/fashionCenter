const express = require('express');
const app = express();
const stripe = require('stripe')('AS2w5dUXM2rC3F5GVwKgrFe6gAuNK0oiS3wS8ayHWORoLTq95GXK26I7PsWGtwoBUoT2ZgbSJ8fHOUjO');
const bodyParser = require('body-parser');
const path = require('path');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Redirect product-detail.html to home page
app.get('/product-detail.html', (req, res) => {
  res.redirect('/');
});

// Handle product pages for sharing
app.get('/product/:id', (req, res) => {
  // Get the product ID from the request parameters
  const productId = req.params.id;
  
  // Redirect to the main page with the product ID as a parameter
  // This will allow the front-end to handle showing the product
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: item.price.discounted * 100, // Stripe expects the amount in cents
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: 'codetoweb.tech',
      cancel_url: 'codetoweb.tech',
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).send('Something went wrong during checkout.');
  }
});

app.listen(3000, () => console.log('Server is running on port 3000'));
