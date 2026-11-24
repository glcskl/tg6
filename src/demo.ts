import { InputFile, InlineKeyboard, type Context } from "grammy";

type RoleId = "owner" | "admin" | "lead" | "guard";
type SectionId = "overview" | "shifts" | "staff" | "objects" | "incidents" | "finance" | "reports";
type TaskId = "role" | "shift" | "incident" | "export";

interface Role {
  id: RoleId;
  name: string;
  short: string;
  access: number;
}

interface Section {
  id: SectionId;
  label: string;
}

interface Shift {
  name: string;
  team: string;
  post: string;
  type: string;
  status: string;
  initials: string;
}

interface StaffRow extends Shift {
  position: string;
  license: string;
  rate: number;
  hours: number;
}

interface Incident {
  id: number;
  title: string;
  place: string;
  time: string;
  category: string;
  severity: string;
  damage: string;
  status: string;
  reason: string;
}

interface DemoState {
  role: RoleId;
  section: SectionId;
  extraShifts: number;
  completedShifts: number[];
  incidents: Incident[];
  nextIncidentId: number;
  exported: boolean;
  lastReport: string;
  tasks: TaskId[];
  status: string;
  pending: "incident_title" | null;
}

const COMPANY = "ЧОП «Редут»";
const DEMO_DATE = "17 ноября 2026";
const DEMO_DATE_SHORT = "17.11.2026";

const ROLES: Role[] = [
  { id: "owner", name: "Владелец", short: "Владелец", access: 19 },
  { id: "admin", name: "Администратор", short: "Админ", access: 17 },
  { id: "lead", name: "Начальник смены", short: "Нач. смены", access: 11 },
  { id: "guard", name: "Охранник", short: "Охранник", access: 6 },
];

const SECTIONS: Section[] = [
  { id: "overview", label: "Обзор" },
  { id: "shifts", label: "Смены" },
  { id: "staff", label: "Кадры" },
  { id: "objects", label: "Объекты" },
  { id: "incidents", label: "Инциденты" },
  { id: "finance", label: "Финансы" },
  { id: "reports", label: "Отчёты" },
];

const DENIED: Record<RoleId, SectionId[]> = {
  owner: [],
  admin: [],
  lead: ["finance", "reports"],
  guard: ["staff", "finance", "reports"],
};

const SHIFTS: Shift[] = [
  { name: "Дмитрий Ковалёв", team: "Бригада №2", post: "Пост №2 · входной", type: "сутки/трое", status: "В смене", initials: "ДК" },
  { name: "Игорь Соколов", team: "Бригада №1", post: "Пост №1 · стационарный", type: "день/ночь", status: "В смене", initials: "ИС" },
  { name: "Руслан Ахметов", team: "Бригада №3", post: "Пост №1 · приёмки", type: "день", status: "Отдыхает", initials: "РА" },
  { name: "Анна Мельникова", team: "Патруль", post: "Патруль · автомобильный", type: "сутки", status: "В смене", initials: "АМ" },
];

const STAFF: StaffRow[] = [
  { ...SHIFTS[0], position: "Охранник", license: "№ 4412 · до 12.27", rate: 220, hours: 168 },
  { ...SHIFTS[1], position: "Нач. смены", license: "№ 3180 · до 08.27", rate: 320, hours: 172 },
  { ...SHIFTS[2], position: "Охранник", license: "№ 5591 · до 03.28", rate: 210, hours: 160 },
  { ...SHIFTS[3], position: "Водитель", license: "№ 2204 · до 11.26", rate: 260, hours: 164 },
];

const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 114,
    title: "Попытка прохода по чужому пропуску",
    place: "Пост №2 · БЦ «Север»",
    time: "17.11.2026, 09:42",
    category: "Несанкц. доступ",
    severity: "высокая",
    damage: "12 400 ₽",
    status: "расследование",
    reason: "Пропуск не блокируется после увольнения",
  },
  {
    id: 113,
    title: "Разбито стекло на парковке",
    place: "Пост №3 · БЦ «Север»",
    time: "16.11.2026, 21:15",
    category: "Вандализм",
    severity: "средняя",
    damage: "8 000 ₽",
    status: "открыт",
    reason: "Не освещён участок маршрута",
  },
  {
    id: 112,
    title: "Сработка сигнализации",
    place: "ЖК «Тихий парк»",
    time: "15.11.2026, 03:20",
    category: "Техническая неисправность",
    severity: "низкая",
    damage: "0 ₽",
    status: "закрыт",
    reason: "Датчик заменён по заявке",
  },
];

const MONTHS = [
  { m: "июн", plan: 78, fact: 74 },
  { m: "июл", plan: 80, fact: 82 },
  { m: "авг", plan: 82, fact: 79 },
  { m: "сен", plan: 85, fact: 88 },
  { m: "окт", plan: 87, fact: 86 },
  { m: "ноя", plan: 90, fact: 94 },
];

const OBJECTS = [
  { name: "БЦ «Север»", address: "Москва, Ленинградский пр-т, 74", posts: 2, status: "Активен" },
  { name: "ЖК «Тихий парк»", address: "Москва, ул. Академика Королёва, 12", posts: 2, status: "Активен" },
  { name: "Склад «Восток»", address: "Московская обл., Домодедово", posts: 1, status: "Требует внимания" },
  { name: "Банк «Кредит»", address: "Москва, Тверская, 18", posts: 3, status: "Активен" },
];

const BUDGET = [
  ["Охрана объектов", "1 420 000", "1 468 000", "+3,4%"],
  ["Оплата труда", "640 000", "662 000", "+3,4%"],
  ["Налоги и взносы", "238 000", "241 000", "+1,3%"],
  ["Транспорт", "82 000", "79 000", "−3,7%"],
];

const AUDIT = [
  { date: "17.11", time: "09:42", who: "С. Громов", field: "инцидент · статус", before: "открыт", after: "расследуется" },
  { date: "17.11", time: "09:58", who: "С. Громов", field: "инцидент · ущерб", before: "0 ₽", after: "12 400 ₽" },
  { date: "17.11", time: "16:05", who: "М. Ким", field: "смена · статус", before: "в работе", after: "завершена" },
  { date: "17.11", time: "16:06", who: "система", field: "табель · часы", before: "—", after: "12 ч" },
];

const REPORTS = [
  { slug: "shifts", label: "График смен", rows: "18 строк" },
  { slug: "staff", label: "Сотрудники", rows: "31 строка" },
  { slug: "incidents", label: "Инциденты", rows: "3 строки" },
  { slug: "finance", label: "Финансы и бюджет", rows: "6 месяцев" },
  { slug: "timesheet", label: "Табель", rows: "31 строка" },
  { slug: "payroll", label: "ФОТ", rows: "6 месяцев" },
];

const TASK_LABELS: Record<TaskId, string> = {
  role: "Переключите роль — доступы изменятся",
  shift: "Проведите смену до завершения",
  incident: "Создайте инцидент и закройте его",
  export: "Выгрузите отчёт в CSV",
};

const states = new Map<number, DemoState>();

function chatId(ctx: Context): number {
  return ctx.chat?.id ?? ctx.from!.id;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function makeCsv(rows: (string | number)[][]): string {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

function defaultState(): DemoState {
  return {
    role: "owner",
    section: "overview",
    extraShifts: 0,
    completedShifts: [],
    incidents: INITIAL_INCIDENTS.map((item) => ({ ...item })),
    nextIncidentId: 115,
    exported: false,
    lastReport: "",
    tasks: [],
    status: "",
    pending: null,
  };
}

function getState(id: number): DemoState {
  let state = states.get(id);
  if (!state) {
    state = defaultState();
    states.set(id, state);
  }
  return state;
}

function canSee(role: RoleId, section: SectionId): boolean {
  return !DENIED[role].includes(section);
}

function mark(state: DemoState, task: TaskId): void {
  if (!state.tasks.includes(task)) state.tasks.push(task);
}

function roleName(role: RoleId): string {
  return ROLES.find((item) => item.id === role)!.name;
}

function roleAccess(role: RoleId): number {
  return ROLES.find((item) => item.id === role)!.access;
}

function sectionTitle(section: SectionId): string {
  return SECTIONS.find((item) => item.id === section)!.label;
}

function checklist(state: DemoState): string {
  const order: TaskId[] = ["role", "shift", "incident", "export"];
  const count = order.filter((id) => id !== "role" && state.tasks.includes(id)).length;
  const lines = order.map((id) => `${state.tasks.includes(id) ? "✓" : "·"} ${TASK_LABELS[id]}`);
  return `<b>Что попробовать</b> · ${count}/3\n${lines.join("\n")}`;
}

function header(state: DemoState): string {
  return (
    `<b>Живое демо WorkDo</b> · ${escapeHtml(COMPANY)}\n` +
    `${DEMO_DATE} · данные вымышленные\n` +
    `Роль: <b>${escapeHtml(roleName(state.role))}</b> · ${roleAccess(state.role)}/19 разделов`
  );
}

function overviewText(): string {
  const lastIncidents = INITIAL_INCIDENTS.slice(0, 2)
    .map((item) => `#${item.id} ${escapeHtml(item.title)} · ${escapeHtml(item.status)}`)
    .join("\n");
  const onShift = SHIFTS.slice(0, 3)
    .map((item) => `${escapeHtml(item.name)} · ${escapeHtml(item.post)} · ${escapeHtml(item.status)}`)
    .join("\n");
  return (
    `<b>Панель управления охранным предприятием</b>\n` +
    `${escapeHtml(COMPANY)} · ${DEMO_DATE}\n\n` +
    `<b>Показатели</b>\n` +
    `Сотрудники: 31 · в базе компании\n` +
    `Активные смены: 18 · сейчас на посту\n` +
    `Посты: 18 · 5 объектов на обслуживании\n` +
    `Инциденты: 3 · всего зарегистрировано\n\n` +
    `<b>Статистика инцидентов</b>\n` +
    `По статусу: открыты 2 · в расследовании 1 · закрыты 12\n` +
    `По серьёзности: низкая 6 · средняя 5 · высокая 3\n` +
    `По приоритету: низкий 7 · средний 4 · срочный 1\n\n` +
    `<b>Ближайшая выплата зарплаты</b>\n` +
    `25 ноября, осталось 8 дн. · 2 480 000 ₽ · 31 сотрудник\n\n` +
    `<b>Последние инциденты</b>\n${lastIncidents}\n\n` +
    `<b>Кто на смене</b>\n${onShift}`
  );
}

function shiftsText(state: DemoState): string {
  const week = [
    "пн 17: Д Н",
    "вт 18: Д",
    "ср 19: Н",
    "чт 20: Д С",
    "пт 21: Д Н",
    "сб 22: —",
    "вс 23: Д Н",
  ];
  const rows = SHIFTS.map((shift, index) => {
    const done = state.completedShifts.includes(index);
    const status = done ? "Завершена" : shift.status;
    return `${index + 1}. ${escapeHtml(shift.name)} · ${escapeHtml(shift.team)} · ${escapeHtml(shift.post)}\n` +
      `   ${escapeHtml(shift.type)} · ${escapeHtml(status)}`;
  }).join("\n\n");
  const added = state.extraShifts > 0 ? `\nДобавлено смен по шаблону: ${state.extraShifts} · новая смена на 18 ноября.` : "";
  return (
    `<b>Смены / ноябрь 2026</b>\n` +
    `Смена связывает сотрудника, пост и время. Завершённая смена уходит в табель.\n\n` +
    `<b>Календарь недели</b>\n${week.join(" · ")}\n\n` +
    `<b>Смены</b>\n${rows}${added}\n\n` +
    `<i>Сгенерировано ${18 + state.extraShifts} смен по шаблону. Табель обновляется автоматически.</i>`
  );
}

function staffText(): string {
  const rows = STAFF.map((item) =>
    `${escapeHtml(item.name)} · ${escapeHtml(item.position)}\n` +
    `   ${escapeHtml(item.license)} · ${item.rate} ₽/ч · ${item.hours} ч`
  ).join("\n\n");
  return (
    `<b>Кадры · 31 сотрудник</b>\n` +
    `Кадровые данные и лицензии доступны по роли. Импорт CSV/XLSX — 31 колонка, в демо отключён.\n\n` +
    `${rows}\n\n` +
    `<i>Охранник видит только свою карточку. Остальные данные скрыты на уровне таблиц.</i>`
  );
}

function objectsText(): string {
  const rows = OBJECTS.map((item) =>
    `${escapeHtml(item.name)} · ${escapeHtml(item.status)}\n` +
    `   ${escapeHtml(item.address)} · ${item.posts} поста · инструкции и чекпоинты`
  ).join("\n\n");
  return (
    `<b>Объекты · 5 на обслуживании</b>\n` +
    `Пост знает своего клиента, инструкцию и маршрут обхода.\n\n` +
    `${rows}\n\n` +
    `<i>Добавление отключено в демо.</i>`
  );
}

function incidentsText(state: DemoState): string {
  const visible = state.incidents.slice(0, 6);
  const rows = visible.map((item) =>
    `#${item.id} · ${escapeHtml(item.severity)} · ${escapeHtml(item.status)}\n` +
    `<b>${escapeHtml(item.title)}</b>\n` +
    `${escapeHtml(item.place)} · ${escapeHtml(item.time)}\n` +
    `Категория: ${escapeHtml(item.category)} · ущерб: ${escapeHtml(item.damage)}\n` +
    `Причина: ${escapeHtml(item.reason)}`
  ).join("\n\n");
  const more = state.incidents.length > visible.length
    ? `\n\nПоказаны последние ${visible.length} из ${state.incidents.length} инцидентов.`
    : "";
  return (
    `<b>Происшествия · ноябрь 2026</b>\n` +
    `Категория, серьёзность, ущерб и корневая причина — обязательные поля расследования.\n\n` +
    `${rows}${more}`
  );
}

function financeText(state: DemoState): string {
  const months = MONTHS.map((item) => `${item.m} ${item.plan}/${item.fact}`).join(" · ");
  const budget = BUDGET.map((row) => row.map((cell) => escapeHtml(cell)).join(" · ")).join("\n");
  const exported = state.exported ? `\n\n<i>Последняя выгрузка: ${escapeHtml(state.lastReport || "Финансы")} · UTF-8, разделитель «;».</i>` : "";
  return (
    `<b>Деньги · июнь — ноябрь 2026</b>\n` +
    `Доходы, ФОТ и налоги собираются из операций. Бюджет показывает отклонение до закрытия месяца.\n\n` +
    `<b>План / факт по месяцам</b>\n${months}\nНоябрь: +3,7% к плану.\n\n` +
    `<b>Статья бюджета · план · факт · отклонение</b>\n${budget}${exported}`
  );
}

function reportsText(state: DemoState): string {
  const rows = REPORTS.map((item) => `${escapeHtml(item.label)} · ${escapeHtml(item.rows)}`).join("\n");
  const audit = AUDIT.map((item) =>
    `${item.date} ${item.time} · ${escapeHtml(item.who)} · ${escapeHtml(item.field)}: ` +
    `<s>${escapeHtml(item.before)}</s> → <b>${escapeHtml(item.after)}</b>`
  ).join("\n");
  const last = state.lastReport ? `\n\n<i>Последняя выгрузка: ${escapeHtml(state.lastReport)}.</i>` : "";
  return (
    `<b>Отчёты и журнал действий</b>\n` +
    `Файл скачивается сразу, без «отправим на почту». Кодировка UTF-8, разделитель — точка с запятой.\n\n` +
    `<b>Доступные отчёты</b>\n${rows}\n\n` +
    `<b>Журнал действий · аудит включён</b> · только владелец и администратор\n${audit}${last}`
  );
}

function sectionText(state: DemoState): string {
  switch (state.section) {
    case "overview": return overviewText();
    case "shifts": return shiftsText(state);
    case "staff": return staffText();
    case "objects": return objectsText();
    case "incidents": return incidentsText(state);
    case "finance": return financeText(state);
    case "reports": return reportsText(state);
  }
}

function sectionKeyboard(state: DemoState): InlineKeyboard {
  let kb = new InlineKeyboard();

  SECTIONS.forEach((section, index) => {
    const locked = !canSee(state.role, section.id);
    const label = locked ? `${section.label} · нет доступа` : section.label;
    kb.text(label, `dm:s:${section.id}`);
    if (index % 2 === 1) kb.row();
  });
  if (SECTIONS.length % 2 === 1) kb.row();

  const roleLabel = (role: Role) => (state.role === role.id ? `• ${role.short}` : role.short);
  kb.text(roleLabel(ROLES[0]), "dm:r:owner").text(roleLabel(ROLES[1]), "dm:r:admin").row();
  kb.text(roleLabel(ROLES[2]), "dm:r:lead").text(roleLabel(ROLES[3]), "dm:r:guard").row();

  if (state.section === "shifts") {
    SHIFTS.forEach((_shift, index) => {
      if (!state.completedShifts.includes(index)) {
        kb.text(`Завершить ${index + 1}`, `dm:a:shift:done:${index}`);
        if (index % 2 === 1) kb.row();
      }
    });
    if (SHIFTS.length % 2 === 1) kb.row();
    kb.text("Добавить смену", "dm:a:shift:add").row();
  }

  if (state.section === "incidents") {
    for (const item of state.incidents.slice(0, 6)) {
      if (item.status === "закрыт") continue;
      kb.text(`Расследовать #${item.id}`, `dm:a:inc:inv:${item.id}`);
      kb.text(`Закрыть #${item.id}`, `dm:a:inc:close:${item.id}`);
      kb.row();
    }
    kb.text("Новый инцидент", "dm:a:inc:new").row();
  }

  if (state.section === "finance") {
    kb.text("Выгрузить CSV", "dm:a:csv:finance").row();
  }

  if (state.section === "reports") {
    REPORTS.forEach((report, index) => {
      kb.text(report.label, `dm:a:csv:${report.slug}`);
      if (index % 2 === 1) kb.row();
    });
    if (REPORTS.length % 2 === 1) kb.row();
  }

  kb.text("Сбросить демо", "dm:a:reset").text("В меню", "dm:a:menu");
  return kb;
}

function cancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("Отмена", "dm:a:inc:cancel");
}

function render(state: DemoState): { text: string; keyboard: InlineKeyboard } {
  const status = state.status ? `<i>${escapeHtml(state.status)}</i>\n\n` : "";
  return {
    text: `${header(state)}\n\n${status}<b>${escapeHtml(sectionTitle(state.section))}</b>\n\n${sectionText(state)}\n\n${checklist(state)}`,
    keyboard: sectionKeyboard(state),
  };
}

async function editDemo(ctx: Context, state: DemoState): Promise<void> {
  const view = render(state);
  try {
    await ctx.editMessageText(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  } catch {
    await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  }
}

function reportRows(slug: string, state: DemoState): { label: string; rows: (string | number)[][] } {
  switch (slug) {
    case "shifts": {
      const rows: (string | number)[][] = [["Сотрудник", "Бригада", "Пост", "Тип", "Статус"]];
      SHIFTS.forEach((shift, index) => {
        rows.push([
          shift.name,
          shift.team,
          shift.post,
          shift.type,
          state.completedShifts.includes(index) ? "Завершена" : shift.status,
        ]);
      });
      for (let i = 0; i < state.extraShifts; i += 1) {
        rows.push(["Смена по шаблону", "Бригада №2", "18 ноября", "день", "Запланирована"]);
      }
      return { label: "График смен", rows };
    }
    case "staff":
      return {
        label: "Сотрудники",
        rows: [
          ["Сотрудник", "Должность", "Лицензия", "Ставка", "Часы"],
          ...STAFF.map((item) => [item.name, item.position, item.license, `${item.rate} ₽/ч`, item.hours]),
        ],
      };
    case "incidents":
      return {
        label: "Инциденты",
        rows: [
          ["ID", "Описание", "Место", "Время", "Категория", "Серьёзность", "Ущерб", "Статус", "Причина"],
          ...state.incidents.map((item) => [
            item.id, item.title, item.place, item.time, item.category,
            item.severity, item.damage, item.status, item.reason,
          ]),
        ],
      };
    case "finance":
      return {
        label: "Финансы и бюджет",
        rows: [
          ["Месяц", "План", "Факт"],
          ...MONTHS.map((item) => [item.m, item.plan, item.fact]),
          [],
          ["Статья бюджета", "План", "Факт", "Отклонение"],
          ...BUDGET,
        ],
      };
    case "timesheet":
      return {
        label: "Табель",
        rows: [["Сотрудник", "Должность", "Часы"], ...STAFF.map((item) => [item.name, item.position, item.hours])],
      };
    case "payroll":
      return {
        label: "ФОТ",
        rows: [
          ["Сотрудник", "Ставка", "Часы", "Сумма"],
          ...STAFF.map((item) => [item.name, item.rate, item.hours, item.rate * item.hours]),
        ],
      };
    default:
      return { label: "Отчёт", rows: [["Раздел", "Значение"], ["Демо", COMPANY]] };
  }
}

async function sendCsv(ctx: Context, state: DemoState, slug: string): Promise<string> {
  const report = reportRows(slug, state);
  const file = new InputFile(Buffer.from(makeCsv(report.rows), "utf8"), `workdo-${slug}.csv`);
  await ctx.api.sendDocument(chatId(ctx), file, {
    caption: `WorkDo · ${report.label} · ${COMPANY}. Данные вымышленные.`,
  });
  state.exported = true;
  state.lastReport = report.label;
  mark(state, "export");
  return `${report.label} выгружен в CSV · UTF-8, разделитель «;»`;
}

export async function openDemo(ctx: Context): Promise<void> {
  const state = getState(chatId(ctx));
  state.section = "overview";
  state.status = "";
  const view = render(state);
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

export async function demoCallback(ctx: Context, data: string): Promise<boolean> {
  if (!data.startsWith("dm:")) return false;
  const id = chatId(ctx);
  let state = getState(id);
  let toast = "";

  if (data === "dm:open") {
    state.section = "overview";
    state.status = "Демо открыто · данные вымышленные";
  } else if (data.startsWith("dm:s:")) {
    const section = data.slice(5) as SectionId;
    if (!canSee(state.role, section)) {
      toast = "Этот раздел недоступен для текущей роли";
      state.status = toast;
    } else {
      state.section = section;
      state.status = `Раздел: ${sectionTitle(section)}`;
    }
  } else if (data.startsWith("dm:r:")) {
    const role = data.slice(5) as RoleId;
    if (!ROLES.some((item) => item.id === role)) return true;
    state.role = role;
    mark(state, "role");
    if (!canSee(role, state.section)) state.section = "overview";
    state.status = `Роль: ${roleName(role)} · ${roleAccess(role)}/19 разделов · доступы проверены`;
    toast = state.status;
  } else if (data === "dm:a:shift:add") {
    state.extraShifts += 1;
    mark(state, "shift");
    state.status = "Смена добавлена на 18 ноября · табель обновлён";
    toast = state.status;
  } else if (data.startsWith("dm:a:shift:done:")) {
    const index = Number(data.slice(16));
    if (!state.completedShifts.includes(index)) state.completedShifts.push(index);
    mark(state, "shift");
    state.status = "Смена завершена · часы ушли в табель";
    toast = state.status;
  } else if (data === "dm:a:inc:new") {
    state.pending = "incident_title";
    await ctx.answerCallbackQuery("Введите описание инцидента");
    await ctx.editMessageText(
      `<b>Новый инцидент</b>\n\nВведите описание происшествия — не менее 4 символов. ` +
      `Например: повреждён турникет на входе.\n\n<i>Данные вымышленные.</i>`,
      { parse_mode: "HTML", reply_markup: cancelKeyboard() }
    );
    return true;
  } else if (data === "dm:a:inc:cancel") {
    state.pending = null;
    state.status = "Создание инцидента отменено";
  } else if (data.startsWith("dm:a:inc:inv:")) {
    const incidentId = Number(data.slice(13));
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (incident) {
      incident.status = "расследование";
      mark(state, "incident");
      state.status = `Инцидент #${incidentId} взят в расследование`;
      toast = state.status;
    }
  } else if (data.startsWith("dm:a:inc:close:")) {
    const incidentId = Number(data.slice(15));
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (incident) {
      incident.status = "закрыт";
      mark(state, "incident");
      state.status = `Инцидент #${incidentId} закрыт · ущерб отражён в финансах`;
      toast = state.status;
    }
  } else if (data.startsWith("dm:a:csv:")) {
    const slug = data.slice(9);
    toast = await sendCsv(ctx, state, slug);
    state.status = toast;
  } else if (data === "dm:a:reset") {
    states.delete(id);
    state = getState(id);
    state.status = "Демо сброшено · данные вымышленные";
    toast = state.status;
  } else {
    return false;
  }

  await ctx.answerCallbackQuery(toast ? { text: toast } : undefined);
  await editDemo(ctx, state);
  return true;
}

export async function demoText(ctx: Context, text: string): Promise<boolean> {
  const id = chatId(ctx);
  const state = states.get(id);
  if (!state || state.pending !== "incident_title") return false;

  const title = text.trim();
  if (title.length < 4) {
    await ctx.reply("Нужно не менее 4 символов. Введите описание ещё раз или нажмите «Отмена».");
    return true;
  }

  const now = new Date();
  const time = `${DEMO_DATE_SHORT}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  state.incidents.unshift({
    id: state.nextIncidentId++,
    title,
    place: "Пост №2 · БЦ «Север»",
    time,
    category: "Происшествие",
    severity: "средняя",
    damage: "0 ₽",
    status: "открыт",
    reason: "уточняется при расследовании",
  });
  state.pending = null;
  state.section = "incidents";
  mark(state, "incident");
  state.status = "Инцидент создан · категория, ущерб и причина фиксируются в карточке";

  try {
    await ctx.api.deleteMessage(id, ctx.message!.message_id);
  } catch {
    // Сообщение уже удалено или бот не имеет прав — это не мешает демо.
  }
  await editDemo(ctx, state);
  return true;
}
