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

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image file"));
    img.src = dataUrl;
  });
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
  const logoInput = el("ctrl-logo");
  const logoControls = el("logo-controls");
  const logoScale = el("ctrl-logo-scale");
  const logoRemove = el("logo-remove");
  const logoNote = el("logo-note");

  let logoState = null; // { image, dataUrl }

  function currentOpts() {
    return {
      dark: fg.value,
      light: transparent.checked ? "#00000000" : bg.value,
      width: Number(size.value),
      margin: margin.checked ? 4 : 0,
      errorCorrectionLevel: ecc.value,
      logo: logoState
        ? {
            image: logoState.image,
            dataUrl: logoState.dataUrl,
            scale: Number(logoScale.value),
            backdrop: transparent.checked ? "#ffffff" : bg.value,
          }
        : null,
    };
  }

  if (logoInput) {
    logoInput.addEventListener("change", async () => {
      const file = logoInput.files[0];
      if (!file) return;
      if (file.size > MAX_LOGO_BYTES) {
        alert("Logo must be under 2MB.");
        logoInput.value = "";
        return;
      }
      try {
        const dataUrl = await fileToDataURL(file);
        const image = await loadImage(dataUrl);
        logoState = { image, dataUrl };
        logoControls.hidden = false;
        logoNote.hidden = false;
        if (ecc.value === "L" || ecc.value === "M") ecc.value = "H";
        update();
      } catch {
        alert("Could not read that image file.");
        logoInput.value = "";
      }
    });

    logoRemove.addEventListener("click", () => {
      logoState = null;
      logoInput.value = "";
      logoControls.hidden = true;
      logoNote.hidden = true;
      update();
    });

    logoScale.addEventListener("change", update);
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
