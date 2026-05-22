export function generateDeepLink(originalUrl: string): string {
  try {
    let url = originalUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    let path = urlObj.pathname;
    
    // YouTube
    if (host === 'youtube.com' || host === 'youtu.be') {
      // Add auto-subscribe prompt for channels/users
      if (path.includes('/channel/') || path.includes('/c/') || path.includes('/@') || path.includes('/user/')) {
        urlObj.searchParams.set('sub_confirmation', '1');
      }
      
      // Intent scheme for Android, standard for iOS (iOS Universal Links handle standard HTTPS best)
      // Since we format it specifically for mobile apps as requested:
      return `intent://${urlObj.host}${urlObj.pathname}${urlObj.search}#Intent;package=com.google.android.youtube;scheme=https;end`;
    }
    
    // Instagram
    if (host === 'instagram.com') {
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 0 && !['p', 'reel', 'tv', 'explore'].includes(parts[0])) {
        // It's a profile
        const username = parts[0];
        // Using instagram:// scheme
        return `instagram://user?username=${username}`;
      }
      // For posts/reels
      return `intent://${urlObj.host}${urlObj.pathname}#Intent;package=com.instagram.android;scheme=https;end`;
    }
    
    // Facebook
    if (host === 'facebook.com' || host === 'fb.com') {
      // A common way to deep link profiles on FB
      return `fb://facewebmodal/f?href=${urlObj.href}`;
    }
    
    // TikTok
    if (host === 'tiktok.com') {
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 0 && parts[0].startsWith('@')) {
        // Return standard url as tiktok's universal links are very robust, or we can use intent.
        return `intent://${urlObj.host}${urlObj.pathname}#Intent;package=com.zhiliaoapp.musically;scheme=https;end`;
      }
    }
    
    // Default fallback to standard URL
    return urlObj.href;
  } catch (error) {
    // If URL parsing fails, return original
    return originalUrl;
  }
}
