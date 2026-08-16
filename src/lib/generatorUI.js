import { renderQR, inspectQR, qrToSVGString, qrToPNGBlob } from "./qr.js";

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function initGeneratorTool({ getText, filenamePrefix = "qr-code", onEmpty, onReady }) {
  const el = (id) => document.getElementById(id);
  const canvas = el("qr-canvas");
  const fg = el("ctrl-fg");
  const bg = el("ctrl-bg");
  const transparent = el("ctrl-transparent");
  const size = el("ctrl-size");
  const margin = el("ctrl-margin");
  const ecc = el("ctrl-ecc");
  const dlPng = el("dl-png");
  const dlSvg = el("dl-svg");
  const meta = el("qr-meta-text");
  const empty = el("qr-empty");

  function currentOpts() {
    return {
      dark: fg.value,
      light: transparent.checked ? "#00000000" : bg.value,
      width: Number(size.value),
      margin: margin.checked ? 4 : 0,
      errorCorrectionLevel: ecc.value,
    };
  }

  let lastText = "";

  async function update() {
    const text = getText();
    lastText = text;
    if (!text) {
      canvas.hidden = true;
      if (empty) empty.hidden = false;
      if (meta) meta.textContent = "";
      dlPng.disabled = true;
      dlSvg.disabled = true;
      if (onEmpty) onEmpty();
      return;
    }
    canvas.hidden = false;
    if (empty) empty.hidden = true;
    dlPng.disabled = false;
    dlSvg.disabled = false;
    const opts = currentOpts();
    await renderQR(canvas, text, { ...opts, width: 400 });
    if (meta) {
      const info = inspectQR(text, opts.errorCorrectionLevel);
      meta.textContent = `${info.size}×${info.size} modules · v${info.version} · ${opts.errorCorrectionLevel}`;
    }
    if (onReady) onReady(text);
  }

  [fg, bg, transparent, size, margin, ecc].forEach((elm) => {
    elm.addEventListener("input", update);
    elm.addEventListener("change", update);
  });

  dlPng.addEventListener("click", async () => {
    if (!lastText) return;
    const opts = currentOpts();
    const blob = await qrToPNGBlob(lastText, { ...opts, width: Math.max(opts.width, 1000) });
    download(blob, `${filenamePrefix}.png`);
  });

  dlSvg.addEventListener("click", async () => {
    if (!lastText) return;
    const opts = currentOpts();
    const svg = await qrToSVGString(lastText, { ...opts, width: Math.max(opts.width, 1000) });
    download(new Blob([svg], { type: "image/svg+xml" }), `${filenamePrefix}.svg`);
  });

  return { update };
}
