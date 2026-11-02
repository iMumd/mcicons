import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { vectorize, vectorSvg } from './vectorize.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
const source = JSON.parse(await fs.readFile(path.join(root, 'data/minecraft-source.json')));
const imported = new Set(source.added.map((item) => item.id));
const official = new Set(source.officialItems);
const core = await fs.readFile(path.join(root, 'resources/css/core.css'), 'utf8');
// dist is exclusively generated output; never touch source icons or user subsets.
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(path.join(output, 'css/icons'), { recursive: true });
await fs.mkdir(path.join(output, 'icons'), { recursive: true });
for (const directory of ['svg', 'definitions', 'css/svg']) await fs.mkdir(path.join(output, directory), { recursive: true });
const items = [];
const classes = [];
const legacy = [];
const svgClasses = [];
let svgGzipBytes = 0;
let svgBytes = 0;
for (const file of (await fs.readdir(path.join(root, 'public/icons'))).filter((name) => /^minecraft_[a-z0-9_]+\.png$/.test(name)).sort()) {
  const id = file.slice('minecraft_'.length, -4);
  const name = id.replaceAll('_', '-');
  const buffer = await fs.readFile(path.join(root, 'public/icons', file));
  if (buffer.readUInt32BE(16) !== 64 || buffer.readUInt32BE(20) !== 64) throw new Error('Invalid 64px PNG: ' + file);
  const category = /spawn_egg$/.test(id) ? 'mobs' : /sword|pickaxe|axe$|shovel|hoe$|spear|helmet|chestplate|leggings|boots|armor|shield|bow|mace/.test(id) ? 'equipment'
    : /flower|sapling|leaves|mushroom|seed|bush|grass|dandelion/.test(id) ? 'nature'
    : /apple|bread|beef|pork|potato|carrot|cookie|chicken$|stew|cake|melon|berries/.test(id) ? 'food'
    : /planks|slab|stairs|bricks|log$|wood$|concrete|wool|stone|copper|shelf|glass|fence|door|wall$/.test(id) ? 'building' : 'items';
  items.push({ name, title: id.split('_').map((word) => word[0].toUpperCase()+word.slice(1)).join(' '), file,
    category, added: imported.has(id), current: official.has(id), bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
  await fs.copyFile(path.join(root, 'public/icons', file), path.join(output, 'icons', file));
  const definition = vectorize(buffer, name);
  const svg = vectorSvg(definition);
  const svgFile = file.replace('.png', '.svg');
  const svgBuffer = Buffer.from(svg);
  Object.assign(items.at(-1), { svg: svgFile, svgBytes: svgBuffer.length, svgGzipBytes: gzipSync(svgBuffer).length,
    svgSha256: createHash('sha256').update(svgBuffer).digest('hex') });
  svgBytes += svgBuffer.length;
  svgGzipBytes += gzipSync(svgBuffer).length;
  await fs.writeFile(path.join(output, 'svg', svgFile), svg);
  await fs.writeFile(path.join(output, 'definitions', name + '.mjs'), `export default ${JSON.stringify(definition)};\n`);
  await fs.writeFile(path.join(output, 'definitions', name + '.d.ts'), "import type { IconDefinition } from '@imumd/mcicons/svg';\ndeclare const icon: IconDefinition;\nexport default icon;\n");
  svgClasses.push(`.mc-${name}{--mc-icon:url('../svg/${svgFile}')}`);
  await fs.writeFile(path.join(output, 'css/svg', name + '.css'), `.mc-${name}{--mc-icon:url('../../svg/${svgFile}')}\n`);
  classes.push(`.mc-${name}{--mc-icon:url('../icons/${file}')}`);
  legacy.push(`.mc-${name}{--mc-icon:url('icons/${file}')}`);
  await fs.writeFile(path.join(output, 'css/icons', name+'.css'), `.mc-${name}{--mc-icon:url('../../icons/${file}')}\n`);
}
const covered = items.filter((item) => item.current).length;
if (covered !== official.size) throw new Error(`Current item coverage incomplete: ${covered}/${official.size}`);
await fs.writeFile(path.join(output, 'css/core.css'), core);
await fs.writeFile(path.join(output, 'css/all.css'), core+'\n'+classes.join('\n')+'\n');
await fs.writeFile(path.join(output, 'css/svg.css'), core+'\n'+svgClasses.join('\n')+'\n');
await fs.writeFile(path.join(root, 'resources/css/mcicons.css'), core+'\n'+legacy.join('\n')+'\n');
const manifest = { version: pkg.version, minecraft: source.minecraft, count: items.length, added: imported.size,
  coverage: { current: covered, official: official.size, retained: items.length-covered }, items };
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest)+'\n');
await fs.writeFile(path.join(output, 'catalog.json'), JSON.stringify({ ...manifest, items: items.map(({ sha256, ...item }) => item) })+'\n');
await fs.writeFile(path.join(root, 'src/index.d.ts'), `export type IconName = ${items.map((item) => JSON.stringify(item.name)).join(' | ')};\nexport type IconSize = 'sm' | 'md' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';\nexport declare const version: string;\nexport declare const defaultBase: string;\nexport declare function iconUrl(name: IconName, base?: string): string;\nexport declare function iconClass(name: IconName, size?: IconSize): string;\n`);
const integrity = {};
for (const file of ['css/core.css', 'css/all.css', 'css/svg.css', 'manifest.json', 'catalog.json']) {
  const buffer = await fs.readFile(path.join(output, file));
  integrity[file] = { bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), sri: 'sha384-'+createHash('sha384').update(buffer).digest('base64') };
}
await fs.writeFile(path.join(output, 'integrity.json'), JSON.stringify(integrity,null,2)+'\n');
await fs.copyFile(path.join(root, 'LICENSE'), path.join(output, 'LICENSE.txt'));
await fs.copyFile(path.join(root, 'ASSET-NOTICE.md'), path.join(output, 'ASSET-NOTICE.md'));
await fs.writeFile(path.join(output, 'metrics.json'), JSON.stringify({ count: items.length,
  pngBytes: items.reduce((sum, item) => sum + item.bytes, 0), svgBytes, svgGzipBytes,
  note: 'SVG gzip is summed per file; vector does not imply smaller than PNG.' }, null, 2) + '\n');
console.log(JSON.stringify({ version: pkg.version, minecraft: source.minecraft, count: items.length, added: imported.size, covered }, null, 2));
