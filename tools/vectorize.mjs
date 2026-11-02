import { PNG } from 'pngjs';

// Lossless pixel geometry, not smoothing/tracing and not an embedded PNG.
export function vectorize(buffer, name) {
  const { width, height, data } = PNG.sync.read(buffer);
  const rectangles = [];
  let previous = new Map();
  for (let y = 0; y < height; y++) {
    const current = new Map();
    for (let x = 0; x < width;) {
      const start = x;
      const rgba = data.readUInt32BE((y * width + x) * 4);
      do { x++; } while (x < width && data.readUInt32BE((y * width + x) * 4) === rgba);
      if (!(rgba & 255)) continue;
      const key = `${start}:${x - start}:${rgba}`;
      const rectangle = previous.get(key);
      if (rectangle) rectangle.height++;
      else rectangles.push({ x: start, y, width: x - start, height: 1, rgba });
      current.set(key, rectangle || rectangles.at(-1));
    }
    previous = current;
  }
  const colors = new Map();
  for (const { x, y, width: w, height: h, rgba } of rectangles) {
    const paths = colors.get(rgba) || [];
    paths.push(`M${x} ${y}h${w}v${h}h-${w}z`);
    colors.set(rgba, paths);
  }
  return { name, width, height, paths: [...colors].map(([rgba, paths]) => ({
    fill: '#' + (rgba >>> 8).toString(16).padStart(6, '0'), d: paths.join(''),
    ...((rgba & 255) === 255 ? {} : { opacity: (rgba & 255) / 255 }),
  })) };
}

export function vectorSvg(icon) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width} ${icon.height}" shape-rendering="crispEdges">${icon.paths.map(({ fill, d, opacity }) => `<path fill="${fill}"${opacity === undefined ? '' : ` fill-opacity="${opacity}"`} d="${d}"/>`).join('')}</svg>`;
}
