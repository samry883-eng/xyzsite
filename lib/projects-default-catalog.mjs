/**
 * Canonical work rows + helpers to build the default projects catalog (40 projects).
 * Seed source: Work/unified/index.html + credits from generate-projects.mjs
 */
import { categorySlug, SERVICE_OPTIONS, PROJECT_TYPES } from './projects-store.mjs';

export const VF = 'https://r2.vidzflow.com/source/';
export const SB = 'https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/';
export const WORK_CDN = 'https://cdn.prod.website-files.com/69174740184591f142f019c1/';

export const THUMBNAILS = {
  'into the void|atomic': WORK_CDN + '69c0bbd38bf9e9ecfb7c293b_final%20test1.mp4_snapshot_00.27.567.jpg',
  'france world cup|nike': '/work/visual-effects/france-world-cup/poster.jpg',
  'i forgot & out of my head|cara delevingne': '/work/visual-effects/i-forgot-out-of-my-head/poster.jpg',
  'speedcross 3|salomon': WORK_CDN + '69c1bf43294738d67f86e3fd_salomon_speedcross_6_2160p.mp4_snapshot_00.04.796.jpg',
  'canadian open|rbc': WORK_CDN + '69c0c7c957a69405e8a00817_original%20(2).mp4_snapshot_00.00.000.jpg',
  's/lab manifesto|salomon': WORK_CDN + '69c0bd3537dcd96b5f0fbd99_original%20(1).mp4_snapshot_00.17.054.jpg',
  'road to palisades|toyota': WORK_CDN + '69c0babb3eeeb38dec9e84a6_original.mp4_snapshot_00.54.027.jpg',
  'nhl store|fanatics': WORK_CDN + '6983f4429ddf0f1817061bef_NHL%20Store.avif',
  'nba store|fanatics': WORK_CDN + '6983f49d3e2baf7fbfa333cd_nba%20store.avif',
  'the flip|jennair': WORK_CDN + '6983f7b1aa7c8344aa96cd3f_Jenair6.avif',
  'the essentials|marc jacobs': WORK_CDN + '698632e07d024cbdc50976fa_Marc%20Jacobs.avif',
  'modo capone ft. drake|chino pacas': WORK_CDN + '6986330ccc8c7a06461fdc31_drake%203.avif',
  'tu sancho|fuerza regida': WORK_CDN + '69863392ec9c14012747b8de_drake%202.avif',
  'secreto victoria|fuerza regida': WORK_CDN + '698633cf9aa1fa498d7e8cac_Fuerza%20Secreto%202.avif',
  'de maravisha|tokischa': WORK_CDN + '698b9b4e9009c8f8fd33f65b_tokischa%201.avif',
  'ai awareness|sumsub': '/work/sound/ai-awareness/poster.jpg',
  'ss26 teaser|louis vuitton': WORK_CDN + '69c0b94d0ebe8f3b86741b7a_214a3ae2-01ca-4593-8949-98a7191f6548.mp4_snapshot_00.12.156.jpg',
  'open|beats': WORK_CDN + '69c0c86dee76a67f51f3ccbb_17e77d71-3bca-4d42-8275-71deb05724d1.mp4_snapshot_00.11.787.jpg',
  'precision without limits|arcteryx': WORK_CDN + '69c0c72384ea4c6ef187a17b_24fed0b9-4d02-45b3-895b-437c3ab89f38.mp4_snapshot_00.03.788.jpg',
  'compromise nothing|lucid': WORK_CDN + '69c0bed5350817015931b808_6c66aad7-7df3-4809-a8d7-1f92a377fa5e.mp4_snapshot_00.15.452.jpg',
  'galaxy ai|samsung': WORK_CDN + '69c0c672692c99cfff1b169a_0f5dc170-f1e8-4b0b-a0bd-d9e6486a91e7.mp4_snapshot_00.26.923.jpg',
  'join the search|ford': WORK_CDN + '69c0c920150477178735f0d8_4f593e77-d9ea-4992-8dc1-f8520895f0e9.mp4_snapshot_00.28.669.jpg',
  'dont forget to take a break|apple music': WORK_CDN + '6986462e994790c13bd54007_apple%202.avif',
  'f1|new era': WORK_CDN + '69864751fdf4446e3aa6a4f3_F1%201.avif',
  'tatata ft. travis scott|burna boy': WORK_CDN + '698649875dfcf9d28b750377_Tata%201.avif',
  'hongqi|hongqi': WORK_CDN + '698649da32089d59e9cbd451_Hongqi%201.avif',
  'concept rr|bmw': WORK_CDN + '6983f254ccb964933dda7ef8_Bmw2.avif',
  'imagine theres no limit|nike': '/work/ai/imagine-theres-no-limit/poster.jpg',
  'ai|nike': WORK_CDN + '6983eea79630e3e88e1faeac_nike2.avif',
  'ai|ducati': WORK_CDN + '6983ee69415b04b87b4162d5_Ducati%202.avif',
  'a cold wall|mercedes-benz': WORK_CDN + '6983eefa0636bab507bca7c9_Mercedes3.avif',
  'sous la lune|chanel': WORK_CDN + '6983f5143e88d686965c096c_Chanel4.avif',
  'spritez vibez|celsius': '/work/sound/spritez-vibez/poster.jpg',
  'good sports|prime video': '/work/sound/good-sports/poster.jpg',
  'hard is home|nike': '/work/sound/hard-is-home/poster.jpg',
  'stay in rotation|foot locker': '/work/sound/stay-in-rotation/poster.jpg',
  'the hunt|ram truck': '/work/sound/the-hunt/poster.jpg',
  'style is in session|snipes': '/work/sound/style-is-in-session/poster.jpg',
};

export const SELECTED_KEYS = new Set([
  'into the void|atomic',
  'france world cup|nike',
  'speedcross 3|salomon',
  'ss26 teaser|louis vuitton',
  'compromise nothing|lucid',
  'sous la lune|chanel',
  'concept rr|bmw',
  'imagine theres no limit|nike',
  'open|beats',
  'good sports|prime video',
]);

export const ROWS = [
  {
    label: 'Visual Effects',
    cards: [
      { video: VF + 'cbf82991-c743-4045-8898-b6ee78efd9b4.mp4', client: 'Atomic', title: 'Into the Void', clipStart: 24, clipEnd: 33, credits: [{ label: 'Directed by', value: 'Dris Yousif' }, { label: 'Produced by', value: 'XYZ Studios' }] },
      { video: VF + 'd93de57b-6909-4f1e-81d3-8d1f6252c2f7.mp4', client: 'Nike', title: 'France World Cup', slug: 'france-world-cup', poster: '/work/visual-effects/france-world-cup/poster.jpg', credits: [{ label: 'Directed by', value: 'Alexis Belhumeur' }, { label: 'Agency', value: 'Knas' }] },
      { video: VF + 'af62bf83-f2c4-4ff5-ae90-e056d209eaae.mp4', client: 'Cara Delevingne', title: 'I Forgot & Out of My Head', poster: '/work/visual-effects/i-forgot-out-of-my-head/poster.jpg', credits: [{ label: 'Directed by', value: 'Jessica Le Gagne' }, { label: 'Production Company USA', value: 'Reset Content' }] },
      { video: VF + 'ef1dc602-5a95-4973-a0ea-82794726bc4a.mp4', client: 'Salomon', title: 'Speedcross 3', credits: [{ label: 'Directed by', value: 'Lenn Anton' }, { label: 'Produced by', value: 'XYZ Studios' }] },
      { video: SB + 'PcB8hb2-uO/original', client: 'Salomon', title: 's/lab Manifesto', credits: [{ label: 'Directed by', value: 'The Reids' }, { label: 'Production', value: 'CommonVision' }] },
      { video: SB + '9O7xsj76Lw/original', client: 'Toyota', title: 'Road to Palisades', credits: [{ label: 'Directed by', value: 'Jack Botti' }, { label: 'Production', value: 'rabithaus' }] },
      { video: SB + '85D_It6HUS/original', client: 'RBC', title: 'Canadian Open', credits: [{ label: 'Agency', value: 'Wasserman' }, { label: 'Produced by', value: 'XYZ Studios' }] },
      { video: SB + 'JchEHAr96O/original', client: 'JennAir', title: 'The Flip', credits: [{ label: 'Directed by', value: 'Nick Martini' }, { label: 'Production', value: 'Stept Studios' }] },
      { video: SB + '0yJ5A9ii2H/original', client: 'Fanatics', title: 'NBA Store', credits: [{ label: 'Directed by', value: 'Jimmy Derner' }, { label: 'Production Company', value: 'Wolfpak Films' }] },
      { video: SB + 'mu8ewXP3uH/original', client: 'Fanatics', title: 'NHL Store', credits: [{ label: 'Directed by', value: 'Jimmy Derner' }, { label: 'Production Company', value: 'Wolfpak Films' }] },
      { video: VF + 'edac671a-7d48-4eb1-b1ea-c2556b330ee4.mp4', client: 'Chino Pacas', title: 'Modo Capone ft. Drake', credits: [{ label: 'Directed by', value: 'Chris Villa' }, { label: 'Production Company', value: 'SHOTCLOCK' }] },
      { video: VF + 'e07f965d-dc13-45bc-a958-08fd1baa3793.mp4', client: 'Marc Jacobs', title: 'The Essentials', credits: [{ label: 'Directed by', value: 'BRTHR' }, { label: 'Produced by', value: 'Afterworld' }] },
      { video: VF + 'b383d525-8d02-4f4b-b2fa-0d9c29a71d91.mp4', client: 'Fuerza Regida', title: 'Tu Sancho', credits: [{ label: 'Directed by', value: 'Miguel' }, { label: 'Produced by', value: 'XYZ Studios' }] },
      { video: VF + 'daf3f8d1-9b55-438d-9259-922de5fb7c8f.mp4', client: 'Fuerza Regida', title: 'Secreto Victoria', credits: [{ label: 'Directed by', value: 'Miguel' }, { label: 'Produced by', value: 'XYZ Studios' }] },
      { video: VF + '15e90e12-e3b1-420a-9b11-db60a7b199b0.mp4', client: 'Tokischa', title: 'De Maravisha', credits: [{ label: 'Directed by', value: 'Olivia Decamps' }, { label: 'Produced by', value: 'XYZ Studios' }] },
      { video: VF + '7c584065-5afb-43e4-9b67-ef1b5b6db304.mp4', client: 'Audi', title: 'F1 2026 Launch Film', slug: 'f1-2026-launch-film' },
      { video: VF + '11fe9d4e-0bef-4966-bf67-b9b48dc8eee5.mp4', client: 'Need For Speed', title: 'Shibuya', slug: 'shibuya' },
    ],
  },
  {
    label: 'Sound',
    cards: [
      { video: '/work/sound/ai-awareness/video.mp4', client: 'Sumsub', title: 'AI Awareness', poster: '/work/sound/ai-awareness/poster.jpg', credits: [{ label: 'Directed by', value: 'Snezhana Yugai' }, { label: 'Sound Design, Mix & Music', value: 'Klangtextur' }] },
      { video: VF + '214a3ae2-01ca-4593-8949-98a7191f6548.mp4', client: 'Louis Vuitton', title: 'SS26 Teaser', director: 'Anthony Prince Leslie', soundDesign: 'Ken Psalms & William Landry', soundDesignMix: true },
      { video: VF + '17e77d71-3bca-4d42-8275-71deb05724d1.mp4', client: 'Beats', title: 'Open', credits: [{ label: 'Directed by', value: 'Aidan Cullen' }, { label: 'Sound Design', value: 'Ken Psalms & Ayodo Uson' }] },
      { video: VF + '24fed0b9-4d02-45b3-895b-437c3ab89f38.mp4', client: "Arc'teryx", title: 'Precision Without Limits' },
      { video: VF + '6c66aad7-7df3-4809-a8d7-1f92a377fa5e.mp4', client: 'Lucid', title: 'Compromise Nothing' },
      { video: VF + 'fb5e495e-8460-4277-a7aa-08accd388af0.mp4', client: 'Prime Video', title: 'Good Sports', poster: '/work/sound/good-sports/poster.jpg' },
      { video: VF + '0f5dc170-f1e8-4b0b-a0bd-d9e6486a91e7.mp4', client: 'Samsung', title: 'Galaxy AI' },
      { video: VF + '4f593e77-d9ea-4992-8dc1-f8520895f0e9.mp4', client: 'Ford', title: 'Join the Search' },
      { video: VF + '996ba39f-1c06-4887-8dc3-52c21a4089b1.mp4', client: 'Apple Music', title: "Don't Forget to Take a Break", credits: [{ label: 'Directed by', value: 'Mithil Rajeev' }, { label: 'Sound Design', value: 'Ken Psalms' }] },
      { video: VF + '5b0d552d-9e53-4967-9d5b-15a5deb86100.mp4', client: 'New Era', title: 'F1' },
      { video: VF + 'a1bc0884-b2b7-42a3-aac5-a490571499f5.mp4', client: 'Burna Boy', title: 'Tatata ft. Travis Scott', credits: [{ label: 'Sound Design', value: 'Ken Psalms' }, { label: 'Mix', value: 'Ken Psalms' }, { label: 'Directed by', value: 'Benny Boom' }] },
      { video: VF + '0e01d94b-2f38-4e6c-8874-14fc6e98dfeb.mp4', client: 'Nike', title: 'Hard Is Home', poster: '/work/sound/hard-is-home/poster.jpg', credits: [{ label: 'Sound Design', value: 'Ken Psalms' }, { label: 'Sound Mixer', value: 'William Landry' }] },
      { video: VF + '00c390f8-2185-4729-be87-dcc17552bc0b.mp4', client: 'Foot Locker', title: 'Stay in Rotation', poster: '/work/sound/stay-in-rotation/poster.jpg', credits: [{ label: 'Sound Design', value: 'Ken Psalms' }, { label: 'Mix', value: 'Ken Psalms' }, { label: 'Directed by', value: 'Edgar Esteves' }] },
      { video: VF + 'ad2de35b-a84f-4468-8ea1-704e79fc1d6e.mp4', client: 'Ram Truck', title: 'The Hunt', poster: '/work/sound/the-hunt/poster.jpg' },
      { video: VF + '392708ea-1d8c-4872-a6cd-65f4a5e947ba.mp4', client: 'SNIPES', title: 'Style Is In Session', poster: '/work/sound/style-is-in-session/poster.jpg', credits: [{ label: 'Sound Design', value: 'Ken Psalms & William Landry' }, { label: 'Sound Mixer', value: 'Ken Psalms & William Landry' }, { label: 'Directed by', value: 'Joshua Smedina' }] },
      { video: VF + '68eb0d30-28c6-4074-a239-6ff8a10dbbf1.mp4', client: 'Hongqi', title: 'Hongqi' },
      { video: VF + 'c5bfdb30-f5d1-4f1d-a96f-b736b4ab1fcf.mp4', client: 'Celsius', title: 'Spritez Vibez', poster: '/work/sound/spritez-vibez/poster.jpg' },
    ],
  },
  {
    label: 'AI',
    cards: [
      { video: VF + '55e60562-4203-4bba-8dc5-4343d1e5a127.mp4', client: 'Nike', title: "Imagine There's No Limit", slug: 'imagine-theres-no-limit', poster: '/work/ai/imagine-theres-no-limit/poster.jpg' },
      { video: SB + '2oBYsIWabd/original', client: 'Chanel', title: 'Sous La Lune', slug: 'sous-la-lune', director: 'Lenn Anton', production: 'Obsidian' },
      { video: SB + 'LWep2Duvk-/original', client: 'Mercedes-Benz', title: 'A Cold Wall' },
      { video: SB + 'I_J-Bii5Ql/original', client: 'BMW', title: 'Concept RR' },
      { video: SB + 'Clp65xDTmS/original', client: 'Nike', title: 'AI', slug: 'ai-nike' },
      { video: SB + 'h-VCHXYcwA/original', client: 'Ducati', title: 'AI', slug: 'ai-ducati' },
    ],
  },
];

function decodeHTML(str) {
  return str.replace(/&amp;/g, '&').replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"');
}

export function normalizeKey(title, client) {
  const clean = (s) => decodeHTML(s || '').trim().toLowerCase()
    .replace(/[''`]/g, '').replace(/[""]/g, '"').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/');
  return clean(title) + '|' + clean(client);
}

export function slugify(s) {
  return s.toLowerCase().replace(/[''`']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function projectURL(card, catLabel) {
  return '/work/' + slugify(catLabel) + '/' + (card.slug || slugify(card.title)) + '/';
}

function getPoster(card) {
  const fallback = WORK_CDN + '69c0bbd38bf9e9ecfb7c293b_final%20test1.mp4_snapshot_00.27.567.jpg';
  return card.poster || THUMBNAILS[normalizeKey(card.title, card.client)] || fallback;
}

function cardCredits(card) {
  if (Array.isArray(card.credits)) return card.credits;
  const out = [];
  if (card.director) out.push({ label: 'Directed by', value: card.director });
  if (card.production) out.push({ label: 'Production', value: card.production });
  if (card.soundDesign) out.push({ label: 'Sound Design', value: card.soundDesign });
  return out;
}

export function inferProjectMeta(card, catLabel) {
  const services = new Set();
  const blob = (card.title + ' ' + card.client).toLowerCase();
  const cat = catLabel.toLowerCase();
  let projectType = 'Commercial';

  if (/delevingne|regida|tokischa|pacas|drake|burna|sancho|maravisha|forgot|modo capone|tatata|travis/i.test(blob)) {
    projectType = 'Music Video';
  } else if (/manifesto|teaser|good sports|ai awareness|compromise|precision|galaxy|join the search|hard is home|stay in rotation|the hunt|style is in session|spritez|sous la lune|imagine|cold wall|open|beats|louis vuitton|prime video|arc/i.test(blob)) {
    projectType = 'Brand Film';
  }

  if (cat === 'visual effects') {
    services.add('Visual Effects');
    services.add('Compositing');
    if (/delevingne|forgot|essentials|jacobs/i.test(blob)) services.add('Clean Up & Beauty');
    if (/atomic|manifesto|flip|essentials|palisades/i.test(blob)) services.add('Creative Direction');
    if (/speedcross|nba|nhl|palisades|flip|void/i.test(blob)) services.add('CGI');
  } else if (cat === 'sound') {
    services.add('Sound Design');
    if (card.soundDesignMix) services.add('Mixing & Mastering');
    if (card.credits) {
      card.credits.forEach((c) => {
        const lab = c.label.toLowerCase();
        if (lab.indexOf('mix') >= 0 || lab.indexOf('mixer') >= 0) services.add('Mixing & Mastering');
      });
    }
    if (/teaser|open|galaxy/i.test(blob)) services.add('Compose');
  } else if (cat === 'ai') {
    services.add('AI');
    services.add('Visual Effects');
    services.add('Creative Direction');
    if (/concept|cold wall|ducati|bmw|nike|chanel|mercedes/i.test(blob)) services.add('CGI');
  }

  return {
    services: Array.from(services).filter((s) => SERVICE_OPTIONS.includes(s)),
    projectType: PROJECT_TYPES.includes(projectType) ? projectType : 'Commercial',
  };
}

/** Add default-catalog projects missing from an existing catalog (non-destructive). */
export function mergeDefaultCatalogMissing(catalog) {
  if (!catalog || !Array.isArray(catalog.projects)) {
    return { catalog: buildDefaultCatalog(), added: buildDefaultCatalog().projects.length };
  }
  const defaults = buildDefaultCatalog();
  const existingIds = new Set(catalog.projects.map((p) => p.id));
  let added = 0;
  defaults.projects.forEach((p) => {
    if (existingIds.has(p.id)) return;
    catalog.projects.push({ ...p, sortOrder: catalog.projects.length });
    existingIds.add(p.id);
    added++;
  });
  return { catalog: { version: catalog.version || 1, projects: catalog.projects }, added };
}

export function buildDefaultCatalog() {
  const projects = [];
  let sortOrder = 0;
  ROWS.forEach((row) => {
    const catSlug = categorySlug(row.label);
    row.cards.forEach((card) => {
      const id = normalizeKey(card.title, card.client);
      const meta = inferProjectMeta(card, row.label);
      const slug = card.slug || slugify(card.title);
      projects.push({
        id,
        slug,
        category: catSlug,
        title: card.title,
        client: card.client,
        href: projectURL(card, row.label),
        video: card.video,
        poster: getPoster(card),
        credits: cardCredits(card),
        services: meta.services,
        projectType: meta.projectType,
        featured: SELECTED_KEYS.has(id),
        homeHero: { start: card.clipStart || 0, enabled: false },
        sortOrder: sortOrder++,
        clipStart: card.clipStart,
        clipEnd: card.clipEnd,
      });
    });
  });
  return { version: 1, projects };
}

/** Map catalog entry to unified page PROJECTS row shape. */
export function catalogToUnifiedProjects(catalog) {
  if (!catalog || !Array.isArray(catalog.projects)) return null;
  const label = (slug) => ({
    'visual-effects': 'Visual Effects',
    sound: 'Sound',
    ai: 'AI',
    'making-of': 'Making Of',
  }[slug] || slug);
  return catalog.projects.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({
    id: p.id,
    client: p.client,
    title: p.title,
    video: p.video,
    poster: p.poster,
    url: p.href,
    category: label(p.category),
    services: p.services || [],
    type: [p.projectType || 'Commercial'],
    selected: !!p.featured,
    clipStart: p.clipStart,
    clipEnd: p.clipEnd,
  }));
}
