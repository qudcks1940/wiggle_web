/* Run from the repository root: node docs/design-assets/gallery/build-assets.mjs */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '../../..');
const out = path.join(root, 'public/landing-gallery');
const specs = [
  { id: 'duck-painter', widths: [640, 1200], alpha: true, alt: '붓과 팔레트를 든 노란 오리 화가', cssWidth: 'clamp(240px, 36vw, 560px)' },
  { id: 'artwork-rocket', widths: [480, 960], alpha: false, alt: '크레용으로 그린 로켓과 우주 비행사', cssWidth: '260–380px' },
  { id: 'artwork-whale', widths: [480, 960], alpha: false, alt: '크레용으로 그린 고래와 바닷속 친구들', cssWidth: '260–380px' },
  { id: 'artwork-house', widths: [480, 960], alpha: false, alt: '크레용으로 그린 빨간 지붕 집과 꽃밭', cssWidth: '260–380px' },
  { id: 'leaves', widths: [160, 320], alpha: true, alt: '', cssWidth: '64–100px' },
  { id: 'paper-blue', widths: [1024], alpha: false, alt: '', cssWidth: 'background-size: cover (tile seams not guaranteed)' },
  { id: 'frame-blue', widths: [480, 960], alpha: true, alt: '', cssWidth: '300–440px' },
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function describe(file) {
  const bytes = await fs.readFile(file);
  const meta = await sharp(bytes).metadata();
  return { path: '/' + path.relative(path.join(root, 'public'), file).split(path.sep).join('/'), width: meta.width, height: meta.height, bytes: bytes.length, hasAlpha: !!meta.hasAlpha, sha256: hash(bytes) };
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const assets = [];
  for (const spec of specs) {
    const sourcePath = path.join(__dirname, 'source', spec.id + '.png');
    const sourceBytes = await fs.readFile(sourcePath);
    const meta = await sharp(sourceBytes).metadata();
    const stats = await sharp(sourceBytes).stats();
    if (spec.alpha && (!meta.hasAlpha || stats.channels.at(-1).min !== 0)) {
      throw new Error(spec.id + ': actual transparency is required');
    }
    const variants = [];
    for (const width of spec.widths) {
      const file = path.join(out, spec.id + '-' + width + '.webp');
      await sharp(sourceBytes).resize({ width, withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(file);
      variants.push(await describe(file));
    }
    const pngFile = path.join(out, spec.id + '.png');
    await sharp(sourceBytes).resize({ width: spec.widths.at(-1), withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(pngFile);
    assets.push({
      id: spec.id, alt: spec.alt, recommendedCssWidth: spec.cssWidth,
      source: { path: 'docs/design-assets/gallery/source/' + spec.id + '.png', width: meta.width, height: meta.height, sha256: hash(sourceBytes) },
      alphaVerified: spec.alpha, png: await describe(pngFile), variants,
      srcSet: variants.map(v => v.path + ' ' + v.width + 'w').join(', '),
      ...(spec.id === 'frame-blue' ? { artworkOverlay: { left: '14.1%', top: '18%', width: '71.7%', height: '62%' }, note: 'Painting is layered ABOVE frame, never behind its soft inner alpha. Use object-fit: contain with white background to avoid stretching.' } : {}),
    });
  }
  const iconFiles = (await fs.readdir(path.join(out, 'icons'))).filter(f => f.endsWith('.svg')).sort();
  const icons = [];
  for (const name of iconFiles) {
    const bytes = await fs.readFile(path.join(out, 'icons', name));
    icons.push({ path: '/landing-gallery/icons/' + name, width: 24, height: 24, bytes: bytes.length, sha256: hash(bytes), source: 'project-authored original SVG; 2px round stroke; no external icon package' });
  }
  const manifest = { version: 1, created: '2026-09-06', status: 'prepared assets; landing route not integrated', generation: 'built-in ImageGen; exact prompts in docs/design-assets/gallery/prompts.json', reference: 'docs/design-assets/gallery/selected-reference.png', reusedLogo: '/brand/logo.png', assets, icons };
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  // A contact sheet is an inspection artifact, not a runtime image or replacement for the individual assets.
  const cells = [
    ['duck-painter', 0, 0], ['artwork-rocket', 1, 0], ['artwork-whale', 2, 0],
    ['artwork-house', 0, 1], ['leaves', 1, 1], ['frame-blue', 2, 1],
  ];
  const layers = [];
  for (const [id, col, row] of cells) {
    const resized = await sharp(path.join(out, id + '.png')).resize({ width: 390, height: 270, fit: 'inside' }).toBuffer();
    const m = await sharp(resized).metadata();
    layers.push({ input: resized, left: col * 420 + Math.round((420 - m.width) / 2), top: row * 330 + 22 + Math.round((270 - m.height) / 2) });
    const label = Buffer.from('<svg width="420" height="34"><text x="210" y="24" font-family="sans-serif" font-size="17" text-anchor="middle" fill="#1a3b5c">' + id + '</text></svg>');
    layers.push({ input: label, left: col * 420, top: row * 330 + 292 });
  }
  await sharp(path.join(out, 'paper-blue.png')).resize(1260, 660, { fit: 'cover' }).composite(layers).png().toFile(path.join(__dirname, 'contact-sheet.png'));
  const frameLayers = [];
  for (const [i, id] of ['artwork-rocket', 'artwork-whale', 'artwork-house'].entries()) {
    const rim = await sharp(path.join(out, 'frame-blue.png')).resize(400, 300).toBuffer();
    const art = await sharp(path.join(out, id + '.png')).resize(287, 186, { fit: 'contain', background: '#ffffff' }).toBuffer();
    frameLayers.push({ input: rim, left: i * 420 + 10, top: 20 });
    frameLayers.push({ input: art, left: i * 420 + 66, top: 74 });
  }
  await sharp(path.join(out, 'paper-blue.png')).resize(1260, 340).composite(frameLayers).png().toFile(path.join(__dirname, 'frame-composition-check.png'));
  console.log(JSON.stringify({ assets: assets.length, icons: icons.length, webpBytes: assets.flatMap(a => a.variants).reduce((s, a) => s + a.bytes, 0), files: assets.map(a => ({ id: a.id, alpha: a.png.hasAlpha, png: a.png.bytes, webp: a.variants.map(v => v.bytes) })) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
