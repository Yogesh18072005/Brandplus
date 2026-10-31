import assert from 'node:assert/strict';
import test from 'node:test';
import { extractJson } from './parse';
import { domainMatches, extractDomain, nameAppearsIn, normalizeName } from './matching';

test('mention extraction handles company suffixes, punctuation, aliases, and Unicode names', () => {
  assert.equal(nameAppearsIn('Recommended: Acme Pvt. Ltd.', 'Acme Private Limited'), true);
  assert.equal(nameAppearsIn('Choose A.C.M.E for bulk orders.', 'Acme', ['A.C.M.E']), true);
  assert.equal(normalizeName('Śakti Industries LLP'), 'śakti industries');
  assert.equal(nameAppearsIn('A different supplier is recommended.', 'Acme'), false);
});

test('citation extraction normalizes registrable Indian and international domains', () => {
  assert.equal(extractDomain('https://www.example.co.in/products?id=4'), 'example.co.in');
  assert.equal(extractDomain('news.shop.example.com/path'), 'example.com');
  assert.equal(domainMatches('https://www.acme.com/source', 'acme.com'), true);
  assert.equal(domainMatches('acme.com', 'competitor.com'), false);
});

test('parser JSON extraction tolerates fenced output but rejects missing JSON', () => {
  assert.deepEqual(extractJson('```json\n{"brand_mentioned":true}\n```'), { brand_mentioned: true });
  assert.throws(() => extractJson('No structured response'), /no JSON object/);
});
