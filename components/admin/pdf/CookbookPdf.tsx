/** @jsxRuntime classic */
/** @jsx h */
import 'server-only';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
import { Document, Font, Image, Link, Page, Polygon, Rect, Circle, Svg, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { Styles } from '@react-pdf/renderer';
import { scaledQty } from '@/lib/recipes';
import { COOKBOOK_GROUPS, type CookbookDish, type PdfImage } from '@/lib/cookbook-pdf/data';

type Style = Styles[string];

/*
 * Next renders app routes with its own bundled React, while react-pdf is
 * loaded from node_modules (it is a default server external) with the
 * project's React. Elements from one React are rejected by the other's
 * reconciler, so this file builds its JSX with the exact React that
 * react-pdf's reconciler resolves (classic JSX pragma above → h).
 */
const pdfReact = createRequire(path.join(process.cwd(), 'node_modules/@react-pdf/reconciler/package.json'))('react') as typeof import('react');
const h = pdfReact.createElement;

/**
 * Cook book PDFs (single recipe and the whole book), drawn with react-pdf so
 * the layout is fixed A4, not whatever the browser's print dialog decides.
 * Colours follow the brand tokens in tailwind.config.ts: ink leads, orange
 * only for accents, warm whites carry the page.
 */

// ---------------------------------------------------------------- fonts

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  const f = (name: string) => path.join(process.cwd(), 'assets/fonts', name);
  Font.register({
    family: 'Inter',
    fonts: [
      { src: f('inter-latin-400-normal.woff'), fontWeight: 400 },
      { src: f('inter-latin-600-normal.woff'), fontWeight: 600 },
      { src: f('inter-latin-800-normal.woff'), fontWeight: 800 },
    ],
  });
  Font.register({
    family: 'Jakarta',
    fonts: [
      { src: f('plus-jakarta-sans-latin-600-normal.woff'), fontWeight: 600 },
      { src: f('plus-jakarta-sans-latin-800-normal.woff'), fontWeight: 800 },
    ],
  });
  // Never split words with hyphens ("Chick-en"): wrap whole words only.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

// ---------------------------------------------------------------- theme

const C = {
  ink: '#121212', inkSoft: '#2A2A2A', muted: '#6B6862', faint: '#9A968F',
  paper: '#FAFAF8', white: '#FFFFFF', sand: '#F3F1EE', sandDeep: '#E7E3DE',
  accent: '#EA580C', accentSoft: '#FFF4EC', accentMuted: '#FFE1CC',
  veg: '#16A34A', nonVeg: '#7B3F00',
  green: '#15803D', greenBg: '#DCFCE7', amber: '#B45309', amberBg: '#FEF3C7',
};

export type PdfVariant = 'designed' | 'print';

type Theme = {
  page: string; band: string; bandText: string; bandSub: string; bandRule: string;
  card: string; cardBorder: string; cardLip: string; zebra: string;
  tipsBg: string; notesBg: string; chipBg: string; chipBorder: string;
  stepBg: string; stepText: string; stepBorder: string;
  coverBg: string; coverText: string; coverSub: string;
};

const THEMES: Record<PdfVariant, Theme> = {
  designed: {
    page: C.paper, band: C.ink, bandText: C.white, bandSub: '#BDB8B0', bandRule: C.accent,
    card: C.white, cardBorder: C.sandDeep, cardLip: C.sandDeep, zebra: C.sand,
    tipsBg: C.accentSoft, notesBg: C.sand, chipBg: C.sand, chipBorder: C.sand,
    stepBg: C.accent, stepText: C.white, stepBorder: C.accent,
    coverBg: C.ink, coverText: C.white, coverSub: '#BDB8B0',
  },
  // Kitchen printer copy: white page, outlined cards, no big ink fills.
  print: {
    page: C.white, band: C.white, bandText: C.ink, bandSub: C.muted, bandRule: C.ink,
    card: C.white, cardBorder: '#CFCBC5', cardLip: '#CFCBC5', zebra: '#F6F5F3',
    tipsBg: C.white, notesBg: C.white, chipBg: C.white, chipBorder: '#CFCBC5',
    stepBg: C.white, stepText: C.ink, stepBorder: C.ink,
    coverBg: C.white, coverText: C.ink, coverSub: C.muted,
  },
};

const M = 32;          // page side margin
const BAND = 44;       // header band height
const FOOT = 40;       // space kept for the footer

const fmtDay = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const num = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-IN');

// ---------------------------------------------------------------- small parts

function Label({ children, color = C.inkSoft, style }: { children: ReactNode; color?: string; style?: Style }) {
  return <Text style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 7, letterSpacing: 1.4, textTransform: 'uppercase', color, ...style }}>{children}</Text>;
}

function VegMark({ veg, size = 10 }: { veg: boolean; size?: number }) {
  const c = veg ? C.veg : C.nonVeg;
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Rect x={0.75} y={0.75} width={14.5} height={14.5} rx={3.5} fill={C.white} stroke={c} strokeWidth={1.5} />
      {veg ? <Circle cx={8} cy={8} r={3.75} fill={c} /> : <Polygon points="8,3.2 12.8,11.8 3.2,11.8" fill={c} />}
    </Svg>
  );
}

/** White card with a hairline border and a slightly heavier bottom lip. */
function Card({ t, children, style, wrap = true }: { t: Theme; children: ReactNode; style?: Style; wrap?: boolean }) {
  return (
    <View wrap={wrap} style={{
      backgroundColor: t.card, borderWidth: 0.75, borderColor: t.cardBorder, borderBottomWidth: 2, borderBottomColor: t.cardLip,
      borderRadius: 10, padding: 14, ...style,
    }}>
      {children}
    </View>
  );
}

function CardTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 7, borderBottomWidth: 0.75, borderBottomColor: C.sandDeep }}>
      <View style={{ width: 5, height: 5, borderRadius: 1.5, backgroundColor: C.accent, marginRight: 6 }} />
      <Label>{title}</Label>
      {aside ? <Text style={{ marginLeft: 'auto', fontSize: 7.5, color: C.muted }}>{aside}</Text> : null}
    </View>
  );
}

function StatChip({ t, label, value }: { t: Theme; label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: t.chipBg, borderWidth: 0.75, borderColor: t.chipBorder, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 7 }}>
      <Label color={C.muted} style={{ fontSize: 5.5, marginBottom: 2, letterSpacing: 1 }}>{label}</Label>
      <Text style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 9.5, color: C.ink }}>{value}</Text>
    </View>
  );
}

function MacroPill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <Text style={{ fontSize: 7, fontWeight: 600, color, backgroundColor: bg, borderRadius: 5, paddingVertical: 2.5, paddingHorizontal: 6 }}>{text}</Text>
  );
}

/** Fills its card (the hero row sets the height); the photo is pre-cropped to 4:3. */
function Photo({ img, radius = 7 }: { img: PdfImage | null; radius?: number }) {
  if (!img) {
    return (
      <View style={{ flex: 1, minHeight: 120, borderRadius: radius, backgroundColor: C.sand, borderWidth: 0.75, borderStyle: 'dashed', borderColor: C.sandDeep, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 8, color: C.faint }}>Photo coming soon</Text>
      </View>
    );
  }
  return <Image src={img} style={{ flex: 1, width: '100%', minHeight: 120, objectFit: 'cover', borderRadius: radius }} />;
}

function EmptyBox({ text }: { text: string }) {
  return (
    <View style={{ borderWidth: 0.75, borderStyle: 'dashed', borderColor: C.sandDeep, borderRadius: 8, padding: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 8.5, color: C.faint }}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- page chrome

function HeaderBand({ t, logo, title }: { t: Theme; logo: PdfImage | null; title: (p: { subPageNumber: number }) => string }) {
  return (
    <View fixed style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: BAND, backgroundColor: t.band,
      borderBottomWidth: 2, borderBottomColor: t.bandRule, flexDirection: 'row', alignItems: 'center', paddingHorizontal: M,
    }}>
      {logo ? (
        <View style={{ backgroundColor: C.white, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 5, marginRight: 9, borderWidth: t.band === C.white ? 0.75 : 0, borderColor: C.sandDeep }}>
          <Image src={logo} style={{ width: 27, height: 20.5 }} />
        </View>
      ) : null}
      <Text style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 10, color: t.bandText, letterSpacing: 0.3 }}>BroTin Box</Text>
      <Text style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1.6, color: C.accent, marginLeft: 7, marginTop: 1 }}>COOK BOOK</Text>
      <Text
        style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 600, color: t.bandSub, maxWidth: 300, textAlign: 'right' }}
        render={({ subPageNumber }) => title({ subPageNumber })}
      />
    </View>
  );
}

function Footer({ left }: { left: string }) {
  return (
    <View fixed style={{
      position: 'absolute', bottom: 16, left: M, right: M, flexDirection: 'row', alignItems: 'center',
      borderTopWidth: 0.75, borderTopColor: C.sandDeep, paddingTop: 6,
    }}>
      <Text style={{ fontSize: 7, color: C.muted }}>{left}</Text>
      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent, marginRight: 5 }} />
        <Text style={{ fontSize: 7.5, fontWeight: 800, color: C.ink }} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </View>
  );
}

const pageStyle = (t: Theme): Style => ({
  backgroundColor: t.page, fontFamily: 'Inter', fontSize: 9.5, color: C.ink,
  paddingTop: BAND + 16, paddingBottom: FOOT + 14, paddingHorizontal: M,
});

// ---------------------------------------------------------------- recipe page

type RecipePageProps = {
  t: Theme;
  dish: CookbookDish;
  portions: number;
  logo: PdfImage | null;
  footerLeft: string;
  /** Full book only: ink band naming the section on its first dish. */
  opener?: { label: string; count: number } | null;
  /** Full book only: records which page each dish starts on (first render pass). */
  onFirstPage?: (pageNumber: number) => void;
};

function RecipePage({ t, dish, portions, logo, footerLeft, opener, onFirstPage }: RecipePageProps) {
  const r = dish.recipe;
  const cookedKg = (dish.grams * portions) / 1000;
  const total = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  const portionText = plural(portions, 'portion');

  return (
    <Page size="A4" style={pageStyle(t)} wrap bookmark={{ title: `${dish.code} · ${dish.name}`, fit: true }}>
      <HeaderBand t={t} logo={logo} title={({ subPageNumber }) => `${dish.code} · ${dish.name}${subPageNumber > 1 ? '  (continued)' : ''}`} />
      {onFirstPage ? (
        <Text fixed style={{ position: 'absolute', top: 0, left: 0, fontSize: 1, color: t.page }}
          render={({ pageNumber, subPageNumber }) => { if (subPageNumber === 1) onFirstPage(pageNumber); return ' '; }} />
      ) : null}

      <View id={`dish-${dish.id}`} />

      {opener ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12,
          backgroundColor: t.band === C.white ? C.white : C.inkSoft, borderWidth: t.band === C.white ? 0.75 : 0, borderColor: C.ink,
        }}>
          <View style={{ width: 14, height: 2, backgroundColor: C.accent, marginRight: 8 }} />
          <Text style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 10, color: t.band === C.white ? C.ink : C.white, letterSpacing: 0.4 }}>{opener.label}</Text>
          <Text style={{ marginLeft: 'auto', fontSize: 8, color: t.band === C.white ? C.muted : '#BDB8B0' }}>{`${opener.count} ${opener.count === 1 ? 'dish' : 'dishes'}`}</Text>
        </View>
      ) : null}

      {/* Hero: name + facts on the left, photo on the right. */}
      <View wrap={false} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <Card t={t} style={{ flex: 1.45, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <VegMark veg={dish.isVeg} />
            <Label color={C.accent} style={{ marginLeft: 6 }}>{dish.categoryLabel}</Label>
            <Text style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: 0.6 }}>{dish.code}</Text>
          </View>
          <Text style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 20, lineHeight: 1.15, color: C.ink, marginTop: 6 }}>{dish.name}</Text>
          <Text style={{ fontSize: 8.5, color: C.muted, marginTop: 3 }}>
            {dish.cookedState ?? `${dish.grams} g`} per portion{total > 0 ? `  ·  ${total} min start to finish` : ''}
          </Text>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            <StatChip t={t} label="Cooking for" value={portionText} />
            <StatChip t={t} label="Yield" value={`${num(cookedKg)} kg`} />
            {r.prep_minutes !== null ? <StatChip t={t} label="Prep" value={`${r.prep_minutes} min`} /> : null}
            {r.cook_minutes !== null ? <StatChip t={t} label="Cook" value={`${r.cook_minutes} min`} /> : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 9, alignItems: 'center' }}>
            <Text style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: 1, color: C.faint, marginRight: 2 }}>PER PORTION</Text>
            <MacroPill text={`${num(dish.calories)} kcal`} color={C.accent} bg={C.accentSoft} />
            <MacroPill text={`Protein ${num(dish.protein)} g`} color={C.green} bg={C.greenBg} />
            <MacroPill text={`Carbs ${num(dish.carbs)} g`} color={C.inkSoft} bg={C.sand} />
            <MacroPill text={`Fat ${num(dish.fat)} g`} color={C.inkSoft} bg={C.sand} />
          </View>
        </Card>
        <Card t={t} style={{ flex: 1, padding: 6 }}>
          <Photo img={dish.photo} />
        </Card>
      </View>

      {/* Ingredients (left) and method (right). */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <Card t={t} style={{ width: "37%" }}>
          <CardTitle title="Ingredients" aside={`for ${portionText}`} />
          {r.ingredients.length === 0 ? <EmptyBox text="Not filled in yet" /> : r.ingredients.map((i, n) => (
            <View key={n} wrap={false} style={{
              flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4.5, paddingHorizontal: 6, borderRadius: 4,
              backgroundColor: n % 2 === 1 ? t.zebra : t.card,
            }}>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={{ fontSize: 9, lineHeight: 1.3, color: C.ink }}>{i.name}</Text>
                {i.note ? <Text style={{ fontSize: 7, color: C.muted, marginTop: 1 }}>{i.note}</Text> : null}
              </View>
              <Text style={{ fontWeight: 800, fontSize: 9, color: C.ink, textAlign: 'right', minWidth: 46 }}>{scaledQty(i, portions)}</Text>
            </View>
          ))}
        </Card>

        <Card t={t} style={{ flex: 1 }}>
          <CardTitle title="Method" aside={r.steps.length ? plural(r.steps.length, 'step') : undefined} />
          {r.steps.length === 0 ? <EmptyBox text="Steps not written yet" /> : r.steps.map((s, n) => (
            <View key={n} wrap={false} style={{
              flexDirection: "row", paddingVertical: 5.5,
              borderTopWidth: n === 0 ? 0 : 0.5, borderTopColor: C.sandDeep,
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 9, backgroundColor: t.stepBg, borderWidth: 1, borderColor: t.stepBorder,
                alignItems: 'center', justifyContent: 'center', marginRight: 9, marginTop: 0.5,
              }}>
                <Text style={{ fontWeight: 800, fontSize: 8, color: t.stepText }}>{n + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 9.3, lineHeight: 1.45, color: C.ink }}>{s}</Text>
            </View>
          ))}
        </Card>
      </View>

      {/* Equipment + allergens strip. */}
      {r.equipment || dish.allergens.length ? (
        <Card t={t} wrap={false} style={{ marginTop: 10, flexDirection: "row", gap: 16, paddingVertical: 9 }}>
          {r.equipment ? (
            <View style={{ flex: 1 }}>
              <Label color={C.muted} style={{ fontSize: 6.5, marginBottom: 3 }}>Equipment</Label>
              <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{r.equipment}</Text>
            </View>
          ) : null}
          {dish.allergens.length ? (
            <View style={{ flex: r.equipment ? 0.6 : 1 }}>
              <Label color={C.muted} style={{ fontSize: 6.5, marginBottom: 3 }}>Allergens</Label>
              <Text style={{ fontSize: 9, fontWeight: 600, color: C.accent }}>{dish.allergens.join(', ')}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* Tips (orange bar) and kitchen notes (sand). */}
      {r.tips || r.notes ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10, alignItems: "flex-start" }}>
          {r.tips ? (
            <View wrap={r.tips.length > 700} style={{
              flex: 1, backgroundColor: t.tipsBg, borderRadius: 10, padding: 12,
              borderWidth: t.tipsBg === C.white ? 0.75 : 0, borderColor: t.cardBorder, borderLeftWidth: 3, borderLeftColor: C.accent,
            }}>
              <Label color={C.accent} style={{ marginBottom: 5 }}>Tips & checks</Label>
              <Text style={{ fontSize: 9, lineHeight: 1.5, color: C.ink }}>{r.tips}</Text>
            </View>
          ) : null}
          {r.notes ? (
            <View wrap={r.notes.length > 700} style={{
              flex: 1, backgroundColor: t.notesBg, borderRadius: 10, padding: 12,
              borderWidth: t.notesBg === C.white ? 0.75 : 0, borderColor: t.cardBorder,
            }}>
              <Label color={C.muted} style={{ marginBottom: 5 }}>Kitchen notes</Label>
              <Text style={{ fontSize: 8.5, lineHeight: 1.5, color: C.inkSoft }}>{r.notes}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Footer left={`${footerLeft}${dish.updatedAt ? `  ·  Recipe updated ${fmtDay(dish.updatedAt)}` : ''}`} />
    </Page>
  );
}

// ---------------------------------------------------------------- cover + contents (full book)

function CoverPage({ t, logo, dishes, today }: { t: Theme; logo: PdfImage | null; dishes: CookbookDish[]; today: string }) {
  const ready = dishes.filter((d) => d.ready).length;
  const mosaic = dishes.filter((d) => d.thumb).slice(0, 8);
  const dark = t.coverBg !== C.white;
  return (
    <Page size="A4" style={{ backgroundColor: t.coverBg, fontFamily: 'Inter', padding: 48, color: t.coverText }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {logo ? (
          <View style={{ backgroundColor: C.white, borderRadius: 14, padding: 10, borderWidth: dark ? 0 : 0.75, borderColor: C.sandDeep }}>
            <Image src={logo} style={{ width: 74, height: 56 }} />
          </View>
        ) : null}
        <Text style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 800, letterSpacing: 2, color: C.accent }}>KITCHEN USE ONLY</Text>
      </View>

      <View style={{ marginTop: 70 }}>
        <Text style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.4, color: t.coverSub }}>BROTIN BOX</Text>
        <Text style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 46, lineHeight: 1.05, marginTop: 10 }}>Kitchen{'\n'}Cook Book</Text>
        <View style={{ width: 64, height: 3.5, backgroundColor: C.accent, borderRadius: 2, marginTop: 18 }} />
        <Text style={{ fontSize: 11.5, lineHeight: 1.55, color: t.coverSub, marginTop: 18, maxWidth: 360 }}>
          How we cook every dish, step by step, so every box tastes the same whoever is at the stove.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 28 }}>
        {[[`${dishes.length}`, 'dishes'], [`${ready}`, 'recipes ready'], [today, 'edition']].map(([v, l]) => (
          <View key={l} style={{ borderWidth: 0.75, borderColor: dark ? '#3A3A3A' : C.sandDeep, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: dark ? '#1C1C1C' : C.paper }}>
            <Text style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 13 }}>{v}</Text>
            <Text style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1.2, color: t.coverSub, marginTop: 2, textTransform: 'uppercase' }}>{l}</Text>
          </View>
        ))}
      </View>

      {mosaic.length ? (
        <View style={{ position: 'absolute', left: 48, right: 48, bottom: 64, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {mosaic.map((d) => (
            <Image key={d.id} src={d.thumb!} style={{ width: 117.8, height: 117.8, borderRadius: 10, objectFit: 'cover' }} />
          ))}
        </View>
      ) : null}
      <Text style={{ position: 'absolute', left: 48, right: 48, bottom: 36, fontSize: 7.5, color: t.coverSub }}>
        Quantities are per portion unless a page says otherwise. Downloaded {today}; download again after any recipe edit.
      </Text>
    </Page>
  );
}

function ContentsPage({ t, logo, dishes, pages, footerLeft }: {
  t: Theme; logo: PdfImage | null; dishes: CookbookDish[]; pages: Map<string, number>; footerLeft: string;
}) {
  return (
    <Page size="A4" style={pageStyle(t)} wrap bookmark={{ title: 'Contents', fit: true }}>
      <HeaderBand t={t} logo={logo} title={() => 'Contents'} />
      <Text style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 22, color: C.ink }}>Contents</Text>
      <Text style={{ fontSize: 9, color: C.muted, marginTop: 3, marginBottom: 14 }}>Tap a dish to jump to its recipe.</Text>
      {COOKBOOK_GROUPS.map(([cat, label]) => {
        const list = dishes.filter((d) => d.category === cat);
        if (!list.length) return null;
        return (
          <View key={cat} style={{ marginBottom: 12 }}>
            <View wrap={false} minPresenceAhead={60} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
              <View style={{ width: 14, height: 2, backgroundColor: C.accent, marginRight: 7 }} />
              <Text style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 11, color: C.ink }}>{label}</Text>
              <Text style={{ fontSize: 8, color: C.muted, marginLeft: 6 }}>{list.length}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {list.map((d) => (
                <Link key={d.id} src={`#dish-${d.id}`} style={{ width: 261.5, textDecoration: 'none', color: C.ink }}>
                  <View wrap={false} style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: t.card, borderWidth: 0.75, borderColor: t.cardBorder,
                    borderBottomWidth: 1.5, borderBottomColor: t.cardLip, borderRadius: 9, padding: 6, height: 50,
                  }}>
                    {d.thumb
                      ? <Image src={d.thumb} style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover' }} />
                      : <View style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: C.sand }} />}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontSize: 9, fontWeight: 800, color: C.ink, maxLines: 1, textOverflow: "ellipsis" }}>{d.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                        <VegMark veg={d.isVeg} size={7} />
                        <Text style={{ fontSize: 7, color: C.muted, marginLeft: 4 }}>{d.code}</Text>
                        <Text style={{
                          fontSize: 6.5, fontWeight: 800, marginLeft: 6, paddingVertical: 1.5, paddingHorizontal: 5, borderRadius: 4,
                          color: d.ready ? C.green : C.amber, backgroundColor: d.ready ? C.greenBg : C.amberBg,
                        }}>{d.ready ? 'READY' : 'TO FILL'}</Text>
                      </View>
                    </View>
                    <Text style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 13, color: C.ink, minWidth: 24, textAlign: 'right', paddingRight: 4 }}>
                      {pages.get(d.id) ?? ''}
                    </Text>
                  </View>
                </Link>
              ))}
            </View>
          </View>
        );
      })}
      <Footer left={footerLeft} />
    </Page>
  );
}

// ---------------------------------------------------------------- entry points

export async function renderRecipePdf(opts: { dish: CookbookDish; portions: number; logo: PdfImage | null; variant: PdfVariant }): Promise<Buffer> {
  ensureFonts();
  const t = THEMES[opts.variant];
  const today = fmtDay(new Date());
  return renderToBuffer(
    <Document title={`${opts.dish.name} · BroTin Box recipe`} author="BroTin Box" subject="Kitchen recipe" creator="BroTin Box admin">
      <RecipePage t={t} dish={opts.dish} portions={opts.portions} logo={opts.logo} footerLeft={`BroTin Box kitchen  ·  Downloaded ${today}`} />
    </Document>
  );
}

export async function renderCookbookPdf(opts: { dishes: CookbookDish[]; logo: PdfImage | null; variant: PdfVariant }): Promise<Buffer> {
  ensureFonts();
  const t = THEMES[opts.variant];
  const today = fmtDay(new Date());
  const footerLeft = `BroTin Box kitchen cook book  ·  ${today}`;
  const counts = new Map<string, number>();
  for (const d of opts.dishes) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);

  const build = (pages: Map<string, number>, record: boolean) => (
    <Document title="BroTin Box kitchen cook book" author="BroTin Box" subject="Kitchen cook book" creator="BroTin Box admin">
      <CoverPage t={t} logo={opts.logo} dishes={opts.dishes} today={today} />
      <ContentsPage t={t} logo={opts.logo} dishes={opts.dishes} pages={pages} footerLeft={footerLeft} />
      {opts.dishes.map((d, n) => {
        const first = n === 0 || opts.dishes[n - 1].category !== d.category;
        return (
          <RecipePage
            key={d.id} t={t} dish={d} portions={1} logo={opts.logo} footerLeft={footerLeft}
            opener={first ? { label: d.categoryLabel, count: counts.get(d.category) ?? 0 } : null}
            onFirstPage={record ? (p) => { if (!pages.has(d.id)) pages.set(d.id, p); } : undefined}
          />
        );
      })}
    </Document>
  );

  // Pass 1 finds the page each dish starts on; pass 2 prints those numbers in the contents.
  const pages = new Map<string, number>();
  await renderToBuffer(build(pages, true));
  return renderToBuffer(build(pages, false));
}
