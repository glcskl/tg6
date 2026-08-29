import "dotenv/config";
import express from "express";
import { Bot, InlineKeyboard, webhookCallback } from "grammY";
import { ANSWERS, KEYWORD_REPLIES, type AnswerKey } from "./faq";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is required (see .env)");

const bot = new Bot(token);

const MENU_TEXT = `👋 Добрый день! Я FAQ-бот платформы <b>WorkDo</b>.
Расскажу о тарифах, возможностях и демо. Выберите, что интересно:`;

const mainMenu = new InlineKeyboard()
  .text("📊 Тарифы", "prices")
  .text("⚙️ Возможности", "features")
  .row()
  .text("ℹ️ О платформе", "about");

const backMenu = new InlineKeyboard().text("⬅️ В меню", "menu");

async function showMenu(ctx: any, chatId: number) {
  await ctx.api.sendMessage(chatId, MENU_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
}

bot.command("start", async (ctx) => {
  await showMenu(ctx, ctx.chat.id);
});

bot.command("help", async (ctx) => {
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

bot.command(["prices", "tariffs"], (ctx) => ctx.reply(ANSWERS.prices, { parse_mode: "HTML", reply_markup: backMenu }));
bot.command("features", (ctx) => ctx.reply(ANSWERS.features, { parse_mode: "HTML", reply_markup: backMenu }));
bot.command("about", (ctx) => ctx.reply(ANSWERS.about, { parse_mode: "HTML", reply_markup: backMenu }));

const answers = new Set<AnswerKey>(["prices", "features", "about"]);

bot.callbackQuery("menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(MENU_TEXT, { parse_mode: "HTML", reply_markup: mainMenu });
});

bot.on("callback_query:data", async (ctx) => {
  const key = ctx.callbackQuery.data as AnswerKey;
  if (!answers.has(key)) return;
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(ANSWERS[key], { parse_mode: "HTML", reply_markup: backMenu });
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  for (const entry of KEYWORD_REPLIES) {
    if (entry.triggers.some((rx) => rx.test(text))) {
      await ctx.reply(ANSWERS[entry.key], { parse_mode: "HTML", reply_markup: backMenu });
      return;
    }
  }
  await ctx.reply(ANSWERS.fallback, { parse_mode: "HTML", reply_markup: backMenu });
});

bot.catch((err) => {
  console.error("[bot error]", err.message ?? err);
});

const publicUrl = process.env.WEBHOOK_URL;

if (publicUrl) {
  const secret = process.env.WEBHOOK_SECRET ?? "";
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