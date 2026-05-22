export function generateDeepLink(originalUrl: string): string {
  try {
    let url = originalUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    const path = urlObj.pathname;
    
    // YouTube
    if (host === 'youtube.com' || host === 'youtu.be') {
      // Add auto-subscribe prompt for channels/users
      if (path.includes('/channel/') || path.includes('/c/') || path.includes('/@') || path.includes('/user/')) {
        urlObj.searchParams.set('sub_confirmation', '1');
      }
      return urlObj.href;
    }
    
    // Instagram
    if (host === 'instagram.com') {
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 0 && !['p', 'reel', 'tv', 'explore', '_u'].includes(parts[0])) {
        // Formulate/_u/username structure which forces native app opening on both iOS and Android
        const username = parts[0];
        return `https://www.instagram.com/_u/${username}${urlObj.search}`;
      }
      return urlObj.href;
    }
    
    // Facebook
    if (host === 'facebook.com' || host === 'fb.com') {
      // Standard FB HTTPS url natively triggers App Links / Universal Links in iOS & Android
      return urlObj.href;
    }
    
    // TikTok
    if (host === 'tiktok.com') {
      // Standard TikTok HTTPS url naturally triggers native TikTok app
      return urlObj.href;
    }
    
    // Default fallback to standard URL
    return urlObj.href;
  } catch (error) {
    // If URL parsing fails, return original
    return originalUrl;
  }
}
