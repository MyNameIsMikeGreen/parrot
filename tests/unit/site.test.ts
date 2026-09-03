import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  linkSections,
  linksInSection,
  outboundLinks,
  vpnHostname,
} from '../../src/lib/site';

describe('outboundLinks', () => {
  it('gives every link a name, description and destination', () => {
    for (const link of outboundLinks) {
      expect(link.name).not.toBe('');
      expect(link.description).not.toBe('');
      expect(() => new URL(link.href)).not.toThrow();
    }
  });

  it('ships every icon it references', () => {
    const icons = fileURLToPath(new URL('../../src/assets/icons/', import.meta.url));

    for (const link of outboundLinks) {
      expect(link.icon, `${link.name} has no icon`).toBeTruthy();
      expect(existsSync(join(icons, link.icon)), `${link.name} icon is missing`).toBe(
        true,
      );
    }
  });

  it('flags every private-network service, and only those', () => {
    const isPrivateHost = (href: string) => new URL(href).hostname === 'pi';

    for (const link of outboundLinks) {
      expect(link.privateNetworkOnly ?? false, `${link.name} is mislabelled`).toBe(
        isPrivateHost(link.href),
      );
    }
  });

  it('uses no duplicate destinations', () => {
    const destinations = outboundLinks.map((link) => link.href);

    expect(new Set(destinations).size).toBe(destinations.length);
  });
});

describe('vpnHostname', () => {
  it('is a different, resolvable-looking hostname from the default', () => {
    expect(vpnHostname).not.toBe('');
    expect(vpnHostname).not.toBe('pi');
    expect(() => new URL(`http://${vpnHostname}`)).not.toThrow();
  });
});

describe('linkSections', () => {
  it('places every link in exactly one section', () => {
    const placed = linkSections.flatMap((section) => linksInSection(section));

    expect(placed).toHaveLength(outboundLinks.length);
    expect(new Set(placed).size).toBe(outboundLinks.length);
  });

  it('keeps private services out of the public section', () => {
    for (const section of linkSections) {
      for (const link of linksInSection(section)) {
        expect(
          link.privateNetworkOnly ?? false,
          `${link.name} is in the wrong section`,
        ).toBe(section.privateNetworkOnly);
      }
    }
  });

  it('preserves the order links were declared in', () => {
    for (const section of linkSections) {
      const positions = linksInSection(section).map((link) =>
        outboundLinks.indexOf(link),
      );

      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it('gives every section a unique id, heading and description', () => {
    const ids = linkSections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const section of linkSections) {
      expect(section.heading).not.toBe('');
      expect(section.description).not.toBe('');
    }
  });
});

describe('icons', () => {
  const iconsDir = fileURLToPath(new URL('../../src/assets/icons/', import.meta.url));
  const iconFiles = readdirSync(iconsDir).filter((file) => file.endsWith('.svg'));
  const read = (file: string) => readFileSync(join(iconsDir, file), 'utf8');

  // Every file is checked so that none of them quietly rots.
  it('draws every icon in the current text colour', () => {
    expect(iconFiles.length, 'no icons were found to check').toBeGreaterThan(0);

    for (const file of iconFiles) {
      expect(read(file), `${file} will not follow the theme`).toContain('currentColor');
      expect(read(file), `${file} has a hard-coded colour`).not.toMatch(
        /#[0-9a-f]{3,8}\b/i,
      );
    }
  });

  it('draws every icon as line art on the shared canvas', () => {
    for (const file of iconFiles) {
      expect(read(file), `${file} is not on the shared canvas`).toContain(
        'viewBox="0 0 48 48"',
      );
      expect(read(file), `${file} is not line art`).toContain('stroke="currentColor"');
    }
  });

  it('keeps no icon that no link uses', () => {
    const used = new Set(outboundLinks.map((link) => link.icon));

    for (const file of iconFiles) {
      expect(used.has(file), `${file} is unused and should be deleted`).toBe(true);
    }
  });
});
