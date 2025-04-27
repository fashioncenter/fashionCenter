// sitemap-generator.js
// Automatic sitemap generator for M. Fashion website
// This script will dynamically generate and update sitemaps based on your products

import fs from 'fs';
import path from 'path';

// Global configuration
const config = {
  baseUrl: 'https://codetoweb.tech',
  outputPath: './',
  productsJsonPath: './products.json',
  mainSitemapPath: './sitemap.xml',
  productSitemapPath: './product-sitemap.xml',
  sitemapIndexPath: './sitemap-index.xml',
  lastModified: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
  defaultChangeFreq: 'weekly',
  defaultPriority: 0.8
};

// Function to load products from JSON file
function loadProducts() {
  try {
    const productsData = fs.readFileSync(config.productsJsonPath, 'utf8');
    return JSON.parse(productsData);
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}

// Function to create a URL-friendly slug from product name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate XML for a single product
function generateProductXml(product) {
  const slug = createSlug(product.name);
  const productUrl = `${config.baseUrl}/products/${slug}`;
  
  let imageXml = '';
  if (product.image) {
    imageXml = `
    <image:image>
      <image:loc>${config.baseUrl}/${product.image}</image:loc>
      <image:title>${product.name}</image:title>
      <image:caption>${product.description || product.name}</image:caption>
    </image:image>`;
  }
  
  return `
  <url>
    <loc>${productUrl}</loc>
    <lastmod>${config.lastModified}</lastmod>
    <changefreq>${config.defaultChangeFreq}</changefreq>
    <priority>${config.defaultPriority}</priority>${imageXml}
  </url>`;
}

// Generate product sitemap
function generateProductSitemap() {
  const products = loadProducts();
  
  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;
  
  products.forEach(product => {
    sitemapContent += generateProductXml(product);
  });
  
  sitemapContent += `
</urlset>`;
  
  try {
    fs.writeFileSync(config.productSitemapPath, sitemapContent);
    console.log(`Product sitemap generated at ${config.productSitemapPath}`);
    return true;
  } catch (error) {
    console.error('Error writing product sitemap:', error);
    return false;
  }
}

// Generate sitemap index
function generateSitemapIndex() {
  const sitemapIndexContent = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${config.baseUrl}/sitemap.xml</loc>
    <lastmod>${config.lastModified}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${config.baseUrl}/product-sitemap.xml</loc>
    <lastmod>${config.lastModified}</lastmod>
  </sitemap>
</sitemapindex>`;
  
  try {
    fs.writeFileSync(config.sitemapIndexPath, sitemapIndexContent);
    console.log(`Sitemap index generated at ${config.sitemapIndexPath}`);
    return true;
  } catch (error) {
    console.error('Error writing sitemap index:', error);
    return false;
  }
}

// Main function to generate all sitemaps
function generateSitemaps() {
  console.log('Starting sitemap generation...');
  
  // Generate product sitemap
  const productSitemapGenerated = generateProductSitemap();
  
  // Generate sitemap index
  if (productSitemapGenerated) {
    generateSitemapIndex();
  }
  
  console.log('Sitemap generation completed!');
}

// Run the generator
generateSitemaps();

// Export for potential use in other scripts
export default generateSitemaps; 