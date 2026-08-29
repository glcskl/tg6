import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { Bot, type BotError, type Context, InlineKeyboard, webhookCallback } from "grammy";
import { ANSWERS, KEYWORD_REPLIES, type AnswerKey } from "./faq";

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
  };
}

const cfg = loadConfig();

const token = cfg.BOT_TOKEN;
if (!token)
  throw new Error(
    "BOT_TOKEN is required. Add it on Render: Settings -> Environment -> BOT_TOKEN (and WEBHOOK_URL, WEBHOOK_SECRET), then redeploy."
  );

const bot = new Bot(token);

const MENU_TEXT = `👋 Добрый день! Я FAQ-бот платформы <b>WorkDo</b>.
Расскажу о тарифах, возможностях и платформе. Выберите, что интересно:`;

const mainMenu = new InlineKeyboard()
  .text("📊 Тарифы", "prices")
  .text("⚙️ Возможности", "features")
  .row()
  .text("ℹ️ О платформе", "about");

const backMenu = new InlineKeyboard().text("⬅️ В меню", "menu");

async function showMenu(ctx: Context, chatId: number) {
  await ctx.api.sendMessage(chatId, MENU_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
}

bot.command("start", async (ctx: Context) => {
  await showMenu(ctx, ctx.chat!.id);
});

bot.command("help", async (ctx: Context) => {
  await ctx.reply(
    `Я отвечаю на вопросы о <b>WorkDo</b>.\n\n` +
      `Команды:\n` +
      `/prices — тарифы (BYN)\n` +
      `/features — возможности\n` +
      `/about — о платформе\n` +
      `/help — эта справка`,
    { parse_mode: "HTML" }
  );
});

bot.command(["prices", "tariffs"], (ctx: Context) => ctx.reply(ANSWERS.prices, { parse_mode: "HTML", reply_markup: backMenu }));
bot.command("features", (ctx: Context) => ctx.reply(ANSWERS.features, { parse_mode: "HTML", reply_markup: backMenu }));
bot.command("about", (ctx: Context) => ctx.reply(ANSWERS.about, { parse_mode: "HTML", reply_markup: backMenu }));

const answers = new Set<AnswerKey>(["prices", "features", "about"]);

bot.callbackQuery("menu", async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(MENU_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
});

bot.on("callback_query:data", async (ctx: Context) => {
  const key = ctx.callbackQuery!.data as AnswerKey;
  if (!answers.has(key)) return;
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(ANSWERS[key], { parse_mode: "HTML", reply_markup: backMenu });
});

bot.on("message:text", async (ctx: Context) => {
  const text = ctx.message!.text!.trim();
  for (const entry of KEYWORD_REPLIES) {
    if (entry.triggers.some((rx) => rx.test(text))) {
      await ctx.reply(ANSWERS[entry.key], { parse_mode: "HTML", reply_markup: backMenu });
      return;
    }
  }
  await ctx.reply(ANSWERS.fallback, { parse_mode: "HTML", reply_markup: backMenu });
});

bot.catch((err: BotError) => {
  console.error("[bot error]", err.message ?? err);
});

const publicUrl = cfg.WEBHOOK_URL;

if (publicUrl) {
  const secret = cfg.WEBHOOK_SECRET || "";
  const hookPath = process.env.HOOK_PATH ?? "/webhook";
  const url = secret ? `${publicUrl}${hookPath}/${secret}` : `${publicUrl}${hookPath}`;

  const app = express();
  app.use(express.json());
  app.get("/healthz", (_req, res) => res.send("ok"));
  app.use(webhookCallback(bot, "express", { secretToken: secret || undefined }));

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, async () => {
    try {
      const ok = await bot.api.setWebhook(url, {
        secret_token: secret || undefined,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      });
      console.log(ok ? `[webhook] set: ${url}` : "[webhook] FAILED to set");
    } catch (err) {
      console.error("[webhook] error:", err);
    }
  });
} else {
  (async () => {
    try {
      await bot.init();
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      console.log(`[polling] @${bot.botInfo.username} started`);
      await bot.start({ allowed_updates: ["message", "callback_query"] });
    } catch (err) {
      console.error("[polling] error:", err);
      process.exit(1);
    }
  })();
}