// canonicals.js
// Helper script to add canonical URLs and ensure proper page relationships for SEO
// This prevents duplicate content issues that can harm search rankings

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const config = {
  baseUrl: 'https://codetoweb.tech',
  pagesDir: './', // Directory where HTML pages are stored
  productUrlFormat: '/products/:slug', // URL format for product pages
  categoryUrlFormat: '/category/:slug', // URL format for category pages
  indexPage: 'index.html'
};

// Function to create URL-friendly slug
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Function to add canonical links to HTML pages
function addCanonicalLink(filePath, canonicalUrl) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if canonical already exists
    if (content.includes('<link rel="canonical"')) {
      // Replace existing canonical
      content = content.replace(
        /<link rel="canonical"[^>]*>/,
        `<link rel="canonical" href="${canonicalUrl}">`
      );
    } else {
      // Add new canonical before </head>
      content = content.replace(
        '</head>',
        `  <link rel="canonical" href="${canonicalUrl}">\n</head>`
      );
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added canonical link to ${filePath}: ${canonicalUrl}`);
    return true;
  } catch (error) {
    console.error(`❌ Error adding canonical to ${filePath}:`, error);
    return false;
  }
}

// Function to process HTML files in directory
function processHtmlFiles(directory) {
  console.log(`Processing HTML files in ${directory}...`);
  
  try {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // Skip node_modules and other special directories
        if (file !== 'node_modules' && !file.startsWith('.')) {
          processHtmlFiles(filePath);
        }
      } else if (file.endsWith('.html')) {
        // Process HTML file
        let canonicalUrl;
        
        // Determine canonical URL based on file name
        if (file === 'index.html') {
          canonicalUrl = config.baseUrl + '/';
        } else {
          // Remove .html extension for canonical URLs
          const pageName = file.replace('.html', '');
          canonicalUrl = `${config.baseUrl}/${pageName}`;
        }
        
        // Add canonical link
        addCanonicalLink(filePath, canonicalUrl);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error processing HTML files:', error);
    return false;
  }
}

// Function to add pagination markup to paginated pages
function addPaginationMarkup(filePath, currentPage, totalPages, baseUrl) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Prepare pagination links
    let paginationLinks = '';
    
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      const prevUrl = prevPage === 1 ? baseUrl : `${baseUrl}?page=${prevPage}`;
      paginationLinks += `<link rel="prev" href="${prevUrl}">\n`;
    }
    
    if (currentPage < totalPages) {
      const nextUrl = `${baseUrl}?page=${currentPage + 1}`;
      paginationLinks += `<link rel="next" href="${nextUrl}">\n`;
    }
    
    // Add pagination links before </head>
    if (paginationLinks) {
      content = content.replace(
        '</head>',
        `  ${paginationLinks}</head>`
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Added pagination links to ${filePath}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error adding pagination to ${filePath}:`, error);
    return false;
  }
}

// Process all HTML files
function updateCanonicals() {
  console.log('Starting canonical URL updates...');
  const success = processHtmlFiles(config.pagesDir);
  
  if (success) {
    console.log('Successfully updated canonical URLs for all pages.');
  } else {
    console.error('Error updating canonical URLs.');
  }
  
  return success;
}

// Example call for pagination markup on a category page
// addPaginationMarkup('category/mens-clothing.html', 1, 5, config.baseUrl + '/category/mens-clothing');

// Run the canonical URL updater
updateCanonicals();

export default {
  updateCanonicals,
  addCanonicalLink,
  addPaginationMarkup
}; 