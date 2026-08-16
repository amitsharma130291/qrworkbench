import QRCode from "qrcode";

export function inspectQR(text, errorCorrectionLevel = "M") {
  const data = QRCode.create(text, { errorCorrectionLevel });
  const size = data.modules.size;
  const density = data.version <= 2 ? "Low" : data.version <= 6 ? "Medium" : "High";
  return { size, version: data.version, density, errorCorrectionLevel };
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
}

export async function qrToSVGString(text, opts = {}) {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: opts.errorCorrectionLevel || "M",
    margin: opts.margin ?? 4,
    width: opts.width || 1000,
    color: {
      dark: opts.dark || "#000000",
      light: opts.light || "#ffffff",
    },
  });
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
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
      }
    );
  });
}
