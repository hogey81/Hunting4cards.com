import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hunting4Cards",
    short_name: "Hunting4Cards",
    description: "Je kaartcollectie met actuele Cardmarket-prijzen.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1630",
    theme_color: "#0B1630",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
