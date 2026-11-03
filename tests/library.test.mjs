import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { iconUrl, iconClass, version } from '../src/index.mjs';

const manifest = JSON.parse(await fs.readFile(new URL('../dist/manifest.json', import.meta.url)));
const source = JSON.parse(await fs.readFile(new URL('../data/minecraft-source.json', import.meta.url)));
test('manifest covers every verified current item plus the compatibility asset', () => {
  assert.equal(manifest.count, manifest.items.length);
  assert.equal(manifest.coverage.current, source.officialItems.length);
  assert.equal(manifest.coverage.official, 1658);
  assert.equal(manifest.added, 263); assert.equal(source.unavailable.length, 0);
  assert.equal(manifest.count, 1659); assert.equal(new Set(manifest.items.map(item => item.name)).size, manifest.count);
  assert.equal(version, manifest.version);
});
test('PNG files are 64px and exactly match the manifest and new-asset provenance', async () => {
  for (const item of manifest.items) {
    const bytes = await fs.readFile(new URL('../dist/icons/'+item.file, import.meta.url));
    assert.equal(bytes.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 64); assert.equal(bytes.readUInt32BE(20), 64);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    const provenance = source.added.find(entry => entry.id.replaceAll('_','-') === item.name);
    if (provenance) assert.equal(provenance.sha256, item.sha256);
  }
});
test('all stylesheets use relocatable existing PNG files and preserve legacy classes', async () => {
  const all = await fs.readFile(new URL('../dist/css/all.css', import.meta.url), 'utf8');
  const legacy = await fs.readFile(new URL('../resources/css/mcicons.css', import.meta.url), 'utf8');
  for (const item of manifest.items) {
    assert.ok(all.includes(`.mc-${item.name}{`)); assert.ok(legacy.includes(`url('icons/${item.file}')`));
    const single = await fs.readFile(new URL('../dist/css/icons/'+item.name+'.css', import.meta.url),'utf8');
    assert.ok(single.includes(`../../icons/${item.file}`));
    assert.ok(single.includes('background-image:var(--mc-icon)'));
  }
  assert.equal(/url\(['"]?\//.test(all), false); assert.equal(/@font-face|data:image/.test(all), false);
});
test('core, full CSS and JavaScript stay inside explicit compressed-size budgets', async () => {
  assert.ok(gzipSync(await fs.readFile(new URL('../dist/css/core.css',import.meta.url))).length < 700);
  assert.ok(gzipSync(await fs.readFile(new URL('../dist/css/all.css',import.meta.url))).length < 20000);
  assert.ok((await fs.readFile(new URL('../src/index.mjs',import.meta.url))).length < 1500);
  assert.ok(manifest.items.reduce((total,item)=>total+item.bytes,0) < 4*1024*1024);
});
test('browser helpers reject path injection and keep runtime independent of the full catalog', () => {
  assert.equal(iconClass('copper-sword','xl'),'mc mc-copper-sword mc-xl');
  assert.equal(iconUrl('diamond-sword','./icons'),'./icons/minecraft_diamond_sword.png');
  for (const name of ['../secret','x/y','x.png','x" onclick="bad','']) assert.throws(()=>iconUrl(name));
  assert.throws(()=>iconUrl('diamond','javascript:bad')); assert.throws(()=>iconClass('diamond','huge'));
});
test('subset includes only selected assets, preserves notices and refuses existing output', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(),'mcicons-test-')); const output=path.join(temporary,'kit');
  try {
    const run=(...args)=>spawnSync(process.execPath,['bin/mcicons.mjs',...args],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
    assert.equal(run('subset','--icons','diamond,copper-sword','--out',output).status,0);
    assert.equal((await fs.readdir(path.join(output,'icons'))).length,2);
    assert.match(await fs.readFile(path.join(output,'ASSET-NOTICE.md'),'utf8'),/Mojang/);
    assert.notEqual(run('subset','--icons','diamond','--out',output).status,0);
    assert.notEqual(run('subset','--icons','../secret','--out',path.join(temporary,'bad')).status,0);
    assert.equal(run('--help').status,0);
  } finally { await fs.rm(temporary,{recursive:true,force:true}); }
});
test('published integrity data matches generated CSS and catalogs', async () => {
  const entries=JSON.parse(await fs.readFile(new URL('../dist/integrity.json',import.meta.url)));
  for (const [file,expected] of Object.entries(entries)) {
    const bytes=await fs.readFile(new URL('../dist/'+file,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256);
    assert.equal('sha384-'+createHash('sha384').update(bytes).digest('base64'),expected.sri);
  }
});
