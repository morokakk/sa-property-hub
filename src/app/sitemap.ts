import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.moremelaproperties.co.za';
  return ['', '/welcome', '/analyzer', '/privacy', '/get-started'].map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
  }));
}
