"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, BookOpen, Check, ChevronRight, ExternalLink, FileCheck2, GraduationCap, HeartPulse, House, Menu, Search, ShieldCheck, TrainFront, UserRound, WalletCards, X, type LucideIcon } from "lucide-react";
import { SpatialHome } from "@/components/home-spatial";
import { Brand } from "@/components/brand";
import { LanguageMenu } from "@/components/language-menu";
import { GlassSelect } from "@/components/glass-select";
import { guidePreviews, type GuidePreview } from "@/data/home-content";
import { schoolOptions, type SchoolId } from "@/data/school-options";
import { toggleSaved, toggleStep, updateHome, useHomeState, type Stage } from "@/lib/home-store";

const stages: { id: Stage; zh: string; ru: string }[] = [
  { id: "prospective", zh: "准备申请", ru: "Поступаю" },
  { id: "newArrival", zh: "刚刚抵达", ru: "Недавно приехал" },
  { id: "enrolled", zh: "正在就读", ru: "Уже учусь" },
];
const categories: { id: GuidePreview["category"]; icon: LucideIcon; zh: string; ru: string }[] = [
  { id: "documents", icon: FileCheck2, zh: "证件与签证", ru: "Документы и виза" },
  { id: "study", icon: GraduationCap, zh: "入学与学习", ru: "Поступление и учёба" },
  { id: "health", icon: HeartPulse, zh: "医疗与保险", ru: "Медицина и страховка" },
  { id: "banking", icon: WalletCards, zh: "银行与支付", ru: "Банки и платежи" },
  { id: "living", icon: House, zh: "住宿与生活", ru: "Проживание и быт" },
  { id: "transport", icon: TrainFront, zh: "交通与城市", ru: "Транспорт и город" },
];
const routes: Record<Stage, string[]> = {
  prospective: ["university-admission", "first-week", "residence-registration"],
  newArrival: ["first-week", "residence-registration", "medical-examination"],
  enrolled: ["visa-extension", "residence-registration", "medical-examination"],
};
type Panel = "profile" | "search" | "saved" | "route" | { guide: string } | null;

function GuideCard({ guide, onOpen }: { guide: GuidePreview; onOpen: (id: string) => void }) {
  const state = useHomeState();
  const t = (zh: string, ru: string) => state.locale === "zh" ? zh : ru;
  const Icon = categories.find(item => item.id === guide.category)!.icon;
  const progress = state.completed[guide.id]?.length ?? 0;
  return <article className="guide-card">
    <div className="guide-card-top"><span className="guide-icon"><Icon size={24} strokeWidth={1.75} /></span><button className={`icon-button save-button${state.saved.includes(guide.id) ? " is-saved" : ""}`} aria-label={`${state.saved.includes(guide.id) ? t("取消收藏", "Убрать из сохранённого") : t("收藏", "Сохранить")}: ${guide.title[state.locale]}`} aria-pressed={state.saved.includes(guide.id)} onClick={() => toggleSaved(guide.id)}><Bookmark size={20} fill={state.saved.includes(guide.id) ? "currentColor" : "none"} /></button></div>
    <span className="guide-category">{categories.find(item => item.id === guide.category)![state.locale]}</span>
    <h3><button className="card-title-button" onClick={() => onOpen(guide.id)}>{guide.title[state.locale]}</button></h3>
    <p>{guide.summary[state.locale]}</p>
    <div className="guide-card-bottom"><span className={`status-label ${guide.status === "general" ? "status-general" : ""}`}>{guide.status === "general" ? <BookOpen size={14} /> : <ShieldCheck size={14} />}{guide.status === "general" ? t("通用建议", "Общие рекомендации") : t("要求需核实", "Требует уточнения")}</span><button className="icon-button circle-link" aria-label={`${t("打开", "Открыть")}: ${guide.title[state.locale]}`} onClick={() => onOpen(guide.id)}><ArrowUpRight size={20} /></button></div>
    {progress > 0 && <div className="card-progress"><span style={{ width: `${progress / 3 * 100}%` }} /><span className="sr-only">{progress}/3</span></div>}
  </article>;
}

export default function StudentHome() {
  const state = useHomeState();
  const t = (zh: string, ru: string) => state.locale === "zh" ? zh : ru;
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => { document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "ru"; }, [state.locale]);
  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
    else if (!panel && dialog.current?.open) dialog.current?.close();
    if (panel) {
      dialog.current?.scrollTo({ top: 0 });
      dialog.current?.querySelector<HTMLElement>(panel === "search" ? "#dialog-query" : ".close-button")?.focus({ preventScroll: true });
    }
  }, [panel]);

  const routeGuides = routes[state.stage].map(id => guidePreviews.find(guide => guide.id === id)!);
  const normalize = (value: string) => value.toLocaleLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim();
  const results = guidePreviews.filter(guide => (category === "all" || guide.category === category) && normalize([guide.title.zh, guide.title.ru, guide.summary.zh, guide.summary.ru, ...guide.keywords].join(" ")).includes(normalize(query)));
  const selectedGuide = typeof panel === "object" && panel ? guidePreviews.find(guide => guide.id === panel.guide) : undefined;
  const openSearch = (search = query, filter = "all") => { setQuery(search); setCategory(filter); setPanel("search"); setMenuOpen(false); };
  const openGuide = (id: string) => setPanel({ guide: id });
  const openFromMenu = (next: "search" | "profile" | "saved") => {
    menuToggle.current?.focus();
    setMenuOpen(false);
    if (next === "search") openSearch();
    else setPanel(next);
  };
  const close = () => setPanel(null);
  const keepDialogFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };




  return (
    <div id="top" className={`site landing-page spatial-page locale-${state.locale}`}>
      <a className="skip-link" href="#main">{t("跳到主要内容", "Перейти к содержимому")}</a>
      <header className="site-header landing-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav landing-nav" aria-label={t("主导航", "Основная навигация")}>
            <a href="#about">{t("探索路线", "Маршрут")}</a>
            <button onClick={() => openSearch()}>{t("办事指南", "Инструкции")}</button>
          </nav>
          <div className="header-actions landing-actions">
            <LanguageMenu />
            <button className="icon-button landing-search-toggle" aria-label={t("搜索指南", "Поиск инструкций")}
              onClick={() => openSearch()}><Search size={20} /></button>
            <button className="icon-button landing-secondary-toggle" aria-label={t("我的清单", "Сохранённое")}
              onClick={() => setPanel("saved")}><Bookmark size={20} /></button>
            <button className="icon-button landing-secondary-toggle" aria-label={t("我的情况", "Мой профиль")}
              onClick={() => setPanel("profile")}><UserRound size={20} /></button>
            <button ref={menuToggle} className="icon-button mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="mobile-navigation"
              aria-label={menuOpen ? t("关闭导航", "Закрыть меню") : t("打开导航", "Открыть меню")}
              onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>
        <nav id="mobile-navigation" className="mobile-nav landing-menu" hidden={!menuOpen}
          aria-label={t("移动导航", "Мобильная навигация")}
          onKeyDown={event => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              menuToggle.current?.focus();
            }
          }}>
          <a href="#about" onClick={() => setMenuOpen(false)}>{t("探索路线", "Маршрут")}</a>
          <button onClick={() => openFromMenu("search")}>{t("搜索指南", "Поиск инструкций")}</button>
          <button onClick={() => openFromMenu("profile")}>{t("我的情况", "Мой профиль")}</button>
          <button onClick={() => openFromMenu("saved")}>{t("我的清单", "Сохранённое")}</button>
        </nav>
      </header>


      <main id="main">
        {state.storageUnavailable && <div className="storage-notice page-container" role="status">{t(
          "浏览器存储不可用。本次操作暂存在内存中。",
          "Хранилище недоступно. Изменения сохраняются только до закрытия страницы."
        )}</div>}
        <SpatialHome locale={state.locale} onStart={() => setPanel("route")} />
      </main>

      <footer className="site-footer landing-footer spatial-footer">
        <div className="footer-inner page-container">
          <Brand light />
        </div>
      </footer>

    <dialog ref={dialog} className={`preview-dialog${selectedGuide ? " guide-dialog" : ""}`} onKeyDown={keepDialogFocus} onCancel={close} onClose={close} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }} aria-labelledby="dialog-title">
      <div className="dialog-header"><div><span className="eyebrow">StudentPath</span><h2 id="dialog-title">{selectedGuide ? selectedGuide.title[state.locale] : panel === "profile" ? t("让路线更适合你", "Настроим ваш маршрут") : panel === "saved" ? t("我的清单", "Сохранённые инструкции") : panel === "route" ? t("我的留学路线", "Мой маршрут") : t("找到你的下一步", "Найдите следующий шаг")}</h2></div><button className="icon-button close-button" onClick={close} aria-label={t("关闭", "Закрыть")}><X size={22} /></button></div>
      {panel === "route" && (
        <div className="dialog-body">
          <div className="filter-pills" role="group" aria-label={t("学习阶段", "Этап учёбы")}>
            {stages.map(stage => (
              <button key={stage.id} aria-pressed={state.stage === stage.id} className={state.stage === stage.id ? "active" : ""}
                onClick={() => updateHome({ stage: stage.id })}>{stage[state.locale]}</button>
            ))}
          </div>
          <div className="result-list">{routeGuides.map(guide => <GuideCard key={guide.id} guide={guide} onOpen={openGuide} />)}</div>
          <button className="text-button" onClick={() => setPanel("profile")}>{t("调整我的情况", "Настроить профиль")}<ArrowRight size={18} /></button>
        </div>
      )}
      {panel === "profile" && <ProfileForm onDone={() => setPanel("route")} />}
      {panel === "search" && <div className="dialog-body"><form onSubmit={event => event.preventDefault()} className="dialog-search" role="search"><Search size={20} /><label className="sr-only" htmlFor="dialog-query">{t("搜索指南", "Поиск инструкций")}</label><input id="dialog-query" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("中文、俄语都可以搜索", "Поиск на русском или китайском")} />{query && <button className="icon-button" type="button" onClick={() => setQuery("")} aria-label={t("清空搜索", "Очистить поиск")}><X size={16} /></button>}</form><div className="filter-pills"><button aria-pressed={category === "all"} className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>{t("全部", "Все")}</button>{categories.map(item => <button key={item.id} aria-pressed={category === item.id} className={category === item.id ? "active" : ""} onClick={() => setCategory(item.id)}>{item[state.locale]}</button>)}</div><p className="result-count" role="status">{t(`找到 ${results.length} 份指南`, `Найдено инструкций: ${results.length}`)}</p><div className="result-list">{results.map(guide => <GuideCard key={guide.id} guide={guide} onOpen={openGuide} />)}</div>{!results.length && <div className="empty-state"><Search size={32} /><h3>{t("暂时没有匹配的指南", "Пока нет подходящих инструкций")}</h3><p>{t("试试「签证」「登记」，或查看首页预览中的全部指南。", "Попробуйте «виза», «регистрация» или откройте все доступные инструкции.")}</p><button className="button secondary" onClick={() => { setQuery(""); setCategory("all"); }}>{t("清空筛选", "Сбросить фильтры")}</button></div>}</div>}
      {panel === "saved" && <div className="dialog-body"><p className="dialog-intro">{t("只保存在当前浏览器，不需要创建账号。", "Хранится только в этом браузере. Аккаунт не нужен.")}</p>{state.saved.length ? <div className="result-list">{guidePreviews.filter(guide => state.saved.includes(guide.id)).map(guide => <GuideCard key={guide.id} guide={guide} onOpen={openGuide} />)}</div> : <div className="empty-state"><Bookmark size={34} /><h3>{t("给下一步，留一个位置。", "Сохраните свой следующий шаг.")}</h3><p>{t("点击指南上的收藏图标，就能在这里找到它。", "Нажмите значок закладки на инструкции, и она появится здесь.")}</p><button className="button primary" onClick={() => openSearch("")}>{t("发现指南", "Найти инструкцию")}<ArrowRight size={17} /></button></div>}</div>}
      {selectedGuide && <div className="dialog-body"><span className="status-label">{selectedGuide.status === "general" ? <BookOpen size={15} /> : <ShieldCheck size={15} />}{selectedGuide.status === "general" ? t("通用建议", "Общие рекомендации") : t("具体要求需向负责部门核实", "Требования уточняйте в ответственном отделе")}</span><p className="guide-summary">{selectedGuide.summary[state.locale]}</p><div className="preview-notice">{t("首页预览 · 以下是核实与准备步骤，不是完整官方材料清单。", "Предпросмотр · Ниже шаги для уточнения и подготовки, а не полный официальный перечень документов.")}</div><div className="checklist-heading"><h3>{t("可以从这几步开始", "С чего начать")}</h3><span>{state.completed[selectedGuide.id]?.length ?? 0} / 3</span></div><div className="guide-progress-track"><span style={{ width: `${(state.completed[selectedGuide.id]?.length ?? 0) / 3 * 100}%` }} /></div><div className="preview-checklist">{selectedGuide.steps.map((step, index) => <label className={state.completed[selectedGuide.id]?.includes(index) ? "checked" : ""} key={index}><input type="checkbox" checked={state.completed[selectedGuide.id]?.includes(index) ?? false} onChange={() => toggleStep(selectedGuide.id, index)} /><span>{step[state.locale]}</span></label>)}</div>{state.completed[selectedGuide.id]?.length === 3 && <p role="status" className="completion-note"><Check size={17} />{t("准备步骤已记录完成，不代表手续获得批准。", "Шаги отмечены. Это не означает официальное одобрение документов.")}</p>}{selectedGuide.id === "visa-extension" && <button className="next-guide" onClick={() => openGuide("residence-registration")}><span><small>{t("接下来，记得核实", "ДАЛЕЕ СТОИТ УТОЧНИТЬ")}</small><strong>{t("是否需要更新居住登记？", "Нужно ли обновить регистрацию?")}</strong></span><ArrowRight size={21} /></button>}{state.university === "other" && selectedGuide.sourceUrl && <p className="preview-notice">{t("下方是 МГУ 的参考入口。其他学校请向本校负责部门确认适用要求。", "Ниже приведён источник МГУ. Для другого вуза уточните требования в своём университете.")}</p>}{selectedGuide.sourceUrl && <a className="source-link" href={selectedGuide.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /><span>{selectedGuide.sourceLabel![state.locale]}<small>{t("官方信息入口，具体要求仍需确认", "Официальный источник; актуальные условия необходимо уточнить")}</small></span><ArrowUpRight size={17} /></a>}<div className="guide-dialog-actions"><button className="button primary" onClick={() => toggleSaved(selectedGuide.id)}><Bookmark size={17} fill={state.saved.includes(selectedGuide.id) ? "currentColor" : "none"} />{state.saved.includes(selectedGuide.id) ? t("已收藏 · 取消收藏", "Сохранено · Убрать") : t("收藏这份指南", "Сохранить инструкцию")}</button><button className="text-button" onClick={() => openSearch("")}>{t("更多指南", "Другие инструкции")}<ChevronRight size={17} /></button></div></div>}
      </dialog>
    </div>
  );
}

function ProfileForm({ onDone }: { onDone: () => void }) {
  const state = useHomeState();
  const t = (zh: string, ru: string) => state.locale === "zh" ? zh : ru;
  const [university, setUniversity] = useState(state.university);
  const [stage, setStage] = useState(state.stage);
  return <form className="dialog-body profile-form" onSubmit={event => { event.preventDefault(); updateHome({ university, stage, profileSet: true }); onDone(); }}><p className="dialog-intro">{t("只需两个选择，让我们为你整理相关信息。", "Два выбора помогут подобрать подходящие инструкции.")}</p><GlassSelect id="university" label={t("你的大学", "Ваш университет")} value={university} onChange={value => setUniversity(value as SchoolId)} options={schoolOptions.map(school => ({ value: school.id, label: school.label[state.locale] }))} /><fieldset><legend>{t("你现在的阶段", "Ваш текущий этап")}</legend>{stages.map(item => <label className={`stage-option${item.id === stage ? " selected" : ""}`} key={item.id}><input type="radio" name="stage" value={item.id} checked={item.id === stage} onChange={() => setStage(item.id)} /><span>{item[state.locale]}</span>{item.id === stage && <Check size={18} />}</label>)}</fieldset><p className="profile-privacy"><ShieldCheck size={17} />{t("仅保存在本机浏览器，无需填写任何身份信息。", "Сохраняется только в браузере. Личные документы не нужны.")}</p><button type="submit" className="button primary full-width">{t("保存，查看我的路线", "Сохранить мой маршрут")}<ArrowRight size={18} /></button></form>;
}
