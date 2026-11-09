/** html[data-intro] is set before first paint while the first-visit splash covers the page. */
export const INTRO_ATTR = 'data-intro';
/** Fired on window once the splash has gone. */
export const INTRO_DONE_EVENT = 'brotin:intro-done';
export const INTRO_SEEN_KEY = 'brotin-intro-seen';
/** Same warm white as the page, so the reveal canvas melts into it. */
export const BROTIN_REVEAL_BG = '#FAFAF8';

/**
 * Runs inline before the first paint (plain <script> in the root layout <head>):
 * a first-time visitor on the home page gets html[data-intro], so the splash
 * covers the page before it can flash. Other pages never get the attribute.
 */
export const INTRO_BOOT_SCRIPT = `try{if(location.pathname==='/'&&!localStorage.getItem('${INTRO_SEEN_KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('${INTRO_ATTR}','')}catch(e){}`;
