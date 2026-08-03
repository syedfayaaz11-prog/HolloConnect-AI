"use client";

import { memo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Play } from "lucide-react";
import type { InspirationItem } from "@/lib/inspiration";

/**
 * Sample/inspiration tiles for the Image AI and Video AI studios.
 *
 * Image AI's tiles use real bundled preview photos (`item.image`, under
 * /public/samples/images) — supplied by the project owner and wired in here, not fetched
 * from any external URL, so there's no runtime network dependency and no third-party
 * hotlinking. `next/image` handles lazy loading, responsive sizing, and format negotiation
 * automatically.
 *
 * Video AI has no bundled video assets (none were supplied), so its tiles keep the original
 * gradient + icon treatment, with `kind="video"` adding a play-affordance cue so they still
 * read as distinct from the image tiles rather than looking unfinished.
 */
function InspirationGridImpl({
  items,
  onUse,
  compact,
  kind = "image",
}: {
  items: InspirationItem[];
  onUse: (prompt: string) => void;
  /** Smaller tiles once the user already has real creations, so inspiration takes a back seat
      to their own gallery instead of competing with it for space. */
  compact?: boolean;
  kind?: "image" | "video";
}) {
  return (
    <div
      className={`grid gap-3 ${
        compact
          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
      }`}
    >
      {items.map((item, i) => (
        <motion.button
          key={item.id}
          type="button"
          onClick={() => onUse(item.prompt)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
          className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface text-left transition-all duration-300 hover:border-white/[0.15] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] ${
            compact ? "p-3 aspect-square" : "p-4 aspect-[4/3]"
          } flex flex-col justify-between`}
        >
          {item.image ? (
            <>
              {/* Real bundled preview photo — object-cover fills the tile regardless of the
                  source image's own aspect ratio. Not `priority`: these grids can hold a
                  dozen-plus tiles and only the visible ones should load eagerly, which is
                  next/image's lazy-by-default behavior. */}
              <Image
                src={item.image}
                alt={item.label}
                fill
                sizes={compact ? "160px" : "260px"}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />
            </>
          ) : (
            <>
              {/* No bundled asset for this category — original gradient + icon treatment. */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
              <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/[0.08] to-transparent transition-opacity duration-300" />
            </>
          )}

          <div className="relative flex items-start justify-between">
            <span
              className={`rounded-xl bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-105 ${
                compact ? "w-7 h-7" : "w-10 h-10"
              }`}
            >
              <item.icon size={compact ? 13 : 17} />
            </span>
            {kind === "video" ? (
              <span
                className={`rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/0 group-hover:text-white transition-all duration-300 group-hover:scale-110 ${
                  compact ? "w-6 h-6" : "w-8 h-8"
                }`}
              >
                <Play size={compact ? 10 : 12} fill="currentColor" className="ml-0.5" />
              </span>
            ) : (
              <ArrowUpRight
                size={14}
                className="text-white/0 group-hover:text-white/80 transition-all -translate-y-0.5 group-hover:translate-y-0 duration-300"
              />
            )}
          </div>
          <div className="relative">
            <p className={`text-white font-semibold drop-shadow-sm ${compact ? "text-[11px]" : "text-sm"}`}>
              {item.label}
            </p>
            {!compact && <p className="text-[11px] text-gray-300/90 line-clamp-2 mt-1 leading-snug drop-shadow-sm">{item.prompt}</p>}
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export const InspirationGrid = memo(InspirationGridImpl);
