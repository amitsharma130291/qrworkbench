import { renderQR, qrToSVGString } from './qr.js';

export function captionLines(text, max = 32) {
  const lines = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && (line + ' ' + word).length > max) { lines.push(line); line = ''; }
      let remaining = word;
      while (remaining.length > max) {
        if (line) { lines.push(line); line = ''; }
        lines.push(remaining.slice(0, max)); remaining = remaining.slice(max);
      }
      line += (line ? ' ' : '') + remaining;
    }
    lines.push(line);
  }
  return lines;
}

export function captionLayout(caption, width, fontRatio = .035) {
  const font = width * fontRatio;
  const lines = captionLines(caption, Math.max(12, Math.floor(.85 / (fontRatio * .62))));
  return { font, lines, extra: caption ? Math.ceil(font * (lines.length * 1.4 + 1)) : 0 };
}

export async function renderCaptionedQR(canvas, text, opts, caption, fontRatio) {
  const qr = document.createElement('canvas');
  await renderQR(qr, text, opts);
  const width = qr.width;
  const { font, lines, extra } = captionLayout(caption, width, fontRatio);
  canvas.width = width; canvas.height = width + extra;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = opts.light || '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(qr, 0, 0);
  ctx.fillStyle = opts.dark || '#111111'; ctx.textAlign = 'center'; ctx.font = `${font}px sans-serif`;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, width + font * (1.1 + i * 1.4), width * .9));
}

const escapeXML = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export async function captionedSVG(text, opts, caption, fontRatio) {
  const width = opts.width;
  const { font, lines, extra } = captionLayout(caption, width, fontRatio);
  const qr = await qrToSVGString(text, opts);
  const sized = qr.replace(/<svg\b[^>]*>/, tag => tag.replace(/\s(width|height)="[^"]*"/g, '').replace('<svg ', `<svg x="0" y="0" width="${width}" height="${width}" `));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width + extra}" viewBox="0 0 ${width} ${width + extra}"><rect width="100%" height="100%" fill="${opts.light}"/>${sized}${caption ? lines.map((line, i) => `<text x="${width / 2}" y="${width + font * (1.1 + i * 1.4)}" text-anchor="middle" font-family="sans-serif" font-size="${font}" fill="${opts.dark}">${escapeXML(line)}</text>`).join('') : ''}</svg>`;
}
