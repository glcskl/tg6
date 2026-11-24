import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { Bot, type BotError, type Context, InlineKeyboard, webhookCallback } from "grammy";
import { ANSWERS, KEYWORD_REPLIES, type AnswerKey } from "./faq";
import { demoCallback, demoText, openDemo } from "./demo";

function loadConfig() {
  let file: Record<string, string> = {};
  try {
    file = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "bot.config.json"), "utf8"));
  } catch {
    // bot.config.json optional when env vars are set
  }
  const pick = (k: string) => process.env[k] || file[k] || "";
  return {
    BOT_TOKEN: pick("BOT_TOKEN"),
    WEBHOOK_URL: pick("WEBHOOK_URL"),
    WEBHOOK_SECRET: pick("WEBHOOK_SECRET"),
    MINI_APP_URL: pick("MINI_APP_URL"),
  };
}

const cfg = loadConfig();

const LANDING_URL = "https://glcskl.github.io/workdo-landing/";

const publicUrl = cfg.WEBHOOK_URL.replace(/\/+$/, "");
const appUrl = (cfg.MINI_APP_URL || (publicUrl ? `${publicUrl}/app/` : "")).replace(/\/+$/, "") + "/";
const hookPath = (process.env.HOOK_PATH || "/webhook").replace(/\/+$/, "") || "/webhook";

const token = cfg.BOT_TOKEN;
if (!token)
  throw new Error(
    "BOT_TOKEN is required. Add it on Render: Settings -> Environment -> BOT_TOKEN (and WEBHOOK_URL, WEBHOOK_SECRET), then redeploy."
  );

const bot = new Bot(token);

const MENU_TEXT = `Здравствуйте! <b>WorkDo</b> — система управления бизнесом.
«Бизнес под контролем»: кадры, смены, зарплата, объекты, инциденты, финансы и отчёты — в одной системе.

Тарифы от 6 270 ₽ в месяц. Демо работает в Telegram, без регистрации.

Выберите раздел ниже:`;

const mainMenu = new InlineKeyboard()
  .text("Тарифы", "prices")
  .text("Возможности", "features")
  .row()
  .text("О платформе", "about")
  .text("Поддержка", "support")
  .row()
  .text("Демо в чате", "dm:open")
  .row()
  .webApp("Демо", LANDING_URL)
  .url("Сайт", LANDING_URL);

if (appUrl && appUrl !== "/") {
  mainMenu.row().webApp("Открыть мини-аппу", appUrl);
}

const backMenu = new InlineKeyboard().text("← В меню", "menu");
const demoMenu = new InlineKeyboard()
  .text("Открыть демо", "dm:open")
  .row()
  .text("← В меню", "menu");

if (appUrl && appUrl !== "/") {
  demoMenu.row().webApp("Открыть мини-аппу", appUrl);
}
demoMenu.row().webApp("Демо", LANDING_URL).url("Сайт", LANDING_URL);

async function showMenu(ctx: Context, chatId: number) {
  await ctx.api.sendMessage(chatId, MENU_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
}

bot.command("start", async (ctx: Context) => {
  await showMenu(ctx, ctx.chat!.id);
});

bot.command("help", async (ctx: Context) => {
  await ctx.reply(
    `<b>WorkDo</b> — система управления бизнесом: кадры, смены, зарплата, объекты, инциденты, финансы и отчёты.\n\n` +
      `Команды:\n` +
      `/prices — актуальные тарифы (₽)\n` +
      `/features — возможности и модули\n` +
      `/about — о системе и внедрении\n` +
      `/support — контакты поддержки\n` +
      `/demo — живое демо WorkDo в чате\n` +
      `/app — открыть мини-аппу WorkDo\n` +
      `/site — демо и сайт WorkDo\n` +
      `/help — данная справка\n\n` +
      `Кнопки «Демо» и «Сайт» ведут на <a href="${LANDING_URL}">лендинг WorkDo</a>.`,
    { parse_mode: "HTML" }
  );
});

bot.command(["prices", "tariffs"], (ctx: Context) => ctx.reply(ANSWERS.prices, { parse_mode: "HTML", reply_markup: backMenu }));
bot.command("features", (ctx: Context) => ctx.reply(ANSWERS.features, { parse_mode: "HTML", reply_markup: backMenu }));
bot.command("about", (ctx: Context) => ctx.reply(ANSWERS.about, { parse_mode: "HTML", reply_markup: backMenu }));
bot.command("support", (ctx: Context) => ctx.reply(ANSWERS.support, { parse_mode: "HTML", reply_markup: backMenu }));
bot.command("demo", (ctx: Context) => openDemo(ctx));
bot.command("app", async (ctx: Context) => {
  if (!appUrl || appUrl === "/") {
    await ctx.reply("Мини-аппа ещё не настроена. Задайте MINI_APP_URL или WEBHOOK_URL на сервере.");
    return;
  }
  await ctx.reply("Откройте интерактивное демо WorkDo в мини-аппе:", {
    reply_markup: new InlineKeyboard().webApp("Открыть мини-аппу", appUrl),
  });
});

const landingMenu = new InlineKeyboard()
  .webApp("Демо", LANDING_URL)
  .url("Сайт", LANDING_URL);

bot.command("site", async (ctx: Context) => {
  await ctx.reply("Демо и сайт WorkDo:", { reply_markup: landingMenu });
});

const answers = new Set<AnswerKey>(["prices", "features", "about", "support", "demo"]);

bot.callbackQuery("menu", async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(MENU_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
});

bot.callbackQuery("dm:a:menu", async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(MENU_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
});

bot.on("callback_query:data", async (ctx: Context) => {
  const data = ctx.callbackQuery!.data as string;
  if (await demoCallback(ctx, data)) return;
  const key = data as AnswerKey;
  if (!answers.has(key)) return;
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(ANSWERS[key], { parse_mode: "HTML", reply_markup: key === "demo" ? demoMenu : backMenu });
});

bot.on("message:text", async (ctx: Context) => {
  const text = ctx.message!.text!.trim();
  if (await demoText(ctx, text)) return;
  for (const entry of KEYWORD_REPLIES) {
    if (entry.triggers.some((rx) => rx.test(text))) {
      await ctx.reply(ANSWERS[entry.key], {
        parse_mode: "HTML",
        reply_markup: entry.key === "demo" ? demoMenu : backMenu,
      });
      return;
    }
  }
  await ctx.reply(ANSWERS.fallback, { parse_mode: "HTML", reply_markup: backMenu });
});

bot.catch((err: BotError) => {
  console.error("[bot error]", err.message ?? err);
});

async function setupMenuButton() {
  if (!appUrl || appUrl === "/") return;
  try {
    await bot.api.setChatMenuButton({
      menu_button: { type: "web_app", text: "Мини-аппа", web_app: { url: appUrl } },
    });
    console.log(`[menu button] set: ${appUrl}`);
  } catch (err) {
    console.error("[menu button] error:", err);
  }
}

if (publicUrl) {
  const secret = cfg.WEBHOOK_SECRET || "";
  const url = secret ? `${publicUrl}${hookPath}/${secret}` : `${publicUrl}${hookPath}`;

  const app = express();
  app.use(express.json());
  app.get("/healthz", (_req, res) => res.send("ok"));
  app.get("/", (_req, res) => res.redirect("/app/"));
  app.use("/app", express.static(path.join(__dirname, "..", "public"), { index: "index.html" }));

  // В webhook-режиме grammY не перехватывает ошибки middleware сам (это делает
  // только long polling), поэтому ловим их здесь, иначе процесс падает и Render
  // перезапускает бота при любой неудачной отправке сообщения.
  const handleUpdate = webhookCallback(bot, "express", { secretToken: secret || undefined });
  app.use(hookPath, async (req, res) => {
    try {
      await handleUpdate(req, res);
    } catch (err) {
      console.error("[webhook error]", err);
      if (!res.headersSent) res.sendStatus(500);
      else res.end();
    }
  });

  const port = Number(process.env.PORT ?? 3000);
  void (async () => {
    try {
      await bot.init();
    } catch (err) {
      console.error("[bot init] error:", err);
      process.exit(1);
    }
    app.listen(port, async () => {
      try {
        const ok = await bot.api.setWebhook(url, {
          secret_token: secret || undefined,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: false,
        });
        console.log(ok ? `[webhook] set: ${url}` : "[webhook] FAILED to set");
      } catch (err) {
        console.error("[webhook] error:", err);
      }
      await setupMenuButton();
    });
  })();
} else {
  (async () => {
    try {
      await bot.init();
      await bot.api.deleteWebhook({ drop_pending_updates: false });
      await setupMenuButton();
      console.log(`[polling] @${bot.botInfo.username} started`);
      await bot.start({ allowed_updates: ["message", "callback_query"] });
    } catch (err) {
      console.error("[polling] error:", err);
      process.exit(1);
    }
  })();
}