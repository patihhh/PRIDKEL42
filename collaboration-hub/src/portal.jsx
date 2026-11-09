import React, { useRef, useState } from "react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { ClipboardList, Layers, FileCheck, Award } from "lucide-react";
import { useHub, scoreOf } from "./store";
import { TODAY, TIERS, DOCS, METRICS, addDays, fmtD, n, fmtRange } from "./data";
import { Btn, Tag, Empty, Seg, statusLabel } from "./ui";

function ConfirmForm({ r, m, onDone }) {
  const answer = useHub((x) => x.answer);
  const sup = useHub((x) => x.suppliers[r.sid]);
  const [st, setSt] = useState(r.status === "pending" ? "full" : r.status);
  const [qty, setQty] = useState(r.status === "pending" ? r.qty : r.cQty);
  const [ship, setShip] = useState(r.ship || addDays(TODAY, 3));
  const [why, setWhy] = useState(r.reason);
  const [tent, setTent] = useState(r.tentative);
  const [err, setErr] = useState("");
  const days = Array.from({ length: 12 }, (_, i) => addDays(TODAY, i + 1));
  const choose = (v) => { setSt(v); setErr(""); if (v === "full") setQty(r.qty); if (v === "partial") setQty(Math.round(r.qty / 2)); };
  const submit = (e) => {
    e.preventDefault();
    if (st !== "full" && !why) return setErr("Pilih alasan karena jawaban tidak penuh.");
    if (st === "partial" && !(Number(qty) > 0 && Number(qty) < r.qty)) return setErr(`Isi jumlah antara 1 dan ${n(r.qty - 1)}.`);
    answer(r.id, { status: st, qty: st === "full" ? r.qty : Number(qty), ship, reason: st === "full" ? "" : why, tentative: tent, via: TIERS[sup.channel] });
    toast("Konfirmasi terkirim ke Paragon");
    onDone();
  };
  return (
    <form className="form" onSubmit={submit}>
      <div className="facts"><span>Diminta <b>{n(r.qty)} {m.unit}</b></span><span>Dibutuhkan <b>{fmtD(r.needBy)}</b></span><span>Jawab sebelum <b>{fmtD(r.deadline)}</b></span></div>
      <Seg label="Bisa memenuhi?" value={st} onChange={choose} options={[["full", "Penuh"], ["partial", "Sebagian"], ["none", "Tidak"]]} />
      {st === "partial" && <label>Jumlah sanggup ({m.unit})<input type="number" min="1" max={r.qty} value={qty} onChange={(e) => setQty(e.target.value)} /></label>}
      {st !== "none" && <label>Tanggal kirim<select value={ship} onChange={(e) => setShip(e.target.value)}>{days.map((d) => <option key={d} value={d}>{fmtD(d)}</option>)}</select></label>}
      {st !== "full" && <label>Alasan<select value={why} onChange={(e) => setWhy(e.target.value)}><option value="">Pilih alasan</option><option>Kapasitas penuh</option><option>Bahan baku kurang</option><option>Lead time tidak cukup</option><option>Kendala pengiriman</option></select></label>}
      {st !== "none" && <label className="check"><input type="checkbox" checked={tent} onChange={(e) => setTent(e.target.checked)} />Jawaban tentatif, akan dipastikan lagi</label>}
      {err && <p className="err" role="alert">{err}</p>}
      <Btn type="submit" className="w-full btn-lg">Kirim konfirmasi</Btn>
    </form>
  );
}

function Berkas({ sid }) {
  const s = useHub();
  const res = s.csv[sid];
  const HEAD = "id_permintaan,material,jumlah_diminta,jumlah_sanggup,tanggal_kirim,alasan";
  const reqs = Object.values(s.requests).filter((r) => r.sid === sid);
  const template = [HEAD, ...reqs.map((r) => `${r.id},${s.materials[r.mid].name},${r.qty},,,`)].join("\n");
  const sample = [HEAD, ...reqs.slice(0, 1).map((r) => `${r.id},${s.materials[r.mid].name},${r.qty},${Math.round(r.qty * 0.8)},${addDays(TODAY, 5)},Kapasitas penuh`), `r999,Material salah,100,120,${addDays(TODAY, 5)},`].join("\n");
  const download = () => { const u = URL.createObjectURL(new Blob([template], { type: "text/csv" })), a = document.createElement("a"); a.href = u; a.download = "template_konfirmasi.csv"; a.click(); URL.revokeObjectURL(u); };
  return (
    <div className="p-card">
      <div className="p-title">Unggah berkas template</div>
      <div className="p-row">
        <Btn kind="secondary" size="sm" onClick={download}>Unduh template</Btn>
        <label className="btn btn-primary btn-sm">Pilih berkas<input type="file" accept=".csv" className="vh" onChange={async (e) => { const f = e.target.files[0]; if (f) s.runCsv(sid, await f.text(), f.name); e.target.value = ""; }} /></label>
        <Btn kind="ghost" size="sm" onClick={() => s.runCsv(sid, sample, "berkas_contoh.csv")}>Coba contoh</Btn>
      </div>
      {res && <ul className="csv">{res.ok.map((x) => <li key={x} className="ok">{x}</li>)}{res.err.map((x) => <li key={x} className="bad">{x}</li>)}</ul>}
    </div>
  );
}

function EtaEdit({ k, unit }) {
  const updateEta = useHub((x) => x.updateEta);
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(k.min);
  const [max, setMax] = useState(k.max);
  return (
    <div className="p-card">
      <div className="p-between"><div><div className="p-title">{n(k.qty)} {unit}, PO {k.po}</div><div className="sub">{k.mode}, ETA {fmtRange(k.min, k.max)}</div></div><Btn kind="secondary" size="sm" onClick={() => setOpen(!open)}>Perbarui ETA</Btn></div>
      {open && <div className="form form-tight">
        <label>ETA paling cepat<input type="date" value={min} onChange={(e) => setMin(e.target.value)} /></label>
        <label>ETA paling lambat<input type="date" value={max} min={min} onChange={(e) => setMax(e.target.value)} /></label>
        <Btn size="sm" onClick={() => { updateEta(k.id, min, max < min ? min : max); setOpen(false); }}>Simpan</Btn>
      </div>}
    </div>
  );
}

function TabPermintaan({ sid, openSheet }) {
  const s = useHub(), sup = s.suppliers[sid];
  const reqs = Object.values(s.requests).filter((r) => r.sid === sid);
  const ships = Object.values(s.shipments).filter((k) => k.who === sup.name);
  return <>
    {sup.channel === "API" && <div className="p-note">ERP Anda tersambung lewat API. Jawaban masuk otomatis (disimulasikan); formulir dipakai bila perlu koreksi.</div>}
    {sup.channel === "Berkas" && <Berkas sid={sid} />}
    {reqs.map((r) => {
      const m = s.materials[r.mid];
      return (
        <div className="p-card" key={r.id}>
          <div className="p-between"><div className="p-title">{m.name}</div><Tag>{statusLabel(r)}</Tag></div>
          <div className="sub">{r.status === "pending" ? `${n(r.qty)} ${m.unit}, jawab sebelum ${fmtD(r.deadline)}` : `${n(r.cQty)} dari ${n(r.qty)} ${m.unit}${r.ship ? `, kirim ${fmtD(r.ship)}` : ""}`}</div>
          {r.status !== "full" && <Btn className="w-full mt" onClick={() => openSheet(r.id)}>{r.status === "pending" ? "Jawab permintaan" : "Perbarui jawaban"}</Btn>}
          {r.status === "full" && <Btn kind="secondary" className="w-full mt" onClick={() => openSheet(r.id)}>Ubah jawaban</Btn>}
        </div>
      );
    })}
    {ships.length > 0 && <div className="p-sec">Kiriman berjalan</div>}
    {ships.map((k) => <EtaEdit key={k.id} k={k} unit={s.materials[k.mid].unit} />)}
  </>;
}

function TabKebutuhan({ sid }) {
  const s = useHub();
  const mats = Object.values(s.materials).filter((m) => m.sid === sid);
  return mats.map((m) => {
    const z = m.zones, resp = s.zoneResp[m.id];
    const rows = [
      ["z-p", "Pasti", "M1 dan M2", `${n(z.m1)} dan ${n(z.m2)} ${m.unit}`, "Ini pesanan, wajib dikirim.", "Siap kirim"],
      ["z-s", "Siap", "M3 sampai M8", `${n(z.s34[0])}-${n(z.s34[1])} ${m.unit}`, "Siapkan kapasitas dalam rentang. Boleh tentatif.", "Sanggup rentang"],
      ["z-g", "Gambaran", "Bulan 3 ke atas", `~${n(z.far)} ${m.unit}`, "Perkiraan, belum perlu produksi.", "Beri info kapasitas"],
    ];
    return (
      <div key={m.id}>
        <div className="p-sec">{m.name}</div>
        {rows.map(([c, a, per, big, txt, btn]) => (
          <div className="zone" key={a}>
            <div className={`zone-h ${c}`}><b>{a}</b><span>{per}</span></div>
            <div className="zone-b"><div className="zone-n">{big}</div><div className="sub">{txt}</div>
              <Btn size="sm" kind={resp === btn ? "primary" : "secondary"} className="mt" onClick={() => { s.setZoneResp(m.id, btn); toast("Respons terkirim ke Paragon"); }}>{btn}</Btn></div>
          </div>
        ))}
      </div>
    );
  });
}

function TabDokumen({ sid }) {
  const s = useHub(), sup = s.suppliers[sid];
  return <div className="p-card">
    {Object.entries(DOCS).map(([k, t]) => (
      <div className="doc" key={k}><div><div className="p-title">{t}</div><Tag>{sup.docs[k]}</Tag></div>
        {sup.docs[k] !== "Lengkap" && sup.docs[k] !== "Menunggu verifikasi" && <label className="btn btn-secondary btn-sm">Unggah<input type="file" className="vh" onChange={(e) => e.target.files[0] && s.uploadDoc(sid, k, e.target.files[0].name)} /></label>}
      </div>
    ))}
  </div>;
}

function TabRapor({ sid }) {
  const sup = useHub((x) => x.suppliers[sid]), c = scoreOf(sup);
  return <div className="p-card">
    <div className="p-between"><div className="zone-n">{c.score}</div><Tag>{c.color}</Tag></div>
    {Object.entries(sup.metrics).map(([k, v]) => <div className="metric" key={k}><div className="metric-l"><span>{METRICS[k]}</span><b>{v}%</b></div><div className="meter"><span style={{ width: `${v}%` }} className={k === c.low ? "low" : ""} /></div></div>)}
    <p className="note">Yang perlu diperbaiki: {METRICS[c.low].toLowerCase()}.</p>
  </div>;
}

const TABS = [["req", "Permintaan", ClipboardList], ["need", "Kebutuhan", Layers], ["doc", "Dokumen", FileCheck], ["rap", "Rapor", Award]];

export function Portal({ sid }) {
  const s = useHub();
  const sup = s.suppliers[sid];
  const [tab, setTab] = useState("req");
  const [sheet, setSheet] = useState(null);
  const root = useRef(null);
  const r = sheet && s.requests[sheet];
  return (
    <div className="portal" ref={root}>
      <div className="p-top"><b>{sup.name}</b><span>{sup.tier}, {TIERS[sup.channel]}</span></div>
      <div className="p-body">
        {tab === "req" && <TabPermintaan sid={sid} openSheet={setSheet} />}
        {tab === "need" && <TabKebutuhan sid={sid} />}
        {tab === "doc" && <TabDokumen sid={sid} />}
        {tab === "rap" && <TabRapor sid={sid} />}
      </div>
      <nav className="p-nav" aria-label="Portal pemasok">
        {TABS.map(([k, t, I]) => <button key={k} type="button" className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}><I size={20} aria-hidden="true" />{t}</button>)}
      </nav>
      {r && <button type="button" className="p-scrim" aria-label="Tutup" onClick={() => setSheet(null)} />}
      <Drawer.Root open={!!r} modal={false} onOpenChange={(o) => !o && setSheet(null)} container={root.current} noBodyStyles>
        <Drawer.Portal container={root.current}>
          <Drawer.Content className="p-sheet" aria-describedby={undefined}>
            <div className="p-grab" />
            <Drawer.Title className="p-sheet-t">{r ? s.materials[r.mid].name : ""}</Drawer.Title>
            {r && <ConfirmForm key={r.id} r={r} m={s.materials[r.mid]} onDone={() => setSheet(null)} />}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

export const EmptyPortal = () => <Empty>Pemasok tidak ditemukan.</Empty>;
