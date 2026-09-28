import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.kitkleen.in",
      lastModified: new Date(),
    },
  ];
}