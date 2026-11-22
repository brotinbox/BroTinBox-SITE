import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { BoxMeal } from '@/lib/menu-engine';
import { BOX_DISH_PHOTOS } from '@/lib/box-photo/manifest';

/**
 * The day's box drawn from one photo per dish (public/box-dishes/<CODE>.webp,
 * made by photos/ai-dishes/publish.mjs). Each compartment shows the dish the
 * menu serves that day, so swaps and one-date changes update the picture.
 *
 * Layout follows the real black 6-spot box, held upright (photo 22 Nov 2026):
 *   left column: curd (veg) · egg (non-veg) · legume
 *   right: salad over main in the big compartment, then carb + egg below.
 * Lite is the 3-spot box: main, salad, carb; veg Lite also gets the curd cup,
 * drawn as a round cup beside the box (lib/lite-box.ts).
 * Percentages are of the tray; change them here if the box changes.
 */

type Spot = { l: number; t: number; w: number; h: number };
type Fill = { src: string; zoom?: number } | null;

const FULL = {
  aspect: 0.82,
  topLeft: { l: 3, t: 3.5, w: 34, h: 34 },
  midLeft: { l: 3, t: 39.5, w: 34, h: 20 },
  bottomLeft: { l: 3, t: 61.5, w: 34, h: 35 },
  big: { l: 39, t: 3.5, w: 58, h: 66 },
  bottomMid: { l: 39, t: 71.5, w: 19, h: 25 },
  bottomRight: { l: 60, t: 71.5, w: 37, h: 25 },
};
const LITE = {
  aspect: 1.1,
  big: { l: 3.5, t: 4.5, w: 59, h: 91 },
  top: { l: 64.5, t: 4.5, w: 32, h: 44.5 },
  bottom: { l: 64.5, t: 51, w: 32, h: 44.5 },
};

/** The generated photos include the box walls, so zoom past them; the CSS compartment draws its own walls. */
const ZOOM = 1.22;

function photo(code: string | undefined): Fill {
  return code && BOX_DISH_PHOTOS.has(code) ? { src: `/box-dishes/${code}.webp` } : null;
}

function Compartment({ spot, fill, alt, split }: { spot: Spot; fill?: Fill; alt?: string; split?: { top: Fill; bottom: Fill; topAlt: string; bottomAlt: string } }) {
  return (
    <div
      className="absolute overflow-hidden rounded-[9%/7%] bg-[#0b0b0b] shadow-[inset_0_0_0_1.5px_#222,inset_0_8px_18px_rgba(0,0,0,0.75)]"
      style={{ left: `${spot.l}%`, top: `${spot.t}%`, width: `${spot.w}%`, height: `${spot.h}%` }}
    >
      {split ? (
        <>
          <Layer fill={split.top} alt={split.topAlt} style={{ top: 0, height: '46%' }} mask="linear-gradient(to bottom, #000 80%, transparent)" />
          <Layer fill={split.bottom} alt={split.bottomAlt} style={{ top: '38%', height: '62%' }} mask="linear-gradient(to bottom, transparent, #000 16%)" />
        </>
      ) : fill ? (
        <Layer fill={fill} alt={alt ?? ''} style={{ top: 0, height: '100%' }} />
      ) : (
        // Empty spot: the ribbed black plastic.
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#0d0d0d_0_5px,#151515_5px_7px)]" />
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_10px_4px_rgba(0,0,0,0.55)]" />
    </div>
  );
}

function Layer({ fill, alt, style, mask }: { fill: Fill; alt: string; style: React.CSSProperties; mask?: string }) {
  if (!fill) return null;
  return (
    <div className="absolute inset-x-0" style={{ ...style, maskImage: mask, WebkitMaskImage: mask }}>
      <Image
        src={fill.src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 60vw, 360px"
        className="object-cover"
        style={{ transform: `scale(${fill.zoom ?? ZOOM})` }}
      />
    </div>
  );
}

/** The veg Lite curd cup: a round black cup resting against the box's bottom-right corner. */
function CurdCup({ fill, alt }: { fill: NonNullable<Fill>; alt: string }) {
  return (
    <div className="absolute -right-[16%] -bottom-[6%] w-[34%] aspect-square rounded-full bg-[linear-gradient(160deg,#222,#080808)] p-[6%] shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
      <div className="relative h-full w-full overflow-hidden rounded-full shadow-[inset_0_4px_10px_rgba(0,0,0,0.7)]">
        <Image src={fill.src} alt={alt} fill sizes="140px" className="object-cover" style={{ transform: 'scale(1.6)' }} />
      </div>
    </div>
  );
}

/** True when the day's main has a box photo; otherwise callers keep the old single photo. */
export function hasBoxPhoto(box: BoxMeal): boolean {
  return BOX_DISH_PHOTOS.has(box.items.main.id);
}

export function BoxPhoto({ box, size = 'regular', className }: { box: BoxMeal; size?: 'regular' | 'lite'; className?: string }) {
  const { main, salad, carb, legume, proteinSide } = box.items;
  const veg = proteinSide.id !== 'NVE';
  const lite = size === 'lite';
  const t = lite ? LITE : FULL;
  const mainSalad = { top: photo(salad.id), bottom: photo(main.id), topAlt: salad.name, bottomAlt: main.name };
  const curd = veg ? photo(proteinSide.id) : null;

  return (
    <div className={cn('absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_30%_20%,#f1ede7,#ddd6cc)]', className)}>
      <div
        className="relative h-[92%] rounded-[5%] bg-[linear-gradient(160deg,#1c1c1c,#090909)] shadow-[0_14px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.10)]"
        style={{ aspectRatio: t.aspect }}
        role="img"
        aria-label={`${lite ? 'Lite' : 'Full'} box: ${(lite ? [main, salad, carb, ...(veg ? [proteinSide] : [])] : [main, proteinSide, legume, salad, carb]).map((d) => d.name).join(', ')}`}
      >
        {lite ? (
          <>
            <Compartment spot={LITE.big} fill={photo(main.id)} alt={main.name} />
            <Compartment spot={LITE.top} fill={photo(salad.id)} alt={salad.name} />
            <Compartment spot={LITE.bottom} fill={photo(carb.id)} alt={carb.name} />
            {curd && <CurdCup fill={curd} alt={proteinSide.name} />}
          </>
        ) : (
          <>
            <Compartment spot={FULL.topLeft} fill={curd} alt={proteinSide.name} />
            <Compartment spot={FULL.midLeft} fill={veg ? null : { src: '/box-dishes/NVE-a.webp', zoom: 1 }} alt="Boiled egg" />
            <Compartment spot={FULL.bottomLeft} fill={photo(legume.id)} alt={legume.name} />
            <Compartment spot={FULL.big} split={mainSalad} />
            <Compartment spot={FULL.bottomMid} fill={photo(carb.id)} alt={carb.name} />
            <Compartment spot={FULL.bottomRight} fill={veg ? null : { src: '/box-dishes/NVE-b.webp', zoom: 1 }} alt="Boiled egg halves" />
          </>
        )}
      </div>
    </div>
  );
}
