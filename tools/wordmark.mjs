import fs from 'node:fs/promises';
const glyphs = {
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  N: ['10001','11001','11001','10101','10011','10011','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110']
};
let drawing = '';
[...'MCICONS'].forEach((letter,index) => glyphs[letter].forEach((row,y) => [...row].forEach((cell,x) => {
  if(cell==='1') drawing += `M${index*48+x*8+4},${y*8+4}h8v8h-8z`;
})));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 344 72" role="img" aria-labelledby="title"><title id="title">MCicons</title><path d="${drawing}" transform="translate(3 7)" fill="#203c2c"/><path d="${drawing}" fill="#94b969"/></svg>\n`;
await fs.writeFile(new URL('../docs/wordmark.svg',import.meta.url),svg);
