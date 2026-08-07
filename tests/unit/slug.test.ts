import { describe, expect, it } from 'vitest';

import { toSlug } from '../../src/lib/slug';

describe('toSlug', () => {
  it('lowercases and hyphenates a post filename', () => {
    expect(toSlug('How_To_Do_A_Thing')).toBe('how-to-do-a-thing');
  });

  it('removes apostrophes rather than turning them into separators', () => {
    expect(toSlug("Don't Overthink It")).toBe('dont-overthink-it');
    expect(toSlug('Don\u2019t Overthink It')).toBe('dont-overthink-it');
  });

  it('collapses runs of punctuation into a single hyphen', () => {
    expect(toSlug('Redis --- CLI, Encrypted!')).toBe('redis-cli-encrypted');
  });

  it('trims leading and trailing separators', () => {
    expect(toSlug('__A Post__')).toBe('a-post');
  });

  it('strips accents', () => {
    expect(toSlug('Café Déjà Vu')).toBe('cafe-deja-vu');
  });

  it('is idempotent, so canonical slugs are left untouched', () => {
    const slug = toSlug("Defining_Tests_Is_Simple_Don't_Overthink_It");
    expect(slug).toBe('defining-tests-is-simple-dont-overthink-it');
    expect(toSlug(slug)).toBe(slug);
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(toSlug('///')).toBe('');
  });
});
