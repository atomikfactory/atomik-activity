// Base map tiles. CARTO's basemaps now watermark every keyless request
// ("API KEY REQUIRED"), so we use the standard OpenStreetMap tiles, which need
// no key. OSM has no dark style; dark mode inverts the light tiles via CSS
// (see `.map-tiles-dark` in index.css).
export const OSM_TILES = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

export function tileClassName(theme: string): string | undefined {
  return theme === "dark" ? "map-tiles-dark" : undefined;
}
