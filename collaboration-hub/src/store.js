import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { seed, TODAY, TOL, addDays, diffDays, fmtD, n, DOCS } from "./data";

const clock = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
let logId = 100;
const withLog = (s, text) => ({ log: [{ id: ++logId + Date.now(), at: clock(), text }, ...s.log].slice(0, 40) });

export const useHub = create(
  persist(
    (set, get) => ({
      ...seed(),

      reset() { set(seed()); toast("Demo kembali ke kondisi awal"); },

      answer(id, { status, qty, ship, reason, tentative, via }) {
        set((s) => {
          const r = s.requests[id], m = s.materials[r.mid], sup = s.suppliers[r.sid];
          const firstAnswer = r.status === "pending";
          const cQty = status === "none" ? 0 : qty;
          const label = { full: "penuh", partial: "sebagian", none: "tidak sanggup" }[status];
          const metrics = firstAnswer ? { ...sup.metrics, confirm: Math.min(100, sup.metrics.confirm + 6) } : sup.metrics;
          return {
            requests: { ...s.requests, [id]: { ...r, status, cQty, ship, reason: reason || "", tentative: !!tentative, via, at: clock() } },
            suppliers: { ...s.suppliers, [r.sid]: { ...sup, metrics } },
            ...withLog(s, `${sup.name} menjawab ${m.name}: ${label}${status === "partial" ? `, ${n(cQty)} dari ${n(r.qty)} ${m.unit}` : ""}${tentative ? " (tentatif)" : ""}.`),
          };
        });
      },

      remind(id) {
        set((s) => {
          const r = s.requests[id], sup = s.suppliers[r.sid], m = s.materials[r.mid];
          const reminders = r.reminders + 1;
          return {
            requests: { ...s.requests, [id]: { ...r, reminders } },
            ...withLog(s, reminders >= 3 ? `${sup.name} belum menjawab ${m.name} setelah 3 pengingat. Eskalasi ke procurement.` : `Pengingat ke-${reminders} dikirim ke ${sup.name} untuk ${m.name}.`),
          };
        });
        toast("Pengingat WhatsApp dikirim (simulasi)");
      },

      setZoneResp(mid, label) {
        set((s) => ({ zoneResp: { ...s.zoneResp, [mid]: label }, ...withLog(s, `${s.suppliers[s.materials[mid].sid].name} merespons papan ${s.materials[mid].name}: ${label}.`) }));
      },

      editS58(mid, value, reason) {
        const s = get(), m = s.materials[mid], base = s.changes[mid]?.prev ?? (m.zones.s58[0] + m.zones.s58[1]) / 2;
        const out = Math.abs(value / base - 1) > TOL;
        if (out && !reason) return { ok: false, error: "Perubahan melebihi 20%, alasan wajib diisi." };
        set((st) => ({
          materials: { ...st.materials, [mid]: { ...m, zones: { ...m.zones, s58: [Math.round(value * 0.9), Math.round(value * 1.1)] } } },
          changes: { ...st.changes, [mid]: { prev: Math.round(base), now: Math.round(value), reason: reason || "Dalam toleransi", by: "Planner", at: "Baru saja", reviewed: !out } },
          ...withLog(st, `Angka M5 sampai 8 ${m.name} diubah menjadi ${n(value)} ${m.unit}${out ? `, di luar toleransi. Alasan: ${reason}.` : "."}`),
        }));
        toast(out ? "Tersimpan dan ditandai di luar toleransi" : "Angka tersimpan");
        return { ok: true };
      },

      reviewChange(mid) {
        set((s) => ({ changes: { ...s.changes, [mid]: { ...s.changes[mid], reviewed: true } } }));
      },

      uploadDoc(sid, doc, file) {
        set((s) => {
          const sup = s.suppliers[sid];
          return { suppliers: { ...s.suppliers, [sid]: { ...sup, docs: { ...sup.docs, [doc]: "Menunggu verifikasi" } } }, ...withLog(s, `${sup.name} mengunggah ${DOCS[doc]} (${file}).`) };
        });
        toast("Dokumen terunggah, menunggu verifikasi");
      },

      verifyDoc(sid, doc) {
        set((s) => {
          const sup = s.suppliers[sid];
          return { suppliers: { ...s.suppliers, [sid]: { ...sup, docs: { ...sup.docs, [doc]: "Lengkap" } } }, ...withLog(s, `${DOCS[doc]} ${sup.name} terverifikasi dan masuk master data.`) };
        });
        toast("Dokumen masuk master data");
      },

      updateEta(kid, min, max) {
        set((s) => {
          const k = s.shipments[kid];
          return { shipments: { ...s.shipments, [kid]: { ...k, min, max } }, ...withLog(s, `${k.who} memperbarui ETA ${s.materials[k.mid].name}: ${fmtD(min)} sampai ${fmtD(max)}.`) };
        });
        toast("ETA diperbarui");
      },

      runCsv(sid, text, name) {
        const HEAD = "id_permintaan,material,jumlah_diminta,jumlah_sanggup,tanggal_kirim,alasan";
        const lines = text.trim().split(/\r?\n/);
        const res = { name, ok: [], err: [] };
        if (lines[0].trim() !== HEAD) res.err.push("Judul kolom tidak sesuai template. Unduh ulang template.");
        else lines.slice(1).forEach((ln, i) => {
          const [id, , , q, t, why] = ln.split(","), no = `Baris ${i + 2}`, s = get(), r = s.requests[id];
          if (!r || r.sid !== sid || r.status === "full") return res.err.push(`${no}: permintaan ${id} tidak ditemukan atau sudah penuh.`);
          const qty = Number(q);
          if (!(qty >= 0) || qty > r.qty) return res.err.push(`${no}: jumlah sanggup harus 0 sampai ${n(r.qty)}.`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(t || "") || diffDays(t, TODAY) <= 0) return res.err.push(`${no}: tanggal kirim harus setelah ${fmtD(TODAY)}, format TAHUN-BULAN-TANGGAL.`);
          if (qty < r.qty && !(why || "").trim()) return res.err.push(`${no}: alasan wajib diisi karena jumlah tidak penuh.`);
          get().answer(id, { status: qty === 0 ? "none" : qty < r.qty ? "partial" : "full", qty, ship: t, reason: (why || "").trim(), tentative: false, via: "Berkas" });
          res.ok.push(`${no}: ${s.materials[r.mid].name} tersimpan, ${n(qty)} dari ${n(r.qty)}.`);
        });
        set((s) => ({ csv: { ...s.csv, [sid]: res } }));
        toast(`${res.ok.length} baris tersimpan, ${res.err.length} perlu diperbaiki`);
      },

      sendRescue(mid, key) {
        const s = get(), c = caseOf(s, s.materials[mid]);
        if (!c) return;
        const o = optionsOf(s, s.materials[mid], c).find((x) => x.key === key);
        const id = "p" + Date.now();
        set((st) => ({ plans: [...st.plans, { id, mid, key, name: o.name, qty: c.short, who: o.who, arrive: o.arrive, cost: o.cost, leftover: o.leftover, status: "waiting" }],
          ...withLog(st, `Supply Rescue: minta konfirmasi ${n(c.short)} ${st.materials[mid].unit} ${st.materials[mid].name} ke ${o.who}.`) }));
        toast(`Permintaan konfirmasi dikirim ke ${o.who}`);
        setTimeout(() => {
          set((st) => ({ plans: st.plans.map((p) => (p.id === id && p.status === "waiting" ? { ...p, status: "confirmed" } : p)), ...withLog(st, `${o.who} mengonfirmasi ${n(c.short)} ${st.materials[mid].unit} ${st.materials[mid].name}. Menunggu persetujuan planner.`) }));
          toast(`${o.who} mengonfirmasi, rencana menunggu persetujuan`);
        }, 2500);
      },

      approveRescue(id) {
        set((s) => {
          const p = s.plans.find((x) => x.id === id), m = s.materials[p.mid], kid = "k" + id;
          return {
            plans: s.plans.map((x) => (x.id === id ? { ...x, status: "approved" } : x)),
            shipments: { ...s.shipments, [kid]: { id: kid, mid: p.mid, who: p.who, mode: "Rescue", qty: p.qty, min: p.arrive, max: p.arrive, po: "Rescue", stages: null } },
            ...withLog(s, `Planner menyetujui ${p.name} untuk ${m.name}: ${n(p.qty)} ${m.unit} tiba ${fmtD(p.arrive)}.`),
          };
        });
        toast("Rencana disetujui dan masuk kiriman");
      },
    }),
    { name: "k42-hub-v1" }
  )
);

// Dua tab atau jendela di perangkat yang sama tetap sinkron.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === "k42-hub-v1") useHub.persist.rehydrate(); });
}

/* Hitungan turunan */
export function approvedQty(s, mid) { return s.plans.filter((p) => p.mid === mid && p.status === "approved").reduce((a, p) => a + p.qty, 0); }

export function caseOf(s, m) {
  const cfg = m.rescue;
  if (!cfg) return null;
  const req = Object.values(s.requests).find((r) => r.mid === m.id);
  let base = 0, active = true;
  if (cfg.source === "request") {
    base = req.cQty;
    active = req.status === "partial" || req.status === "none" || (req.status === "pending" && req.reminders >= 3);
  } else base = m.stock;
  const ready = base + approvedQty(s, m.id);
  const short = cfg.needQty - ready;
  if (!active || short <= 0) return null;
  return { need: cfg.needQty, ready, short, needBy: cfg.needBy, req };
}

export function optionsOf(s, m, c) {
  const cfg = m.rescue, main = s.suppliers[m.sid].name, backup = s.backup.name;
  return [
    { key: "A", name: "Pecah pesanan", who: backup, arrive: cfg.arriveA, cost: c.short * cfg.unitA, leftover: 0 },
    { key: "B", name: "Kirim bertahap", who: main, arrive: cfg.arriveB, cost: 0, leftover: c.short },
    { key: "C", name: "Ekspres", who: main, arrive: cfg.arriveC, cost: c.short * cfg.unitC, leftover: 0 },
  ];
}

export function riskOf(s, m) {
  const arrivals = Object.values(s.shipments).filter((k) => k.mid === m.id);
  let stock = m.stock, out = null;
  for (let i = 1; i <= 30; i++) {
    const day = addDays(TODAY, i);
    arrivals.forEach((k) => { if (k.max === day) stock += k.qty; });
    stock -= m.use;
    if (stock <= 0) { out = day; break; }
  }
  const days = out ? diffDays(out, TODAY) : null;
  const level = days === null ? "Aman" : days <= 7 ? "Kritis" : days <= 14 ? "Waspada" : "Aman";
  const next = arrivals.slice().sort((a, b) => a.min.localeCompare(b.min))[0] || null;
  const transit = arrivals.reduce((a, k) => a + k.qty, 0);
  return { level, out, days, next, transit, cover: m.stock / m.use };
}

export function scoreOf(sup) {
  const v = Object.values(sup.metrics), score = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  const color = score >= 85 ? "Hijau" : score >= 70 ? "Kuning" : "Merah";
  const [low] = Object.entries(sup.metrics).sort((a, b) => a[1] - b[1]);
  return { score, color, low: low[0], lowV: low[1] };
}

export function signalsOf(s) {
  const out = [];
  Object.values(s.materials).forEach((m) => {
    const c = caseOf(s, m);
    if (c && !s.plans.some((p) => p.mid === m.id && p.status !== "approved"))
      out.push({ id: "c" + m.id, pri: 0, tag: "Segera", text: `${m.name} kurang ${n(c.short)} ${m.unit} untuk ${fmtD(c.needBy)}`, go: { to: "rescue", mid: m.id }, cta: "Buka Rescue" });
  });
  s.plans.filter((p) => p.status === "confirmed").forEach((p) =>
    out.push({ id: p.id, pri: 0, tag: "Setujui", text: `${p.who} mengonfirmasi ${n(p.qty)} ${s.materials[p.mid].unit} ${s.materials[p.mid].name}`, go: { to: "rescue", mid: p.mid }, cta: "Tinjau rencana" }));
  Object.values(s.requests).filter((r) => r.status === "pending").forEach((r) => {
    const m = s.materials[r.mid], risk = riskOf(s, m);
    out.push({ id: r.id, pri: risk.level === "Kritis" ? 0 : 1, tag: r.reminders >= 3 ? "Eskalasi" : "Ingatkan",
      text: `${s.suppliers[r.sid].name} belum menjawab ${m.name}${r.reminders ? `, ${r.reminders} pengingat terkirim` : ""}${risk.out ? `. Stok habis ${fmtD(risk.out)}` : ""}`, remind: r.id, cta: "Kirim pengingat" });
  });
  Object.entries(s.changes).filter(([, c]) => !c.reviewed).forEach(([mid, c]) =>
    out.push({ id: "t" + mid, pri: 2, tag: "Tinjau", text: `Angka M5 sampai 8 ${s.materials[mid].name} berubah ${Math.round((c.now / c.prev - 1) * 100)}%, melebihi toleransi. Pemilik: ${c.by}`, go: { to: "papan" }, cta: "Buka papan" }));
  Object.values(s.suppliers).forEach((sup) => {
    if (sup.docs.halal === "Kosong") out.push({ id: "h" + sup.id, pri: 2, tag: "Tinjau", text: `Sertifikat halal ${sup.name} kosong, tenggat 18 Okt 2026 sudah lewat`, go: { to: "pemasok", sid: sup.id }, cta: "Lihat pemasok" });
    if (sup.docs.halal === "Menunggu verifikasi") out.push({ id: "v" + sup.id, pri: 1, tag: "Tinjau", text: `Sertifikat halal ${sup.name} menunggu verifikasi`, go: { to: "pemasok", sid: sup.id }, cta: "Verifikasi" });
  });
  Object.values(s.requests).filter((r) => r.tentative).forEach((r) =>
    out.push({ id: "te" + r.id, pri: 3, tag: "Pantau", text: `Jawaban ${s.suppliers[r.sid].name} untuk ${s.materials[r.mid].name} masih tentatif` }));
  return out.sort((a, b) => a.pri - b.pri);
}
