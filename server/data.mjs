import { dbEnabled, query, transaction } from "./db.mjs";
import { recordAudit } from "./audit.mjs";
import { generateMagicToken, hashToken } from "./tokens.mjs";

export const buildings = [
  {
    id: "bldg-rtl-24",
    name: "בניין רוטשילד 24",
    address: "רוטשילד 24, תל אביב",
    units: 40,
    activeResidents: 34,
    balance: 9400,
    monthlyFee: 350,
    collectionRate: 78,
    emergencyFund: 45200
  }
];

export const residents = [
  { id: "res-1", name: "דני לוי", apartment: "4ב", floor: 2, role: "resident", paidCurrentMonth: false, balanceDue: 350, accessToken: "demo-danny-4b" },
  { id: "res-2", name: "שרה כהן", apartment: "4", floor: 2, role: "resident", paidCurrentMonth: true, balanceDue: 0, accessToken: "demo-sarah-4" },
  { id: "res-3", name: "יוסי מזרחי", apartment: "11", floor: 5, role: "committee", paidCurrentMonth: true, balanceDue: 0, accessToken: "demo-yossi-11" },
  { id: "res-4", name: "מיכל ברק", apartment: "1א", floor: 1, role: "chair", paidCurrentMonth: true, balanceDue: 0, accessToken: "demo-michal-1a" }
];

export const payments = [
  { id: "pay-1", residentId: "res-2", residentName: "שרה כהן", amount: 350, method: "Bit", status: "paid", paidAt: "2026-05-03" },
  { id: "pay-2", residentId: "res-3", residentName: "יוסי מזרחי", amount: 350, method: "credit_card", status: "paid", paidAt: "2026-05-02" },
  { id: "pay-3", residentId: "res-1", residentName: "דני לוי", amount: 350, method: null, status: "late", paidAt: null }
];

export const charges = [
  { id: "chg-1", residentId: "res-1", title: "ועד בית מאי 2026", description: "דמי ועד חודשיים לדירה 4ב", amount: 350, status: "open", dueDate: "2026-05-10", category: "monthly_fee" },
  { id: "chg-2", residentId: "res-1", title: "השתתפות תיקון מעלית", description: "חלוקת עלות תיקון חירום במעלית", amount: 120, status: "open", dueDate: "2026-06-01", category: "maintenance" },
  { id: "chg-3", residentId: "res-2", title: "ועד בית מאי 2026", description: "דמי ועד חודשיים לדירה 4", amount: 350, status: "paid", dueDate: "2026-05-10", category: "monthly_fee" },
  { id: "chg-4", residentId: "res-3", title: "ועד בית מאי 2026", description: "דמי ועד חודשיים לדירה 11", amount: 350, status: "paid", dueDate: "2026-05-10", category: "monthly_fee" }
];

export const residentLedger = [
  { id: "led-1", residentId: "res-1", type: "charge", title: "ועד בית מאי 2026", amount: 350, date: "2026-05-01" },
  { id: "led-2", residentId: "res-1", type: "charge", title: "השתתפות תיקון מעלית", amount: 120, date: "2026-05-22" },
  { id: "led-3", residentId: "res-2", type: "charge", title: "ועד בית מאי 2026", amount: 350, date: "2026-05-01" },
  { id: "led-4", residentId: "res-2", type: "payment", title: "תשלום Bit", amount: -350, date: "2026-05-03" }
];

export const tickets = [
  {
    id: "T-2847",
    title: "ריח גז בחדר מדרגות",
    description: "דווח ריח גז בחדר המדרגות בקומה ג'",
    category: "gas",
    priority: "P0",
    status: "assigned",
    location: "חדר מדרגות, קומה ג'",
    reporter: "דייר מקומה 3",
    providerId: "prov-1",
    openedAt: "2026-05-26T09:15:00+03:00",
    slaHours: 1
  },
  {
    id: "T-2848",
    title: "נורה שרופה בלובי",
    description: "תאורת הכניסה לא עובדת",
    category: "electricity",
    priority: "P2",
    status: "open",
    location: "לובי",
    reporter: "שרה כהן",
    providerId: "prov-2",
    openedAt: "2026-05-25T18:20:00+03:00",
    slaHours: 48
  },
  {
    id: "T-2849",
    title: "ניקיון חדר אשפה",
    description: "ריח חריף וחוסר ניקיון בחדר האשפה",
    category: "cleaning",
    priority: "P2",
    status: "in_progress",
    location: "חדר אשפה",
    reporter: "יוסי מזרחי",
    providerId: "prov-3",
    openedAt: "2026-05-24T13:45:00+03:00",
    slaHours: 24
  }
];

export const providers = [
  { id: "prov-1", name: "מרק שירותי אינסטלציה וגז", domain: "אינסטלציה וגז", phone: "+972-50-123-4567", rating: 4.7, avgResponseHours: 2 },
  { id: "prov-2", name: "אור חשמל", domain: "חשמל", phone: "+972-52-234-5678", rating: 4.5, avgResponseHours: 4 },
  { id: "prov-3", name: "רחל ניקיון", domain: "ניקיון", phone: "+972-54-345-6789", rating: 4.9, avgResponseHours: 6 }
];

export const communityPosts = [
  { id: "post-1", channel: "announcements", title: "אסיפת דיירים חודשית", body: "האסיפה תתקיים ביום ראשון בשעה 20:00 בלובי.", author: "ועד הבית", pinned: true, expiresAt: null },
  { id: "post-2", channel: "help", title: "המלצה על גנן", body: "מחפשים המלצה לגנן להחלפת שתילים בכניסה.", author: "דירה 7", pinned: false, expiresAt: "2026-06-25" },
  { id: "post-3", channel: "safety", title: "חניה חסומה", body: "נא לשים לב לא לחסום את יציאת החניון.", author: "דייר מקומה 1", pinned: false, expiresAt: "2026-05-28" }
];

export const items = [
  { id: "item-1", name: "מקדחה Bosch GSB 18V", category: "tools", owner: "שרה כהן", apartment: "4", status: "available", maxDays: 3, loans: 3, notes: "יש 2 ביטים. להחזיר בסוף יום." },
  { id: "item-2", name: "סולם מתקפל", category: "tools", owner: "יוסי מזרחי", apartment: "11", status: "available", maxDays: 2, loans: 5, notes: "מתאים לעבודות פנים." },
  { id: "item-3", name: "כיסאות פלסטיק לאירוח", category: "outdoor", owner: "מיכל ברק", apartment: "1א", status: "borrowed", maxDays: 4, loans: 2, notes: "זמין שוב מ-30 במאי." }
];

export const votes = [
  {
    id: "vote-1",
    title: "חידוש חוזה ניקיון עם רחל ניקיון",
    options: [
      { label: "כן, לחדש", votes: 18 },
      { label: "לא, לחפש ספק חדש", votes: 5 },
      { label: "צריך עוד מידע", votes: 4 }
    ],
    quorum: 21,
    closesAt: "2026-06-10",
    status: "open"
  }
];

export async function getDashboard() {
  const building = buildings[0];
  const allTickets = await listMaintenanceTickets();
  const openTickets = allTickets.filter((ticket) => ticket.status !== "closed");
  const urgentTickets = openTickets.filter((ticket) => ticket.priority === "P0" || ticket.priority === "P1");
  const latePayments = payments.filter((payment) => payment.status === "late");

  return {
    building,
    stats: {
      collectionRate: building.collectionRate,
      balance: building.balance,
      openTickets: openTickets.length,
      urgentTickets: urgentTickets.length,
      activeResidents: building.activeResidents,
      totalResidents: building.units,
      communityPostsToday: 12
    },
    attention: [
      ...urgentTickets.map((ticket) => `${ticket.id}: ${ticket.title} - ${ticket.status}`),
      `${latePayments.length} דיירים באיחור תשלום`
    ],
    agentSummary: "בשבעת הימים האחרונים נפתחו 9 תקלות ונסגרו 8. שיעור הגבייה עלה ב-5%, ויש טיקט חירום אחד שממתין לאישור ספק."
  };
}

export async function listMaintenanceTickets() {
  if (!dbEnabled) return tickets;

  const result = await query(
    `SELECT t.id, t.title, t.description, t.category, t.priority, t.status,
            t.location, t.provider_id AS "providerId", t.opened_at AS "openedAt",
            t.sla_hours AS "slaHours",
            COALESCE(r.name, 'דייר מהקבוצה') AS reporter
     FROM maintenance_tickets t
     LEFT JOIN residents r ON r.id = t.reporter_id
     ORDER BY t.opened_at DESC`
  );
  return result.rows;
}

export async function createMaintenanceTicket({
  actorId = "agent",
  reporterId = null,
  title,
  description,
  category = "general",
  priority = "P3",
  status = "open",
  location = "לא צוין",
  providerId = null
}) {
  const id = `T-${Date.now().toString().slice(-6)}`;
  const slaHours = priority === "P0" ? 1 : priority === "P1" ? 24 : priority === "P2" ? 72 : 336;
  const ticket = {
    id,
    title: title || "דיווח תחזוקה מה-Agent",
    description: description || title || "דיווח תחזוקה מה-Agent",
    category,
    priority,
    status,
    location,
    reporter: residents.find((resident) => resident.id === reporterId)?.name ?? "דייר מהקבוצה",
    providerId,
    openedAt: new Date().toISOString(),
    slaHours
  };

  if (dbEnabled) {
    await query(
      `INSERT INTO maintenance_tickets
       (id, building_id, reporter_id, provider_id, title, description, category, priority, status, location, sla_hours)
       VALUES ($1, 'bldg-rtl-24', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, reporterId, providerId, ticket.title, ticket.description, category, priority, status, location, slaHours]
    );
  } else {
    tickets.unshift(ticket);
  }

  await recordAudit({
    actorId,
    action: "maintenance_ticket_created",
    entityType: "maintenance_ticket",
    entityId: id,
    metadata: { reporterId, priority, location, providerId, source: "agent" }
  });
  return ticket;
}

export function findResidentByToken(token) {
  return residents.find((resident) => resident.accessToken === token);
}

export async function getResidentByToken(token) {
  if (!dbEnabled) return findResidentByToken(token) ?? null;
  const tokenHash = hashToken(token);
  const result = await query(
    `SELECT id, name, apartment, floor, role
     FROM residents
     WHERE access_token_hash IN ($1, $2)
       AND (token_expires_at IS NULL OR token_expires_at > now())`,
    [tokenHash, token]
  );
  return result.rows[0] ?? null;
}

export async function getResidentAccount(token) {
  if (dbEnabled) return getResidentAccountFromDb(token);

  const resident = findResidentByToken(token);
  if (!resident) return null;

  const residentCharges = charges.filter((charge) => charge.residentId === resident.id);
  const residentPayments = payments.filter((payment) => payment.residentId === resident.id);
  const ledger = residentLedger.filter((entry) => entry.residentId === resident.id);
  const paidThisYear = residentPayments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const chargeTotal = residentCharges
    .filter((charge) => charge.status !== "void")
    .reduce((sum, charge) => sum + charge.amount, 0);
  const openBalance = Math.max(0, chargeTotal - paidThisYear);

  return {
    resident: {
      id: resident.id,
      name: resident.name,
      apartment: resident.apartment,
      floor: resident.floor,
      role: resident.role
    },
    balance: {
      open: openBalance,
      paidThisYear,
      currency: "ILS"
    },
    charges: residentCharges,
    payments: residentPayments,
    ledger
  };
}

export async function createResident({ actorId, name, apartment, floor = null, role = "resident", phone = null, email = null }) {
  const id = `res-${Date.now()}`;
  const accessToken = generateMagicToken();
  const accessTokenHash = hashToken(accessToken);

  if (dbEnabled) {
    await query(
      `INSERT INTO residents (id, building_id, name, apartment, floor, role, phone, email, access_token_hash, consent_ai_processing)
       VALUES ($1, 'bldg-rtl-24', $2, $3, $4, $5, $6, $7, $8, false)`,
      [id, name, apartment, floor, role, phone, email, accessTokenHash]
    );
  } else {
    residents.push({ id, name, apartment, floor, role, phone, email, paidCurrentMonth: false, balanceDue: 0, accessToken });
  }

  await recordAudit({ actorId, action: "resident_created", entityType: "resident", entityId: id, metadata: { apartment, role } });
  return { id, name, apartment, floor, role, phone, email, accessToken };
}

export async function createResidentCharge({ actorId, residentId, title, description, amount, dueDate, category = "manual" }) {
  const id = `chg-${Date.now()}`;
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("Invalid charge amount");

  if (dbEnabled) {
    await query(
      `INSERT INTO resident_charges (id, building_id, resident_id, title, description, amount_cents, status, due_date, category)
       VALUES ($1, 'bldg-rtl-24', $2, $3, $4, $5, 'open', $6, $7)`,
      [id, residentId, title, description, Math.round(numericAmount * 100), dueDate, category]
    );
    await query(
      `INSERT INTO resident_ledger (id, resident_id, type, title, amount_cents, posted_at)
       VALUES ($1, $2, 'charge', $3, $4, CURRENT_DATE)`,
      [`led-${Date.now()}`, residentId, title, Math.round(numericAmount * 100)]
    );
  } else {
    charges.push({ id, residentId, title, description, amount: numericAmount, status: "open", dueDate, category });
    residentLedger.push({ id: `led-${Date.now()}`, residentId, type: "charge", title, amount: numericAmount, date: new Date().toISOString().slice(0, 10) });
  }

  await recordAudit({ actorId, action: "charge_created", entityType: "resident_charge", entityId: id, metadata: { residentId, amount: numericAmount } });
  return { id, residentId, title, description, amount: numericAmount, status: "open", dueDate, category };
}

export async function updatePaymentStatus({ actorId, paymentId, status }) {
  if (!["pending", "paid", "late", "failed"].includes(status)) throw new Error("Invalid payment status");
  if (dbEnabled) {
    await query(`UPDATE payments SET status = $1 WHERE id = $2`, [status, paymentId]);
  } else {
    const payment = payments.find((entry) => entry.id === paymentId);
    if (payment) payment.status = status;
  }
  await recordAudit({ actorId, action: "payment_status_updated", entityType: "payment", entityId: paymentId, metadata: { status } });
  return { id: paymentId, status };
}

export async function createVote({ actorId, title, options = [], quorum = 1, closesAt }) {
  const id = `vote-${Date.now()}`;
  const vote = { id, title, options: options.map((label) => ({ label, votes: 0 })), quorum, closesAt, status: "open" };
  votes.push(vote);
  await recordAudit({ actorId, action: "vote_created", entityType: "vote", entityId: id, metadata: { options, quorum, closesAt } });
  return vote;
}

export async function approveExpense({ actorId, title, amount, providerId = null }) {
  const id = `expense-${Date.now()}`;
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("Invalid expense amount");
  await recordAudit({ actorId, action: "expense_approved", entityType: "expense", entityId: id, metadata: { title, amount: numericAmount, providerId } });
  return { id, title, amount: numericAmount, providerId, status: "approved" };
}

export async function createProvider({ actorId, name, domain, phone }) {
  const id = `prov-${Date.now()}`;
  const provider = { id, name, domain, phone, rating: 0, avgResponseHours: 0 };
  providers.push(provider);
  await recordAudit({ actorId, action: "provider_created", entityType: "provider", entityId: id, metadata: { domain } });
  return provider;
}

export async function recordResidentPayment({ token, amount, method, providerReference = null }) {
  if (dbEnabled) return recordResidentPaymentInDb({ token, amount, method, providerReference });

  const resident = findResidentByToken(token);
  if (!resident) return null;

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  let remaining = numericAmount;
  for (const charge of charges.filter((entry) => entry.residentId === resident.id && entry.status === "open")) {
    if (remaining <= 0) break;
    if (remaining >= charge.amount) {
      remaining -= charge.amount;
      charge.status = "paid";
      charge.paidAt = new Date().toISOString();
    }
  }

  const payment = {
    id: `pay-${Date.now()}`,
    residentId: resident.id,
    residentName: resident.name,
    amount: numericAmount,
    method,
    status: "paid",
    paidAt: new Date().toISOString(),
    providerReference
  };

  payments.push(payment);
  residentLedger.push({
    id: `led-${Date.now()}`,
    residentId: resident.id,
    type: "payment",
    title: paymentTitle(method),
    amount: -numericAmount,
    date: new Date().toISOString().slice(0, 10),
    providerReference
  });

  resident.balanceDue = Math.max(0, resident.balanceDue - numericAmount);
  resident.paidCurrentMonth = (await getResidentAccount(token))?.balance.open === 0;

  return { payment, account: await getResidentAccount(token) };
}

export async function resetResidentDemoAccount(token) {
  if (dbEnabled) return resetResidentDemoAccountInDb(token);

  const resident = findResidentByToken(token);
  if (!resident) return null;

  for (let index = payments.length - 1; index >= 0; index -= 1) {
    const payment = payments[index];
    if (payment.residentId === resident.id && payment.providerReference) payments.splice(index, 1);
  }

  for (const charge of charges.filter((entry) => entry.residentId === resident.id)) {
    charge.status = "open";
    delete charge.paidAt;
  }

  for (let index = residentLedger.length - 1; index >= 0; index -= 1) {
    const entry = residentLedger[index];
    if (entry.residentId === resident.id && entry.type === "payment" && entry.providerReference) {
      residentLedger.splice(index, 1);
    }
  }

  resident.balanceDue = 470;
  resident.paidCurrentMonth = false;

  return { account: await getResidentAccount(token) };
}

async function getResidentAccountFromDb(token) {
  const tokenHash = hashToken(token);
  const residentResult = await query(
    `SELECT id, name, apartment, floor, role
     FROM residents
     WHERE access_token_hash IN ($1, $2)
       AND (token_expires_at IS NULL OR token_expires_at > now())`,
    [tokenHash, token]
  );
  const resident = residentResult.rows[0];
  if (!resident) return null;

  const chargesResult = await query(
    `SELECT id, resident_id AS "residentId", title, description, amount_cents AS "amountCents",
            status, to_char(due_date, 'YYYY-MM-DD') AS "dueDate", category, paid_at AS "paidAt"
     FROM resident_charges
     WHERE resident_id = $1
     ORDER BY due_date ASC`,
    [resident.id]
  );
  const paymentsResult = await query(
    `SELECT p.id, p.resident_id AS "residentId", r.name AS "residentName",
            p.amount_cents AS "amountCents", p.method, p.status,
            p.paid_at AS "paidAt", p.provider_reference AS "providerReference"
     FROM payments p
     JOIN residents r ON r.id = p.resident_id
     WHERE p.resident_id = $1
     ORDER BY p.created_at DESC`,
    [resident.id]
  );
  const ledgerResult = await query(
    `SELECT id, resident_id AS "residentId", type, title,
            amount_cents AS "amountCents", provider_reference AS "providerReference",
            to_char(posted_at, 'YYYY-MM-DD') AS "date"
     FROM resident_ledger
     WHERE resident_id = $1
     ORDER BY posted_at DESC, created_at DESC`,
    [resident.id]
  );

  const charges = chargesResult.rows.map((charge) => ({
    ...charge,
    amount: charge.amountCents / 100
  }));
  const paymentsForResident = paymentsResult.rows.map((payment) => ({
    ...payment,
    amount: payment.amountCents / 100
  }));
  const ledger = ledgerResult.rows.map((entry) => ({
    ...entry,
    amount: entry.amountCents / 100
  }));
  const paidThisYear = paymentsForResident
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const chargeTotal = charges
    .filter((charge) => charge.status !== "void")
    .reduce((sum, charge) => sum + charge.amount, 0);
  const openBalance = Math.max(0, chargeTotal - paidThisYear);

  return {
    resident,
    balance: {
      open: openBalance,
      paidThisYear,
      currency: "ILS"
    },
    charges,
    payments: paymentsForResident,
    ledger
  };
}

async function recordResidentPaymentInDb({ token, amount, method, providerReference = null }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const amountCents = Math.round(numericAmount * 100);
  const paymentId = `pay-${Date.now()}`;
  const ledgerId = `led-${Date.now()}`;

  await transaction(async (client) => {
    const tokenHash = hashToken(token);
    const residentResult = await client.query(
      `SELECT id, name FROM residents
       WHERE access_token_hash IN ($1, $2)
         AND (token_expires_at IS NULL OR token_expires_at > now())`,
      [tokenHash, token]
    );
    const resident = residentResult.rows[0];
    if (!resident) throw new Error("Invalid magic link");

    await client.query(
      `INSERT INTO payments (id, building_id, resident_id, amount_cents, method, status, provider_reference, paid_at)
       VALUES ($1, 'bldg-rtl-24', $2, $3, $4, 'paid', $5, now())`,
      [paymentId, resident.id, amountCents, method, providerReference]
    );

    let remaining = amountCents;
    const openCharges = await client.query(
      `SELECT id, amount_cents
       FROM resident_charges
       WHERE resident_id = $1 AND status = 'open'
       ORDER BY due_date ASC
       FOR UPDATE`,
      [resident.id]
    );

    for (const charge of openCharges.rows) {
      if (remaining <= 0) break;
      if (remaining >= charge.amount_cents) {
        remaining -= charge.amount_cents;
        await client.query(
          `UPDATE resident_charges
           SET status = 'paid', paid_at = now()
           WHERE id = $1`,
          [charge.id]
        );
      }
    }

    await client.query(
      `INSERT INTO resident_ledger (id, resident_id, type, title, amount_cents, provider_reference, posted_at)
       VALUES ($1, $2, 'payment', $3, $4, $5, CURRENT_DATE)`,
      [
        ledgerId,
        resident.id,
        paymentTitle(method),
        -amountCents,
        providerReference
      ]
    );
  });

  const account = await getResidentAccount(token);
  const payment = account.payments.find((entry) => entry.id === paymentId) ?? {
    id: paymentId,
    amount: numericAmount,
    method,
    status: "paid",
    providerReference
  };

  return { payment, account };
}

async function resetResidentDemoAccountInDb(token) {
  await transaction(async (client) => {
    const tokenHash = hashToken(token);
    const residentResult = await client.query(
      `SELECT id FROM residents
       WHERE access_token_hash IN ($1, $2)
         AND (token_expires_at IS NULL OR token_expires_at > now())`,
      [tokenHash, token]
    );
    const resident = residentResult.rows[0];
    if (!resident) throw new Error("Invalid magic link");

    await client.query(
      `DELETE FROM resident_ledger
       WHERE resident_id = $1 AND type = 'payment'`,
      [resident.id]
    );
    await client.query(
      `DELETE FROM payments
       WHERE resident_id = $1 AND status = 'paid'`,
      [resident.id]
    );
    await client.query(
      `UPDATE resident_charges
       SET status = 'open', paid_at = NULL
       WHERE resident_id = $1`,
      [resident.id]
    );
  });

  return { account: await getResidentAccount(token) };
}

function paymentTitle(method) {
  if (method === "paypal") return "תשלום PayPal Sandbox";
  if (method === "bit") return "תשלום BIT";
  return "תשלום דמו";
}
