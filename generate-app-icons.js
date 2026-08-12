import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// --------------------------------------------------------------------------
// BRANDING COLORS
// Primary Blue: #1565FF
// Dark Navy:    #0B1220
// Pure White:   #FFFFFF
// --------------------------------------------------------------------------

// 1. MASTER ICON SVG (1024x1024) - Auto Parts India Premium Emblem
const fullIconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid Dark Navy Background -->
  <rect width="1024" height="1024" fill="#0B1220"/>
  
  <!-- Subtle Radial Gradient Glow -->
  <circle cx="512" cy="512" r="420" fill="url(#bg_glow)" opacity="0.18"/>
  
  <!-- Central Emblem Symbol -->
  <g transform="translate(0, -10)">
    <!-- Primary Outer Apex Chevron - Primary Blue #1565FF -->
    <path d="M 512 180 L 800 564 L 700 564 L 512 312 L 324 564 L 224 564 Z" fill="#1565FF"/>
    
    <!-- Secondary Inner Dynamic Chevron - Pure White #FFFFFF -->
    <path d="M 512 340 L 712 612 L 620 612 L 512 464 L 404 612 L 312 612 Z" fill="#FFFFFF"/>
    
    <!-- Core Apex Notch - Primary Blue #1565FF -->
    <path d="M 512 492 L 624 652 L 548 652 L 512 600 L 476 652 L 400 652 Z" fill="#1565FF"/>
    
    <!-- Precision Anchor Diamond - Pure White #FFFFFF -->
    <path d="M 512 680 L 560 744 L 512 808 L 464 744 Z" fill="#FFFFFF"/>
  </g>
  
  <defs>
    <radialGradient id="bg_glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(512 512) rotate(90) scale(420)">
      <stop stop-color="#1565FF"/>
      <stop offset="1" stop-color="#1565FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>
`;

// 2. ADAPTIVE FOREGROUND ICON SVG (432x432 Viewport)
// Scaled inside 66% Android Safe Zone (264x264 circle at center 216, 216)
const foregroundIconSvg = `
<svg width="432" height="432" viewBox="0 0 432 432" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(216, 212) scale(0.35)">
    <!-- Primary Outer Apex Chevron - Primary Blue #1565FF -->
    <path d="M 0 -332 L 288 52 L 188 52 L 0 -200 L -188 52 L -288 52 Z" fill="#1565FF"/>
    
    <!-- Secondary Inner Dynamic Chevron - Pure White #FFFFFF -->
    <path d="M 0 -172 L 200 100 L 108 100 L 0 -48 L -108 100 L -200 100 Z" fill="#FFFFFF"/>
    
    <!-- Core Apex Notch - Primary Blue #1565FF -->
    <path d="M 0 -20 L 112 140 L 36 140 L 0 88 L -36 140 L -112 140 Z" fill="#1565FF"/>
    
    <!-- Precision Anchor Diamond - Pure White #FFFFFF -->
    <path d="M 0 168 L 48 232 L 0 296 L -48 232 Z" fill="#FFFFFF"/>
  </g>
</svg>
`;

// 3. MONOCHROME ICON SVG (Android 13+ Themed Icons & Notifications)
const monochromeIconSvg = `
<svg width="432" height="432" viewBox="0 0 432 432" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(216, 212) scale(0.35)">
    <path d="M 0 -332 L 288 52 L 188 52 L 0 -200 L -188 52 L -288 52 Z" fill="#FFFFFF"/>
    <path d="M 0 -172 L 200 100 L 108 100 L 0 -48 L -108 100 L -200 100 Z" fill="#FFFFFF"/>
    <path d="M 0 -20 L 112 140 L 36 140 L 0 88 L -36 140 L -112 140 Z" fill="#FFFFFF"/>
    <path d="M 0 168 L 48 232 L 0 296 L -48 232 Z" fill="#FFFFFF"/>
  </g>
</svg>
`;

// 4. NOTIFICATION MONOCHROME ICON SVG (96x96)
const notificationIconSvg = `
<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(48, 47) scale(0.08)">
    <path d="M 0 -332 L 288 52 L 188 52 L 0 -200 L -188 52 L -288 52 Z" fill="#FFFFFF"/>
    <path d="M 0 -172 L 200 100 L 108 100 L 0 -48 L -108 100 L -200 100 Z" fill="#FFFFFF"/>
    <path d="M 0 -20 L 112 140 L 36 140 L 0 88 L -36 140 L -112 140 Z" fill="#FFFFFF"/>
    <path d="M 0 168 L 48 232 L 0 296 L -48 232 Z" fill="#FFFFFF"/>
  </g>
</svg>
`;

async function main() {
  console.log("🎨 Generating Auto Parts India professional branding assets...");

  // Master 1024x1024 PNG
  const fullBuffer = await sharp(Buffer.from(fullIconSvg))
    .resize(1024, 1024)
    .png()
    .toBuffer();

  // 512x512 Play Store / Splash Buffer
  const playStoreBuffer = await sharp(fullBuffer)
    .resize(512, 512)
    .png()
    .toBuffer();

  // Round Mask 1024x1024 PNG
  const roundMaskSvg = `
    <svg width="1024" height="1024">
      <circle cx="512" cy="512" r="512" fill="#fff"/>
    </svg>
  `;
  const roundBuffer = await sharp(fullBuffer)
    .composite([{ input: Buffer.from(roundMaskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Adaptive Foreground PNG
  const foregroundBuffer = await sharp(Buffer.from(foregroundIconSvg))
    .resize(432, 432)
    .png()
    .toBuffer();

  // Monochrome PNG
  const monochromeBuffer = await sharp(Buffer.from(monochromeIconSvg))
    .resize(432, 432)
    .png()
    .toBuffer();

  // Notification Monochrome PNG
  const notificationBuffer = await sharp(Buffer.from(notificationIconSvg))
    .resize(96, 96)
    .png()
    .toBuffer();

  // 1. Export Web, Applet & Root Assets master PNGs & SVGs
  const webDirs = ['./assets', './public', './dist', './src/assets'];
  
  // Create 2732x2732 splash.png buffer for assets/
  const splashBuffer = await sharp(fullBuffer)
    .resize(2732, 2732, { fit: 'contain', background: { r: 11, g: 18, b: 32, alpha: 1 } })
    .png()
    .toBuffer();

  for (const dir of webDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'icon.png'), fullBuffer);
    fs.writeFileSync(path.join(dir, 'icon-only.png'), fullBuffer);
    fs.writeFileSync(path.join(dir, 'icon-foreground.png'), foregroundBuffer);
    fs.writeFileSync(path.join(dir, 'app-icon.png'), fullBuffer);
    fs.writeFileSync(path.join(dir, 'logo.png'), fullBuffer);
    fs.writeFileSync(path.join(dir, 'playstore-icon-512.png'), playStoreBuffer);
    fs.writeFileSync(path.join(dir, 'splash-icon.png'), playStoreBuffer);
    fs.writeFileSync(path.join(dir, 'splash.png'), splashBuffer);
    fs.writeFileSync(path.join(dir, 'adaptive-icon.png'), foregroundBuffer);
    fs.writeFileSync(path.join(dir, 'monochrome-icon.png'), monochromeBuffer);
    fs.writeFileSync(path.join(dir, 'notification-icon.png'), notificationBuffer);

    fs.writeFileSync(path.join(dir, 'app-icon.svg'), fullIconSvg);
    fs.writeFileSync(path.join(dir, 'icon.svg'), fullIconSvg);
    fs.writeFileSync(path.join(dir, 'monochrome-icon.svg'), monochromeIconSvg);

    // Favicon generation (32x32)
    await sharp(fullBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(dir, 'favicon.png'));

    console.log(`Saved master PNGs, SVGs & favicons to ${dir}`);
  }

  // 2. Android Mipmap & Drawable Target Directories
  const resDirectories = [
    './android/app/src/main/res'
  ];

  const densities = [
    { dir: 'mipmap-mdpi', drawDir: 'drawable-mdpi', size: 48, fgSize: 108, notifSize: 24, splashSize: 120 },
    { dir: 'mipmap-hdpi', drawDir: 'drawable-hdpi', size: 72, fgSize: 162, notifSize: 36, splashSize: 180 },
    { dir: 'mipmap-xhdpi', drawDir: 'drawable-xhdpi', size: 96, fgSize: 216, notifSize: 48, splashSize: 240 },
    { dir: 'mipmap-xxhdpi', drawDir: 'drawable-xxhdpi', size: 144, fgSize: 324, notifSize: 72, splashSize: 360 },
    { dir: 'mipmap-xxxhdpi', drawDir: 'drawable-xxxhdpi', size: 192, fgSize: 432, notifSize: 96, splashSize: 480 },
  ];

  for (const resDir of resDirectories) {
    if (!fs.existsSync(resDir)) {
      fs.mkdirSync(resDir, { recursive: true });
    }

    for (const { dir, drawDir, size, fgSize, notifSize, splashSize } of densities) {
      const targetPath = path.join(resDir, dir);
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      const drawPath = path.join(resDir, drawDir);
      if (!fs.existsSync(drawPath)) {
        fs.mkdirSync(drawPath, { recursive: true });
      }

      // Legacy Square launcher icon
      await sharp(fullBuffer)
        .resize(size, size)
        .toFile(path.join(targetPath, 'ic_launcher.png'));

      // Legacy Round launcher icon
      await sharp(roundBuffer)
        .resize(size, size)
        .toFile(path.join(targetPath, 'ic_launcher_round.png'));

      // Adaptive Foreground launcher icon
      await sharp(foregroundBuffer)
        .resize(fgSize, fgSize)
        .toFile(path.join(targetPath, 'ic_launcher_foreground.png'));

      // Android 13+ Monochrome launcher icon
      await sharp(monochromeBuffer)
        .resize(fgSize, fgSize)
        .toFile(path.join(targetPath, 'ic_launcher_monochrome.png'));

      // Notification Icon
      await sharp(notificationBuffer)
        .resize(notifSize, notifSize)
        .toFile(path.join(targetPath, 'ic_notification.png'));

      // Splash Screen Logo in drawable density folder
      await sharp(playStoreBuffer)
        .resize(splashSize, splashSize)
        .toFile(path.join(drawPath, 'splash_logo.png'));

      // Notification Icon in drawable density folder
      await sharp(notificationBuffer)
        .resize(notifSize, notifSize)
        .toFile(path.join(drawPath, 'ic_notification.png'));

      // Master Logo in drawable density folder
      await sharp(fullBuffer)
        .resize(splashSize, splashSize)
        .toFile(path.join(drawPath, 'master_logo.png'));

      console.log(`Generated ${dir} & ${drawDir} assets for ${resDir}`);
    }

    // Write drawable/launch_screen.xml
    const drawableDir = path.join(resDir, 'drawable');
    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });

    fs.writeFileSync(path.join(drawableDir, 'launch_screen.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/dark_navy" />
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_logo" />
    </item>
</layer-list>
`);

    // Write values/colors.xml
    const valuesDir = path.join(resDir, 'values');
    if (!fs.existsSync(valuesDir)) fs.mkdirSync(valuesDir, { recursive: true });

    fs.writeFileSync(path.join(valuesDir, 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B1220</color>
    <color name="primary_blue">#1565FF</color>
    <color name="dark_navy">#0B1220</color>
    <color name="white">#FFFFFF</color>
</resources>
`);

    fs.writeFileSync(path.join(valuesDir, 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:textColor">#000000</item>
        <item name="android:windowBackground">@drawable/launch_screen</item>
        <item name="android:statusBarColor">#0B1220</item>
    </style>
</resources>
`);

    fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B1220</color>
</resources>
`);

    // Write mipmap-anydpi-v26 XMLs
    const v26Dir = path.join(resDir, 'mipmap-anydpi-v26');
    if (!fs.existsSync(v26Dir)) fs.mkdirSync(v26Dir, { recursive: true });

    fs.writeFileSync(path.join(v26Dir, 'ic_launcher.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`);

    fs.writeFileSync(path.join(v26Dir, 'ic_launcher_round.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`);
  }

  console.log("✅ Auto Parts India branding package successfully generated!");
}

main().catch(console.error);
