export function normalizeHtml(html: string): string {
  const document = /<html[\s>]/i.test(html)
    ? html
    : `<!doctype html>
<html>
  <body>${html}</body>
</html>`;

  return hardenOutlookImageSpacing(injectOutlookResetStyle(document));
}

const OUTLOOK_RESET_STYLE = `<!--[if mso]>
<style data-html-to-oft-outlook-reset type="text/css">
table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
img{display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
p.MsoNormal,li.MsoNormal,div.MsoNormal{margin:0!important;padding:0!important;mso-margin-top-alt:0in;mso-margin-bottom-alt:0in;}
p.MsoNormal a,p.MsoNormal span{font-size:0!important;line-height:0!important;}
p.MsoNormal img,p img{display:block;border:0;margin:0;padding:0;}
</style>
<![endif]-->`;

function injectOutlookResetStyle(html: string): string {
  if (html.includes('data-html-to-oft-outlook-reset')) return html;

  if (/<\/head\s*>/i.test(html)) {
    return html.replace(/<\/head\s*>/i, `${OUTLOOK_RESET_STYLE}\n</head>`);
  }

  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (tag) => `${tag}\n<head>\n${OUTLOOK_RESET_STYLE}\n</head>`);
  }

  return `${OUTLOOK_RESET_STYLE}\n${html}`;
}

function hardenOutlookImageSpacing(html: string): string {
  const withImageStyles = html.replace(/<img\b[^>]*>/gi, (tag) => hardenImageTag(tag));

  return hardenImageOnlyContainers(
    hardenImageOnlyContainers(
      hardenImageOnlyContainers(withImageStyles, 'p'),
      'td',
    ),
    'th',
  );
}

type ImageContainerTag = 'td' | 'th' | 'p';

function hardenImageOnlyContainers(html: string, tagName: ImageContainerTag): string {
  return html.replace(new RegExp(`<${tagName}\\b[^>]*>(?:(?!<${tagName}\\b|<\\/${tagName}>)[\\s\\S])*<\\/${tagName}>`, 'gi'), (container) => {
    if (!isImageOnlyContainer(container, tagName)) return container;
    return hardenImageOnlyContainer(container, tagName);
  });
}

function hardenImageTag(tag: string): string {
  const style = readAttribute(tag, 'style');
  const width = readAttribute(tag, 'width') ?? readPixelStyle(style, 'width');

  let next = upsertStyle(tag, {
    border: '0',
    display: 'block',
    'font-size': '0',
    'line-height': '0',
    margin: '0',
    outline: 'none',
    padding: '0',
    'text-decoration': 'none',
    '-ms-interpolation-mode': 'bicubic',
  }, ['display', 'font-size', 'line-height']);

  next = upsertAttribute(next, 'border', '0');
  if (width) next = upsertAttribute(next, 'width', width);
  next = removeAttribute(next, 'height');
  return removeStyleProperties(next, ['height']);
}

function hardenImageOnlyContainer(container: string, tagName: ImageContainerTag): string {
  const image = container.match(/<img\b[^>]*>/i)?.[0];
  if (!image) return container;

  const width = readAttribute(image, 'width') ?? readPixelStyle(readAttribute(image, 'style'), 'width');
  const openTagMatch = container.match(new RegExp(`<${tagName}\\b[^>]*>`, 'i'));
  const openTag = openTagMatch?.[0];
  if (!openTag) return container;

  const styles: Record<string, string> = {
    border: '0',
    'border-collapse': 'collapse',
    'font-size': '0',
    margin: '0',
    padding: '0',
  };
  const overrideProperties = ['font-size'];

  styles['line-height'] = '0';
  styles['mso-line-height-alt'] = '0';
  styles['mso-line-height-rule'] = 'exactly';
  overrideProperties.push('line-height', 'mso-line-height-alt', 'mso-line-height-rule');

  let nextOpenTag = upsertStyle(openTag, styles, overrideProperties);
  nextOpenTag = removeAttribute(nextOpenTag, 'height');
  nextOpenTag = removeStyleProperties(nextOpenTag, ['height']);
  if (tagName === 'td' || tagName === 'th') {
    nextOpenTag = upsertAttribute(nextOpenTag, 'valign', 'top');
    if (width) nextOpenTag = upsertAttribute(nextOpenTag, 'width', width);
  }

  if (tagName === 'td' || tagName === 'th') {
    const outputTagName = tagName === 'th' ? 'td' : tagName;
    const outputOpenTag = tagName === 'th' ? renameOpeningTag(nextOpenTag, outputTagName) : nextOpenTag;

    return `${outputOpenTag}${wrapImageOnlyCellContent(canonicalImageOnlyContent(container, image))}</${outputTagName}>`;
  }

  const nextContainer = container.replace(openTag, nextOpenTag);
  return hardenImageInlineWrappers(nextContainer);
}

function isImageOnlyContainer(container: string, tagName: ImageContainerTag): boolean {
  if (!/<img\b/i.test(container)) return false;

  const inner = container
    .replace(new RegExp(`^<${tagName}\\b[^>]*>`, 'i'), '')
    .replace(new RegExp(`<\\/${tagName}>$`, 'i'), '');
  const residue = inner
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<\/?(?:a|span|u|b|i|strong|em|p|div|center|font|o:p)\b[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;|&#160;|\u00a0/gi, '')
    .replace(/\s+/g, '');

  return residue.length === 0;
}

function hardenImageInlineWrappers(container: string): string {
  return container.replace(/<(a|span)\b[^>]*>/gi, (tag) => upsertStyle(tag, {
    display: 'block',
    'font-size': '0',
    'line-height': '0',
    margin: '0',
    padding: '0',
    'text-decoration': 'none',
  }, ['display', 'font-size', 'line-height']));
}

function canonicalImageOnlyContent(container: string, image: string): string {
  const anchor = container.match(/<a\b[^>]*>/i)?.[0];
  if (!anchor) return image;

  const hardenedAnchor = upsertStyle(anchor, {
    display: 'block',
    'font-size': '0',
    'line-height': '0',
    margin: '0',
    padding: '0',
    'text-decoration': 'none',
  }, ['display', 'font-size', 'line-height']);

  return `${hardenedAnchor}${image}</a>`;
}

function wrapImageOnlyCellContent(content: string): string {
  return `<p style="margin:0;padding:0;font-size:0;line-height:0;mso-line-height-alt:0;mso-line-height-rule:exactly">${content}</p>`;
}

function renameOpeningTag(tag: string, nextTagName: string): string {
  return tag.replace(/^<\s*[a-z0-9:-]+/i, `<${nextTagName}`);
}

function readAttribute(tag: string, name: string): string | null {
  const escapedName = escapeRegExp(name);
  const match = tag.match(new RegExp(`\\s${escapedName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function readPixelStyle(style: string | null, property: string): string | null {
  if (!style) return null;

  const escapedProperty = escapeRegExp(property);
  const match = style.match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*(\\d+(?:\\.\\d+)?)px\\s*(?:;|$)`, 'i'));
  return match?.[1] ?? null;
}

function upsertAttribute(tag: string, name: string, value: string): string {
  if (readAttribute(tag, name) !== null) {
    return tag.replace(
      new RegExp(`(\\s${escapeRegExp(name)}\\s*=\\s*)("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
      `$1"${value}"`,
    );
  }

  return tag.replace(/\/?>$/, (end) => ` ${name}="${value}"${end}`);
}

function removeAttribute(tag: string, name: string): string {
  return tag.replace(new RegExp(`\\s${escapeRegExp(name)}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'), '');
}

function upsertStyle(tag: string, properties: Record<string, string>, overrideProperties: string[] = []): string {
  const currentStyle = readAttribute(tag, 'style') ?? '';
  const mergedStyle = mergeStyle(currentStyle, properties, new Set(overrideProperties));

  return upsertAttribute(tag, 'style', mergedStyle);
}

function removeStyleProperties(tag: string, properties: string[]): string {
  const currentStyle = readAttribute(tag, 'style');
  if (currentStyle === null) return tag;

  const blocked = new Set(properties.map((property) => property.toLowerCase()));
  const nextStyle = currentStyle
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator === -1) return true;
      return !blocked.has(declaration.slice(0, separator).trim().toLowerCase());
    })
    .join(';');

  return nextStyle ? upsertAttribute(tag, 'style', nextStyle) : removeAttribute(tag, 'style');
}

function mergeStyle(style: string, properties: Record<string, string>, overrideProperties: Set<string>): string {
  const declarations = style
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const next: string[] = [];

  declarations.forEach((declaration) => {
    const separator = declaration.indexOf(':');
    if (separator === -1) {
      next.push(declaration);
      return;
    }

    const property = declaration.slice(0, separator).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(properties, property) && overrideProperties.has(property)) {
      next.push(`${property}:${properties[property]}`);
    } else {
      next.push(declaration);
    }
    seen.add(property);
  });

  Object.entries(properties).forEach(([property, value]) => {
    if (!seen.has(property.toLowerCase())) {
      next.push(`${property}:${value}`);
    }
  });

  return next.join(';');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
