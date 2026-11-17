import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePublishedCommunityPost, COMMUNITY_IMAGE_LIMIT } from '../src/lib/community-published-schema.mjs';

const photo = (n = 1) => ({ id: `campus-${n}`, src: `/media/community/msu/spring-${n}.jpg`, width: 3200, height: 2400, caption: { zh: '校园里的春天', ru: 'Весна в кампусе' } });
const post = () => ({
  id: 'community-msu-spring', schoolId: 'msu', kind: 'note', topic: 'campus',
  title: { zh: '校园里的春天', ru: 'Весна в кампусе' },
  body: { zh: '春天的校园很适合散步，也可以记录沿路的风景。', ru: 'Весенний кампус подходит для прогулок и фотографий окружающего пейзажа.' },
  cover: null, demo: false, createdAt: '2026-11-17T10:00:00.000Z',
  author: { zh: 'StudentPath 编辑', ru: 'Редакция StudentPath' }, images: [photo()],
  sources: [{ label: { zh: '大学网站', ru: 'Сайт университета' }, url: 'https://www.msu.ru/' }],
});

test('published parser accepts independent translations, complete photo credits and 24 originals', () => {
  const input = post();
  input.images = Array.from({ length: COMMUNITY_IMAGE_LIMIT }, (_, n) => photo(n + 1));
  input.images[0].credit = { name: 'Photo author', url: 'https://commons.wikimedia.org/wiki/File:Example.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
  const output = parsePublishedCommunityPost(input);
  assert.deepEqual(output, input);
  input.images[0].caption.zh = '外部改动';
  input.images[0].credit.name = 'Changed';
  assert.equal(output.images[0].caption.zh, '校园里的春天');
  assert.equal(output.images[0].credit.name, 'Photo author');
  assert.throws(() => parsePublishedCommunityPost({ ...post(), images: Array.from({ length: 25 }, (_, n) => photo(n)) }), /invalid_request/);
});

test('legacy text-only posts keep their original shape and no extra defaults', () => {
  const input = post();
  delete input.images; delete input.author; delete input.sources;
  input.title.ru = input.title.zh; input.body.ru = input.body.zh;
  assert.deepEqual(parsePublishedCommunityPost(input), input);
});

test('published photos only accept bounded local raster assets with unique stable ids', () => {
  const invalidSources = ['https://example.com/photo.jpg', '//example.com/photo.jpg', 'data:image/jpeg;base64,abc', '/media/community/../secret.jpg', '/media/community/%2e%2e/secret.jpg', '/media/community/folder\\photo.jpg', '/media/community/photo.jpg?x=1', '/media/community/photo.svg', '/media/community/.hidden.jpg', '/media/community//photo.jpg', '/media/other/photo.jpg'];
  for (const src of invalidSources) assert.throws(() => parsePublishedCommunityPost({ ...post(), images: [{ ...photo(), src }] }), /invalid_request/, src);
  for (const patch of [{ width: 0 }, { height: 3201 }, { width: 1.5 }, { caption: { zh: '说明' } }, { credit: { name: 'Missing license' } }, { credit: { name: 'Author', url: 'javascript:alert(1)', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' } }]) {
    assert.throws(() => parsePublishedCommunityPost({ ...post(), images: [{ ...photo(), ...patch }] }), /invalid_request/);
  }
  assert.throws(() => parsePublishedCommunityPost({ ...post(), images: [photo(), photo()] }), /invalid_request/);
});

test('published parser rejects invalid identity, content and unsafe outbound sources', () => {
  for (const patch of [{ id: 'demo-forged' }, { schoolId: 'unknown' }, { demo: true }, { cover: 'lilac' }, { author: { zh: '作者', ru: '' } }, { title: { zh: '标题文字', ru: '' } }, { createdAt: '2026-02-31T12:00:00.000Z' }, { admin: true }, { sources: [{ label: { zh: '来源', ru: 'Источник' }, url: 'https://user:password@example.com/' }] }]) {
    assert.throws(() => parsePublishedCommunityPost({ ...post(), ...patch }), /invalid_request/);
  }
});

test('published tags are optional, normalized and detached without changing the rest of the post', () => {
  const input = { ...post(), tags: ['＃校园', '# МГУ', 'мгу', ''] };
  const parsed = parsePublishedCommunityPost(input);
  assert.deepEqual(parsed, { ...input, tags: ['校园', 'МГУ'] });
  input.tags.push('后来添加');
  assert.deepEqual(parsed.tags, ['校园', 'МГУ']);
  assert.equal(Object.hasOwn(parsePublishedCommunityPost(post()), 'tags'), false);
  for (const tags of [null, '校园', [42], ['界'.repeat(25)], Array.from({ length: 9 }, (_, n) => `tag-${n}`)]) {
    assert.throws(() => parsePublishedCommunityPost({ ...post(), tags }), /invalid_request/);
  }
});
