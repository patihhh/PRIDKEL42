// Data ilustrasi. Angka zona, stok, ETA, dan opsi Rescue mengikuti mockup Tugas Pekan 9 (slide 18 sampai 23).
export const TODAY = "2026-11-02"; // Senin minggu 1, sesuai mockup papan komitmen
export const TOL = 0.2;

const parse = (iso) => new Date(iso + "T00:00:00");
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
export const fmtD = (s) => parse(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
export const fmtDL = (s) => parse(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtRange = (a, b) => (a === b ? fmtD(a) : `${fmtD(a)} sampai ${fmtD(b)}`);
export const n = (v) => Math.round(v).toLocaleString("id-ID");
export const rp = (v) => (v === 0 ? "Rp0" : v >= 1e6 ? `+Rp${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : `+Rp${n(v)}`);

export const TIERS = { API: "API dari ERP", Berkas: "Berkas template", Formulir: "Formulir ponsel" };
export const DOCS = { halal: "Sertifikat halal", coa: "MSDS atau CoA", epr: "Dokumen EPR" };
export const METRICS = { confirm: "Konfirmasi tepat waktu", ontime: "Tepat kirim", fulfil: "Pemenuhan", eta: "Akurasi ETA" };

export const seed = () => ({
  suppliers: {
    aneka: { id: "aneka", name: "PT Aneka", tier: "Besar", channel: "API", metrics: { confirm: 96, ontime: 92, fulfil: 98, eta: 88 }, docs: { halal: "Lengkap", coa: "Lengkap", epr: "Lengkap" } },
    mandiri: { id: "mandiri", name: "CV Mandiri", tier: "Menengah", channel: "Berkas", metrics: { confirm: 78, ontime: 74, fulfil: 85, eta: 70 }, docs: { halal: "Lengkap", coa: "Lengkap", epr: "Kosong" } },
    sari: { id: "sari", name: "UD Sari", tier: "UMKM", channel: "Formulir", metrics: { confirm: 55, ontime: 72, fulfil: 80, eta: 65 }, docs: { halal: "Kosong", coa: "Lengkap", epr: "Kosong" } },
    kimia: { id: "kimia", name: "PT Kimia", tier: "Besar", channel: "API", metrics: { confirm: 98, ontime: 95, fulfil: 97, eta: 90 }, docs: { halal: "Lengkap", coa: "Lengkap", epr: "Lengkap" } },
  },
  backup: { id: "cadangan", name: "Pemasok cadangan" },
  materials: {
    A: { id: "A", name: "Bahan Baku A", unit: "kg", sid: "mandiri", owner: "Procurement", use: 70, stock: 400, atSupplier: 500, critical: false, impor: false,
      zones: { m1: 500, m2: 480, s34: [400, 600], s58: [650, 800], far: 2300, ambisi: 350 },
      rescue: { needBy: "2026-11-10", needQty: 1000, source: "request", unitA: 5000, unitC: 12500, arriveA: "2026-11-10", arriveB: "2026-11-12", arriveC: "2026-11-09" } },
    B: { id: "B", name: "Kemasan Botol", unit: "pcs", sid: "aneka", owner: "Planner", use: 120, stock: 900, atSupplier: 0, critical: false, impor: false,
      zones: { m1: 1200, m2: 1200, s34: [1000, 1400], s58: [1100, 1500], far: 5500, ambisi: 800 }, rescue: null },
    C: { id: "C", name: "Bahan Baku C", unit: "kg", sid: "kimia", owner: "Planner", use: 30, stock: 150, atSupplier: 200, critical: true, impor: true,
      zones: { m1: 300, m2: 320, s34: [250, 350], s58: [280, 380], far: 1400, ambisi: 200 },
      rescue: { needBy: "2026-11-18", needQty: 480, source: "stock", unitA: 8000, unitC: 20000, arriveA: "2026-11-09", arriveB: "2026-11-20", arriveC: "2026-11-08" } },
    L: { id: "L", name: "Label Kemasan", unit: "lembar", sid: "sari", owner: "Planner", use: 30, stock: 120, atSupplier: 300, critical: false, impor: false,
      zones: { m1: 200, m2: 210, s34: [160, 240], s58: [180, 260], far: 900, ambisi: 130 },
      rescue: { needBy: "2026-11-09", needQty: 200, source: "request", unitA: 3000, unitC: 7000, arriveA: "2026-11-09", arriveB: "2026-11-11", arriveC: "2026-11-08" } },
  },
  requests: {
    r1: { id: "r1", mid: "B", sid: "aneka", qty: 1200, needBy: "2026-11-06", deadline: "2026-11-03", status: "full", cQty: 1200, ship: "2026-11-05", reason: "", tentative: false, via: "API", at: "08.02", reminders: 0 },
    r2: { id: "r2", mid: "A", sid: "mandiri", qty: 1000, needBy: "2026-11-10", deadline: "2026-11-03", status: "partial", cQty: 600, ship: "2026-11-08", reason: "Kapasitas penuh", tentative: false, via: "Berkas", at: "09.15", reminders: 0 },
    r3: { id: "r3", mid: "C", sid: "kimia", qty: 300, needBy: "2026-11-18", deadline: "2026-11-03", status: "full", cQty: 300, ship: "2026-11-02", reason: "", tentative: false, via: "API", at: "08.04", reminders: 0 },
    r4: { id: "r4", mid: "L", sid: "sari", qty: 200, needBy: "2026-11-09", deadline: "2026-11-03", status: "pending", cQty: 0, ship: null, reason: "", tentative: false, via: null, at: null, reminders: 0 },
  },
  shipments: {
    k1: { id: "k1", mid: "A", who: "CV Mandiri", mode: "Truk", qty: 300, min: "2026-11-03", max: "2026-11-04", po: "4500118", stages: null },
    k2: { id: "k2", mid: "B", who: "PT Aneka", mode: "Truk", qty: 1200, min: "2026-11-06", max: "2026-11-07", po: "4500120", stages: null },
    k3: { id: "k3", mid: "C", who: "PT Kimia", mode: "Kapal", qty: 600, min: "2026-11-18", max: "2026-11-22", po: "4500123",
      stages: [{ t: "Dikirim", d: "2 Nov", done: true }, { t: "Di laut", d: "sekarang", done: true }, { t: "Pelabuhan", d: "18 sampai 20 Nov", done: false }] },
  },
  changes: { A: { prev: 538, now: 725, reason: "Campaign Ramadan dimajukan 2 minggu", by: "Komersial", at: "Senin minggu 1", reviewed: false } },
  zoneResp: { A: "Siap kirim", B: "Sanggup rentang", C: null, L: null },
  plans: [],
  csv: {},
  log: [
    { id: 1, at: "09.15", text: "CV Mandiri mengunggah berkas: Bahan Baku A sebagian, 600 dari 1.000 kg." },
    { id: 2, at: "08.04", text: "PT Kimia menjawab otomatis lewat API: Bahan Baku C penuh." },
    { id: 3, at: "08.02", text: "PT Aneka menjawab otomatis lewat API: Kemasan Botol penuh." },
  ],
});
