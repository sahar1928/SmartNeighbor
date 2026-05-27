const formatShekel = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const searchParams = new URLSearchParams(window.location.search);
const residentToken = searchParams.get("rt") || searchParams.get("token") || localStorage.getItem("smartneighbor_token") || "demo-danny-4b";
localStorage.setItem("smartneighbor_token", residentToken);
let deferredInstallPrompt = null;
let appConfig = { demoResetEnabled: false };

function setDemoResetAvailable(enabled) {
  const button = document.querySelector("#resetDemoAccountButton");
  if (!button) return;
  button.hidden = !enabled;
  button.disabled = !enabled;
}

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(`API failed: ${response.status}`);
  return response.json();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.querySelector("#installButton").hidden = false;
});

function text(selector, value) {
  document.querySelector(selector).textContent = value;
}

function card({ title, meta, body, badge, badgeClass = "" }) {
  const article = document.createElement("article");
  article.className = "row-card";
  article.innerHTML = `
    <header>
      <strong></strong>
      ${badge ? `<span class="badge ${badgeClass}">${badge}</span>` : ""}
    </header>
    <p class="muted"></p>
    <div></div>
  `;
  article.querySelector("strong").textContent = title;
  article.querySelector("p").textContent = meta ?? "";
  article.querySelector("div").textContent = body ?? "";
  return article;
}

function renderList(selector, rows) {
  const list = document.querySelector(selector);
  list.replaceChildren(...rows);
}

function statusBadge(status) {
  if (status === "paid") return { label: "שולם", className: "blue" };
  if (status === "open") return { label: "פתוח", className: "red" };
  return { label: status, className: "" };
}

function addBubble(kind, content) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${kind}`;
  bubble.textContent = content;
  const chatLog = document.querySelector("#chatLog");
  chatLog.append(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderWhatsappMessage(message) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${message.direction === "outbound" ? "agent" : "user"}`;
  const time = new Date(message.timestamp).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  bubble.innerHTML = `<strong></strong><small></small><span></span>`;
  bubble.querySelector("strong").textContent = message.from;
  bubble.querySelector("small").textContent = ` · ${time} · ${message.source}`;
  bubble.querySelector("span").textContent = message.text;
  return bubble;
}

function isScrolledNearBottom(element) {
  const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
  return distanceFromBottom < 48;
}

async function loadWhatsappMessages({ preserveScroll = true, forceScroll = false } = {}) {
  const log = document.querySelector("#whatsappLog");
  const shouldStayAtBottom = forceScroll || isScrolledNearBottom(log);
  const previousScrollTop = log.scrollTop;
  const messages = await api("/api/whatsapp/messages");
  log.replaceChildren(...messages.map(renderWhatsappMessage));

  if (shouldStayAtBottom) {
    log.scrollTop = log.scrollHeight;
  } else if (preserveScroll) {
    log.scrollTop = previousScrollTop;
  }
}

async function loadDashboard() {
  const dashboard = await api("/api/dashboard");
  text("#buildingName", dashboard.building.name);
  text("#collectionRate", `${dashboard.stats.collectionRate}%`);
  text("#balance", formatShekel.format(dashboard.stats.balance));
  text("#openTickets", dashboard.stats.openTickets);
  text("#urgentTickets", `${dashboard.stats.urgentTickets} דחופות`);
  text("#activeResidents", `${dashboard.stats.activeResidents}/${dashboard.stats.totalResidents}`);
  text("#agentSummary", dashboard.agentSummary);

  const attentionItems = dashboard.attention.map((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  });
  document.querySelector("#attentionList").replaceChildren(...attentionItems);
}

async function loadAppConfig() {
  appConfig = { demoResetEnabled: false, ...(await api("/api/app/config")) };
  setDemoResetAvailable(false);
  return appConfig;
}

async function loadMyAccount() {
  const account = await api(`/api/me?token=${encodeURIComponent(residentToken)}`);
  text("#accountIdentity", `${account.resident.name} · דירה ${account.resident.apartment} · קומה ${account.resident.floor}`);
  text("#myOpenBalance", formatShekel.format(account.balance.open));
  text("#myPaidTotal", formatShekel.format(account.balance.paidThisYear));
  text("#magicLinkValue", `${window.location.origin}${window.location.pathname}?rt=${residentToken}#my-account`);
  const payableAmount = account.balance.open;
  document.querySelector("#demoAmount").value = payableAmount;
  text("#paymentAmountLabel", formatShekel.format(payableAmount));
  const hasOpenBalance = payableAmount > 0;
  document.querySelector("#paypalPayButton").disabled = !hasOpenBalance;
  document.querySelector("#bitPayButton").disabled = !hasOpenBalance;
  setDemoResetAvailable(!hasOpenBalance && appConfig.demoResetEnabled);
  if (!hasOpenBalance && !document.querySelector("#paymentStatus").textContent) {
    text("#paymentStatus", "אין חוב פתוח כרגע. אפשר לאפס את הדמו כדי לבדוק תשלום נוסף.");
  }

  renderList("#myChargesList", account.charges.map((charge) => {
    const badge = statusBadge(charge.status);
    return card({
      title: charge.title,
      meta: `${charge.description} · לתשלום עד ${charge.dueDate}`,
      body: formatShekel.format(charge.amount),
      badge: badge.label,
      badgeClass: badge.className
    });
  }));

  renderList("#myLedgerList", account.ledger.map((entry) => card({
    title: entry.title,
    meta: entry.date,
    body: formatShekel.format(entry.amount),
    badge: entry.type === "payment" ? "זיכוי" : "חיוב",
    badgeClass: entry.type === "payment" ? "blue" : "gold"
  })));

  return account;
}

async function loadPayPalConfig() {
  const config = await api("/api/paypal/config");
  const status = document.querySelector("#paypalConnectionStatus");
  status.textContent = config.configured
    ? `PayPal ${config.mode} מחובר. התשלום יעבור דרך PayPal approval.`
    : "PayPal Sandbox עדיין לא מחובר עם credentials. הכפתור יעבוד כסימולטור.";
  return config;
}

async function loadBitConfig() {
  const config = await api("/api/bit/config");
  const status = document.querySelector("#bitConnectionStatus");
  status.textContent = config.configured
    ? `BIT ${config.mode} מחובר למוצר ${config.paymentProduct}.`
    : "BIT פועל כרגע בסימולטור. API אמיתי של BIT דורש TPP credentials ותעודות חתימה.";
  return config;
}

async function loadTickets() {
  const tickets = await api("/api/tickets");
  renderList("#ticketList", tickets.map((ticket) => card({
    title: `${ticket.id} · ${ticket.title}`,
    meta: `${ticket.location} · ${ticket.reporter}`,
    body: ticket.description,
    badge: `${ticket.priority} · ${ticket.status}`,
    badgeClass: ticket.priority === "P0" ? "red" : "blue"
  })));
}

async function loadPayments() {
  const payments = await api("/api/payments");
  renderList("#paymentList", payments.map((payment) => card({
    title: payment.residentName,
    meta: payment.method ? `שולם דרך ${payment.method}` : "טרם שולם",
    body: formatShekel.format(payment.amount),
    badge: payment.status === "paid" ? "שולם" : "באיחור",
    badgeClass: payment.status === "paid" ? "blue" : "red"
  })));
}

async function loadCommunity() {
  const posts = await api("/api/community");
  renderList("#communityList", posts.map((post) => card({
    title: post.title,
    meta: `${post.author} · ${post.channel}`,
    body: post.body,
    badge: post.pinned ? "נעוץ" : "פעיל",
    badgeClass: post.pinned ? "gold" : ""
  })));
}

async function loadItems() {
  const items = await api("/api/items");
  renderList("#itemList", items.map((item) => card({
    title: item.name,
    meta: `${item.owner}, דירה ${item.apartment}`,
    body: item.notes,
    badge: item.status === "available" ? "זמין" : "מושאל",
    badgeClass: item.status === "available" ? "blue" : "gold"
  })));
}

document.querySelector("#agentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#agentInput");
  const message = input.value.trim();
  if (!message) return;

  addBubble("user", message);
  input.value = "";
  const result = await api("/api/agent/message", {
    method: "POST",
    body: JSON.stringify({ message, residentId: "res-1" })
  });
  addBubble("agent", result.reply);
  if (result.ticket || result.actions?.some((action) => action.type === "ticket_created")) {
    await Promise.all([loadTickets(), loadDashboard()]);
  }
});

document.querySelector("#installButton").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.querySelector("#installButton").hidden = true;
});

document.querySelector("#whatsappForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#whatsappInput");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  await api("/api/whatsapp/local-message", {
    method: "POST",
    body: JSON.stringify({ text, from: "דייר מהקבוצה" })
  });
  await loadWhatsappMessages({ forceScroll: true });
});

document.querySelector("#paypalPayButton").addEventListener("click", async () => {
  const amount = Number(document.querySelector("#demoAmount").value);
  const status = document.querySelector("#paymentStatus");
  if (amount <= 0) {
    status.textContent = "אין חוב פתוח לתשלום כרגע.";
    return;
  }

  status.textContent = "יוצר PayPal Sandbox order...";
  const returnUrl = `${window.location.origin}${window.location.pathname}?rt=${encodeURIComponent(residentToken)}&paypal=return#my-account`;
  const cancelUrl = `${window.location.origin}${window.location.pathname}?rt=${encodeURIComponent(residentToken)}&paypal=cancel#my-account`;
  const order = await api("/api/paypal/create-order", {
    method: "POST",
    body: JSON.stringify({ token: residentToken, amount, returnUrl, cancelUrl })
  });

  if (order.mode === "paypal") {
    const approveLink = order.links?.find((link) => link.rel === "approve")?.href;
    if (approveLink) {
      sessionStorage.setItem("smartneighbor_pending_paypal", JSON.stringify({
        orderId: order.id,
        amount,
        residentToken
      }));
      status.textContent = "מעביר ל-PayPal Sandbox...";
      window.location.href = approveLink;
      return;
    }
  }

  const captured = await api("/api/paypal/capture-order", {
    method: "POST",
    body: JSON.stringify({ token: residentToken, orderId: order.orderId || order.id, amount })
  });

  status.textContent = `PayPal ${captured.mode} capture הושלם: ${formatShekel.format(captured.payment.amount)}.`;
  await Promise.all([loadMyAccount(), loadPayments(), loadDashboard()]);
});

document.querySelector("#bitPayButton").addEventListener("click", async () => {
  const amount = Number(document.querySelector("#demoAmount").value);
  const status = document.querySelector("#paymentStatus");
  if (amount <= 0) {
    status.textContent = "אין חוב פתוח לתשלום כרגע.";
    return;
  }

  status.textContent = "יוצר תשלום BIT...";
  const returnUrl = `${window.location.origin}${window.location.pathname}?rt=${encodeURIComponent(residentToken)}&bit=return#my-account`;
  const created = await api("/api/bit/create-payment", {
    method: "POST",
    body: JSON.stringify({ token: residentToken, amount, returnUrl })
  });

  if (created.authorizationUrl) {
    sessionStorage.setItem("smartneighbor_pending_bit", JSON.stringify({
      paymentId: created.paymentId,
      amount,
      residentToken
    }));
    status.textContent = "מעביר ל-BIT...";
    window.location.href = created.authorizationUrl;
    return;
  }

  const captured = await api("/api/bit/capture-payment", {
    method: "POST",
    body: JSON.stringify({ token: residentToken, paymentId: created.paymentId, amount })
  });

  status.textContent = `BIT ${captured.mode} הושלם: ${formatShekel.format(captured.payment.amount)}.`;
  await Promise.all([loadMyAccount(), loadPayments(), loadDashboard()]);
});

document.querySelector("#resetDemoAccountButton").addEventListener("click", async () => {
  const status = document.querySelector("#paymentStatus");
  if (!appConfig.demoResetEnabled) {
    setDemoResetAvailable(false);
    status.textContent = "איפוס הדמו כבוי בסביבת הענן.";
    return;
  }

  try {
    status.textContent = "מאפס נתוני דמו...";
    await api("/api/demo/reset-account", {
      method: "POST",
      body: JSON.stringify({ token: residentToken })
    });
    status.textContent = "הדמו אופס. אפשר לבדוק תשלום נוסף.";
    await Promise.all([loadMyAccount(), loadPayments(), loadDashboard()]);
  } catch (error) {
    setDemoResetAvailable(false);
    status.textContent = "איפוס הדמו לא זמין בסביבה הזו.";
  }
});

async function handlePayPalReturn() {
  const paypalState = searchParams.get("paypal");
  if (!paypalState) return;

  const status = document.querySelector("#paymentStatus");
  if (paypalState === "cancel") {
    status.textContent = "התשלום ב-PayPal בוטל.";
    return;
  }

  const pending = JSON.parse(sessionStorage.getItem("smartneighbor_pending_paypal") || "null");
  const orderId = searchParams.get("token") || pending?.orderId;
  const amount = Number(searchParams.get("amount")) || pending?.amount || Number(document.querySelector("#demoAmount").value);

  if (!orderId || !amount) {
    status.textContent = "חזרת מ-PayPal, אבל לא נמצא order פתוח לקליטה.";
    return;
  }

  status.textContent = "קולט אישור תשלום מ-PayPal...";
  const captured = await api("/api/paypal/capture-order", {
    method: "POST",
    body: JSON.stringify({ token: residentToken, orderId, amount })
  });
  sessionStorage.removeItem("smartneighbor_pending_paypal");
  status.textContent = `PayPal ${captured.mode} capture הושלם: ${formatShekel.format(captured.payment.amount)}.`;
  await Promise.all([loadMyAccount(), loadPayments(), loadDashboard()]);
}

document.querySelector("#quickTicketForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const location = document.querySelector("#quickTicketLocation").value.trim();
  const description = document.querySelector("#quickTicketText").value.trim();
  const status = document.querySelector("#quickTicketStatus");
  if (!description) return;

  const result = await api("/api/agent/message", {
    method: "POST",
    body: JSON.stringify({ message: `${description} ב${location}`, residentId: "res-1" })
  });
  status.textContent = result.reply;
  await Promise.all([loadTickets(), loadDashboard()]);
});

document.querySelector("#quickItemForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#quickItemName").value.trim();
  const notes = document.querySelector("#quickItemNotes").value.trim();
  const status = document.querySelector("#quickItemStatus");
  if (!name) return;

  const result = await api("/api/agent/message", {
    method: "POST",
    body: JSON.stringify({ message: `יש לי ${name} להשאלה. ${notes}`, residentId: "res-1" })
  });
  status.textContent = result.reply;
});

addBubble("agent", "שלום, אני SmartNeighbor Agent. אפשר לשאול על תשלום, לדווח תקלה, לבקש חפץ או למצוא ספק.");
setDemoResetAvailable(false);

await loadAppConfig().catch(() => {});

const initialLoads = await Promise.allSettled([
  loadDashboard(),
  loadMyAccount(),
  loadPayPalConfig(),
  loadBitConfig(),
  loadWhatsappMessages({ forceScroll: true }),
  loadTickets(),
  loadPayments(),
  loadCommunity(),
  loadItems()
]);

const failedInitialLoads = initialLoads.filter((result) => result.status === "rejected");
if (failedInitialLoads.length) {
  document.querySelector("#paymentStatus").textContent = "חלק מהנתונים לא נטענו כרגע. נסה לרענן בעוד רגע.";
  console.warn("SmartNeighbor initial load partial failure", failedInitialLoads);
}

await handlePayPalReturn();

setInterval(() => {
  loadWhatsappMessages({ preserveScroll: true }).catch(() => {});
}, 5000);
