(function () {
  "use strict";

  var D = window.WORKDO_DATA;
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  var LANDING_URL = "https://glcskl.github.io/workdo-landing/";
  var STORAGE_KEY = "workdo-miniapp-state-v1";
  var ROLE_ORDER = ["role", "shift", "incident", "export"];

  var els = {
    tabs: document.getElementById("tabs"),
    roleSwitch: document.getElementById("roleSwitch"),
    roleBadge: document.getElementById("roleBadge"),
    content: document.getElementById("content"),
    checklist: document.getElementById("checklist"),
    checklistCounter: document.getElementById("checklistCounter"),
    toast: document.getElementById("toast"),
    modal: document.getElementById("modal"),
    incidentTitle: document.getElementById("incidentTitle"),
    resetBtn: document.getElementById("resetBtn"),
    closeBtn: document.getElementById("closeBtn"),
  };

  function defaultState() {
    return {
      role: "owner",
      section: "overview",
      extraShifts: 0,
      completedShifts: [],
      incidents: D.initialIncidents.map(function (item) { return Object.assign({}, item); }),
      nextIncidentId: 115,
      exported: false,
      lastReport: "",
      tasks: [],
      modalOpen: false,
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var saved = JSON.parse(raw);
      var fresh = defaultState();
      return Object.assign(fresh, saved, {
        modalOpen: false,
        incidents: Array.isArray(saved.incidents) ? saved.incidents : fresh.incidents,
        completedShifts: Array.isArray(saved.completedShifts) ? saved.completedShifts : [],
        tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
      });
    } catch (err) {
      return defaultState();
    }
  }

  var state = loadState();
  var toastTimer;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        role: state.role,
        section: state.section,
        extraShifts: state.extraShifts,
        completedShifts: state.completedShifts,
        incidents: state.incidents,
        nextIncidentId: state.nextIncidentId,
        exported: state.exported,
        lastReport: state.lastReport,
        tasks: state.tasks,
      }));
    } catch (err) {
      // Приватный режим Telegram — состояние просто не сохранится между перезапусками.
    }
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function roleInfo(id) {
    return D.roles.find(function (r) { return r.id === id; }) || D.roles[0];
  }

  function sectionInfo(id) {
    return D.sections.find(function (s) { return s.id === id; }) || D.sections[0];
  }

  function canSee(role, section) {
    return (D.denied[role] || []).indexOf(section) === -1;
  }

  function mark(task) {
    if (state.tasks.indexOf(task) === -1) state.tasks.push(task);
  }

  function haptic() {
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("show"); }, 2600);
  }

  function updateMainButton() {
    if (!tg || !tg.MainButton) return;
    if (state.modalOpen) {
      tg.MainButton.setText("Создать инцидент");
      tg.MainButton.show();
      tg.MainButton.enable();
    } else {
      tg.MainButton.hide();
    }
  }

  function popup(title, message, buttons, callback) {
    if (tg && tg.showPopup) {
      tg.showPopup({ title: title, message: message, buttons: buttons }, callback);
      return;
    }
    if (window.confirm(message)) callback({ id: "ok" });
  }

  function renderRoles() {
    els.roleSwitch.innerHTML = D.roles.map(function (role) {
      return '<button type="button" class="pill' + (state.role === role.id ? " active" : "") +
        '" data-role="' + role.id + '">' + esc(role.short) + " · " + role.access + "</button>";
    }).join("");
    var info = roleInfo(state.role);
    els.roleBadge.textContent = info.name + " · " + info.access + "/19";
  }

  function renderTabs() {
    els.tabs.innerHTML = D.sections.map(function (section) {
      var locked = !canSee(state.role, section.id);
      return '<button type="button" class="tab' + (state.section === section.id ? " active" : "") +
        (locked ? " locked" : "") + '" data-action="section:' + section.id + '">' +
        (locked ? "🔒 " : "") + esc(section.label) + "</button>";
    }).join("");
  }

  function line(label, value) {
    return '<div class="stat-line"><span class="label">' + esc(label) + '</span><span class="value">' + esc(value) + "</span></div>";
  }

  function statusTag(status) {
    var cls = status === "закрыт" ? "ok" : status === "расследование" ? "mid" : "high";
    return '<span class="tag ' + cls + '">' + esc(status) + "</span>";
  }

  function severityTag(severity) {
    var cls = severity === "высокая" ? "high" : severity === "средняя" ? "mid" : "low";
    return '<span class="tag ' + cls + '">' + esc(severity) + " серьёзность</span>";
  }

  function overview() {
    var incidents = D.initialIncidents.slice(0, 2).map(function (item) {
      return line("#" + item.id + " " + item.title, item.status);
    }).join("");
    var onShift = D.shifts.slice(0, 3).map(function (item) {
      return line(item.name, item.post + " · " + item.status);
    }).join("");
    return '' +
      '<div class="section-head"><h2>Панель управления</h2><span class="counter">' + esc(D.demoDate) + '</span></div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi"><div class="kpi-value">31</div><div class="kpi-label">сотрудник в базе</div></div>' +
        '<div class="kpi"><div class="kpi-value">' + (18 + state.extraShifts) + '</div><div class="kpi-label">активных смен</div></div>' +
        '<div class="kpi"><div class="kpi-value">18</div><div class="kpi-label">постов на 5 объектах</div></div>' +
        '<div class="kpi"><div class="kpi-value">' + state.incidents.length + '</div><div class="kpi-label">инцидентов зарегистрировано</div></div>' +
      '</div>' +
      '<h3>Статистика инцидентов</h3>' +
      line('По статусу', 'открыты 2 · в расследовании 1 · закрыты 12') +
      line('По серьёзности', 'низкая 6 · средняя 5 · высокая 3') +
      line('По приоритету', 'низкий 7 · средний 4 · срочный 1') +
      '<h3>Ближайшая выплата зарплаты</h3>' +
      line('25 ноября', 'осталось 8 дн. · 2 480 000 ₽ · 31 сотрудник') +
      '<h3>Последние инциденты</h3>' + incidents +
      '<h3>Кто на смене</h3>' + onShift;
  }

  function shifts() {
    var rows = D.shifts.map(function (shift, index) {
      var done = state.completedShifts.indexOf(index) !== -1;
      return '<div class="item">' +
        '<div class="item-title">' + esc(shift.name) + '</div>' +
        '<div class="item-sub">' + esc(shift.team) + ' · ' + esc(shift.post) + '</div>' +
        '<div class="item-meta">' + esc(shift.type) + ' · <b>' + (done ? "Завершена" : esc(shift.status)) + "</b></div>" +
        (done ? "" : '<div class="item-actions"><button type="button" class="btn small primary" data-action="shift:done:' + index + '">Завершить</button></div>') +
        "</div>";
    }).join("");
    return '' +
      '<div class="section-head"><h2>Смены · ноябрь 2026</h2><span class="counter">' + (18 + state.extraShifts) + ' смен</span></div>' +
      '<p class="muted">Смена связывает сотрудника, пост и время. Завершённая смена уходит в табель.</p>' +
      '<div class="week">' + D.week.map(function (day) { return "<span>" + esc(day) + "</span>"; }).join("") + "</div>" +
      '<div class="list">' + rows + "</div>" +
      (state.extraShifts > 0 ? '<p class="muted" style="margin-top:12px">Добавлено смен по шаблону: ' + state.extraShifts + ' · новая смена на 18 ноября.</p>' : "") +
      '<div class="item-actions" style="margin-top:12px"><button type="button" class="btn primary" data-action="shift:add">Добавить смену</button></div>';
  }

  function staff() {
    return '' +
      '<div class="section-head"><h2>Кадры</h2><span class="counter">31 сотрудник</span></div>' +
      '<p class="muted">Кадровые данные и лицензии доступны по роли. Импорт CSV/XLSX — 31 колонка, в демо отключён.</p>' +
      '<div class="list">' + D.staff.map(function (item) {
        return '<div class="item"><div class="item-title">' + esc(item.name) + ' · ' + esc(item.position) + '</div>' +
          '<div class="item-sub">' + esc(item.license) + "</div>" +
          '<div class="item-meta">' + item.rate + " ₽/ч · " + item.hours + " ч</div></div>";
      }).join("") + "</div>";
  }

  function objects() {
    return '' +
      '<div class="section-head"><h2>Объекты</h2><span class="counter">5 на обслуживании</span></div>' +
      '<p class="muted">Пост знает своего клиента, инструкцию и маршрут обхода.</p>' +
      '<div class="list">' + D.objects.map(function (item) {
        return '<div class="item"><div class="item-title">' + esc(item.name) + " · " + esc(item.status) + '</div>' +
          '<div class="item-sub">' + esc(item.address) + "</div>" +
          '<div class="item-meta">' + item.posts + " поста · инструкции и чекпоинты</div></div>";
      }).join("") + "</div>";
  }

  function incidents() {
    var rows = state.incidents.slice(0, 6).map(function (item) {
      var actions = "";
      if (item.status !== "закрыт") {
        actions = '<div class="item-actions">' +
          '<button type="button" class="btn small ghost" data-action="inc:inv:' + item.id + '">Расследовать</button>' +
          '<button type="button" class="btn small danger" data-action="inc:close:' + item.id + '">Закрыть</button>' +
          "</div>";
      }
      return '<div class="item">' +
        '<div class="item-title">#' + item.id + " · " + esc(item.title) + "</div>" +
        '<div class="item-sub">' + esc(item.place) + " · " + esc(item.time) + "</div>" +
        '<div class="item-meta">' + severityTag(item.severity) + statusTag(item.status) + "</div>" +
        '<div class="item-meta">Категория: ' + esc(item.category) + " · ущерб: " + esc(item.damage) + "</div>" +
        '<div class="item-sub">Причина: ' + esc(item.reason) + "</div>" +
        actions + "</div>";
    }).join("");
    return '' +
      '<div class="section-head"><h2>Происшествия</h2><span class="counter">' + state.incidents.length + ' всего</span></div>' +
      '<p class="muted">Категория, серьёзность, ущерб и корневая причина — обязательные поля расследования.</p>' +
      '<div class="list">' + rows + "</div>" +
      '<div class="item-actions" style="margin-top:12px"><button type="button" class="btn primary" data-action="inc:new">Новый инцидент</button></div>';
  }

  function finance() {
    var bars = D.months.map(function (item) {
      return '<div class="bar-row"><span>' + esc(item.m) + '</span>' +
        '<span class="bar"><i class="' + (item.fact >= item.plan ? "over" : "") + '" style="width:' + Math.min(100, item.fact) + '%"></i></span>' +
        '<span>' + item.plan + "/" + item.fact + "</span></div>";
    }).join("");
    var budget = D.budget.map(function (row) {
      return "<tr><td>" + esc(row[0]) + "</td><td>" + esc(row[1]) + "</td><td>" + esc(row[2]) + "</td><td>" + esc(row[3]) + "</td></tr>";
    }).join("");
    return '' +
      '<div class="section-head"><h2>Деньги · июнь — ноябрь 2026</h2><span class="counter">план/факт</span></div>' +
      '<h3>План / факт по месяцам</h3>' + bars +
      '<p class="muted" style="margin-top:8px">Ноябрь: +3,7% к плану.</p>' +
      '<h3>Бюджет</h3><div class="table-wrap"><table><thead><tr><th>Статья</th><th>План</th><th>Факт</th><th>Отклонение</th></tr></thead><tbody>' + budget + "</tbody></table></div>" +
      (state.lastReport ? '<p class="muted" style="margin-top:12px">Последняя выгрузка: ' + esc(state.lastReport) + "</p>" : "") +
      '<div class="item-actions" style="margin-top:12px">' +
        '<button type="button" class="btn primary" data-action="csv:finance">Выгрузить CSV</button>' +
        '<button type="button" class="btn ghost" data-action="csvcopy:finance">Скопировать CSV</button>' +
        '</div>';
  }

  function reports() {
    var cards = D.reports.map(function (report) {
      return '<div class="report"><div><div class="item-title">' + esc(report.label) + '</div><div class="report-rows">' + esc(report.rows) + '</div></div>' +
        '<button type="button" class="btn small primary" data-action="csv:' + report.slug + '">Скачать CSV</button>' +
        '<button type="button" class="btn small ghost" data-action="csvcopy:' + report.slug + '">Копировать</button></div>';
    }).join("");
    var audit = D.audit.map(function (item) {
      return '<div class="stat-line"><span class="label">' + esc(item.date + " " + item.time) + " · " + esc(item.who) + "</span>" +
        '<span class="value">' + esc(item.field) + ": " + esc(item.before) + " → " + esc(item.after) + "</span></div>";
    }).join("");
    return '' +
      '<div class="section-head"><h2>Отчёты и журнал действий</h2><span class="counter">CSV · UTF-8</span></div>' +
      '<p class="muted">Файл скачивается сразу, без «отправим на почту». Разделитель — точка с запятой.</p>' +
      '<div class="report-grid">' + cards + "</div>" +
      '<h3>Журнал действий · аудит</h3>' + audit +
      (state.lastReport ? '<p class="muted" style="margin-top:12px">Последняя выгрузка: ' + esc(state.lastReport) + "</p>" : "");
  }

  function renderChecklist() {
    var count = ROLE_ORDER.filter(function (id) { return id !== "role" && state.tasks.indexOf(id) !== -1; }).length;
    els.checklistCounter.textContent = count + "/3";
    els.checklist.innerHTML = ROLE_ORDER.map(function (id) {
      var done = state.tasks.indexOf(id) !== -1;
      return '<li class="' + (done ? "done" : "") + '"><span class="mark">' + (done ? "✓" : "·") + "</span><span>" + esc(D.taskLabels[id]) + "</span></li>";
    }).join("");
  }

  function renderContent() {
    if (!canSee(state.role, state.section)) state.section = "overview";
    var views = {
      overview: overview,
      shifts: shifts,
      staff: staff,
      objects: objects,
      incidents: incidents,
      finance: finance,
      reports: reports,
    };
    els.content.innerHTML = (views[state.section] || overview)();
  }

  function render() {
    renderRoles();
    renderTabs();
    renderContent();
    renderChecklist();
  }

  function csvCell(value) {
    var text = String(value == null ? "" : value);
    return /[;"\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function makeCsv(rows) {
    return "\uFEFF" + rows.map(function (row) { return row.map(csvCell).join(";"); }).join("\r\n");
  }

  function reportRows(slug) {
    switch (slug) {
      case "shifts": {
        var rows = [["Сотрудник", "Бригада", "Пост", "Тип", "Статус"]];
        D.shifts.forEach(function (shift, index) {
          rows.push([shift.name, shift.team, shift.post, shift.type, state.completedShifts.indexOf(index) !== -1 ? "Завершена" : shift.status]);
        });
        for (var i = 0; i < state.extraShifts; i += 1) {
          rows.push(["Смена по шаблону", "Бригада №2", "18 ноября", "день", "Запланирована"]);
        }
        return { label: "График смен", rows: rows };
      }
      case "staff":
        return {
          label: "Сотрудники",
          rows: [["Сотрудник", "Должность", "Лицензия", "Ставка", "Часы"]].concat(D.staff.map(function (item) {
            return [item.name, item.position, item.license, item.rate + " ₽/ч", item.hours];
          })),
        };
      case "incidents":
        return {
          label: "Инциденты",
          rows: [["ID", "Описание", "Место", "Время", "Категория", "Серьёзность", "Ущерб", "Статус", "Причина"]].concat(state.incidents.map(function (item) {
            return [item.id, item.title, item.place, item.time, item.category, item.severity, item.damage, item.status, item.reason];
          })),
        };
      case "finance": {
        var fin = [["Месяц", "План", "Факт"]];
        D.months.forEach(function (item) { fin.push([item.m, item.plan, item.fact]); });
        fin.push([]);
        fin.push(["Статья бюджета", "План", "Факт", "Отклонение"]);
        D.budget.forEach(function (row) { fin.push(row); });
        return { label: "Финансы и бюджет", rows: fin };
      }
      case "timesheet":
        return {
          label: "Табель",
          rows: [["Сотрудник", "Должность", "Часы"]].concat(D.staff.map(function (item) { return [item.name, item.position, item.hours]; })),
        };
      case "payroll":
        return {
          label: "ФОТ",
          rows: [["Сотрудник", "Ставка", "Часы", "Сумма"]].concat(D.staff.map(function (item) {
            return [item.name, item.rate, item.hours, item.rate * item.hours];
          })),
        };
      default:
        return { label: "Отчёт", rows: [["Раздел", "Значение"], ["Демо", D.company]] };
    }
  }

  function downloadCsv(slug) {
    var report = reportRows(slug);
    var content = makeCsv(report.rows);
    try {
      var blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "workdo-" + slug + ".csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (err) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(content);
    }
    state.exported = true;
    state.lastReport = report.label;
    mark("export");
    save();
    renderChecklist();
    renderContent();
    toast(report.label + " выгружен в CSV · UTF-8, разделитель «;»");
  }

  function copyCsv(slug) {
    var report = reportRows(slug);
    var content = makeCsv(report.rows);
    var done = function () {
      state.exported = true;
      state.lastReport = report.label;
      mark("export");
      save();
      renderChecklist();
      renderContent();
      toast(report.label + " скопирован в буфер · UTF-8, разделитель «;»");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(done, function () { toast("Не удалось скопировать CSV"); });
      return;
    }
    var area = document.createElement("textarea");
    area.value = content;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = document.execCommand && document.execCommand("copy");
    document.body.removeChild(area);
    if (ok) done();
    else toast("Не удалось скопировать CSV");
  }

  function openModal() {
    state.modalOpen = true;
    els.incidentTitle.value = "";
    els.modal.hidden = false;
    updateMainButton();
    setTimeout(function () { els.incidentTitle.focus(); }, 50);
  }

  function closeModal() {
    state.modalOpen = false;
    els.modal.hidden = true;
    updateMainButton();
  }

  function submitIncident() {
    var title = els.incidentTitle.value.trim();
    if (title.length < 4) {
      toast("Нужно не менее 4 символов");
      return;
    }
    var now = new Date();
    var time = D.demoDateShort + ", " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    state.incidents.unshift({
      id: state.nextIncidentId++,
      title: title,
      place: "Пост №2 · БЦ «Север»",
      time: time,
      category: "Происшествие",
      severity: "средняя",
      damage: "0 ₽",
      status: "открыт",
      reason: "уточняется при расследовании",
    });
    closeModal();
    state.section = "incidents";
    mark("incident");
    save();
    render();
    toast("Инцидент создан · категория, ущерб и причина фиксируются в карточке");
  }

  document.addEventListener("click", function (event) {
    var roleBtn = event.target.closest("[data-role]");
    if (roleBtn) {
      var role = roleBtn.getAttribute("data-role");
      if (!canSee(role, state.section)) state.section = "overview";
      state.role = role;
      mark("role");
      haptic();
      save();
      render();
      toast("Роль: " + roleInfo(role).name + " · " + roleInfo(role).access + "/19 разделов · доступы проверены");
      return;
    }

    var actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    var action = actionBtn.getAttribute("data-action") || "";
    haptic();

    if (action.indexOf("section:") === 0) {
      var section = action.slice(8);
      if (!canSee(state.role, section)) {
        toast("Этот раздел недоступен для текущей роли");
        return;
      }
      state.section = section;
      save();
      render();
    } else if (action === "shift:add") {
      state.extraShifts += 1;
      mark("shift");
      save();
      render();
      toast("Смена добавлена на 18 ноября · табель обновлён");
    } else if (action.indexOf("shift:done:") === 0) {
      var index = Number(action.slice(11));
      if (state.completedShifts.indexOf(index) === -1) state.completedShifts.push(index);
      mark("shift");
      save();
      render();
      toast("Смена завершена · часы ушли в табель");
    } else if (action === "inc:new") {
      openModal();
    } else if (action.indexOf("inc:inv:") === 0) {
      var invId = Number(action.slice(8));
      var inv = state.incidents.find(function (item) { return item.id === invId; });
      if (inv) {
        inv.status = "расследование";
        mark("incident");
        save();
        render();
        toast("Инцидент #" + invId + " взят в расследование");
      }
    } else if (action.indexOf("inc:close:") === 0) {
      var closeId = Number(action.slice(10));
      var closed = state.incidents.find(function (item) { return item.id === closeId; });
      if (closed) {
        closed.status = "закрыт";
        mark("incident");
        save();
        render();
        toast("Инцидент #" + closeId + " закрыт · ущерб отражён в финансах");
      }
    } else if (action.indexOf("csv:") === 0) {
      downloadCsv(action.slice(4));
    } else if (action.indexOf("csvcopy:") === 0) {
      copyCsv(action.slice(8));
    } else if (action.indexOf("link:") === 0) {
      if (tg && tg.openLink) tg.openLink(LANDING_URL);
      else window.open(LANDING_URL, "_blank", "noopener");
    }
  });

  els.resetBtn.addEventListener("click", function () {
    popup("Сбросить демо", "Вернуть начальные данные и прогресс?", [
      { id: "ok", type: "destructive", text: "Сбросить" },
      { id: "cancel", type: "cancel", text: "Отмена" },
    ], function (result) {
      if (!result || result.id !== "ok") return;
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      save();
      render();
      toast("Демо сброшено · данные вымышленные");
    });
  });

  els.closeBtn.addEventListener("click", function () {
    if (tg && tg.close) tg.close();
    else toast("Мини-аппа открыта в браузере — просто закройте вкладку");
  });

  document.getElementById("createIncident").addEventListener("click", submitIncident);
  document.getElementById("cancelIncident").addEventListener("click", closeModal);
  els.incidentTitle.addEventListener("keydown", function (event) {
    if (event.key === "Enter") submitIncident();
    if (event.key === "Escape") closeModal();
  });

  if (tg && tg.MainButton) {
    tg.MainButton.onEvent(function () {
      if (state.modalOpen) submitIncident();
    });
  }

  render();
  updateMainButton();
})();
