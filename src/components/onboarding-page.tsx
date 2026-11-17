"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Compass, Globe2, GraduationCap, MapPin, Plane, Search } from "lucide-react";
import { MemberAuth } from "@/components/member-auth";
import { useMemberSession } from "@/components/member-session";
import { socialErrorCode, socialErrorText } from "@/lib/social-client";
import { parseMemberProfile } from "@/lib/member-profile.mjs";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { GlassSelect } from "@/components/glass-select";
import { degreeOptions, facultyOptions, interestOptions, stageOptions } from "@/data/profile-options";
import { schoolOptions } from "@/data/school-options";
import { getProfileDraft, updateProfileDraft, useHomeState, type DegreeLevel, type Stage } from "@/lib/home-store";

export function OnboardingPage() {
  const state = useHomeState();
  const member = useMemberSession();
  const draft = getProfileDraft(state);
  const locale = state.locale;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const router = useRouter();
  const [step, setStep] = useState(1);
  const phase = member.user ? step : 0;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [error, setError] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(phase);
  const schoolField = useRef<HTMLFieldSetElement>(null);
  const stageField = useRef<HTMLFieldSetElement>(null);
  const resetControl = useRef<HTMLButtonElement>(null);
  const confirmControl = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (previousStep.current !== phase) { title.current?.focus(); previousStep.current = phase; }
  }, [phase]);

  const schools = schoolOptions.map(school => ({ id: school.id, icon: school.id === "other" ? Globe2 : GraduationCap, title: school.label[locale], subtitle: school.id === "other" ? t("先从通用内容开始", "Начать с общей информации") : t("莫斯科", "Москва"), keywords: school.keywords }));
  const visibleSchools = schools.filter(school => `${school.title} ${school.subtitle} ${school.keywords}`.toLocaleLowerCase().includes(schoolQuery.toLocaleLowerCase().trim()));
  const stageDescriptions: Record<Stage, { zh: string; ru: string }> = {
    prospective: { zh: "正在了解学校与申请", ru: "Знакомлюсь с вузами и поступлением" },
    newArrival: { zh: "准备安顿新的生活", ru: "Обустраиваюсь на новом месте" },
    enrolled: { zh: "继续学习与日常生活", ru: "Продолжаю учёбу и жизнь в городе" },
  };
  const stageIcons = { prospective: Compass, newArrival: Plane, enrolled: GraduationCap };
  const selectedSchool = schools.find(school => school.id === draft.university);
  const selectedStage = stageOptions.find(option => option.id === draft.stage);
  const selectStage = (stage: Stage) => { updateProfileDraft({ stage }); setResetNotice(false); };
  const next = () => {
    if (!draft.university || !draft.stage) {
      setError(true);
      (!draft.university ? schoolField : stageField).current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
      return;
    }
    setError(false); setStep(2);
  };
  const save = async () => {
    const profile = parseMemberProfile(draft);
    if (!profile) { setError(true); setStep(1); return; }
    setSaving(true); setSaveError(null);
    try {
      await member.saveProfile(profile);
      router.push("/dashboard");
    } catch (cause) { setSaveError(socialErrorCode(cause)); }
    finally { setSaving(false); }
  };
  const reset = async () => {
    setSaving(true); setSaveError(null);
    try {
      await member.saveProfile(null);
      setResetConfirm(false); setResetNotice(true); setError(false); setSchoolQuery(""); setStep(1);
      requestAnimationFrame(() => title.current?.focus());
    } catch (cause) { setSaveError(socialErrorCode(cause)); }
    finally { setSaving(false); }
  };

  return <div className="workspace-container onboarding-page">
    <div className="onboarding-topline"><Link href="/" className="workspace-back"><ArrowLeft size={18} />{t("返回首页", "На главную")}</Link>{member.profile && <Link href="/me" className="workspace-skip">{t("返回我的空间", "Мой профиль")}<ArrowRight size={18} /></Link>}</div>
    <div className="onboarding-layout">
      <aside className="onboarding-intro">
        <span className="workspace-eyebrow">{t("你的旅程，由你开始", "Ваш путь начинается с вас")}</span>
        <h2>{t("每个人，", "У каждого")}<br /><span className="sketch-highlight">{t("都有自己的起点。", "своя отправная точка.")}<svg viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M3 8Q98 2 236 5M35 10Q129 6 216 9" /></svg></span></h2>
        <p>{member.user ? t("选好自己的情况，继续你的留学旅程。", "Расскажите о себе и продолжайте свой путь.") : t("创建账号，选好自己的情况，就可以出发了。", "Создайте аккаунт, расскажите о себе — и можно начинать.")}</p>
        <div className="onboarding-guidance"><GuidanceIllustration key={phase} kind={phase < 2 ? "route" : "pencil"} /></div>
        <div className="onboarding-summary" aria-live="polite"><MapPin size={20} /><div><strong>{selectedSchool?.title ?? t("莫斯科 · 留学生活", "Москва · Студенческая жизнь")}</strong><span>{selectedStage?.label[locale] ?? t("从选择你的情况开始", "Начните с выбора своего этапа")}</span></div></div>
      </aside>

      <section className="onboarding-form workspace-panel" aria-labelledby="onboarding-title">
        <ol className="onboarding-stepper" aria-label={t("设置步骤", "Шаги настройки")}>
          {[t("账号", "Аккаунт"), t("基本情况", "О вас"), t("偏好", "Интересы")].map((label, index) => <li key={index} aria-current={phase === index ? "step" : undefined}><span className="onboarding-step-number">{phase > index ? <Check size={16} /> : index + 1}</span>{label}</li>)}
        </ol>
        <div className="workspace-heading"><h1 ref={title} tabIndex={-1} id="onboarding-title">{phase === 0 ? t("从这里，开启旅程。", "Начните свой путь.") : step === 1 ? t("先认识一下你。", "Давайте познакомимся.") : t("让内容更贴近你。", "Что вам интересно?")}</h1><p>{phase === 0 ? t("注册新账号，或登录已有账号。", "Создайте аккаунт или войдите в существующий.") : step === 1 ? t("选择学校和目前的状态，之后随时可以修改。", "Выберите вуз и текущий этап. Позже это можно изменить.") : t("这些都是选填项，可以直接完成设置。", "Все поля необязательны. Можно сразу завершить настройку.")}</p></div>
        {member.error && <div role="alert"><p>{socialErrorText(member.error, locale)}</p><button type="button" className="text-button" onClick={() => void member.refresh()}>{t("重试", "Повторить")}</button></div>}
        {!member.loaded ? <p role="status">{t("正在读取账号…", "Загрузка аккаунта…")}</p> : !member.user ? !member.error && <MemberAuth initialMode="register" compact onAuthenticated={session => { setStep(1); if (session.profile) router.push("/dashboard"); }} /> : <>
        <p className="onboarding-member">{member.user.displayName} <span>@{member.user.username}</span></p>
        {saveError && <p className="onboarding-error" role="alert">{socialErrorText(saveError, locale)}</p>}
        {error && <p className="onboarding-error" role="alert">{t("请选择学校和当前状态后继续。", "Чтобы продолжить, выберите вуз и текущий этап.")}</p>}
        {step === 1 ? <div className="onboarding-fields">
          <fieldset ref={schoolField} className="onboarding-fieldset"><legend>{t("你在哪所学校？", "В каком вузе вы учитесь или планируете учиться?")}</legend>
            <label className="onboarding-school-search"><Search size={18} /><span className="sr-only">{t("搜索学校", "Поиск вуза")}</span><input type="search" value={schoolQuery} onChange={event => setSchoolQuery(event.target.value)} placeholder={t("搜索学校名称", "Найти вуз по названию")} /></label>
            <div className="onboarding-school-options">{visibleSchools.map(school => <label key={school.id} className={`onboarding-choice school-choice${draft.university === school.id ? " is-selected" : ""}`}>
              <input type="radio" name="university" value={school.id} checked={draft.university === school.id} onChange={() => { updateProfileDraft({ university: school.id }); setResetNotice(false); }} />
              <school.icon size={22} strokeWidth={1.75} /><span className="onboarding-choice-copy"><strong>{school.title}</strong><span>{school.subtitle}</span></span><span className="onboarding-radio-mark" aria-hidden="true">{draft.university === school.id && <Check size={14} />}</span>
            </label>)}</div>
            {visibleSchools.length === 0 && <div className="onboarding-empty"><p>{t("还没有找到这所学校，可以选择“其他学校／还不确定”。", "Такой вуз пока не найден. Можно выбрать «Другой вуз / пока не знаю».")}</p><button className="text-button" onClick={() => { setSchoolQuery(""); updateProfileDraft({ university: "other" }); }}>{t("选择其他学校", "Выбрать другой вуз")}</button></div>}
          </fieldset>
          <fieldset ref={stageField} className="onboarding-fieldset"><legend>{t("你现在处于哪个阶段？", "На каком вы сейчас этапе?")}</legend><div className="onboarding-stage-options">{stageOptions.map(option => {
            const Icon = stageIcons[option.id];
            return <label key={option.id} className={`onboarding-choice stage-choice${draft.stage === option.id ? " is-selected" : ""}`}><input type="radio" name="student-stage" value={option.id} checked={draft.stage === option.id} onChange={() => selectStage(option.id)} /><Icon size={24} strokeWidth={1.75} /><span className="onboarding-choice-copy"><strong>{option.label[locale]}</strong><span>{stageDescriptions[option.id][locale]}</span></span><span className="onboarding-radio-mark" aria-hidden="true">{draft.stage === option.id && <Check size={14} />}</span></label>;
          })}</div></fieldset>
        </div> : <div className="onboarding-fields">
          <div className="onboarding-select-grid">
            <GlassSelect label={t("院系（选填）", "Факультет (необязательно)")} value={draft.faculty} disabled={draft.university !== "msu"} onChange={faculty => updateProfileDraft({ faculty })} options={[{ value: "", label: t("暂不选择", "Пока не выбирать") }, ...(draft.university === "msu" ? facultyOptions.map(option => ({ value: option.id, label: option.label[locale] })) : [])]} />
            <GlassSelect label={t("学习阶段（选填）", "Уровень обучения (необязательно)")} value={draft.degreeLevel} onChange={degreeLevel => updateProfileDraft({ degreeLevel: degreeLevel as DegreeLevel })} options={degreeOptions.map(option => ({ value: option.id, label: option.label[locale] }))} />
          </div>
          <fieldset className="onboarding-fieldset"><legend>{t("你更关注哪些内容？（选填）", "Какие темы вас интересуют? (необязательно)")}</legend><div className="onboarding-interest-options">{interestOptions.map(interest => <label key={interest.id} className={`onboarding-interest${draft.interests.includes(interest.id) ? " is-selected" : ""}`}><input type="checkbox" checked={draft.interests.includes(interest.id)} onChange={() => updateProfileDraft({ interests: draft.interests.includes(interest.id) ? draft.interests.filter(id => id !== interest.id) : [...draft.interests, interest.id] })} /><span>{interest.label[locale]}</span>{draft.interests.includes(interest.id) && <Check size={16} aria-hidden="true" />}</label>)}</div></fieldset>
          <div className="onboarding-review"><CheckCircle2 size={20} /><p>{t("保存后会优先展示与你的阶段和关注主题相关的指南。", "После сохранения сначала появятся инструкции для вашего этапа и выбранных тем.")}</p></div>
        </div>}
        <div className="onboarding-actions">{step === 2 && <button className="button secondary" onClick={() => setStep(1)}><ArrowLeft size={18} />{t("上一步", "Назад")}</button>}<button className="button button-sticker onboarding-next" disabled={saving} onClick={step === 1 ? next : () => void save()}>{saving ? t("正在保存…", "Сохранение…") : step === 1 ? t("继续", "Продолжить") : t("完成设置，开始旅程", "Сохранить и начать")}<ArrowRight size={18} /></button></div>
        <div className="onboarding-reset">{resetConfirm ? <div className="onboarding-reset-confirm"><p>{t("重置个人情况？已收藏的指南和办理勾选会保留。", "Сбросить профиль? Сохранённые инструкции и отметки останутся.")}</p><div><button ref={confirmControl} className="text-button" disabled={saving} onClick={() => void reset()}>{t("确认重置", "Сбросить")}</button><button className="text-button" onClick={() => { setResetConfirm(false); requestAnimationFrame(() => resetControl.current?.focus()); }}>{t("取消", "Отмена")}</button></div></div> : <button ref={resetControl} className="text-button" onClick={() => { setResetConfirm(true); requestAnimationFrame(() => confirmControl.current?.focus()); }}>{t("重新选择个人情况", "Сбросить настройки профиля")}</button>}<p role="status">{resetNotice ? t("个人情况已重置，收藏和办理记录已保留。", "Профиль сброшен. Сохранённое и отметки остались.") : ""}</p></div>
        </>}
      </section>
    </div>
  </div>;
}
