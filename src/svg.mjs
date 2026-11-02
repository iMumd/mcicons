const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** Serialize an explicitly imported definition. No catalog or network. */
export function iconSvg(icon, { title, size = '1em', className = '' } = {}) {
  if (!icon || !Array.isArray(icon.paths) || !Number.isFinite(icon.width) || !Number.isFinite(icon.height)) throw new TypeError('Expected an MCicons definition');
  const paths = icon.paths.map(({ fill, d, opacity }) => `<path fill="${escape(fill)}" d="${escape(d)}"${opacity === undefined ? '' : ` fill-opacity="${escape(opacity)}"`}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width} ${icon.height}" width="${escape(size)}" height="${escape(size)}" shape-rendering="crispEdges" focusable="false"${className ? ` class="${escape(className)}"` : ''}${title ? ` role="img" aria-label="${escape(title)}"` : ' aria-hidden="true"'}>${title ? `<title>${escape(title)}</title>` : ''}${paths}</svg>`;
}

/** Explicit one-shot mounting; only supplied definitions are available. */
export function mountIcons(icons, root = globalThis.document) {
  if (!root?.querySelectorAll) throw new TypeError('Expected a DOM root');
  const available = new Map(icons.map(icon => [icon.name, icon]));
  let count = 0;
  for (const element of root.querySelectorAll('.mc')) {
    if (element.namespaceURI === 'http://www.w3.org/2000/svg') continue;
    const name = [...element.classList].find(value => value.startsWith('mc-') && available.has(value.slice(3)))?.slice(3);
    if (!name) continue;
    const template = element.ownerDocument.createElement('template');
    template.innerHTML = iconSvg(available.get(name), { title: element.getAttribute('aria-label') || undefined, className: element.className });
    const svg = template.content.firstElementChild;
    for (const attribute of element.attributes) {
      if (/^(id|style|title|tabindex|role|aria-[\w-]+|data-[\w-]+)$/.test(attribute.name)) svg.setAttribute(attribute.name, attribute.value);
    }
    if (svg.getAttribute('role') === 'img' || svg.hasAttribute('aria-label')) svg.removeAttribute('aria-hidden');
    element.replaceWith(svg);
    count++;
  }
  return count;
}
