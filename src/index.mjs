export const version = '2.0.0';
export const defaultBase = `https://mcicons.mumd.dev/releases/v${version}/icons/`;

export function iconUrl(name, base = defaultBase) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) throw new TypeError('Expected a canonical icon name, e.g. diamond-sword');
  const url = new URL(base, 'https://mcicons.mumd.dev/');
  if (!['http:', 'https:'].includes(url.protocol) || /[?#\s]/.test(base)) throw new TypeError('Expected an HTTP(S) or relative asset directory');
  return base.replace(/\/$/, '') + '/minecraft_' + name.replaceAll('-', '_') + '.png';
}

export function iconClass(name, size = 'md') {
  iconUrl(name);
  if (!['sm', 'md', 'xl', '2xl', '3xl', '4xl', '5xl'].includes(size)) throw new TypeError('Unsupported icon size');
  return `mc mc-${name}` + (size === 'md' ? '' : ` mc-${size}`);
}
