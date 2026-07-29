import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StageHome — Verified Student Housing in Kenya",
    short_name: "StageHome",
    description: "Find verified student accommodation near Kenyan universities.",
    start_url: "/",
    display: "standalone",
    background_color: "#EDEFE9",
    theme_color: "#B23A2F",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
    ],
  };
}
