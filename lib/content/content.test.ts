import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { allDocs, KIND_BASE, pathOf } from './registry';

const STATIC_ROUTES = new Set(['/', '/#audit', '/sprint', '/methodology', '/about', '/resources', '/llms.txt', ...Object.values(KIND_BASE)]);
const docs = allDocs();
const docPaths = new Set(docs.map(pathOf));

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('resources content', () => {
  test('every page has a unique path', () => {
    assert.equal(docPaths.size, docs.length);
  });

  test('related links and inline internal links all resolve', () => {
    const broken: string[] = [];
    for (const d of docs) {
      const inline = strings(d).flatMap((s) => [...s.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1] ?? ''));
      for (const href of [...(d.related ?? []), ...inline]) {
        if (!docPaths.has(href) && !STATIC_ROUTES.has(href)) broken.push(`${pathOf(d)} -> ${href}`);
      }
    }
    assert.deepEqual(broken, []);
  });

  test('copy follows the brand rules (no em dashes, no guarantees)', () => {
    for (const d of docs) {
      for (const s of strings(d)) {
        assert.ok(!s.includes('—'), `em dash in ${pathOf(d)}: ${s.slice(0, 60)}`);
        assert.ok(!/\bwe guarantee\b/i.test(s), `guarantee claim in ${pathOf(d)}`);
      }
    }
  });

  test('every page answers up front and has a usable meta description', () => {
    for (const d of docs) {
      assert.ok(d.answer.split(/\s+/).length >= 25, `answer capsule too short on ${pathOf(d)}`);
      assert.ok(d.description.length <= 160, `description too long on ${pathOf(d)}`);
      assert.ok(d.sections.length >= 1, `no sections on ${pathOf(d)}`);
    }
  });
});
