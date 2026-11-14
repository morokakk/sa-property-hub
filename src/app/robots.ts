import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/welcome', '/analyzer', '/privacy', '/get-started'],
      disallow: ['/dashboard', '/settings', '/funding', '/tasks', '/statement/', '/deal-room/', '/about'],
    },
    sitemap: 'https://www.moremelaproperties.co.za/sitemap.xml',
  };
}
