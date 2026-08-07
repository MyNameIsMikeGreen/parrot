/**
 * Converts an arbitrary string into a URL-safe, lowercase slug.
 *
 * Applying this to a URL parameter as well as to a post's filename lets the site
 * resolve legacy URLs (which used the raw underscored filename) and canonical
 * URLs through exactly the same code path.
 */
export function toSlug(value: string): string {
  return (
    value
      .normalize('NFKD')
      // Drop combining marks left behind by the decomposition above.
      .replace(/[\u0300-\u036f]/g, '')
      // Apostrophes join words rather than separate them: "Don't" -> "dont".
      .replace(/['\u2018\u2019]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}
