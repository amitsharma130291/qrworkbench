import QRCode from "qrcode";

export function inspectQR(text, errorCorrectionLevel = "M") {
  const data = QRCode.create(text, { errorCorrectionLevel });
  const size = data.modules.size;
  const density = data.version <= 2 ? "Low" : data.version <= 6 ? "Medium" : "High";
  return { size, version: data.version, density, errorCorrectionLevel };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draws the uploaded logo centered on an already-rendered QR canvas, behind a
// solid backdrop patch so the modules underneath don't interfere with the scan.
function drawLogoOnCanvas(canvas, logo) {
  if (!logo || !logo.image) return;
  const ctx = canvas.getContext("2d");
  const side = canvas.width;
  const scale = Math.min(Math.max(logo.scale || 0.22, 0.1), 0.3);
  const logoSize = side * scale;
  const pad = logoSize * 0.18;
  const boxSize = logoSize + pad * 2;
  const boxPos = (side - boxSize) / 2;
  const imgPos = (side - logoSize) / 2;

  ctx.fillStyle = logo.backdrop || "#ffffff";
  roundRectPath(ctx, boxPos, boxPos, boxSize, boxSize, boxSize * 0.18);
  ctx.fill();
  ctx.drawImage(logo.image, imgPos, imgPos, logoSize, logoSize);
}

function injectLogoIntoSVG(svgString, text, opts) {
  if (!opts.logo || !opts.logo.dataUrl) return svgString;
  const { size } = inspectQR(text, opts.errorCorrectionLevel || "M");
  const marginModules = opts.margin ?? 4;
  const total = size + marginModules * 2;
  const scale = Math.min(Math.max(opts.logo.scale || 0.22, 0.1), 0.3);
  const logoSize = total * scale;
  const pad = logoSize * 0.18;
  const boxSize = logoSize + pad * 2;
  const boxPos = (total - boxSize) / 2;
  const imgPos = (total - logoSize) / 2;
  const backdrop = opts.logo.backdrop || "#ffffff";

  const overlay =
    `<rect x="${boxPos.toFixed(3)}" y="${boxPos.toFixed(3)}" width="${boxSize.toFixed(3)}" height="${boxSize.toFixed(3)}" rx="${(boxSize * 0.18).toFixed(3)}" fill="${backdrop}"/>` +
    `<image x="${imgPos.toFixed(3)}" y="${imgPos.toFixed(3)}" width="${logoSize.toFixed(3)}" height="${logoSize.toFixed(3)}" href="${opts.logo.dataUrl}" preserveAspectRatio="xMidYMid meet"/>`;

  return svgString.replace("</svg>", overlay + "</svg>");
}

export async function renderQR(canvas, text, opts = {}) {
  await QRCode.toCanvas(canvas, text, {
    errorCorrectionLevel: opts.errorCorrectionLevel || "M",
    margin: opts.margin ?? 1,
    width: opts.width || 480,
    color: {
      dark: opts.dark || "#111111",
      light: opts.light || "#00000000",
    },
  });
  // QRCode.toCanvas sets an inline width/height style on the canvas to match
  // the pixel size it just rendered at -- that inline style beats every CSS
  // rule sizing the canvas (a fixed 44px preview thumbnail, a 100%-wide hero
  // panel), so strip it and let the page's own CSS control display size.
  canvas.style.removeProperty("width");
  canvas.style.removeProperty("height");
  drawLogoOnCanvas(canvas, opts.logo);
}

export async function qrToSVGString(text, opts = {}) {
  const svg = await QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: opts.errorCorrectionLevel || "M",
    margin: opts.margin ?? 4,
    width: opts.width || 1000,
    color: {
      dark: opts.dark || "#000000",
      light: opts.light || "#ffffff",
    },
  });
  return injectLogoIntoSVG(svg, text, opts);
}

export function qrToPNGBlob(text, opts = {}) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(
      canvas,
      text,
      {
        errorCorrectionLevel: opts.errorCorrectionLevel || "M",
        margin: opts.margin ?? 4,
        width: opts.width || 1000,
        color: {
          dark: opts.dark || "#000000",
          light: opts.light || "#ffffff",
        },
      },
      (err) => {
        if (err) return reject(err);
        drawLogoOnCanvas(canvas, opts.logo);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
      }
    );
  });
}
