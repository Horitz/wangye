import { createInterface, emitKeypressEvents } from "node:readline";
import { normalizeUsername, validPassword, AdminError } from "../src/lib/server/admin-core.mjs";
import { openSiteAdminStore } from "../src/lib/server/site-store.mjs";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

function question(prompt) {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => input.question(prompt, answer => { input.close(); resolve(answer); }));
}
function secret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") throw new Error("interactive_terminal_required");
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const previousRaw = process.stdin.isRaw;
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = (error = null) => {
      process.stdin.removeListener("keypress", onKey);
      process.stdin.setRawMode(Boolean(previousRaw));
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error); else resolve(value);
    };
    const onKey = (text, key = {}) => {
      if (key.ctrl && (key.name === "c" || key.name === "d")) { finish(new Error("cancelled")); return; }
      if (key.name === "return" || key.name === "enter") { finish(); return; }
      if (key.name === "backspace") { value = [...value].slice(0, -1).join(""); return; }
      if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text) && value.length + text.length <= 128) value += text;
    };
    process.stdin.on("keypress", onKey);
  });
}
async function stdinSecret() {
  if (process.stdin.isTTY) throw new Error("stdin_flag_requires_pipe");
  const chunks = []; let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    if (length > 1024) throw new AdminError("invalid_password");
    chunks.push(chunk);
  }
  const value = Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  if (/[\r\n]/.test(value)) throw new AdminError("invalid_password");
  return value;
}
async function main() {
  const [action, ...args] = process.argv.slice(2);
  if (!["create", "reset"].includes(action)) throw new Error("usage");
  let username; let fromStdin = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--username" && !username && args[index + 1]) username = args[++index];
    else if (args[index] === "--password-stdin" && !fromStdin) fromStdin = true;
    else throw new Error("usage");
  }
  if (!username) {
    if (!process.stdin.isTTY) throw new Error("username_required");
    username = await question("管理员用户名 / Admin username (3–64, a-z 0-9 . _ -): ");
  }
  username = normalizeUsername(username);
  const password = fromStdin ? await stdinSecret() : await secret("新密码 / New password (12–128 characters, hidden): ");
  if (!validPassword(password)) throw new AdminError("invalid_password");
  if (!fromStdin && password !== await secret("再次输入 / Confirm password (hidden): ")) throw new Error("password_mismatch");
  const store = await openSiteAdminStore();
  try { await store.createAdmin(username, password, { reset: action === "reset" }); }
  finally {
    await store.close();
    if (process.env.DATABASE_URL) {
      const { closePostgres } = await import("../src/lib/server/postgres-connection.mjs");
      await closePostgres();
    }
  }
  process.stdout.write(action === "reset" ? "密码已重置；此管理员的全部会话已撤销。Password reset; all sessions for this administrator revoked.\n" : "管理员已创建。Administrator created.\n");
}
main().catch(error => {
  const messages = {
    usage: "用法 / Usage: npm run admin:create|admin:reset -- --username NAME [--password-stdin]. Passwords are never accepted in command arguments.",
    username_required: "非交互操作需要 --username。Non-interactive use requires --username.",
    interactive_terminal_required: "请在本机交互终端运行，密码输入不会显示。Run in an interactive terminal; password input stays hidden.",
    stdin_flag_requires_pipe: "--password-stdin 仅接收管道输入。--password-stdin requires piped input.",
    invalid_request: "用户名须为3–64个英文字母、数字、点、下划线或连字符，首位须为字母或数字。Username must use 3–64 letters, numbers, dots, underscores or hyphens, starting with a letter or number.",
    invalid_password: "密码须为12–128个字符，不能全为空白。Password must contain 12–128 characters and cannot be blank.",
    password_mismatch: "两次密码不同，未作更改。Passwords differ; nothing changed.",
    account_exists: "该管理员已存在。如需更换密码，请运行 admin:reset。Administrator exists; use admin:reset to change the password.",
    account_not_found: "未找到该管理员，未作更改。Administrator not found; nothing changed.",
    cancelled: "已取消，未作更改。Cancelled; nothing changed.",
  };
  process.stderr.write(`${messages[error.code ?? error.message] ?? "数据库暂不可用，未完成操作。Database unavailable; operation did not complete."}\n`);
  process.exitCode = 1;
});
