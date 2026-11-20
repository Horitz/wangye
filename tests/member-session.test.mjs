import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = new URL('../src/components/member-session.tsx', import.meta.url);
const signedOut = { user: null, profile: null };
const alice = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', username: 'alice', displayName: 'Alice' };
const bob = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', username: 'bob', displayName: 'Bob' };
const profile = { university: 'msu', stage: 'newArrival', degreeLevel: 'bachelor', faculty: 'physics', interests: ['study'], cityId: 'moscow' };

// Drive the actual provider with controlled network responses, without a DOM or extra dependency.
function harness() {
  const hooks = [], pendingEffects = [], requests = [], applied = [], channels = [];
  let cursor = 0, value, dirty = false;
  const browser = new EventTarget();
  const document = new EventTarget();
  document.visibilityState = 'visible';
  const same = (left, right) => left?.length === right?.length && left.every((item, index) => Object.is(item, right[index]));
  const react = {
    createContext: initial => ({ current: initial, Provider: Symbol('provider') }),
    useContext: context => context.current ?? value,
    useState(initial) {
      const index = cursor++;
      hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[index].value, next => { hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next; dirty = true; }];
    },
    useRef(initial) { const index = cursor++; hooks[index] ??= { current: initial }; return hooks[index]; },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!same(hooks[index]?.deps, deps)) hooks[index] = { value: callback, deps };
      return hooks[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!same(hooks[index]?.deps, deps)) {
        const previous = hooks[index];
        hooks[index] = { deps, cleanup: null };
        pendingEffects.push(() => { previous?.cleanup?.(); hooks[index].cleanup = effect(); });
      }
    },
  };
  class Channel {
    constructor(name) { this.name = name; this.sent = []; this.closed = false; channels.push(this); }
    postMessage(message) { this.sent.push(message); }
    close() { this.closed = true; }
  }
  const socialRequest = (path, options, expectedUserId) => new Promise((resolve, reject) => requests.push({ path, options, expectedUserId, resolve, reject }));
  const compiled = ts.transpileModule(readFileSync(source, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiledModule = { exports: {} };
  const require = name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    if (name === '@/lib/community-store') return { setCommunityOwner() {} };
    if (name === '@/lib/personal-plan-store') return { setPersonalPlanOwner() {} };
    if (name === '@/lib/community-remote-store') return { resetCommunityViewer() {} };
    if (name === '@/lib/home-store') return { applyMemberProfile: (...args) => applied.push(args) };
    if (name === '@/lib/social-client') return { SOCIAL_SESSION_EVENT: 'session-changed', socialRequest, socialErrorCode: error => error.message };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function('require', 'module', 'exports', 'window', 'document', 'BroadcastChannel', compiled)(require, compiledModule, compiledModule.exports, browser, document, Channel);
  function render() {
    cursor = 0; dirty = false;
    value = compiledModule.exports.MemberSessionProvider({ children: null }).props.value;
    while (pendingEffects.length) pendingEffects.shift()();
  }
  render();
  return {
    requests, applied, channels, browser, document,
    get value() { if (dirty) render(); return value; },
    observe: () => compiledModule.exports.useMemberSession(),
    async flush() { await Promise.resolve(); await Promise.resolve(); if (dirty) render(); },
    async respond(request, body) { request.resolve(body); await this.flush(); },
    unmount() { for (const hook of hooks) hook?.cleanup?.(); },
  };
}

test('one root session supplies all observers and a single successful login updates them together', async () => {
  const app = harness();
  await app.respond(app.requests[0], signedOut);
  assert.equal(app.requests.length, 1);
  assert.strictEqual(app.observe(), app.value);
  assert.strictEqual(app.observe(), app.observe());
  const login = app.value.authenticate('login', { username: 'alice', password: 'test-only-password' });
  await app.respond(app.requests[1], { user: alice, profile });
  await login;
  assert.strictEqual(app.observe().user, alice);
  assert.strictEqual(app.observe().profile, profile);
  assert.equal(app.channels[0].sent.length, 1);
  assert.deepEqual(app.applied.at(-1), [alice.id, profile, { clearDraft: false }]);
  app.unmount();
});

test('a session GET issued before logout cannot sign the member back in afterwards', async () => {
  const app = harness();
  await app.respond(app.requests[0], { user: alice, profile });
  const staleRefresh = app.value.refresh();
  const logout = app.value.logout();
  assert.equal(app.requests[2].expectedUserId, alice.id);
  await app.respond(app.requests[2], { ok: true });
  await logout;
  await app.respond(app.requests[1], { user: alice, profile });
  await staleRefresh;
  assert.equal(app.value.user, null);
  assert.equal(app.value.profile, null);
  assert.deepEqual(app.applied.at(-1), [null, null, { clearDraft: false }]);
  app.unmount();
});

test('a failed logout preserves the signed-in member and reports the actual failure', async () => {
  const app = harness();
  await app.respond(app.requests[0], { user: alice, profile });
  const logout = app.value.logout();
  app.requests[1].reject(new Error('network_error'));
  await assert.rejects(logout, /network_error/);
  assert.equal(app.value.user.id, alice.id);
  assert.equal(app.channels[0].sent.length, 0);
  app.unmount();
});

test('cross-tab session invalidation updates every observer without rebroadcasting the refresh', async () => {
  const app = harness();
  await app.respond(app.requests[0], { user: alice, profile });
  app.channels[0].onmessage({ data: 'changed' });
  assert.equal(app.requests[1].path, 'session');
  await app.respond(app.requests[1], signedOut);
  assert.equal(app.value.user, null);
  assert.equal(app.observe().user, null);
  assert.equal(app.channels[0].sent.length, 0);
  app.unmount();
  assert.equal(app.channels[0].closed, true);
  app.browser.dispatchEvent(new Event('focus'));
  assert.equal(app.requests.length, 2);
});

test('hidden documents do not refresh until visible, and the latest refresh wins out of order', async () => {
  const app = harness();
  await app.respond(app.requests[0], signedOut);
  app.document.visibilityState = 'hidden';
  app.browser.dispatchEvent(new Event('focus'));
  app.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(app.requests.length, 1);
  app.document.visibilityState = 'visible';
  app.document.dispatchEvent(new Event('visibilitychange'));
  app.browser.dispatchEvent(new Event('focus'));
  await app.respond(app.requests[2], { user: bob, profile: null });
  await app.respond(app.requests[1], { user: alice, profile });
  assert.equal(app.value.user.id, bob.id);
  app.unmount();
});

test('profile saves use the current member and accept the server result before clearing its draft', async () => {
  const app = harness();
  await app.respond(app.requests[0], { user: alice, profile: null });
  const save = app.value.saveProfile(profile);
  assert.equal(app.requests[1].path, 'profile');
  assert.equal(app.requests[1].expectedUserId, alice.id);
  assert.deepEqual(JSON.parse(app.requests[1].options.body), { profile });
  assert.equal(app.value.profile, null);
  await app.respond(app.requests[1], { profile });
  await save;
  assert.deepEqual(app.applied.at(-1), [alice.id, profile, { clearDraft: true }]);
  app.unmount();
});

test('a pending profile save cannot restore a member after logout or replace a different account', async () => {
  for (const nextSession of [signedOut, { user: bob, profile: null }]) {
    const app = harness();
    await app.respond(app.requests[0], { user: alice, profile: null });
    const save = app.value.saveProfile(profile);
    const refresh = app.value.refresh();
    await app.respond(app.requests[2], nextSession);
    await refresh;
    app.requests[1].resolve({ profile });
    await assert.rejects(save, /session_changed/);
    assert.deepEqual(app.value.user, nextSession.user);
    assert.equal(app.value.profile, null);
    app.unmount();
  }
});

test('refresh network failure retains the current account and retry clears the error', async () => {
  const app = harness();
  await app.respond(app.requests[0], { user: alice, profile });
  const failure = app.value.refresh();
  app.requests[1].reject(new Error('network_error'));
  await failure;
  assert.equal(app.value.user.id, alice.id);
  assert.equal(app.value.error, 'network_error');
  const retry = app.value.refresh();
  await app.respond(app.requests[2], { user: alice, profile });
  await retry;
  assert.equal(app.value.error, null);
  app.unmount();
});
