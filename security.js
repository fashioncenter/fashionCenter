// Enhanced Security Middleware
const sensitivePatterns = [
  'firebase',
  'database',
  'config',
  'private',
  'backup',
  'git',
  'logs',
  'auth',
  'storage',
  'hosting',
  'functions',
  'firestore',
  'rtdb'
];

class SecurityGuard {
  constructor() {
    this.isInitialized = false;
    this.originalLocation = window.location.href;
    this.homePageUrl = '/';
  }

  init() {
    if (this.isInitialized) return;
    
    // Intercept all navigation attempts
    this.interceptNavigation();
    
    // Monitor URL changes
    this.watchUrlChanges();
    
    // Block direct Firebase access
    this.blockDirectFirebaseAccess();
    
    this.isInitialized = true;
  }

  interceptNavigation() {
    // Intercept pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const self = this;

    history.pushState = function() {
      if (self.isSensitiveUrl(arguments[2])) {
        self.redirectToHome('Blocked navigation to sensitive URL');
        return;
      }
      return originalPushState.apply(this, arguments);
    };

    history.replaceState = function() {
      if (self.isSensitiveUrl(arguments[2])) {
        self.redirectToHome('Blocked state replacement with sensitive URL');
        return;
      }
      return originalReplaceState.apply(this, arguments);
    };
  }

  watchUrlChanges() {
    // Watch for URL changes
    window.addEventListener('popstate', () => this.checkCurrentUrl());
    window.addEventListener('hashchange', () => this.checkCurrentUrl());
    
    // Check periodically for URL changes
    setInterval(() => this.checkCurrentUrl(), 1000);
  }

  blockDirectFirebaseAccess() {
    if (this.isFirebaseHostname(window.location.hostname)) {
      this.redirectToHome('Blocked direct Firebase access');
    }
  }

  isFirebaseHostname(hostname) {
    return hostname.includes('firebaseapp.com') || 
           hostname.includes('firebaseio.com') ||
           hostname.includes('firebase') ||
           hostname.includes('firestore');
  }

  isSensitiveUrl(url) {
    if (!url) return false;
    
    const lowerUrl = url.toLowerCase();
    return sensitivePatterns.some(pattern => 
      lowerUrl.includes(pattern.toLowerCase())
    );
  }

  checkCurrentUrl() {
    const currentUrl = window.location.href;
    
    // Check if current URL is sensitive
    if (this.isSensitiveUrl(currentUrl)) {
      this.redirectToHome('Blocked access to sensitive URL');
      return;
    }

    // Check if we're on a Firebase domain
    if (this.isFirebaseHostname(window.location.hostname)) {
      this.redirectToHome('Blocked Firebase domain access');
      return;
    }
  }

  redirectToHome(reason) {
    console.warn('Security redirect:', reason);
    
    // Prevent redirect loops
    if (window.location.pathname !== this.homePageUrl) {
      window.location.replace(this.homePageUrl);
    }
  }
}

// Create and export security guard instance
const securityGuard = new SecurityGuard();

// Initialize security on load
document.addEventListener('DOMContentLoaded', () => {
  securityGuard.init();
});

// Export for use in other modules
export { securityGuard };

