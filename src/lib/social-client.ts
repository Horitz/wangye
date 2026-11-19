"use client";

export type SocialUser = { id: string; username: string; displayName: string };
export type SocialFriends = { friends: SocialUser[]; incoming: SocialUser[]; outgoing: SocialUser[] };
export type SocialMessage = { id: number; senderId: string; recipientId: string; body: string; createdAt: number };
export type SocialMessages = { messages: SocialMessage[]; hasMore: boolean };
export type FriendAction = "request" | "accept" | "decline" | "cancel" | "remove";
export const SOCIAL_SESSION_EVENT = "studentpath:member-session";

export async function socialRequest<T>(path: string, options: RequestInit = {}, userId?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (userId) headers.set("X-StudentPath-User", userId);
  const response = await fetch(`/api/social/${path}`, {
    ...options, headers, credentials: "same-origin", cache: "no-store",
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
  });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event(SOCIAL_SESSION_EVENT));
    throw new Error(typeof body.error === "string" ? body.error : "unavailable");
  }
  return body as T;
}

export function socialErrorCode(error: unknown): string {
  return error instanceof Error ? error.message : "unavailable";
}

export function socialErrorText(code: string, locale: "zh" | "ru"): string {
  const messages: Record<string, [string, string]> = {
    invalid_search: ["请输入完整的用户名或账号昵称。", "Введите полный логин или отображаемое имя."],
    invalid_credentials: ["用户名或密码不正确。", "Неверное имя пользователя или пароль."],
    username_taken: ["这个用户名已经有人使用，请换一个。", "Это имя пользователя уже занято. Выберите другое."],
    invalid_username: ["用户名需为 3–32 位字母、数字、点、下划线或短横线。", "Имя: 3–32 латинских символа, цифры, точка, дефис или подчёркивание."],
    invalid_password: ["密码需为 10–128 个字符。", "Пароль должен содержать от 10 до 128 символов."],
    invalid_display_name: ["请填写不超过 32 个字符的昵称。", "Введите имя длиной до 32 символов."],
    invalid_profile: ["请检查学校与个人情况后重试。", "Проверьте вуз и данные профиля."],
    unauthorized: ["请重新登录后继续。", "Войдите снова, чтобы продолжить."],
    session_changed: ["当前账号已改变，请重新打开会话。", "Аккаунт изменился. Откройте разговор снова."],
    not_friends: ["成为好友后就能聊天。", "Переписка доступна после добавления в друзья."],
    friendship_required: ["成为好友后就能聊天。", "Переписка доступна после добавления в друзья."],
    user_not_found: ["没有找到这个用户。", "Пользователь не найден."],
    request_pending: ["对方已向你发出申请，请到申请中接受。", "У вас есть заявка от этого пользователя. Примите её в разделе заявок."],
    request_not_found: ["这条申请已改变，请刷新列表。", "Эта заявка уже изменилась. Обновите список."],
    already_friends: ["你们已经是好友了，可以开始聊天。", "Вы уже друзья и можете начать переписку."],
    idempotency_conflict: ["消息提交状态有变化，请重新打开聊天确认。", "Статус сообщения изменился. Откройте разговор снова."],
    invalid_action: ["好友状态已改变，请刷新后再试。", "Статус дружбы изменился. Обновите список."],
    invalid_request: ["请检查填写的内容后再试。", "Проверьте введённые данные и попробуйте снова."],
    rate_limited: ["操作太频繁，请稍后再试。", "Слишком много попыток. Попробуйте чуть позже."],
    invalid_message: ["请输入 1–2000 个字符的消息。", "Введите сообщение длиной от 1 до 2000 символов."],
    forbidden: ["这次操作未被允许，请刷新后重试。", "Действие недоступно. Обновите страницу."],
  };
  return (messages[code] ?? ["暂时无法连接，请重试。", "Не удалось подключиться. Попробуйте снова."])[locale === "zh" ? 0 : 1];
}
