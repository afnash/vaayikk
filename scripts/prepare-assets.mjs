import { mkdir, copyFile, cp, writeFile, access } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';

await mkdir('public/icons', { recursive: true });
await mkdir('public/demo', { recursive: true });
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs');
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) await cp(`node_modules/pdfjs-dist/${folder}`, `public/${folder}`, { recursive: true });
for (const size of [192, 512]) await sharp('public/icon.svg').resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#a74f36' } }).composite([{ input: await sharp('public/icon.svg').resize(350).toBuffer(), gravity: 'center' }]).png().toFile('public/icons/maskable-512.png');

const editions = [
  { id: 'noticing', title: 'The Art of Noticing', lines: ['The Art of', 'Noticing'], sub: 'A LITTLE MORE PRESENT', bg: '#dce1c8', ink: '#263e34', type: 'plant', topic: 'attention', collection: 'everyday' },
  { id: 'morning', title: 'A Slower Kind of Morning', lines: ['A Slower', 'Kind of', 'Morning'], sub: 'MAKE ROOM FOR THE DAY', bg: '#bb573b', ink: '#fff0d4', type: 'sun', topic: 'slowness', collection: 'everyday' },
  { id: 'quiet', title: 'The Quiet Between', lines: ['The Quiet', 'Between'], sub: 'NOTES ON MAKING SPACE', bg: '#ebe4d4', ink: '#393e39', type: 'shapes', topic: 'creativity', collection: 'creative' },
  { id: 'elsewhere', title: 'Somewhere, Else', lines: ['Somewhere,', 'Else'], sub: 'A SMALL JOURNEY OUTSIDE', bg: '#a7bfca', ink: '#263e51', type: 'landscape', topic: 'wandering', collection: 'fiction' },
  { id: 'focus', title: 'A Field Guide to Focus', lines: ['A Field Guide', 'to Focus'], sub: 'DO LESS, NOTICE MORE', bg: '#2e493e', ink: '#e4e3b9', type: 'orbit', topic: 'focus', collection: 'creative' },
  { id: 'pleasures', title: 'Small Pleasures', lines: ['Small', 'Pleasures'], sub: 'THE BEAUTY OF ORDINARY THINGS', bg: '#ded5e0', ink: '#753d48', type: 'flower', topic: 'joy', collection: 'everyday' },
];

function art(type) {
  if (type === 'plant') return `<g fill="none" stroke="#576c48" stroke-width="3"><path d="M210 525Q208 405 270 330M213 479Q150 465 141 417Q199 414 213 479ZM221 445Q273 435 291 385Q239 385 221 445ZM242 392Q191 382 189 342Q232 350 242 392Z"/><path d="M210 525Q250 477 305 470M254 490Q259 460 288 445"/></g><circle cx="138" cy="347" r="27" fill="#c3aa65" opacity=".75"/>`;
  if (type === 'sun') return `<circle cx="210" cy="418" r="82" fill="#ecc987"/><path d="M56 440Q132 390 210 448T365 440V550H56Z" fill="#8d3e31"/><path d="M56 484Q166 438 262 493T365 474V550H56Z" fill="#d87d51"/><g stroke="#edc78d" opacity=".5"><path d="M60 558H360M80 570H340"/></g>`;
  if (type === 'shapes') return `<path d="M103 534V402a73 73 0 01146 0v132Z" fill="#c36b48"/><path d="M194 534V458a65 65 0 01130 0v76Z" fill="#334b41"/><circle cx="288" cy="342" r="34" fill="#c9b888"/><path d="M77 545H347" stroke="#464c40" stroke-width="2"/>`;
  if (type === 'landscape') return `<circle cx="282" cy="345" r="36" fill="#f0dcaf"/><path d="M45 466L157 326 270 466Z" fill="#6e8f89"/><path d="M127 492L270 366 381 492Z" fill="#4c727a"/><path d="M43 493Q190 444 376 507V553H43Z" fill="#d4d2b6"/><path d="M210 491Q160 517 219 552" fill="none" stroke="#f2ecda" stroke-width="12"/>`;
  if (type === 'orbit') return `<g fill="none" stroke="#b9be8c" stroke-width="1.5"><circle cx="210" cy="436" r="97"/><circle cx="210" cy="436" r="72"/><circle cx="210" cy="436" r="47"/><path d="M210 315V557M89 436H331"/></g><circle cx="210" cy="436" r="17" fill="#dbb76b"/><circle cx="291" cy="383" r="8" fill="#dbb76b"/>`;
  return `<g fill="#a25b62">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="210" cy="378" rx="25" ry="54" transform="rotate(${i * 45} 210 428)"/>`).join('')}</g><circle cx="210" cy="428" r="29" fill="#e0b56a"/><path d="M210 470V562" stroke="#637153" stroke-width="5"/><path d="M210 528Q146 538 155 493Q198 489 210 528Z" fill="#637153"/>`;
}

const paragraphs = [
  'There is a particular kind of quiet that arrives when we stop trying to fill every moment. It is not an absence. It is the sound of a day unfolding at its own pace: a window opening, a kettle warming, a page turning beneath your hand.',
  'We often imagine that a meaningful life is built from extraordinary moments. But most of a life is made of smaller things. The route we walk. The words we choose. The way the afternoon light falls across a familiar room. These things are easy to miss, and they are also enough.',
  'Try this: leave a little space before the next thing. Put the phone down for a minute. Look at what is already here. You do not need to turn the experience into a lesson or capture it for later. Let it simply be an experience that belongs to you.',
  'A small practice is better than a grand intention that never finds its way into a day. Begin with something ordinary. A walk without a destination. A few lines written by hand. A cup of something warm, finished before it goes cold.',
  'There will still be unfinished work. There will still be noise beyond the window. Making room for yourself does not require that the world becomes less complicated. It only requires a moment in which your attention is your own again.',
  'When you return to the rest of your day, you may find that nothing has changed very much. And yet the familiar world feels a little wider. Sometimes that is what a good page offers us: not a different life, but a gentler way of inhabiting this one.',
];

for (const [index, book] of editions.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="630" viewBox="0 0 420 630"><rect width="420" height="630" fill="${book.bg}"/><rect x="17" y="17" width="386" height="596" fill="none" stroke="${book.ink}" stroke-opacity=".18"/><path d="M33 63H387" stroke="${book.ink}" stroke-opacity=".4"/><text x="210" y="48" text-anchor="middle" fill="${book.ink}" font-family="Arial,sans-serif" font-size="10" letter-spacing="4">FOLIO ORIGINALS · 0${index + 1}</text>${book.lines.map((line, i) => `<text x="210" y="${126 + i * 53}" text-anchor="middle" fill="${book.ink}" font-family="Georgia,serif" font-size="${line.length > 12 ? 38 : 46}" letter-spacing="-1.5">${line}</text>`).join('')}<text x="210" y="${145 + book.lines.length * 53}" text-anchor="middle" fill="${book.ink}" font-family="Arial,sans-serif" font-size="9" letter-spacing="2">${book.sub}</text>${art(book.type)}<text x="210" y="594" text-anchor="middle" fill="${book.ink}" font-family="Arial,sans-serif" font-size="10" letter-spacing="3">THE EVERYDAY SERIES</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(`public/demo/${book.id}.png`, png);
  const doc = await PDFDocument.create();
  doc.setTitle(book.title); doc.setAuthor('Folio Editions'); doc.setSubject(`An original short read about ${book.topic}.`);
  const img = await doc.embedPng(png);
  const cover = doc.addPage([420, 630]); cover.drawImage(img, { x: 0, y: 0, width: 420, height: 630 });
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  for (let page = 0; page < 6; page++) {
    const p = doc.addPage([420, 630]);
    p.drawRectangle({ x: 0, y: 0, width: 420, height: 630, color: rgb(.985, .977, .953) });
    p.drawText('F O L I O   O R I G I N A L S', { x: 48, y: 580, font: sans, size: 8, color: rgb(.48, .48, .42) });
    p.drawText(['A little room', 'Ordinary things', 'An invitation', 'Begin again', 'The world can wait', 'A page to take with you'][page], { x: 48, y: 519, size: 27, font, color: rgb(.2, .25, .2) });
    const content = [paragraphs[page], paragraphs[(page + 2) % paragraphs.length]];
    let y = 467;
    for (const para of content) {
      let line = '';
      for (const word of para.split(' ')) {
        const next = line ? line + ' ' + word : word;
        if (font.widthOfTextAtSize(next, 13) > 321) { p.drawText(line, { x: 48, y, size: 13, font, color: rgb(.25, .27, .24) }); y -= 22; line = word; } else line = next;
      }
      if (line) { p.drawText(line, { x: 48, y, size: 13, font, color: rgb(.25, .27, .24) }); y -= 40; }
    }
    if (page === 5) p.drawText('A short original reading sample, made for Folio.', { x: 48, y: 117, font: italic, size: 11, color: rgb(.48, .48, .42) });
    p.drawText(book.title, { x: 48, y: 39, font: italic, size: 9, color: rgb(.48, .48, .42) });
    p.drawText(String(page + 2), { x: 365, y: 39, font: sans, size: 9, color: rgb(.48, .48, .42) });
  }
  await writeFile(`public/demo/${book.id}.pdf`, await doc.save());
}
await writeFile('public/demo/catalog.json', JSON.stringify(editions.map(({ id, title, bg, collection }) => ({ id, title, color: bg, collection })), null, 2));
console.log('Prepared local PDF worker, icons, and six original reading samples.');
