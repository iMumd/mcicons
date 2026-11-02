import { createElement } from 'react';

/** An explicit definition keeps imports tree-shakeable and SSR-safe. */
export function Icon({ icon, title, size = '1em', ...props }) {
  return createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${icon.width} ${icon.height}`,
    width: size, height: size, shapeRendering: 'crispEdges', focusable: false,
    ...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true }), ...props,
  }, title ? createElement('title', null, title) : null,
  ...icon.paths.map(({ fill, d, opacity }, key) => createElement('path', { key, fill, d, fillOpacity: opacity })));
}
