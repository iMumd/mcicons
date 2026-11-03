import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { Resvg } from '@resvg/resvg-js';
import { parseHTML } from 'linkedom';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { build } from 'esbuild';
import { Icon } from '../src/react.mjs';
import { iconSvg, mountIcons } from '../src/svg.mjs';
import sword from '../dist/definitions/diamond-sword.mjs';
import { vectorize, vectorSvg } from '../tools/vectorize.mjs';

const manifest = JSON.parse(await fs.readFile(new URL('../dist/manifest.json', import.meta.url)));
test('all 1,659 SVG definitions preserve every nontransparent source pixel exactly', async () => {
  for (const item of manifest.items) {
    const bytes = await fs.readFile(new URL('../dist/icons/' + item.file, import.meta.url));
    const png = PNG.sync.read(bytes);
    const icon = (await import('../dist/definitions/' + item.name + '.mjs')).default;
    const raster = Buffer.alloc(64 * 64 * 4);
    for (const { fill, d, opacity = 1 } of icon.paths) {
      const rgb = parseInt(fill.slice(1), 16);
      for (const match of d.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z/g)) {
        const [, x, y, w, h, back] = match.map(Number);
        assert.equal(w, back);
        assert.ok(x + w <= 64 && y + h <= 64);
        for (let dy = y; dy < y + h; dy++) for (let dx = x; dx < x + w; dx++) {
          const offset = (dy * 64 + dx) * 4;
          assert.equal(raster[offset + 3], 0, item.name + ' overlapping geometry');
          raster[offset] = rgb >>> 16; raster[offset + 1] = (rgb >>> 8) & 255;
          raster[offset + 2] = rgb & 255; raster[offset + 3] = Math.round(opacity * 255);
        }
      }
    }
    for (let i = 0; i < png.data.length; i += 4) {
      assert.equal(raster[i + 3], png.data[i + 3], item.name + ' alpha');
      if (png.data[i + 3]) assert.deepEqual(raster.subarray(i, i + 3), png.data.subarray(i, i + 3), item.name);
    }
    const svg = await fs.readFile(new URL('../dist/svg/' + item.svg, import.meta.url), 'utf8');
    assert.equal(svg, vectorSvg(vectorize(bytes, item.name)));
    assert.equal(createHash('sha256').update(svg).digest('hex'), item.svgSha256);
    assert.doesNotMatch(svg, /<image|<script|foreignObject|href=|data:/);
  }
});
test('SVG rasterization matches PNG on light and dark backgrounds', async () => {
  for (const name of ['diamond-sword', 'copper-golem-statue', 'glass', 'air', 'oak-sapling', 'ender-pearl']) {
    const item = manifest.items.find(item => item.name === name);
    const original = PNG.sync.read(await fs.readFile(new URL('../dist/icons/' + item.file, import.meta.url)));
    const svg = await fs.readFile(new URL('../dist/svg/' + item.svg, import.meta.url));
    const rendered = PNG.sync.read(new Resvg(svg, { fitTo: { mode: 'width', value: 64 } }).render().asPng());
    for (const background of [20, 245]) for (let i = 0; i < original.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const a = original.data[i+3] / 255, b = rendered.data[i+3] / 255;
        assert.ok(Math.abs(original.data[i+c] * a + background * (1-a) - rendered.data[i+c] * b - background * (1-b)) <= 2, name);
      }
    }
  }
});
test('SVG output escapes caller text; React renders accessible server-side SVG', () => {
  const svg = iconSvg(sword, { title: '"><script>alert(1)</script>', className: '" onload="bad' });
  assert.doesNotMatch(svg, /<script|class="" onload/);
  assert.match(svg, /role="img"/);
  assert.match(iconSvg(sword), /aria-hidden="true"/);
  const html = renderToStaticMarkup(createElement(Icon, { icon: sword, title: 'Sword & shield', size: 32 }));
  assert.match(html, /width="32"/); assert.match(html, /Sword &amp; shield/);
  assert.doesNotMatch(html, /<img|https:\/\/mcicons/);
});
test('explicit class mounting preserves attributes and ignores unknown icons without fetching', () => {
  const { document } = parseHTML('<html><body><i id="sword" class="mc mc-diamond-sword mc-xl" role="img" aria-label="Sword" data-key="one"></i><i class="mc mc-unknown"></i></body></html>');
  assert.equal(mountIcons([sword], document), 1);
  assert.equal(document.querySelector('#sword').localName, 'svg');
  assert.equal(document.querySelector('#sword').getAttribute('data-key'), 'one');
  assert.equal(document.querySelector('#sword').hasAttribute('aria-hidden'), false);
  assert.equal(mountIcons([sword], document), 0);
  assert.equal(document.querySelector('i').className, 'mc mc-unknown');
});
test('embedded SVG subsets are one relocatable stylesheet with no external asset requests', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mcicons-svg-'));
  const run = (...args) => spawnSync(process.execPath, ['bin/mcicons.mjs', ...args], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  try {
    const output = path.join(temporary, 'kit');
    assert.equal(run('subset', '--icons', 'diamond-sword,emerald', '--out', output, '--format', 'svg', '--embed').status, 0);
    const css = await fs.readFile(path.join(output, 'mcicons.css'), 'utf8');
    assert.equal((css.match(/data:image\/svg\+xml,/g) || []).length, 2);
    assert.doesNotMatch(css, /https?:|url\('icons\//);
    assert.ok(gzipSync(css).length < 6000);
    assert.equal((await fs.readdir(output)).includes('icons'), false);
    assert.notEqual(run('subset', '--icons', 'diamond', '--out', output).status, 0);
    for (const options of [['--embed'], ['--format', 'bad'], ['--unknown', 'x']])
      assert.notEqual(run('subset', '--icons', 'diamond', '--out', path.join(temporary, 'bad'), ...options).status, 0);
    const vector = path.join(temporary, 'vector');
    assert.equal(run('subset', '--icons', 'diamond', '--out', vector, '--format', 'svg').status, 0);
    assert.deepEqual(await fs.readdir(path.join(vector, 'icons')), ['minecraft_diamond.svg']);
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});
test('single-definition bundles exclude the catalog and stay inside an explicit budget', async () => {
  const result = await build({ stdin: { contents: 'import sword from "@imumd/mcicons/definitions/diamond-sword"; import {iconSvg} from "@imumd/mcicons/svg"; console.log(iconSvg(sword));', resolveDir: process.cwd() }, bundle: true, write: false, minify: true, metafile: true, format: 'esm' });
  assert.ok(gzipSync(result.outputFiles[0].contents).length < 6000);
  const inputs = Object.keys(result.metafile.inputs);
  assert.equal(inputs.filter(name => name.includes('definitions/')).length, 1);
  assert.ok(!inputs.some(name => /manifest|catalog|react/.test(name)));
  assert.ok((await fs.stat(new URL('../src/svg.mjs', import.meta.url))).size < 4000);
  const catalog = await fs.readFile(new URL('../dist/catalog.json', import.meta.url));
  assert.ok(gzipSync(catalog).length < 60000);
  assert.ok(JSON.parse(catalog).items.every(item => !('sha256' in item) && !('svgSha256' in item)));
});
