import ExcelJS from "exceljs";
import type { PaymentExportRow } from "@/lib/dal/payments";
import type { ExpenseExportRow } from "@/lib/dal/expenses";
import type { ResidentExportRow } from "@/lib/dal/residents";

/**
 * Bump when sheets or columns are added, removed or renamed, so a future importer
 * can tell which layout a file uses.
 *
 * Import rules (also written on the "Read Me" sheet):
 *  - Row 1 of every data sheet is the header; match columns by header text, not position.
 *  - A row is a record only if its ID column (Payment ID / Expense ID / Resident ID) holds
 *    a number. Blank rows and the TOTAL / calculation rows at the bottom have no ID.
 */
export const REPORT_FORMAT_VERSION = 4;

type Cell = string | number | null;

interface Column<T> {
  header: string;
  width: number;
  money?: boolean;
  /** Technical column (IDs etc.) — kept at the right, greyed header */
  system?: boolean;
  value: (r: T) => Cell;
}

interface HostelRef {
  id: number;
  name: string;
}

const MONEY_FMT = "#,##0.00";
const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const HEADER_FILL = fill("FF1F2937");   // dark slate, white text
const SYSTEM_FILL = fill("FF9CA3AF");   // grey for technical columns
const TOTAL_FILL = fill("FFFEF3C7");
const STATUS_STYLE: Record<string, { fill: ExcelJS.Fill; color: string }> = {
  Paid:    { fill: fill("FFDCFCE7"), color: "FF166534" },
  Pending: { fill: fill("FFFEF3C7"), color: "FF92400E" },
  Overdue: { fill: fill("FFFEE2E2"), color: "FF991B1B" },
};
const THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};
const UNASSIGNED = "Unassigned";

const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const yesNo = (v: boolean) => (v ? "Yes" : "No");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const billing = (roomType: string | null) => (roomType === "dormitory" ? "Daily" : "Monthly");
const isDorm = (roomType: string | null) => roomType === "dormitory";
const natural = (a: string | null, b: string | null) =>
  (a ?? "￿").localeCompare(b ?? "￿", undefined, { numeric: true, sensitivity: "base" });

function paymentStatus(r: PaymentExportRow) {
  if (r.paid) return "Paid";
  return r.is_overdue ? "Overdue" : "Pending";
}

/** Hostel → room → bed → name, so the list reads like walking the building. */
function byLocation<T extends { hostel_name: string | null; room_number: string | null; bed_number: string | null }>(
  name: (r: T) => string,
) {
  return (a: T, b: T) =>
    natural(a.hostel_name, b.hostel_name) ||
    natural(a.room_number, b.room_number) ||
    natural(a.bed_number, b.bed_number) ||
    natural(name(a), name(b));
}

// ─── Column definitions (shared with a future importer) ──────────────────────
// Readable columns first, technical ones (system: true) at the right.

export const PAYMENT_COLUMNS: Column<PaymentExportRow>[] = [
  { header: "Resident Name",   width: 26, value: (r) => r.resident_name },
  { header: "Phone",           width: 14, value: (r) => r.phone },
  { header: "Hostel",          width: 14, value: (r) => r.hostel_name ?? UNASSIGNED },
  { header: "Room",            width: 8,  value: (r) => r.room_number },
  { header: "Bed",             width: 6,  value: (r) => r.bed_number },
  { header: "Billing",         width: 9,  value: (r) => billing(r.room_type) },
  { header: "Rent",            width: 11, money: true, value: (r) => num(r.amount) },
  { header: "Fine Due",        width: 10, money: true, value: (r) => num(r.fine_amount) },
  { header: "Fine Paid",       width: 10, money: true, value: (r) => num(r.fine_paid) },
  { header: "Total",           width: 11, money: true, value: (r) => num(r.total) },
  { header: "Status",          width: 9,  value: paymentStatus },
  { header: "Paid On",         width: 16, value: (r) => r.paid_at },
  { header: "Due Date",        width: 11, value: (r) => r.due_date },
  { header: "Days Overdue",    width: 8,  value: (r) => r.days_overdue },
  { header: "Advance",         width: 9,  value: (r) => yesNo(r.is_advance) },
  { header: "Notes",           width: 28, value: (r) => r.notes },
  { header: "Parent Phone",    width: 14, value: (r) => r.parent_phone },
  { header: "Email",           width: 24, value: (r) => r.email },
  { header: "ID Number",       width: 16, value: (r) => r.id_number },
  { header: "Monthly Rate",    width: 12, money: true, value: (r) => num(r.monthly_rate) },
  { header: "Daily Rate",      width: 10, money: true, value: (r) => num(r.daily_rate) },
  { header: "Days Billed",     width: 8,  value: (r) => r.days_billed },
  { header: "Move-in Date",    width: 12, value: (r) => r.move_in_date },
  { header: "Move-out Date",   width: 13, value: (r) => r.move_out_date },
  { header: "Resident Active", width: 9,  value: (r) => yesNo(r.resident_active) },
  { header: "Month",           width: 9,  system: true, value: (r) => r.month },
  { header: "Room Type",       width: 11, system: true, value: (r) => r.room_type },
  { header: "Payment ID",      width: 11, system: true, value: (r) => r.payment_id },
  { header: "Resident ID",     width: 11, system: true, value: (r) => r.resident_id },
  { header: "Hostel ID",       width: 9,  system: true, value: (r) => r.hostel_id },
  { header: "Booking ID",      width: 10, system: true, value: (r) => r.booking_id },
];

export const EXPENSE_COLUMNS: Column<ExpenseExportRow>[] = [
  { header: "Date",       width: 11, value: (r) => r.date },
  { header: "Hostel",     width: 14, value: (r) => r.hostel_name ?? UNASSIGNED },
  { header: "Category",   width: 13, value: (r) => r.category },
  { header: "Title",      width: 30, value: (r) => r.title },
  { header: "Amount",     width: 12, money: true, value: (r) => num(r.amount) },
  { header: "Notes",      width: 30, value: (r) => r.notes },
  { header: "Expense ID", width: 11, system: true, value: (r) => r.expense_id },
  { header: "Hostel ID",  width: 9,  system: true, value: (r) => r.hostel_id },
];

export const RESIDENT_COLUMNS: Column<ResidentExportRow>[] = [
  { header: "Name",             width: 26, value: (r) => r.name },
  { header: "Phone",            width: 14, value: (r) => r.phone },
  { header: "Parent Phone",     width: 14, value: (r) => r.parent_phone },
  { header: "Hostel",           width: 14, value: (r) => r.hostel_name },
  { header: "Room",             width: 8,  value: (r) => r.room_number },
  { header: "Bed",              width: 6,  value: (r) => r.bed_number },
  { header: "Billing",          width: 9,  value: (r) => (r.is_staff ? "Staff" : billing(r.room_type)) },
  { header: "Monthly Rate",     width: 12, money: true, value: (r) => num(r.monthly_rate) },
  { header: "Daily Rate",       width: 10, money: true, value: (r) => num(r.daily_rate) },
  { header: "Active",           width: 8,  value: (r) => yesNo(r.is_active) },
  { header: "Currently In Bed", width: 10, value: (r) => yesNo(r.has_active_bed) },
  { header: "Move-in Date",     width: 12, value: (r) => r.move_in_date },
  { header: "Move-out Date",    width: 13, value: (r) => r.move_out_date },
  { header: "Email",            width: 24, value: (r) => r.email },
  { header: "ID Number",        width: 16, value: (r) => r.id_number },
  { header: "Staff",            width: 7,  value: (r) => yesNo(r.is_staff) },
  { header: "Blacklisted",      width: 11, value: (r) => yesNo(r.is_blacklisted) },
  { header: "Blacklist Reason", width: 24, value: (r) => r.blacklist_reason },
  { header: "Notes",            width: 28, value: (r) => r.notes },
  { header: "Added On",         width: 11, value: (r) => r.created_at },
  { header: "Room Type",        width: 11, system: true, value: (r) => r.room_type },
  { header: "Resident ID",      width: 11, system: true, value: (r) => r.resident_id },
  { header: "Hostel ID",        width: 9,  system: true, value: (r) => r.hostel_id },
];

// ─── Sheet helpers ───────────────────────────────────────────────────────────

/** Excel sheet names: max 31 chars, no []:*?/\ */
function sheetName(name: string) {
  return name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31);
}

function colIndex<T>(columns: Column<T>[], header: string) {
  const i = columns.findIndex((c) => c.header === header);
  if (i < 0) throw new Error(`Unknown column ${header}`);
  return i + 1;
}

function colLetter<T>(columns: Column<T>[], header: string) {
  let n = colIndex(columns, header), s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Formula cell that also carries the computed value, so it shows correctly before Excel recalculates. */
function formula(f: string, result: number): ExcelJS.CellFormulaValue {
  return { formula: f, result };
}

/** Header + data rows with borders, frozen header/name column and coloured Status. */
function addDataSheet<T>(wb: ExcelJS.Workbook, name: string, columns: Column<T>[], rows: T[], tabColor?: string) {
  const ws = wb.addWorksheet(sheetName(name), {
    views: [{ state: "frozen", xSplit: 1, ySplit: 1 }],
    properties: tabColor ? { tabColor: { argb: tabColor } } : undefined,
  });
  ws.columns = columns.map((c) => ({
    header: c.header,
    width: c.width,
    style: c.money ? { numFmt: MONEY_FMT } : {},
  }));
  for (const r of rows) ws.addRow(columns.map((c) => c.value(r)));

  const header = ws.getRow(1);
  header.height = 30;
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = c.system ? SYSTEM_FILL : HEADER_FILL;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = THIN;
  });

  const statusCol = columns.findIndex((c) => c.header === "Status") + 1;
  for (let i = 2; i <= rows.length + 1; i++) {
    const row = ws.getRow(i);
    for (let c = 1; c <= columns.length; c++) row.getCell(c).border = THIN;
    row.getCell(1).font = { bold: true };
    if (statusCol > 0) {
      const cell = row.getCell(statusCol);
      const style = STATUS_STYLE[String(cell.value)];
      if (style) {
        cell.fill = style.fill;
        cell.font = { bold: true, color: { argb: style.color } };
        cell.alignment = { horizontal: "center" };
      }
    }
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: columns.length } };
  return { ws, lastRow: rows.length + 1 };
}

/**
 * Calculation row under a table. The label goes in column 1 (the name column) and the
 * ID columns stay empty, so importers skip it.
 */
function addCalcRow<T>(ws: ExcelJS.Worksheet, columns: Column<T>[], label: string, cells: Record<string, Cell | ExcelJS.CellFormulaValue>) {
  const row = ws.addRow([]);
  row.getCell(1).value = label;
  for (const [header, value] of Object.entries(cells)) {
    const idx = colIndex(columns, header);
    const cell = row.getCell(idx);
    cell.value = value;
    if (columns[idx - 1].money) cell.numFmt = MONEY_FMT;
  }
  row.font = { bold: true };
  row.eachCell({ includeEmpty: false }, (c) => { c.fill = TOTAL_FILL; c.border = THIN; });
  return row;
}

// ─── Payment sheets ──────────────────────────────────────────────────────────

function addPaymentSheet(wb: ExcelJS.Workbook, name: string, rows: PaymentExportRow[], tabColor?: string) {
  const sorted = [...rows].sort(byLocation((r) => r.resident_name));
  const { ws, lastRow } = addDataSheet(wb, name, PAYMENT_COLUMNS, sorted, tabColor);
  const L = (h: string) => colLetter(PAYMENT_COLUMNS, h);
  const range = (h: string) => `${L(h)}2:${L(h)}${lastRow}`;
  const has = sorted.length > 0;
  const sum = (h: string, val: number) => (has ? formula(`SUM(${range(h)})`, val) : 0);
  const sumIf = (h: string, cond: string, val: number) =>
    has ? formula(`SUMIF(${range("Status")},"${cond}",${range(h)})`, val) : 0;

  const paid = sorted.filter((r) => r.paid);
  const unpaid = sorted.filter((r) => !r.paid);
  const overdue = unpaid.filter((r) => r.is_overdue);
  const t = (list: PaymentExportRow[], f: (r: PaymentExportRow) => string | number) =>
    list.reduce((s, r) => s + num(f(r)), 0);

  ws.addRow([]);
  addCalcRow(ws, PAYMENT_COLUMNS, `TOTAL (${plural(sorted.length, "record")})`, {
    "Rent": sum("Rent", t(sorted, (r) => r.amount)),
    "Fine Due": sum("Fine Due", t(sorted, (r) => r.fine_amount)),
    "Fine Paid": sum("Fine Paid", t(sorted, (r) => r.fine_paid)),
    "Total": sum("Total", t(sorted, (r) => r.total)),
  });
  addCalcRow(ws, PAYMENT_COLUMNS, `COLLECTED (${paid.length} paid)`, {
    "Rent": sumIf("Rent", "Paid", t(paid, (r) => r.amount)),
    "Fine Paid": sumIf("Fine Paid", "Paid", t(paid, (r) => r.fine_paid)),
    "Total": sumIf("Total", "Paid", t(paid, (r) => r.total)),
  });
  addCalcRow(ws, PAYMENT_COLUMNS, `PENDING (${unpaid.length} not paid)`, {
    "Rent": sumIf("Rent", "<>Paid", t(unpaid, (r) => r.amount)),
    "Fine Due": sumIf("Fine Due", "<>Paid", t(unpaid, (r) => r.fine_amount)),
    "Total": sumIf("Total", "<>Paid", t(unpaid, (r) => r.total)),
  });
  addCalcRow(ws, PAYMENT_COLUMNS, `OVERDUE (${overdue.length})`, {
    "Total": sumIf("Total", "Overdue", t(overdue, (r) => r.total)),
  });
}

// ─── Report sheet (the easy-to-read one) ─────────────────────────────────────
// Per hostel: Normal table, Dormitory table (with stay details), each ending in totals,
// then the hostel's income / expenses / profit. Grand total for all hostels at the end.

const REPORT_COLS: { header: string; width: number; money?: boolean; dormOnly?: boolean }[] = [
  { header: "#",          width: 5 },
  { header: "Phone",      width: 14 },
  { header: "Name",       width: 26 },
  { header: "Room / Bed", width: 11 },
  { header: "Rent",       width: 12, money: true },
  { header: "Fine",       width: 10, money: true },
  { header: "Amount",     width: 13, money: true },
  { header: "Paid",       width: 10 },
  { header: "Paid On",    width: 17 },
  { header: "Daily Rate", width: 11, money: true, dormOnly: true },
  { header: "Days",       width: 7,  dormOnly: true },
  { header: "Move-in",    width: 12, dormOnly: true },
  { header: "Move-out",   width: 12, dormOnly: true },
];
const RC = (h: string) => REPORT_COLS.findIndex((c) => c.header === h) + 1;
const RL = (h: string) => String.fromCharCode(64 + RC(h)); // all within A–M

interface TableTotals { collected: number; pending: number }

function reportTable(ws: ExcelJS.Worksheet, title: string, rows: PaymentExportRow[], dorm: boolean): TableTotals {
  const cols = REPORT_COLS.filter((c) => dorm || !c.dormOnly);
  const sorted = [...rows].sort(byLocation((r) => r.resident_name));

  const sub = ws.addRow([`${title} — ${plural(sorted.length, "resident")}`]);
  sub.font = { bold: true, size: 12 };

  const head = ws.addRow(cols.map((c) => c.header));
  head.height = 20;
  cols.forEach((_, i) => {
    const c = head.getCell(i + 1);
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = HEADER_FILL;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = THIN;
  });

  if (sorted.length === 0) {
    ws.addRow(["", "", "No payments this month"]).font = { italic: true, color: { argb: "FF6B7280" } };
    ws.addRow([]);
    return { collected: 0, pending: 0 };
  }

  const first = ws.rowCount + 1;
  sorted.forEach((r, i) => {
    const status = paymentStatus(r);
    const fine = r.paid ? num(r.fine_paid) : num(r.fine_amount);
    const values: Cell[] = [
      i + 1, r.phone, r.resident_name,
      [r.room_number, r.bed_number].filter(Boolean).join(" / ") || "—",
      num(r.amount), fine, num(r.amount) + fine, status, r.paid_at ?? "",
    ];
    if (dorm) values.push(num(r.daily_rate), r.days_billed, r.move_in_date ?? "", r.move_out_date ?? "");
    const row = ws.addRow(values);
    cols.forEach((c, j) => {
      const cell = row.getCell(j + 1);
      cell.border = THIN;
      if (c.money) cell.numFmt = MONEY_FMT;
    });
    row.getCell(RC("Name")).font = { bold: true };
    const st = row.getCell(RC("Paid"));
    st.fill = STATUS_STYLE[status].fill;
    st.font = { bold: true, color: { argb: STATUS_STYLE[status].color } };
    st.alignment = { horizontal: "center" };
  });
  const last = ws.rowCount;

  const range = (h: string) => `${RL(h)}${first}:${RL(h)}${last}`;
  const paid = sorted.filter((r) => r.paid);
  const amount = (list: PaymentExportRow[]) =>
    list.reduce((s, r) => s + num(r.amount) + (r.paid ? num(r.fine_paid) : num(r.fine_amount)), 0);
  const collected = amount(paid);
  const pending = amount(sorted) - collected;

  const totalRow = (label: string, cells: Record<string, Cell | ExcelJS.CellFormulaValue>, highlight: boolean) => {
    const row = ws.addRow([]);
    row.getCell(RC("Name")).value = label;
    for (const [h, v] of Object.entries(cells)) row.getCell(RC(h)).value = v;
    for (let i = 1; i <= cols.length; i++) {
      const c = row.getCell(i);
      c.font = { bold: true };
      c.border = THIN;
      if (cols[i - 1].money) c.numFmt = MONEY_FMT;
      if (highlight) c.fill = TOTAL_FILL;
    }
  };
  totalRow("TOTAL", {
    "Rent": formula(`SUM(${range("Rent")})`, sorted.reduce((s, r) => s + num(r.amount), 0)),
    "Fine": formula(`SUM(${range("Fine")})`, sorted.reduce((s, r) => s + (r.paid ? num(r.fine_paid) : num(r.fine_amount)), 0)),
    "Amount": formula(`SUM(${range("Amount")})`, amount(sorted)),
    "Paid": `${paid.length} of ${sorted.length}`,
  }, true);
  totalRow("Collected", { "Amount": formula(`SUMIF(${range("Paid")},"Paid",${range("Amount")})`, collected) }, false);
  totalRow("Not paid yet", { "Amount": formula(`SUMIF(${range("Paid")},"<>Paid",${range("Amount")})`, pending) }, false);
  ws.addRow([]);
  return { collected, pending };
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function categoryTotals(rows: ExpenseExportRow[]): [string, number][] {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.category] = (map[r.category] ?? 0) + num(r.amount);
  return Object.entries(map).sort(([, a], [, b]) => b - a);
}

/** Itemised expenses for one hostel, then a by-category breakdown and total. */
function reportExpenses(ws: ExcelJS.Worksheet, rows: ExpenseExportRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.expense_id - b.expense_id);
  const span = ["#", "Phone", "Name", "Room / Bed", "Rent", "Fine", "Amount"].map(RC);

  const sub = ws.addRow([`Expenses — ${plural(sorted.length, "item")}`]);
  sub.font = { bold: true, size: 12 };

  // Reuses the report grid: # | Date | Title | Category | Notes (E:F) | Amount (G)
  const head = ws.addRow([]);
  const labels: Record<string, string> = { "#": "#", "Phone": "Date", "Name": "Title", "Room / Bed": "Category", "Rent": "Notes", "Amount": "Amount" };
  for (const [col, label] of Object.entries(labels)) head.getCell(RC(col)).value = label;
  ws.mergeCells(head.number, RC("Rent"), head.number, RC("Fine"));
  for (const i of span) {
    const c = head.getCell(i);
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = fill("FFDC2626");
    c.alignment = { horizontal: "center" };
    c.border = THIN;
  }

  if (sorted.length === 0) {
    ws.addRow(["", "", "No expenses this month"]).font = { italic: true, color: { argb: "FF6B7280" } };
    ws.addRow([]);
    return;
  }

  const first = ws.rowCount + 1;
  sorted.forEach((e, i) => {
    const row = ws.addRow([]);
    row.getCell(RC("#")).value = i + 1;
    row.getCell(RC("Phone")).value = e.date;
    row.getCell(RC("Name")).value = e.title;
    row.getCell(RC("Room / Bed")).value = capitalize(e.category);
    row.getCell(RC("Rent")).value = e.notes ?? "";
    ws.mergeCells(row.number, RC("Rent"), row.number, RC("Fine"));
    const amt = row.getCell(RC("Amount"));
    amt.value = num(e.amount);
    amt.numFmt = MONEY_FMT;
    for (const c of span) row.getCell(c).border = THIN;
  });
  const last = ws.rowCount;
  const range = (col: string) => `${RL(col)}${first}:${RL(col)}${last}`;

  // By category — SUMIF on the Category column so it follows any edits
  for (const [cat, total] of categoryTotals(sorted)) {
    const row = ws.addRow([]);
    row.getCell(RC("Name")).value = `${capitalize(cat)}`;
    const v = row.getCell(RC("Amount"));
    v.value = formula(`SUMIF(${range("Room / Bed")},"${capitalize(cat).replace(/"/g, '""')}",${range("Amount")})`, total);
    v.numFmt = MONEY_FMT;
    for (const c of span.slice(2)) row.getCell(c).border = { bottom: THIN.bottom };
  }
  const total = ws.addRow([]);
  total.getCell(RC("Name")).value = "TOTAL EXPENSES";
  const tv = total.getCell(RC("Amount"));
  tv.value = formula(`SUM(${range("Amount")})`, sorted.reduce((s, e) => s + num(e.amount), 0));
  tv.numFmt = MONEY_FMT;
  for (const c of span.slice(2)) {
    const cell = total.getCell(c);
    cell.font = { bold: true };
    cell.fill = TOTAL_FILL;
    cell.border = THIN;
  }
  ws.addRow([]);
}

function moneyBox(ws: ExcelJS.Worksheet, title: string, lines: [string, number, boolean?][]) {
  const head = ws.addRow([]);
  head.getCell(RC("Name")).value = title;
  for (const h of ["Name", "Room / Bed", "Rent", "Fine", "Amount"]) {
    const c = head.getCell(RC(h));
    c.fill = HEADER_FILL;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  }
  for (const [label, value, strong] of lines) {
    const row = ws.addRow([]);
    row.getCell(RC("Name")).value = label;
    const v = row.getCell(RC("Amount"));
    v.value = value;
    v.numFmt = MONEY_FMT;
    for (const h of ["Name", "Room / Bed", "Rent", "Fine", "Amount"]) {
      const c = row.getCell(RC(h));
      c.border = { bottom: THIN.bottom };
      if (strong) { c.font = { bold: true }; c.fill = TOTAL_FILL; }
    }
    if (label.startsWith("Net") && value < 0) v.font = { bold: true, color: { argb: "FF991B1B" } };
  }
}

function addReportSheet(
  wb: ExcelJS.Workbook,
  month: string,
  groups: HostelRef[],
  payments: PaymentExportRow[],
  expenses: ExpenseExportRow[],
  inGroup: (id: number | null, g: HostelRef) => boolean,
) {
  const ws = wb.addWorksheet("Report", { properties: { tabColor: { argb: "FF16A34A" } } });
  ws.columns = REPORT_COLS.map((c) => ({ width: c.width }));
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const title = ws.addRow([`Crown Hostels — ${new Date(`${month}-01T00:00:00`).toLocaleString("en-IN", { month: "long", year: "numeric" })}`]);
  title.font = { bold: true, size: 16 };
  ws.addRow([]);

  let allCollected = 0, allPending = 0;
  for (const g of groups) {
    const p = payments.filter((r) => inGroup(r.hostel_id, g));
    const e = expenses.filter((r) => inGroup(r.hostel_id, g));
    if (g.id === -1 && p.length === 0 && e.length === 0) continue;

    const banner = ws.addRow([g.name.toUpperCase()]);
    ws.mergeCells(banner.number, 1, banner.number, REPORT_COLS.length);
    banner.height = 24;
    banner.getCell(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    banner.getCell(1).fill = fill("FF16A34A");
    banner.getCell(1).alignment = { vertical: "middle" };
    ws.addRow([]);

    const n = reportTable(ws, "Normal Rooms", p.filter((r) => !isDorm(r.room_type)), false);
    const d = reportTable(ws, "Dormitory (pay per day)", p.filter((r) => isDorm(r.room_type)), true);
    reportExpenses(ws, e);

    const collected = n.collected + d.collected;
    const pending = n.pending + d.pending;
    const spent = e.reduce((s, x) => s + num(x.amount), 0);
    allCollected += collected;
    allPending += pending;

    moneyBox(ws, `${g.name} — Total`, [
      ["Collected — Normal rooms", n.collected],
      ["Collected — Dormitory", d.collected],
      ["Total income", collected, true],
      ["Not paid yet", pending],
      ["Expenses", spent],
      ["Net profit", collected - spent, true],
    ]);
    ws.addRow([]);
    ws.addRow([]);
  }

  const spentAll = expenses.reduce((s, x) => s + num(x.amount), 0);
  moneyBox(ws, "ALL HOSTELS — Grand Total", [
    ["Total income", allCollected, true],
    ["Not paid yet", allPending],
    ...categoryTotals(expenses).map(([cat, v]): [string, number] => [`Expenses — ${capitalize(cat)}`, v]),
    ["Total expenses", spentAll, true],
    ["Net profit", allCollected - spentAll, true],
  ]);
}

// ─── Expenses sheet ──────────────────────────────────────────────────────────

function addExpenseSheet(wb: ExcelJS.Workbook, rows: ExpenseExportRow[], groups: HostelRef[]) {
  const { ws, lastRow } = addDataSheet(wb, "Expenses", EXPENSE_COLUMNS, rows, "FFDC2626");
  const L = (h: string) => colLetter(EXPENSE_COLUMNS, h);
  const range = (h: string) => `${L(h)}2:${L(h)}${lastRow}`;
  const has = rows.length > 0;

  ws.addRow([]);
  for (const g of groups) {
    const list = rows.filter((r) => (r.hostel_name ?? UNASSIGNED) === g.name);
    if (list.length === 0) continue;
    addCalcRow(ws, EXPENSE_COLUMNS, `${g.name} (${plural(list.length, "expense")})`, {
      "Amount": formula(`SUMIF(${range("Hostel")},"${g.name.replace(/"/g, '""')}",${range("Amount")})`,
        list.reduce((s, r) => s + num(r.amount), 0)),
    });
  }
  addCalcRow(ws, EXPENSE_COLUMNS, `TOTAL (${plural(rows.length, "expense")})`, {
    "Amount": has ? formula(`SUM(${range("Amount")})`, rows.reduce((s, r) => s + num(r.amount), 0)) : 0,
  });
}

// ─── Residents sheet ─────────────────────────────────────────────────────────

function addResidentSheet(wb: ExcelJS.Workbook, rows: ResidentExportRow[]) {
  // Active residents first, then by location
  const sorted = [...rows].sort((a, b) =>
    Number(b.is_active) - Number(a.is_active) || byLocation<ResidentExportRow>((r) => r.name)(a, b));
  const { ws } = addDataSheet(wb, "Residents", RESIDENT_COLUMNS, sorted, "FF2563EB");

  ws.addRow([]);
  addCalcRow(ws, RESIDENT_COLUMNS, `TOTAL (${plural(sorted.length, "resident")})`, {});
  addCalcRow(ws, RESIDENT_COLUMNS, `Active: ${sorted.filter((r) => r.is_active).length}`, {});
  addCalcRow(ws, RESIDENT_COLUMNS, `Currently in a bed: ${sorted.filter((r) => r.has_active_bed).length}`, {});
  addCalcRow(ws, RESIDENT_COLUMNS, `Staff: ${sorted.filter((r) => r.is_staff).length}`, {});
}

// ─── Summary sheet ───────────────────────────────────────────────────────────

interface GroupTotals {
  records: number;
  paid: number;
  pending: number;
  overdue: number;
  normalRent: number;
  dormRent: number;
  fines: number;
  income: number;
  outstanding: number;
  expensesNoFood: number;
  food: number;
  expenses: number;
  net: number;
  netIfAllPaid: number;
  residentsInBed: number;
  normalResidents: number;
  dormResidents: number;
  byCategory: Record<string, number>;
}

function groupTotals(p: PaymentExportRow[], e: ExpenseExportRow[], res: ResidentExportRow[]): GroupTotals {
  const paid = p.filter((r) => r.paid);
  const unpaid = p.filter((r) => !r.paid);
  const income = paid.reduce((s, r) => s + num(r.total), 0);
  const outstanding = unpaid.reduce((s, r) => s + num(r.total), 0);
  const byCategory: Record<string, number> = {};
  for (const x of e) byCategory[x.category] = (byCategory[x.category] ?? 0) + num(x.amount);
  const expenses = e.reduce((s, x) => s + num(x.amount), 0);
  const food = byCategory.food ?? 0;
  const inBed = res.filter((r) => r.has_active_bed && !r.is_staff);
  return {
    records: p.length,
    paid: paid.length,
    pending: unpaid.length,
    overdue: unpaid.filter((r) => r.is_overdue).length,
    normalRent: paid.filter((r) => !isDorm(r.room_type)).reduce((s, r) => s + num(r.amount), 0),
    dormRent: paid.filter((r) => isDorm(r.room_type)).reduce((s, r) => s + num(r.amount), 0),
    fines: paid.reduce((s, r) => s + num(r.fine_paid), 0),
    income,
    outstanding,
    expensesNoFood: expenses - food,
    food,
    expenses,
    net: income - expenses,
    netIfAllPaid: income + outstanding - expenses,
    residentsInBed: inBed.length,
    normalResidents: inBed.filter((r) => !isDorm(r.room_type)).length,
    dormResidents: inBed.filter((r) => isDorm(r.room_type)).length,
    byCategory,
  };
}

function addSummarySheet(
  wb: ExcelJS.Workbook,
  month: string,
  groups: { name: string; t: GroupTotals }[],
  all: GroupTotals,
) {
  const ws = wb.addWorksheet("Summary", { properties: { tabColor: { argb: "FF16A34A" } } });
  ws.columns = [{ width: 34 }, ...groups.map(() => ({ width: 18 })), { width: 18 }];
  const width = groups.length + 2;

  const title = ws.addRow([`Monthly Report — ${month}`]);
  title.font = { bold: true, size: 14 };
  const info: [string, Cell][] = [
    ["Exported At (IST)", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
    ["Format Version", REPORT_FORMAT_VERSION],
  ];
  for (const row of info) ws.addRow(row).getCell(1).font = { bold: true };
  ws.addRow([]);

  const section = (label: string) => {
    const r = ws.addRow([label, ...groups.map((g) => g.name), "All Hostels"]);
    for (let i = 1; i <= width; i++) {
      const c = r.getCell(i);
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = HEADER_FILL;
      c.border = THIN;
      if (i > 1) c.alignment = { horizontal: "center" };
    }
  };
  const line = (label: string, pick: (t: GroupTotals) => number, money: boolean, highlight = false) => {
    const r = ws.addRow([label, ...groups.map((g) => pick(g.t)), pick(all)]);
    for (let i = 1; i <= width; i++) {
      const c = r.getCell(i);
      c.border = THIN;
      if (money && i > 1) c.numFmt = MONEY_FMT;
      if (highlight) { c.fill = TOTAL_FILL; c.font = { bold: true }; }
    }
    r.getCell(width).font = { bold: true };
  };

  section("Payments");
  line("Payment records", (t) => t.records, false);
  line("Paid", (t) => t.paid, false);
  line("Pending (not paid)", (t) => t.pending, false);
  line("Overdue", (t) => t.overdue, false);
  ws.addRow([]);

  section("Income");
  line("Rent collected — Normal rooms", (t) => t.normalRent, true);
  line("Rent collected — Dormitory", (t) => t.dormRent, true);
  line("Fines collected", (t) => t.fines, true);
  line("TOTAL INCOME", (t) => t.income, true, true);
  line("Still pending (rent + fines)", (t) => t.outstanding, true);
  ws.addRow([]);

  section("Expenses");
  const categories = Object.keys(all.byCategory).sort();
  for (const cat of categories) {
    line(`${cat[0].toUpperCase()}${cat.slice(1)}`, (t) => t.byCategory[cat] ?? 0, true);
  }
  line("Expenses excl. food", (t) => t.expensesNoFood, true);
  line("Food", (t) => t.food, true);
  line("TOTAL EXPENSES", (t) => t.expenses, true, true);
  ws.addRow([]);

  section("Profit");
  line("NET PROFIT (income − expenses)", (t) => t.net, true, true);
  line("Net if all pending is collected", (t) => t.netIfAllPaid, true);
  ws.addRow([]);

  section("Residents in a bed (excl. staff)");
  line("Normal rooms", (t) => t.normalResidents, false);
  line("Dormitory", (t) => t.dormResidents, false);
  line("Total", (t) => t.residentsInBed, false, true);
}

// ─── Read Me ─────────────────────────────────────────────────────────────────

function addReadMeSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Read Me", { properties: { tabColor: { argb: "FF6B7280" } } });
  ws.columns = [{ width: 120 }];
  const headings = ["About this file", "Sheets", "Unique keys", "Rules for importing", "Notes"];
  const lines = [
    "About this file",
    `Format version: ${REPORT_FORMAT_VERSION}`,
    "",
    "Sheets",
    "Report — easy-to-read list per hostel: Normal rooms, then Dormitory (with daily rate and days), totals, and income / expenses / profit. Opens first. For reading, not importing.",
    "Summary — income, expenses by category and profit, per hostel and for all hostels.",
    "Payments Data — every payment with all details and IDs (one row per payment). Use this for importing.",
    "Expenses — every expense this month, all hostels and categories (food included).",
    "Residents — every resident (active, checked out and staff).",
    "",
    "Unique keys",
    "Payment ID, Resident ID and Expense ID (grey columns at the right) are the database IDs and never change. Use them to match rows when importing.",
    "",
    "Rules for importing",
    "1. Row 1 of each data sheet is the header. Match columns by header name, not by position.",
    "2. A row is a record only if its ID column (Payment ID / Expense ID / Resident ID) has a number. Skip blank rows and the TOTAL rows at the bottom.",
    "3. Import payments from 'Payments Data' only. The Report sheet is a formatted copy of the same records.",
    "4. Dates are text in YYYY-MM-DD form. 'Paid On' is YYYY-MM-DD HH:MM in India time.",
    "5. Amounts are plain numbers in rupees.",
    "",
    "Notes",
    "Status colours: green = Paid, amber = Pending, red = Overdue.",
    "Hostel and room are the resident's current bed, or their last bed if they have checked out.",
    "Payments not linked to any bed are listed under 'Unassigned'.",
    "Income = rent + fines on paid records for this month. Advance payments are counted in the month they were paid.",
  ];
  for (const l of lines) {
    const r = ws.addRow([l]);
    if (headings.includes(l)) r.font = { bold: true, size: 12 };
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function buildMonthlyReport(data: {
  month: string;                 // "YYYY-MM"
  hostels: HostelRef[];
  payments: PaymentExportRow[];
  expenses: ExpenseExportRow[];
  residents: ResidentExportRow[];
}): Promise<Uint8Array> {
  const { month, hostels, payments, expenses, residents } = data;
  const known = new Set(hostels.map((h) => h.id));
  const inGroup = (id: number | null, g: HostelRef) =>
    g.id === -1 ? id === null || !known.has(id) : id === g.id;

  // Only add an "Unassigned" group if something actually falls outside the known hostels
  const groups: HostelRef[] = [...hostels];
  const hasUnassigned =
    payments.some((p) => p.hostel_id === null || !known.has(p.hostel_id)) ||
    expenses.some((e) => e.hostel_id === null || !known.has(e.hostel_id));
  if (hasUnassigned) groups.push({ id: -1, name: UNASSIGNED });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Crown Hostel Admin";
  wb.created = new Date();
  // Make Excel recompute every TOTAL formula on open (cached zero results aren't stored)
  wb.calcProperties = { fullCalcOnLoad: true };

  // 1. Easy-to-read report opens first
  addReportSheet(wb, month, groups, payments, expenses, inGroup);

  // 2. Totals by category etc.
  const perGroup = groups.map((g) => ({
    name: g.name,
    t: groupTotals(
      payments.filter((r) => inGroup(r.hostel_id, g)),
      expenses.filter((r) => inGroup(r.hostel_id, g)),
      residents.filter((r) => inGroup(r.hostel_id, g)),
    ),
  }));
  addSummarySheet(wb, month, perGroup, groupTotals(payments, expenses, residents));

  // 3. Full data tables (every column + IDs) — these are what a future import reads
  addPaymentSheet(wb, "Payments Data", payments, "FF6B7280");
  addExpenseSheet(wb, expenses, groups);
  addResidentSheet(wb, residents);
  addReadMeSheet(wb);

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
