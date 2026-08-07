/**
 * Site-wide content and configuration.
 *
 * Everything a maintainer is likely to want to change without touching markup
 * lives here: the owner's name, the outbound links shown on the landing page,
 * and the site's identity.
 */

export interface OutboundLink {
  /** Short label, e.g. "GitHub". */
  readonly name: string;
  /** One-line description of what the visitor will find there. */
  readonly description: string;
  readonly href: string;
  /**
   * Filename of an icon in `src/assets/icons`. Icons are inlined and drawn in
   * the current text colour, so they follow the light and dark themes. Every
   * link needs one; see `docs/content.md` for how to draw it.
   */
  readonly icon: string;
  /**
   * Marks a profile of the site's owner elsewhere on the web. Those links carry
   * `rel="me"`, and their addresses are published as schema.org `sameAs`, both
   * of which say "this is the same person". Do not set it on a link that merely
   * happens to be public.
   */
  readonly profile?: boolean;
  /** Set for services that are only reachable from the private network. */
  readonly privateNetworkOnly?: boolean;
}

/**
 * A group of links on the landing page.
 *
 * Sections exist to separate what a visitor can actually open from what only
 * responds on the home network, so nobody is left clicking a link that was
 * never going to work for them.
 */
export interface LinkSection {
  /** Used to tie the section to its heading for screen readers. */
  readonly id: string;
  readonly heading: string;
  readonly description: string;
  /** Which links belong here, matched against `OutboundLink.privateNetworkOnly`. */
  readonly privateNetworkOnly: boolean;
}

export const site = {
  name: 'Mike Green',
  role: 'Software Engineer',
  description:
    'Mike Green, a software engineer based in the UK. Where to find me online, and an occasional blog about software.',
  /** Year the site first went live, used by the footer copyright range. */
  foundedYear: 2020,
  sourceRepositoryUrl: 'https://github.com/MyNameIsMikeGreen/parrot',
} as const;

export const navigation = [
  { label: 'Links', href: '/' },
  { label: 'Blog', href: '/blog' },
] as const;

export const outboundLinks: readonly OutboundLink[] = [
  {
    name: 'GitHub',
    description: 'Software projects',
    href: 'https://github.com/MyNameIsMikeGreen',
    icon: 'github.svg',
    profile: true,
  },
  {
    name: 'LinkedIn',
    description: 'Networking',
    href: 'https://uk.linkedin.com/in/MyNameIsMikeGreen',
    icon: 'linkedin.svg',
    profile: true,
  },
  {
    name: 'Platypus',
    description: 'Recipes',
    href: 'http://pi:8001',
    icon: 'platypus.svg',
    privateNetworkOnly: true,
  },
  {
    name: 'Home Assistant',
    description: 'Home automation',
    href: 'http://pi:8123',
    icon: 'home-assistant.svg',
    privateNetworkOnly: true,
  },
  {
    name: 'Zigbee2MQTT',
    description: 'Zigbee devices',
    href: 'http://pi:8080',
    icon: 'zigbee2mqtt.svg',
    privateNetworkOnly: true,
  },
];

export const linkSections: readonly LinkSection[] = [
  {
    id: 'public',
    heading: 'Around the web',
    description: 'Public profiles, open to anyone.',
    privateNetworkOnly: false,
  },
  {
    id: 'home-network',
    heading: 'On my home network',
    description:
      'Things I self-host. These only answer from inside my home network, so they will not open for you.',
    privateNetworkOnly: true,
  },
];

/** The links belonging to a section, in the order they appear in `outboundLinks`. */
export function linksInSection(section: LinkSection): readonly OutboundLink[] {
  return outboundLinks.filter(
    (link) => (link.privateNetworkOnly ?? false) === section.privateNetworkOnly,
  );
}
