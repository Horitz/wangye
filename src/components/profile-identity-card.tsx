"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Check, GraduationCap, Pencil, School, Trash2, Upload, UserRound } from "lucide-react";
import { ClayStudent } from "@/components/clay-student";
import { SketchSticker } from "@/components/campus-sketch";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { MemberLogout } from "@/components/member-logout";
import { useMemberSession } from "@/components/member-session";
import { facultyOptions, stageOptions } from "@/data/profile-options";
import { getSchool } from "@/data/school-options";
import { useHomeState } from "@/lib/home-store";
import {
  IDENTITY_NICKNAME_LIMIT, identityPresets, prepareIdentityPhoto, savePersonalIdentity, usePersonalIdentity,
  type IdentityImageError, type PersonalIdentityDraft,
} from "@/lib/personal-identity-store";

function IdentityAvatar({ value }: { value: PersonalIdentityDraft }) {
  return <span className={`identity-avatar identity-avatar--${value.preset}`} aria-hidden="true">
    {value.photo ? <Image src={value.photo} alt="" width={256} height={256} unoptimized /> : <ClayStudent variant={value.preset} />}
  </span>;
}

export function ProfileIdentityCard({ onOpenAccount }: { onOpenAccount: () => void }) {
  const identity = usePersonalIdentity();
  const member = useMemberSession();
  const profile = useHomeState();
  const { locale } = profile;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PersonalIdentityDraft>({ nickname: "", preset: "curly", photo: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<IdentityImageError | "nickname" | "save" | null>(null);
  const [saved, setSaved] = useState<"saved" | "memory" | null>(null);
  const generation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => () => { generation.current++; }, []);
  const labels = {
    curly: t("卷发", "Кудри"), glasses: t("眼镜", "Очки"), longhair: t("长发", "Длинные волосы"), beanie: t("毛线帽", "Шапка"),
  };
  const errorText = error === "format" ? t("请选择 JPEG、PNG 或 WebP 图片，不支持 SVG。", "Выберите JPEG, PNG или WebP. SVG не поддерживается.")
    : error === "file-size" ? t("图片须小于或等于 5 MB，且不能是空文件。", "Нужен непустой файл размером не более 5 МБ.")
      : error === "dimensions" ? t("图片每边不能超过 4096 像素，总像素不能超过 1600 万。", "Каждая сторона — до 4096 пикселей, всего — не более 16 мегапикселей.")
        : error === "decode" ? t("这张图片无法读取，请换一张 JPEG、PNG 或 WebP 图片。", "Не удалось прочитать изображение. Выберите другой JPEG, PNG или WebP.")
          : error === "nickname" ? t("昵称最多 32 个字符，请移除换行或控制字符。", "В имени может быть до 32 символов, без переносов строк и управляющих знаков.")
            : error === "save" ? t("无法保存这份资料，请重新选择头像后再试。", "Не удалось сохранить карточку. Выберите аватар ещё раз.") : null;
  const close = () => { generation.current++; setEditing(false); setBusy(false); };
  const beginEdit = () => {
    generation.current++;
    setDraft({ nickname: identity.nickname, preset: identity.preset, photo: identity.photo });
    setError(null); setSaved(null); setBusy(false); setEditing(true);
  };
  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const request = ++generation.current;
    setError(null); setBusy(true);
    try {
      const photo = await prepareIdentityPhoto(file);
      if (request === generation.current) setDraft(previous => ({ ...previous, photo }));
    } catch (cause) {
      if (request === generation.current) {
        const code = cause instanceof Error ? cause.message : "decode";
        setError(["format", "file-size", "dimensions", "decode"].includes(code) ? code as IdentityImageError : "decode");
      }
    } finally { if (request === generation.current) setBusy(false); }
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (draft.nickname.trim().length > IDENTITY_NICKNAME_LIMIT || /\p{Cc}/u.test(draft.nickname)) {
      setError("nickname"); nameInput.current?.focus(); return;
    }
    const result = savePersonalIdentity(draft);
    if (result === "invalid") { setError("save"); return; }
    setSaved(result); close();
  };
  const unset = t("未设置", "Не указано");
  const school = profile.profileSet ? getSchool(profile.university).shortLabel[locale] : unset;
  const stage = profile.profileSet ? stageOptions.find(option => option.id === profile.stage)?.label[locale] ?? unset : unset;
  const faculty = profile.profileSet ? facultyOptions.find(option => option.id === profile.faculty && option.university === profile.university)?.label[locale] ?? unset : unset;

  return <>
    <section className="profile-identity-card material-glass" aria-labelledby={`${id}-title`}>
      <div className="identity-card-top">
        <div className="identity-portrait-scene">
          <span className="identity-portrait-sticker"><SketchSticker kind="compass" /></span>
          <button type="button" className="identity-avatar-edit" onClick={beginEdit} disabled={!identity.hydrated} aria-label={t("编辑昵称与头像", "Изменить имя и аватар")} aria-haspopup="dialog">
            <IdentityAvatar value={identity} /><span className="identity-camera"><Camera size={18} strokeWidth={1.75} /></span>
          </button>
          <span className="identity-portrait-sticker"><SketchSticker kind="book" /></span>
        </div>
        <h2 id={`${id}-title`}>{identity.nickname || member.user?.displayName || t("你的个人名片", "Ваша карточка")}</h2>
        <span className="identity-local-label">{member.user ? `@${member.user.username}` : member.loaded ? t("尚未登录", "Вы не вошли") : t("正在读取账号…", "Загрузка аккаунта…")}</span>
        <button type="button" className="identity-text-action" onClick={beginEdit} disabled={!identity.hydrated} aria-haspopup="dialog"><Pencil size={16} strokeWidth={1.75} />{t("编辑名片", "Изменить карточку")}</button>
      </div>
      <dl className="identity-facts">
        <div><dt><School size={18} strokeWidth={1.75} />{t("学校", "Университет")}</dt><dd>{school}</dd></div>
        <div><dt><UserRound size={18} strokeWidth={1.75} />{t("当前阶段", "Сейчас")}</dt><dd>{stage}</dd></div>
        <div><dt><GraduationCap size={18} strokeWidth={1.75} />{t("院系", "Факультет")}</dt><dd>{faculty}</dd></div>
      </dl>
      <div className="identity-card-actions">
        <Link className="button button-sticker" href="/onboarding"><Pencil size={18} strokeWidth={1.75} />{profile.profileSet ? t("修改个人情况", "Изменить профиль") : t("设置个人情况", "Настроить профиль")}</Link>
        <button className="button secondary" type="button" onClick={onOpenAccount}><UserRound size={18} strokeWidth={1.75} />{member.user ? t("账号设置", "Настройки аккаунта") : t("登录 / 注册", "Вход / Регистрация")}</button>
        <MemberLogout />
      </div>
      {saved && <p className="identity-feedback" role="status">{saved === "saved" ? t("名片已保存。", "Карточка сохранена.") : t("名片已更新，仅在本次浏览中保留。", "Карточка обновлена только для текущего просмотра.")}</p>}
      {identity.storageUnavailable && <p className="identity-storage-notice" role="status">{t("浏览器存储不可用或已有记录损坏。新修改仅在本次浏览中保留，原记录未覆盖。", "Хранилище недоступно или запись повреждена. Изменения останутся только до перезагрузки; исходная запись не перезаписана.")}</p>}
    </section>
    <WorkspaceDialog open={editing} onClose={close} title={t("编辑个人名片", "Изменить личную карточку")}>
      <form className="identity-editor" onSubmit={save}>
        <div className="identity-editor-preview"><IdentityAvatar value={draft} /><p>{t("选择一种模样，或放上你自己的照片。", "Выберите персонажа или своё фото.")}</p></div>
        <label className="identity-name-label" htmlFor={`${id}-name`}>{t("昵称（可选）", "Имя (необязательно)")}</label>
        <input ref={nameInput} className="identity-name-input" id={`${id}-name`} value={draft.nickname} maxLength={IDENTITY_NICKNAME_LIMIT} onChange={event => { setDraft(previous => ({ ...previous, nickname: event.target.value })); if (error === "nickname") setError(null); }} autoComplete="off" aria-describedby={`${id}-name-help`} aria-invalid={error === "nickname"} />
        <p className="identity-field-note" id={`${id}-name-help`}>{t("最多 32 个字符", "До 32 символов")}</p>
        <fieldset className="identity-preset-fieldset"><legend>{t("预设头像", "Готовый аватар")}</legend><div className="identity-presets">
          {identityPresets.map(preset => <label className="identity-preset" key={preset}>
            <input type="radio" name={`${id}-preset`} value={preset} checked={draft.photo === null && draft.preset === preset} onChange={() => { generation.current++; setBusy(false); setError(null); setDraft(previous => ({ ...previous, preset, photo: null })); }} />
            <span className="identity-preset-content"><IdentityAvatar value={{ nickname: "", preset, photo: null }} /><span>{labels[preset]}</span><Check className="identity-preset-check" size={18} strokeWidth={1.75} /></span>
          </label>)}
        </div></fieldset>
        <div className="identity-photo-actions">
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} hidden />
          <button className="button secondary" type="button" onClick={() => fileInput.current?.click()}><Upload size={18} strokeWidth={1.75} />{t("选择照片", "Выбрать фото")}</button>
          {draft.photo && <button className="identity-text-action" type="button" onClick={() => { generation.current++; setBusy(false); setError(null); setDraft(previous => ({ ...previous, photo: null })); }}><Trash2 size={18} strokeWidth={1.75} />{t("删除照片", "Удалить фото")}</button>}
        </div>
        <p className="identity-field-note">{t("JPEG、PNG 或 WebP，最大 5 MB。照片会居中裁成方形。", "JPEG, PNG или WebP, до 5 МБ. Фото обрезается по центру до квадрата.")}</p>
        {busy && <p className="identity-feedback" role="status">{t("正在处理图片…", "Обработка изображения…")}</p>}
        {errorText && <p className="identity-error" role="alert">{errorText}</p>}
        {identity.storageUnavailable && <p className="identity-storage-notice">{t("当前只能临时保存，刷新后可能丢失新修改。", "Сейчас доступно только временное сохранение. После перезагрузки изменения могут исчезнуть.")}</p>}
        <div className="identity-editor-footer"><button className="button secondary" type="button" onClick={close}>{t("取消", "Отмена")}</button><button className="button button-sticker" type="submit" disabled={busy}>{t("保存名片", "Сохранить")}</button></div>
      </form>
    </WorkspaceDialog>
  </>;
}
