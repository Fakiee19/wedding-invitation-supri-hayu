/**
 * Google Apps Script — Backend undangan pernikahan
 * Spreadsheet + Web App (POST urlencoded + GET wishes)
 *
 * SETUP:
 * 1. Buat Google Spreadsheet baru.
 * 2. Extensions → Apps Script → tempel skrip ini.
 * 3. Ganti SPREADSHEET_ID dengan ID dari URL spreadsheet (antara /d/ dan /edit).
 * 4. Jalankan setupSheets() sekali dari editor (pilih fungsi → Run) untuk membuat sheet & header.
 * 5. Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Salin URL Web App → tempel ke WEB_APP_URL di js/script.js
 */

/** @type {string} Wajib: ID Spreadsheet dari URL */
const SPREADSHEET_ID = "ISI_SPREADSHEET_ID_ANDA";

const SHEET_RSVP = "RSVP";

/** Buat sheet & header jika belum ada */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_RSVP);
  if (!sh) {
    sh = ss.insertSheet(SHEET_RSVP);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow([
      "Timestamp",
      "Nama Tamu",
      "WhatsApp",
      "Jumlah Kehadiran",
      "Konfirmasi",
      "Ucapan & Doa",
    ]);
  }
}

/**
 * Entry GET — ?action=wishes
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  if (action === "wishes") {
    try {
      const wishes = getWishesFromSheet();
      return jsonOut({ ok: true, wishes: wishes });
    } catch (err) {
      return jsonOut({ ok: false, wishes: [], error: String(err) });
    }
  }
  return jsonOut({ ok: true, message: "Wedding API — gunakan POST action=rsvp atau GET action=wishes" });
}

/**
 * Entry POST — application/x-www-form-urlencoded
 * action=rsvp & data={"name":"...","phone":"...","count":"1","attendance":"Hadir","wish":"..."}
 */
function doPost(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "";
    if (action !== "rsvp") {
      return jsonOut({ ok: false, message: "Aksi tidak dikenal" });
    }
    const raw = (e.parameter && e.parameter.data) || "";
    if (!raw) {
      return jsonOut({ ok: false, message: "Data kosong" });
    }
    const data = JSON.parse(raw);
    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").trim();
    const count = String(data.count || "1").trim();
    const attendance = String(data.attendance || "").trim();
    const wish = String(data.wish || "").trim();

    if (!name || !phone || !attendance) {
      return jsonOut({ ok: false, message: "Nama, WhatsApp, dan konfirmasi wajib diisi" });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      if (isDuplicateRecent(phone)) {
        return jsonOut({ ok: true, message: "Sudah tercatat sebelumnya", duplicate: true });
      }
      appendRsvpRow_(name, phone, count, attendance, wish);
    } finally {
      lock.releaseLock();
    }

    return jsonOut({ ok: true, message: "RSVP tersimpan" });
  } catch (err) {
    return jsonOut({ ok: false, message: String(err) });
  }
}

function appendRsvpRow_(name, phone, count, attendance, wish) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_RSVP);
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName(SHEET_RSVP);
  }
  sheet.appendRow([new Date(), name, phone, count, attendance, wish]);
}

/** Cegah dobel sederhana: nomor sama dalam 50 baris terakhir */
function isDuplicateRecent(phone) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_RSVP);
  if (!sh || sh.getLastRow() < 2) return false;
  const last = sh.getLastRow();
  const start = Math.max(2, last - 49);
  const range = sh.getRange(start, 3, last, 3).getValues();
  const norm = normalizePhone_(phone);
  for (let i = 0; i < range.length; i++) {
    if (normalizePhone_(String(range[i][0] || "")) === norm) return true;
  }
  return false;
}

function normalizePhone_(p) {
  return String(p).replace(/\D/g, "");
}

function getWishesFromSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_RSVP);
  if (!sh || sh.getLastRow() < 2) return [];

  const values = sh.getDataRange().getValues();
  const rows = values.slice(1);
  const out = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ts = row[0];
    const name = String(row[1] || "").trim();
    const wish = String(row[5] || "").trim();
    if (!wish) continue;
    var meta = "";
    if (ts instanceof Date) {
      meta = Utilities.formatDate(ts, Session.getScriptTimeZone(), "d MMM yyyy, HH:mm");
    } else {
      meta = String(ts || "");
    }
    var tVal = ts instanceof Date ? ts.getTime() : 0;
    out.push({ name: name || "Tamu", text: wish, meta: meta, _t: tVal });
  }

  out.sort(function (a, b) {
    return b._t - a._t;
  });
  return out.map(function (w) {
    return { name: w.name, text: w.text, meta: w.meta };
  });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
