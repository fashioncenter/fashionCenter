// ping-search-engines.js
// This script notifies search engines about your sitemap updates
// Run this after updating your products or content

import https from 'https';
import http from 'http';
import { URL } from 'url';

// Configuration
const config = {
  siteUrl: 'https://codetoweb.tech',
  sitemapUrl: 'https://codetoweb.tech/sitemap-index.xml',
  searchEngines: [
    {
      name: 'Google',
      url: 'https://www.google.com/ping?sitemap='
    },
    {
      name: 'Bing',
      url: 'https://www.bing.com/ping?sitemap='
    },
    {
      name: 'Yandex',
      url: 'https://webmaster.yandex.com/ping?sitemap='
    }
  ],
  logPath: './search-engine-pings.log'
};

// Function to ping a search engine
async function pingSearchEngine(engine) {
  return new Promise((resolve, reject) => {
    const pingUrl = `${engine.url}${encodeURIComponent(config.sitemapUrl)}`;
    const parsedUrl = new URL(pingUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET'
    };
    
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          engine: engine.name,
          status: res.statusCode,
          message: `${engine.name} responded with status ${res.statusCode}`,
          timestamp: new Date().toISOString()
        };
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Successfully pinged ${engine.name}: ${res.statusCode}`);
          resolve(result);
        } else {
          console.error(`❌ Failed to ping ${engine.name}: ${res.statusCode}`);
          reject(result);
        }
      });
    });
    
    req.on('error', (error) => {
      const result = {
        engine: engine.name,
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      console.error(`❌ Error pinging ${engine.name}: ${error.message}`);
      reject(result);
    });
    
    req.end();
  });
}

// Function to ping all search engines
async function pingAllSearchEngines() {
  console.log('Starting to ping search engines...');
  console.log(`Site URL: ${config.siteUrl}`);
  console.log(`Sitemap URL: ${config.sitemapUrl}`);
  
  const results = [];
  const timestamp = new Date().toISOString();
  
  for (const engine of config.searchEngines) {
    try {
      const result = await pingSearchEngine(engine);
      results.push(result);
    } catch (error) {
      results.push(error);
    }
  }
  
  console.log('Completed pinging all search engines.');
  logResults(results);
  return results;
}

// Function to log results to console and file
function logResults(results) {
  const timestamp = new Date().toISOString();
  const logMessage = `
===============================================
Search Engine Ping Results - ${timestamp}
===============================================
${results.map(result => 
  `${result.engine}: ${result.status} - ${result.message}`
).join('\n')}
===============================================
`;

  console.log(logMessage);
  
  // Implement file logging if needed
  // fs.appendFileSync(config.logPath, logMessage);
}

// Execute the ping function
pingAllSearchEngines();

// Export for potential use in other scripts
export default pingAllSearchEngines; 