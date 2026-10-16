/** Web app manifest: name and icons used for "Add to Home screen". */
export default function manifest() {
  return {
    name: "nSplit",
    short_name: "nSplit",
    description: "Split expenses with your group and settle up cleanly.",
    start_url: "/groups",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4F46E5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
