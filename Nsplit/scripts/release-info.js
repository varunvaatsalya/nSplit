/**
 * After building a release APK, updates the web's download info
 * (web/src/config/app-release.json) with this build's version, size and date.
 *
 *   npm run release:info                 keep the current download link
 *   npm run release:info -- "<link>"     also set a new download link
 */
const fs = require('fs');
const path = require('path');

// npm runs scripts from the project folder.
const root = process.cwd();
const app = require(path.join(root, 'app.json')).expo;
const apk = path.join(root, 'android/app/build/outputs/apk/release/app-release.apk');
const target = path.resolve(root, '../web/src/config/app-release.json');

if (!fs.existsSync(apk)) {
  console.error(`No release APK at ${apk}. Run "npm run android:release" first.`);
  process.exit(1);
}

/** Today's date (YYYY-MM-DD) in this computer's time zone. */
function localDate() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

const current = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : {};
const next = {
  version: app.version,
  versionCode: app.android?.versionCode ?? null,
  updatedAt: localDate(),
  sizeBytes: fs.statSync(apk).size,
  downloadUrl: process.argv[2] || current.downloadUrl || '',
};

fs.writeFileSync(target, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Updated ${path.relative(process.cwd(), target)}:`, next);
if (!next.downloadUrl) console.log('No download link yet: pass it as  npm run release:info -- "<link>"');
