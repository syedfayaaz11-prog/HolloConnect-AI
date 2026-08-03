import type { LucideIcon } from "lucide-react";
import {
  User,
  Package,
  Car,
  Building2,
  Cpu,
  Sparkles,
  Wand2,
  Trees,
  Shapes,
  Sofa,
  UtensilsCrossed,
  Plane,
  Rotate3d,
  Waves,
  RectangleHorizontal,
  Rocket,
  Wind,
  Mountain,
  Droplets,
  Flame,
  Building,
} from "lucide-react";

export interface InspirationItem {
  id: string;
  label: string;
  prompt: string;
  icon: LucideIcon;
  /** Tailwind gradient classes for the tile — used as the base wash under the image (or
      alone, for categories without a bundled photo yet, like the video list). */
  gradient: string;
  /** Local bundled preview image under /public/samples/images — real photos the user
      supplied and asked to be wired in here, not stock/external URLs. Optional: video
      inspiration tiles and any image category without a supplied asset fall back to the
      gradient + icon treatment. */
  image?: string;
}

export const IMAGE_INSPIRATION: InspirationItem[] = [
  {
    id: "portrait",
    label: "Portrait",
    prompt: "Studio portrait of a woman with soft window light, shallow depth of field, 85mm lens look",
    icon: User,
    gradient: "from-rose-400/50 via-fuchsia-500/30 to-transparent",
    image: "/samples/images/portrait-photography.webp",
  },
  {
    id: "product",
    label: "Product Photography",
    prompt: "Minimalist product shot of a ceramic coffee cup on a marble surface, soft studio lighting",
    icon: Package,
    gradient: "from-amber-300/45 via-orange-400/25 to-transparent",
    image: "/samples/images/product-photography.webp",
  },
  {
    id: "luxury-cars",
    label: "Luxury Cars",
    prompt: "A sleek luxury sports car on a wet city street at night, dramatic reflections, cinematic lighting",
    icon: Car,
    gradient: "from-slate-300/40 via-zinc-400/25 to-transparent",
    image: "/samples/images/luxury-car.webp",
  },
  {
    id: "architecture",
    label: "Architecture",
    prompt: "Modern minimalist house with floor-to-ceiling glass, surrounded by pine trees, golden hour",
    icon: Building2,
    gradient: "from-teal-400/45 via-emerald-500/25 to-transparent",
    image: "/samples/images/architecture.webp",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    prompt: "Cyberpunk city street at night, neon signs reflecting on wet pavement, futuristic figure in the foreground",
    icon: Cpu,
    gradient: "from-fuchsia-500/55 via-cyan-400/30 to-transparent",
    image: "/samples/images/cyberpunk-city.webp",
  },
  {
    id: "anime",
    label: "Anime",
    prompt: "Anime-style illustration of a girl standing on a rooftop at sunset, wind in her hair, detailed sky",
    icon: Sparkles,
    gradient: "from-pink-400/50 via-rose-400/30 to-transparent",
    image: "/samples/images/anime-style.webp",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    prompt: "Epic fantasy landscape with floating islands and waterfalls, dramatic clouds, painterly style",
    icon: Wand2,
    gradient: "from-violet-500/55 via-indigo-500/30 to-transparent",
    image: "/samples/images/fantasy-landscape.webp",
  },
  {
    id: "nature",
    label: "Nature",
    prompt: "Sunlight filtering through a dense green forest canopy, mist rising from the forest floor",
    icon: Trees,
    gradient: "from-green-400/45 via-emerald-500/25 to-transparent",
    image: "/samples/images/nature.webp",
  },
  {
    id: "space",
    label: "Space Scene",
    prompt: "A breathtaking view of a planet and galaxy from a rocky moon surface, stars and nebula in the background",
    icon: Rocket,
    gradient: "from-indigo-500/50 via-purple-500/28 to-transparent",
    image: "/samples/images/space-scene.webp",
  },
  {
    id: "logo",
    label: "Logo Design",
    prompt: "Minimalist geometric logo mark for a tech startup, single color, clean lines, on white background",
    icon: Shapes,
    gradient: "from-slate-400/35 via-gray-400/20 to-transparent",
    image: "/samples/images/logo-design.webp",
  },
  {
    id: "interior",
    label: "Interior Design",
    prompt: "Warm, minimalist living room interior with natural light, wood textures, and soft neutral tones",
    icon: Sofa,
    gradient: "from-orange-300/40 via-amber-400/25 to-transparent",
    image: "/samples/images/interior-design.webp",
  },
  {
    id: "food",
    label: "Food Photography",
    prompt: "Overhead shot of a rustic pasta dish on a wooden table, natural light, shallow depth of field",
    icon: UtensilsCrossed,
    gradient: "from-yellow-400/45 via-red-400/25 to-transparent",
    image: "/samples/images/food-photography.webp",
  },
];

export const VIDEO_INSPIRATION: InspirationItem[] = [
  {
    id: "drone-flyover",
    label: "Drone Flyover",
    prompt: "Aerial drone flyover of a rugged coastline at sunrise, sweeping cinematic motion",
    icon: Plane,
    gradient: "from-sky-400/45 via-blue-500/25 to-transparent",
  },
  {
    id: "cinematic-pan",
    label: "Cinematic Pan",
    prompt: "Slow cinematic pan across a misty mountain range at sunrise, soft golden light",
    icon: Mountain,
    gradient: "from-indigo-500/50 via-purple-500/28 to-transparent",
  },
  {
    id: "ocean-waves",
    label: "Ocean Waves",
    prompt: "Slow motion ocean waves rolling onto a sandy beach, golden hour light, gentle rhythm",
    icon: Waves,
    gradient: "from-cyan-400/45 via-blue-400/25 to-transparent",
  },
  {
    id: "product-spin",
    label: "Product Spin",
    prompt: "Smooth 360-degree rotation of a sleek wireless headphone on a reflective black surface, studio lighting",
    icon: Rotate3d,
    gradient: "from-amber-300/40 via-orange-400/25 to-transparent",
  },
  {
    id: "city-timelapse",
    label: "City Timelapse",
    prompt: "Timelapse of a city skyline from day to night, light trails building up on the streets below",
    icon: RectangleHorizontal,
    gradient: "from-pink-400/45 via-rose-500/25 to-transparent",
  },
  {
    id: "space-animation",
    label: "Space Animation",
    prompt: "Camera drifting slowly through a starfield past a glowing nebula, deep space, cinematic scale",
    icon: Rocket,
    gradient: "from-purple-500/55 via-violet-500/30 to-transparent",
  },
  {
    id: "particle-motion",
    label: "Particle Motion",
    prompt: "Abstract glowing particles flowing and swirling in slow motion against a dark background",
    icon: Wind,
    gradient: "from-cyan-400/50 via-teal-400/28 to-transparent",
  },
  {
    id: "fantasy-landscape",
    label: "Fantasy Landscape",
    prompt: "Camera slowly flying over a fantasy landscape with floating islands and glowing rivers of light",
    icon: Wand2,
    gradient: "from-violet-500/50 via-fuchsia-500/28 to-transparent",
  },
  {
    id: "luxury-car-motion",
    label: "Luxury Car Motion",
    prompt: "A luxury car driving along a coastal road at sunset, smooth tracking shot, cinematic color grade",
    icon: Car,
    gradient: "from-slate-300/40 via-zinc-400/25 to-transparent",
  },
  {
    id: "water-splash",
    label: "Water Splash",
    prompt: "Extreme slow motion of water splashing upward with droplets suspended in the air, studio lighting",
    icon: Droplets,
    gradient: "from-blue-400/45 via-cyan-400/25 to-transparent",
  },
  {
    id: "fire-effects",
    label: "Fire Effects",
    prompt: "Slow motion flames flickering and swirling against a black background, warm dramatic lighting",
    icon: Flame,
    gradient: "from-orange-500/55 via-red-500/30 to-transparent",
  },
  {
    id: "neon-city",
    label: "Neon City",
    prompt: "Slow tracking shot through a neon-lit city alley at night, reflections on wet ground, cyberpunk mood",
    icon: Building,
    gradient: "from-fuchsia-500/55 via-cyan-400/30 to-transparent",
  },
];
