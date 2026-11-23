// 生成自适应启动图标 + 圆形图标占位（纯色 PNG，分辨率齐全即可，可后续替换成真图标）
const fs = require('fs');
const zlib = require('zlib');

// 递归创建目录
function mkdirp(p) {
  const parts = p.split('/');
  let cur = '';
  for (const part of parts) {
    cur += part + '/';
    if (!fs.existsSync(cur)) fs.mkdirSync(cur);
  }
}

// 生成一个 1x1 纯色 PNG（rgba）
function makePng(r, g, b, a) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    const buf = Buffer.concat([t, data]);
    // CRC32
    let c = 0xffffffff;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) {
        if (c & 1) c = (c >>> 1) ^ 0xedb88320;
        else c = c >>> 1;
      }
    }
    c ^= 0xffffffff;
    crc.writeUInt32BE(c >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); // 1x1
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(Buffer.from([r, g, b, a]));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// 自适应图标用主色，圆形图标用深色
const BASE = 'android/app/src/main/res';
const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};
// mipmap 里放 1x1 占位即可，Capacitor 构建时会用 capacitor-android 的默认图标覆盖；
// 这里只保证目录非空、文件存在，避免 AAPT 报缺资源
for (const [dir, size] of Object.entries(sizes)) {
  const p = `${BASE}/${dir}`;
  mkdirp(p);
  fs.writeFileSync(`${p}/ic_launcher.png`, makePng(0x2E, 0x86, 0xDE, 0xff));
  fs.writeFileSync(`${p}/ic_launcher_round.png`, makePng(0x1B, 0x5E, 0x9B, 0xff));
}
// 自适应图标（v26+）放一个 drawable xml 即可
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/splash_background"/>
    <foreground android:drawable="@color/colorAccent"/>
</adaptive-icon>`;
fs.writeFileSync(`${BASE}/mipmap-anydpi-v26/ic_launcher.xml`, adaptive);
fs.writeFileSync(`${BASE}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptive);
console.log('icons generated');
