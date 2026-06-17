import { describe, expect, it } from 'vitest';
import { normalizeHtml } from '../src/html/normalize-html.js';

describe('normalizeHtml', () => {
  it('injects an Outlook MsoNormal reset style', () => {
    const html = normalizeHtml('<html><head><title>Email</title></head><body>Hello</body></html>');

    expect(html).toContain('data-html-to-oft-outlook-reset');
    expect(html).toContain('p.MsoNormal,li.MsoNormal,div.MsoNormal{margin:0!important;padding:0!important;mso-margin-top-alt:0in;mso-margin-bottom-alt:0in;}');
    expect(html).toContain('p.MsoNormal a,p.MsoNormal span{font-size:0!important;line-height:0!important;}');
    expect(html).toContain('p.MsoNormal img,p img{display:block;border:0;margin:0;padding:0;}');
    expect(html.indexOf('data-html-to-oft-outlook-reset')).toBe(html.lastIndexOf('data-html-to-oft-outlook-reset'));
    expect(html).toMatch(/<\/style>\s*<!\[endif\]-->\s*<\/head>/);
  });

  it('hardens image-only table cells for Outlook classic spacing', () => {
    const html = normalizeHtml(`
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:0;line-height:0;">
            <img src="cid:hero" width="600" height="240" style="width:600px;height:240px;">
          </td>
        </tr>
      </table>
    `);

    expect(html).not.toMatch(/\sheight=/i);
    expect(html).not.toMatch(/(?:^|[;"\s])height\s*:/i);
    expect(html).toContain('width="600"');
    expect(html).toContain('valign="top"');
    expect(html).toContain('line-height:0');
    expect(html).toContain('mso-line-height-alt:0');
    expect(html).toContain('mso-line-height-rule:exactly');
    expect(html).toContain('display:block');
    expect(html).toContain('border="0"');
  });

  it('adds physical image width from inline pixel styles while removing height', () => {
    const html = normalizeHtml('<p><img src="cid:slice" style="width:320px;height:18px;"></p>');

    expect(html).toContain('width="320"');
    expect(html).not.toMatch(/\sheight=/i);
    expect(html).not.toMatch(/(?:^|[;"\s])height\s*:/i);
    expect(html).toContain('line-height:0');
    expect(html).toContain('mso-line-height-alt:0');
    expect(html).toContain('mso-line-height-rule:exactly');
  });

  it('hardens Outlook-generated anchor and span wrappers around image-only rows', () => {
    const html = normalizeHtml(`
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0in 0in 0in 0in">
            <p align="center" style="margin:0in;text-align:center">
              <span style="color:black">
                <a href="https://example.com/" target="_blank">
                  <span style="font-size:1.0pt;text-decoration:none">
                    <img border="0" width="865" height="439" style="width:9.0104in;height:4.5729in" src="cid:featured" alt="Featured image">
                  </span>
                </a>
              </span>
              <span style="font-size:1.0pt"><u></u><u></u></span>
            </p>
          </td>
        </tr>
      </table>
    `);

    expect(html).not.toMatch(/\sheight=/i);
    expect(html).not.toMatch(/(?:^|[;"\s])height\s*:/i);
    expect(html).toContain('width="865"');
    expect(html).toContain('line-height:0');
    expect(html).toContain('mso-line-height-alt:0');
    expect(html).toContain('mso-line-height-rule:exactly');
    expect(html).toContain('<a href="https://example.com/" target="_blank" style="display:block;font-size:0;line-height:0;margin:0;padding:0;text-decoration:none">');
    expect(html).toContain('<td style="padding:0in 0in 0in 0in;border:0;border-collapse:collapse;font-size:0;margin:0;line-height:0;mso-line-height-alt:0;mso-line-height-rule:exactly" valign="top" width="865"><p style="margin:0;padding:0;font-size:0;line-height:0;mso-line-height-alt:0;mso-line-height-rule:exactly"><a href="https://example.com/" target="_blank" style="display:block;font-size:0;line-height:0;margin:0;padding:0;text-decoration:none"><img');
    expect(html).not.toContain('<p align="center"');
    expect(html).not.toContain('<u></u>');
  });

  it('hardens nested image leaf cells without consuming parent table cells', () => {
    const html = normalizeHtml(`
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <table cellspacing="0" cellpadding="0" width="100%">
              <tr>
                <td style="font-size:0; line-height:0;">
                  <img src="cid:intro" width="600" style="display:block; width:100%; max-width:600px; height:auto;" alt="">
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `);

    expect(html).toContain('<table cellspacing="0" cellpadding="0" width="100%">');
    expect(html).toContain('<td style="font-size:0;line-height:0;border:0;border-collapse:collapse;margin:0;padding:0;mso-line-height-alt:0;mso-line-height-rule:exactly" valign="top" width="600"><p style="margin:0;padding:0;font-size:0;line-height:0;mso-line-height-alt:0;mso-line-height-rule:exactly"><img');
  });

  it('converts image-only table header cells to table cells for Outlook classic', () => {
    const html = normalizeHtml(`
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <th style="background-color:#fff;font-size:0px;font-weight:normal;line-height:0px;padding:0px;text-align:center;vertical-align:middle;">
            <a href="https://example.com" style="text-decoration:none;">
              <img src="cid:hero" width="865" height="439" style="width:865px;height:439px;max-width:100%;" alt="">
            </a>
          </th>
        </tr>
      </table>
    `);

    expect(html).toContain('<td style="background-color:#fff;font-size:0;font-weight:normal;line-height:0;padding:0px;text-align:center;vertical-align:middle;border:0;border-collapse:collapse;margin:0;mso-line-height-alt:0;mso-line-height-rule:exactly" valign="top" width="865"><p style="margin:0;padding:0;font-size:0;line-height:0;mso-line-height-alt:0;mso-line-height-rule:exactly"><a href="https://example.com" style="text-decoration:none;display:block;font-size:0;line-height:0;margin:0;padding:0"><img');
    expect(html).not.toMatch(/\sheight=/i);
    expect(html).not.toMatch(/(?:^|[;"\s])height\s*:/i);
    expect(html).not.toContain('<th');
    expect(html).toContain('border="0"');
  });
});
