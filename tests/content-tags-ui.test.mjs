import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as tagRules from "../src/lib/content-tags.mjs";

// Run the actual TSX handlers with controlled props and persistent React hook slots.
// The tiny DOM models only focus containment, bubbling blur and input validity;
// it does not replace the separate real-browser layout/accessibility checks.
function loadTags({ communityStore } = {}) {
  let active;
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const hooks = {
    useId: () => `tags-${active.cursor++}`,
    useRef: initial => {
      const index = active.cursor++;
      return active.hooks[index] ??= { current: initial };
    },
    useState: initial => {
      const renderer = active, index = renderer.cursor++;
      if (!(index in renderer.hooks)) renderer.hooks[index] = typeof initial === "function" ? initial() : initial;
      return [renderer.hooks[index], next => { renderer.hooks[index] = typeof next === "function" ? next(renderer.hooks[index]) : next; }];
    },
    useEffect: (run, dependencies) => {
      const renderer = active, index = renderer.cursor++;
      const previous = renderer.hooks[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        renderer.effects.push(() => { previous?.cleanup?.(); renderer.hooks[index] = { dependencies, cleanup: run() }; });
      }
    },
    useImperativeHandle: (ref, create) => {
      active.cursor++;
      active.effects.push(() => { if (ref) ref.current = create(); });
    },
  };
  const require = name => {
    if (name === "react") return hooks;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
    if (name === "next/link") return { default: "a" };
    if (name === "lucide-react") return new Proxy({}, { get: () => "svg" });
    if (name === "@/lib/content-tags.mjs") return tagRules;
    if (name === "@/lib/home-store") return { useHomeState: () => ({ locale: active.props.locale ?? "zh" }) };
    if (name === "@/components/content-tags") return loaded.exports;
    if (name === "@/components/glass-select") return { GlassSelect: "select" };
    if (name === "@/lib/community-store") return communityStore;
    if (name === "@/data/school-options") return { getSchool: () => ({ label: { zh: "莫大", ru: "МГУ" } }), schoolOptions: [] };
    if (name === "@/data/community-topics") return { communityTopics: {} };
    if (name === "@/lib/editorial-store") return { useEditorialCatalog: () => ({ guides: [] }) };
    if (name === "@/data/guide-sections") return {};
    if (name === "@/lib/guide-media-store") return { GUIDE_MEDIA_CAPTION_LIMIT: 160, GUIDE_MEDIA_LIMIT: 24 };
    throw new Error(`Unexpected module: ${name}`);
  };
  const code = ts.transpileModule(readFileSync(new URL("../src/components/content-tags.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)(require, loaded, loaded.exports);
  for (const file of ["community-composer", "editorial-editor"]) {
    const result = { exports: {} };
    const source = ts.transpileModule(readFileSync(new URL(`../src/components/${file}.tsx`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    new Function("require", "module", "exports", source)(require, result, result.exports);
    Object.assign(loaded.exports, result.exports);
  }
  function mount(name, initialProps) {
    const renderer = { hooks: [], cursor: 0, effects: [], nodes: [], elements: new Map(), props: { ...initialProps } };
    function render() {
      renderer.cursor = 0; renderer.effects = []; renderer.nodes = []; active = renderer;
      const tree = loaded.exports[name](renderer.props);
      function visit(node, parent = null, path = "root") {
        if (Array.isArray(node)) { node.forEach((child, index) => visit(child, parent, `${path}.${index}`)); return; }
        if (!node || typeof node !== "object") return;
        const domRef = typeof node.type === "string" ? node.props.ref : undefined;
        const element = domRef?.current ?? renderer.elements.get(path) ?? {
          validationMessage: "", focusCount: 0,
          setCustomValidity(message) { this.validationMessage = message; },
          focus() { this.focusCount++; },
          checkValidity() { return true; },
          reportValidity() { this.reportCount = (this.reportCount ?? 0) + 1; },
          contains(target) { for (let item = target; item; item = item.parent) if (item === this) return true; return false; },
        };
        element.parent = parent?.element ?? null;
        element.type = node.props.type;
        element.form = node.type === "form" ? null : parent?.type === "form" ? parent.element : parent?.element.form ?? null;
        node.element = element; node.parent = parent;
        renderer.elements.set(path, element);
        if (domRef) domRef.current = element;
        renderer.nodes.push(node);
        visit(node.props.children, node, `${path}.children`);
      }
      visit(tree);
      for (const effect of renderer.effects) effect();
      return tree;
    }
    const api = {
      render, props: renderer.props,
      update: patch => { Object.assign(renderer.props, patch); render(); },
      all: predicate => renderer.nodes.filter(predicate),
      find: predicate => { const node = renderer.nodes.find(predicate); assert.ok(node, "Expected rendered control"); return node; },
      event: (node, handler, details = {}) => {
        const event = { target: node.element, currentTarget: node.element, nativeEvent: {}, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...details };
        node.props[handler]?.(event); render(); return event;
      },
      blur: (node, target = null) => {
        const event = { target: node.element, relatedTarget: target?.element ?? target, currentTarget: null };
        for (let item = node; item; item = item.parent) { event.currentTarget = item.element; item.props.onBlur?.(event); }
        render();
      },
    };
    render(); return api;
  }
  return { ...loaded.exports, mount };
}

const text = node => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
const input = editor => editor.find(node => node.type === "input");
const button = (editor, label) => editor.find(node => node.type === "button" && text(node) === label);
const type = (editor, value) => editor.event(input(editor), "onChange", { target: { value } });
function editor(options = {}) {
  const { mount } = loadTags();
  let control;
  control = mount("TagEditor", { value: [], locale: "zh", ...options, onChange: tags => { control.props.value = tags; } });
  return control;
}

test("a long valid suggestion pool stays usable and excludes selected tags after controlled updates", () => {
  const suggestions = ["Москва", "МОСКВА", ...Array.from({ length: 18 }, (_, n) => `Тема ${n}`)];
  const control = editor({ value: ["москва"], suggestions });
  const choices = () => control.all(node => node.type === "button" && node.parent?.props.className === "tag-editor-suggestions");
  assert.equal(choices().length, 5);
  assert.ok(choices().every(node => !text(node).toLowerCase().includes("москва")));
  type(control, "Тема 12");
  control.event(button(control, "#Тема 12"), "onClick");
  assert.deepEqual(control.props.value, ["москва", "Тема 12"]);
  assert.equal(input(control).props.value, "");
  control.update({ value: ["Тема 0", "Тема 1"] });
  assert.ok(choices().every(node => !["#Тема 0", "#Тема 1"].includes(text(node))));
  assert.equal(suggestions.length, 20);
});

test("IME confirmation does not add a tag or clear the composition draft", () => {
  const control = editor();
  control.event(input(control), "onCompositionStart"); type(control, "校园");
  const composing = control.event(input(control), "onKeyDown", { key: "Enter", nativeEvent: { isComposing: true } });
  assert.deepEqual(control.props.value, []); assert.equal(input(control).props.value, "校园");
  assert.equal(composing.prevented, false);
  control.event(input(control), "onCompositionEnd");
  const added = control.event(input(control), "onKeyDown", { key: "Enter" });
  assert.equal(added.prevented, true); assert.deepEqual(control.props.value, ["校园"]); assert.equal(input(control).props.value, "");
});

test("pending input commits when tabbing through an internal button and then to another field", () => {
  const control = editor({ value: ["校园"] }); type(control, "# МГУ");
  control.blur(input(control), button(control, "添加"));
  assert.deepEqual(control.props.value, ["校园"], "moving within the editor does not prematurely commit");
  control.blur(button(control, "添加"), { parent: null, name: "title" });
  assert.deepEqual(control.props.value, ["校园", "МГУ"]);
  assert.equal(input(control).props.value, ""); assert.equal(input(control).element.validationMessage, "");
});

test("eight tags allow duplicates but a ninth or oversized pending tag blocks saving without discarding text", () => {
  const value = Array.from({ length: 8 }, (_, n) => `Tag ${n}`);
  const control = editor({ value });
  type(control, "#TAG 0"); control.event(input(control), "onKeyDown", { key: "Enter" });
  assert.deepEqual(control.props.value, value); assert.equal(input(control).props.value, "");
  type(control, "第九个"); control.blur(input(control), { parent: null });
  assert.deepEqual(control.props.value, value); assert.equal(input(control).props.value, "第九个");
  assert.equal(input(control).props["aria-invalid"], true);
  assert.ok(input(control).element.validationMessage.includes("8"));
  const alert = control.find(node => node.props.role === "alert");
  assert.equal(input(control).props["aria-describedby"], alert.props.id);
  const escaped = control.event(input(control), "onKeyDown", { key: "Escape" });
  assert.equal(escaped.stopped, true); assert.equal(input(control).element.validationMessage, "");
  type(control, "🚀".repeat(25));
  assert.ok(input(control).element.validationMessage.includes("24"));
  control.event(button(control, "添加"), "onClick");
  assert.equal(input(control).props.value, "🚀".repeat(25)); assert.deepEqual(control.props.value, value);
});

test("language changes update native validity and accessible text without losing the pending input", () => {
  const control = editor({ value: ["校园"] }); type(control, "я".repeat(25));
  assert.ok(input(control).element.validationMessage.includes("最多"));
  control.update({ locale: "ru" });
  assert.ok(input(control).element.validationMessage.includes("не больше"));
  assert.equal(input(control).props.value, "я".repeat(25)); assert.deepEqual(control.props.value, ["校园"]);
  const label = control.find(node => node.type === "label");
  assert.equal(label.props.htmlFor, input(control).props.id); assert.equal(text(label), "Теги");
  assert.ok(control.find(node => node.props["aria-label"] === "Удалить тег 校园"));
  assert.ok(control.all(node => node.type === "button").every(node => node.props.type === "button"));
});

test("removing an existing tag cannot hide invalid pending text when focus leaves to save", () => {
  const control = editor({ value: ["校园"] }); type(control, "界".repeat(25));
  const remove = control.find(node => node.props["aria-label"] === "移除标签 校园");
  control.blur(input(control), remove); control.event(remove, "onClick");
  control.blur(input(control), { parent: null });
  assert.deepEqual(control.props.value, []);
  assert.equal(input(control).props.value, "界".repeat(25));
  assert.equal(input(control).props["aria-invalid"], true);
  assert.ok(input(control).element.validationMessage.includes("24"));
});

test("filter expansion retains the current tag without mutating shared counts or duplicating it", () => {
  const { mount, collectTagCounts } = loadTags();
  const counts = collectTagCounts([{ tags: ["МГУ", "мгу"] }, { tags: ["＃МГУ", "校园"] }]);
  assert.deepEqual(counts.find(item => item.tag === "МГУ"), { tag: "МГУ", count: 2 });
  const items = Object.freeze(Array.from({ length: 14 }, (_, index) => Object.freeze({ tag: `Tag ${index}`, count: index + 1 })));
  const selections = [];
  const control = mount("TagFilter", { items, selected: "Other", onSelect: tag => selections.push(tag) });
  control.event(button(control, "展开全部"), "onClick");
  assert.equal(items.length, 14);
  assert.equal(control.all(node => node.type === "button" && text(node).startsWith("Other")).length, 1);
  const selected = control.find(node => node.type === "button" && text(node).startsWith("Other"));
  assert.equal(selected.props["aria-pressed"], true);
  control.event(selected, "onClick"); assert.deepEqual(selections, [""]);
});

test("focus moving to the same form's submit keeps the layout stable until explicit commit", () => {
  const ref = { current: null };
  const control = editor({ ref, value: ["校园"] }); type(control, "＃ МГУ, мгу");
  const form = {};
  input(control).element.form = form;
  control.blur(input(control), { type: "submit", form });
  assert.deepEqual(control.props.value, ["校园"], "no chip is inserted during the pointer down / blur part of a click");
  assert.equal(input(control).props.value, "＃ МГУ, мгу", "the input and suggestion rows stay in place");
  assert.deepEqual(ref.current.commit(), ["校园", "МГУ"]);
  control.render();
  assert.deepEqual(control.props.value, ["校园", "МГУ"]); assert.equal(input(control).props.value, "");
  type(control, "次日安排"); input(control).element.form = form;
  control.blur(input(control), { type: "submit", form: {} });
  assert.deepEqual(control.props.value, ["校园", "МГУ", "次日安排"], "a different form does not defer ordinary blur handling");
});

// Use the actual local store/data modules for the form-to-record assertions below.
function loadData(filename) {
  const cache = new Map();
  const values = new Map();
  const browser = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }, addEventListener() {} };
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const loaded = { exports: {} }; cache.set(path, loaded);
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = name => name === "react" ? { useSyncExternalStore: (subscribe, snapshot) => { subscribe(() => {}); return snapshot(); } } : load(resolve(dirname(path), name.endsWith(".mjs") ? name : `${name}.ts`));
    new Function("require", "module", "exports", "window", code)(require, loaded, loaded.exports, browser);
    return loaded.exports;
  }
  return load(fileURLToPath(new URL(`../src/${filename}`, import.meta.url)));
}

function mountFormTags(components, parent) {
  const node = parent.find(item => item.type === components.TagEditor);
  const tags = components.mount("TagEditor", node.props);
  const form = parent.find(item => item.type === "form");
  input(tags).element.form = form.element;
  return { tags, form };
}

test("community create and edit both save pending tags on the first submit with the real store", () => {
  const store = loadData("lib/community-store.ts");
  store.updateCommunityDraft({ title: "校园散步笔记", body: "这是一次校园散步的笔记，记录今天看到的风景。", schoolId: "msu", tags: ["校园"] });
  const components = loadTags({ communityStore: store });
  const saved = [];
  let parent = components.mount("CommunityComposer", { schoolId: "msu", onClose() {}, onSaved: id => saved.push(id) });
  let { tags, form } = mountFormTags(components, parent);
  type(tags, "# МГУ, мгу"); input(tags).element.form = form.element;
  tags.blur(input(tags), button(parent, "保存"));
  assert.deepEqual(store.useCommunityState().draft.tags, ["校园"], "blur does not move the submit button");
  parent.event(form, "onSubmit");
  assert.equal(saved.length, 1);
  let post = store.useCommunityState().posts.find(item => item.id === saved[0]);
  assert.deepEqual(post.tags, ["校园", "МГУ"]);
  parent = components.mount("CommunityComposer", { schoolId: "msu", post, onClose() {}, onSaved: id => saved.push(id) });
  ({ tags, form } = mountFormTags(components, parent));
  type(tags, "# Москва"); input(tags).element.form = form.element;
  tags.blur(input(tags), button(parent, "保存"));
  parent.event(form, "onSubmit");
  assert.equal(saved.length, 2);
  post = store.useCommunityState().posts.find(item => item.id === saved[0]);
  assert.deepEqual(post.tags, ["校园", "МГУ", "Москва"], "edit uses returned tags, not the pre-blur render's stale draft");
  parent = components.mount("CommunityComposer", { schoolId: "msu", post, onClose() {}, onSaved: id => saved.push(id) });
  ({ tags, form } = mountFormTags(components, parent));
  type(tags, "я".repeat(25)); input(tags).element.form = form.element;
  tags.blur(input(tags), button(parent, "保存"));
  parent.event(form, "onSubmit");
  assert.equal(saved.length, 2); assert.equal(form.element.reportCount, 1);
  assert.deepEqual(store.useCommunityState().posts.find(item => item.id === post.id).tags, post.tags);
  assert.equal(input(tags).props.value, "я".repeat(25));
});

test("editorial submit includes the pending tags and refuses invalid or unfinished composition", async () => {
  const { getEditorialDefault } = loadData("data/editorial-content.ts");
  const document = getEditorialDefault("visa-extension");
  const components = loadTags();
  const saved = [];
  const parent = components.mount("EditorialEditor", { document, locale: "ru", onCancel() {}, onSave: async value => { saved.push(structuredClone(value)); } });
  const { tags, form } = mountFormTags(components, parent);
  type(tags, "# Москва, МОСКВА"); input(tags).element.form = form.element;
  tags.blur(input(tags), button(parent, "Сохранить"));
  assert.equal(input(tags).props.value, "# Москва, МОСКВА");
  parent.event(form, "onSubmit"); await Promise.resolve();
  assert.equal(saved.length, 1); assert.deepEqual(saved[0].tags, ["Москва"]);
  const next = components.mount("EditorialEditor", { document: saved[0], locale: "ru", onCancel() {}, onSave: async value => { saved.push(value); } });
  const invalid = mountFormTags(components, next);
  type(invalid.tags, "я".repeat(25));
  next.event(invalid.form, "onSubmit"); await Promise.resolve();
  assert.equal(saved.length, 1); assert.equal(invalid.form.element.reportCount, 1);
  type(invalid.tags, "校园"); invalid.tags.event(input(invalid.tags), "onCompositionStart");
  next.event(invalid.form, "onSubmit"); await Promise.resolve();
  assert.equal(saved.length, 1, "a composition still in progress is not saved as a partial tag");
  assert.equal(input(invalid.tags).props.value, "校园");
  invalid.tags.event(input(invalid.tags), "onCompositionEnd");
  next.event(invalid.form, "onSubmit"); await Promise.resolve();
  assert.equal(saved.length, 2); assert.deepEqual(saved[1].tags, ["Москва", "校园"]);
});
