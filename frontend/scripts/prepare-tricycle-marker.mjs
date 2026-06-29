import sharp from "sharp";
import { unlink } from "fs/promises";

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error("Usage: node prepare-tricycle-marker.mjs <input> <output>");
  process.exit(1);
}

const temp = `${output}.tmp.png`;
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  if (r <= 28 && g <= 28 && b <= 28) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4,
  },
})
  .png()
  .toFile(temp);

await sharp(temp).trim().png().toFile(output);
await unlink(temp);

const meta = await sharp(output).metadata();
console.log(`Wrote ${output} (${meta.width}x${meta.height})`);
