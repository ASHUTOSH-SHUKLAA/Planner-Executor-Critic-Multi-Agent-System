import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Synora",
    short_name: "Synora",
    description: "Autonomous research powered by coordinated intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#101116",
    theme_color: "#101116",
    icons: [
      {
        src: "/brand/synora-logo.png",
        sizes: "822x543",
        type: "image/png",
      },
    ],
  };
}
