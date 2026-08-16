import sharp from "sharp";

async function run() {
  const favicon = await sharp("src/assets/favicon-source.png").trim({ threshold: 10 }).png().toBuffer();

  await sharp(favicon)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("public/favicon-32.png");

  await sharp(favicon)
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("public/favicon-128.png");

  await sharp(favicon)
    .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("public/apple-touch-icon.png");

  // Trimmed wordmark lockup for on-page use (nav) -- tight bounding box, sized
  // for ~2x retina sharpness at its ~330px display width (58px tall), not the
  // much larger 920px master this used to ship at full-size on every page.
  const logoTrimmed = await sharp("src/assets/logo-source.png").trim({ threshold: 10 }).png().toBuffer();
  const logoDisplay = await sharp(logoTrimmed).resize(680, null, { withoutEnlargement: true }).toBuffer();
  await sharp(logoDisplay).png({ compressionLevel: 9 }).toFile("public/logo.png");
  await sharp(logoDisplay).webp({ quality: 90 }).toFile("public/logo.webp");

  // Social preview card: the wordmark lockup centered on the site's warm-white ground.
  const logo = await sharp(logoTrimmed)
    .resize(1000, null, { withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();

  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: "#F8F8F5" },
  })
    .composite([{ input: logo, left: Math.round((1200 - logoMeta.width) / 2), top: Math.round((630 - logoMeta.height) / 2) }])
    .png()
    .toFile("public/og-image.png");

  const f32 = await sharp("public/favicon-32.png").metadata();
  const f128 = await sharp("public/favicon-128.png").metadata();
  const logoOut = await sharp("public/logo.png").metadata();
  const og = await sharp("public/og-image.png").metadata();
  console.log("public/favicon-32.png", f32.width, "x", f32.height);
  console.log("public/favicon-128.png", f128.width, "x", f128.height);
  console.log("public/apple-touch-icon.png 180x180");
  console.log("public/logo.png / logo.webp", logoOut.width, "x", logoOut.height);
  console.log("public/og-image.png", og.width, "x", og.height);
}

run();
