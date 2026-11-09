import React, { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Drawer } from "vaul";
import { Check, Pencil, Ship, Truck, X } from "lucide-react";
import { useHub, signalsOf, riskOf, caseOf, optionsOf, scoreOf } from "./store";
import { TODAY, TOL, TIERS, DOCS, METRICS, fmtD, fmtDL, fmtRange, n, rp } from "./data";
import { Btn, Tag, Page, Panel, Empty, Seg, go, statusLabel } from "./ui";

const Stat = ({ label, value, of, suffix, sub, alert }) => (
  <div className="stat">
    <div className="stat-l">{label}</div>
    <div className={`stat-v${alert ? " is-alert" : ""}`}><NumberFlow value={value} locales="id-ID" />{of != null && <span className="stat-of"> dari {of}</span>}{suffix}</div>
    <div className="stat-s">{sub}</div>
  </div>
);

export function Antrean() {
  const s = useHub();
  const [f, setF] = useState("all");
  const signals = signalsOf(s);
  const reqs = Object.values(s.requests);
  const answered = reqs.filter((r) => r.status !== "pending").length;
  const kritis = Object.values(s.materials).filter((m) => riskOf(s, m).level === "Kritis").length;
  const running = s.plans.filter((p) => p.status !== "approved").length;
  const shown = signals.filter((x) => f === "all" || (f === "now" ? x.pri === 0 : x.pri > 0));
  return (
    <Page title="Antrean sinyal" desc={`Minggu 1, ${fmtDL(TODAY)}`}>
      <div className="stats">
        <Stat label="Konfirmasi terkumpul" value={answered} of={reqs.length} sub="Hari ke-1, proses manual ±7 hari" />
        <Stat label="Item kritis" value={kritis} sub="Stok habis dalam 7 hari" alert={kritis > 0} />
        <Stat label="Sinyal terbuka" value={signals.length} sub={`${signals.filter((x) => x.pri === 0).length} perlu tindakan segera`} />
        <Stat label="Rescue berjalan" value={running} sub={`${s.plans.filter((p) => p.status === "approved").length} rencana disetujui`} />
      </div>
      <div className="cols-main">
        <Panel title="Perlu ditindak" right={<Seg label="Saring sinyal" value={f} onChange={setF} options={[["all", "Semua"], ["now", "Segera"], ["later", "Lainnya"]]} />}>
          {shown.length === 0 ? <Empty>Tidak ada sinyal pada saringan ini.</Empty> : (
            <table className="tbl tbl-queue"><tbody>
              {shown.map((x) => (
                <tr key={x.id}>
                  <td className="w-tag"><Tag>{x.tag}</Tag></td>
                  <td>{x.text}</td>
                  <td className="ta-r">
                    {x.remind && <Btn kind="secondary" size="sm" onClick={() => s.remind(x.remind)}>{x.cta}</Btn>}
                    {x.go && <Btn kind={x.pri === 0 ? "primary" : "secondary"} size="sm" onClick={() => go(x.go.to, x.go.mid ? { mid: x.go.mid } : x.go.sid ? { sid: x.go.sid } : undefined)}>{x.cta}</Btn>}
                  </td>
                </tr>
              ))}
            </tbody></table>
          )}
        </Panel>
        <div className="stack-col">
          <Panel title="Status konfirmasi">
            <table className="tbl"><tbody>
              {reqs.map((r) => (
                <tr key={r.id}>
                  <td><div className="strong">{s.suppliers[r.sid].name}</div><div className="sub">{TIERS[s.suppliers[r.sid].channel]}</div></td>
                  <td><div>{s.materials[r.mid].name}</div><div className="sub">{r.status === "pending" ? `Tenggat ${fmtD(r.deadline)}` : `${n(r.cQty)} dari ${n(r.qty)} ${s.materials[r.mid].unit}`}</div></td>
                  <td className="ta-r"><Tag>{statusLabel(r)}</Tag></td>
                </tr>
              ))}
            </tbody></table>
          </Panel>
          <Panel title="Aktivitas">
            <ul className="log">{s.log.slice(0, 6).map((l) => <li key={l.id}><span>{l.at}</span>{l.text}</li>)}</ul>
          </Panel>
        </div>
      </div>
    </Page>
  );
}

function EditS58({ m, onClose }) {
  const editS58 = useHub((x) => x.editS58);
  const mid0 = (m.zones.s58[0] + m.zones.s58[1]) / 2;
  const [val, setVal] = useState(Math.round(mid0));
  const [why, setWhy] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!(val > 0)) return setErr("Isi angka yang benar.");
    const r = editS58(m.id, Number(val), why);
    if (!r.ok) return setErr(r.error);
    onClose();
  };
  return (
    <form className="inline-form" onSubmit={submit}>
      <label>Titik tengah M5 sampai 8 ({m.unit})<input type="number" min="1" value={val} onChange={(e) => setVal(e.target.value)} /></label>
      <label>Alasan
        <select value={why} onChange={(e) => setWhy(e.target.value)}>
          <option value="">Wajib bila melebihi 20%</option>
          <option>Campaign dimajukan</option><option>Produk baru</option><option>Koreksi forecast</option><option>Isu pasokan</option>
        </select>
      </label>
      <Btn type="submit" size="sm">Simpan</Btn>
      <Btn kind="secondary" size="sm" onClick={onClose}>Batal</Btn>
      {err && <span className="err">{err}</span>}
    </form>
  );
}

export function Papan() {
  const s = useHub();
  const [sid, setSid] = useState("all");
  const [edit, setEdit] = useState(null);
  const mats = Object.values(s.materials).filter((m) => sid === "all" || m.sid === sid);
  const history = Object.entries(s.changes);
  return (
    <Page title="Papan komitmen" desc="Satu definisi, satu pemilik, satu tanda untuk tiap angka yang dikirim ke pemasok."
      actions={<label className="field-inline">Pemasok
        <select value={sid} onChange={(e) => setSid(e.target.value)}><option value="all">Semua pemasok</option>{Object.values(s.suppliers).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}>
      <Panel>
        <div className="scroll">
          <table className="tbl grid">
            <thead>
              <tr><th rowSpan="2">Material dan pemilik</th><th colSpan="2" className="z-p">Pasti, toleransi 0%</th><th colSpan="2" className="z-s">Siap, toleransi ±20%</th><th className="z-g">Gambaran</th><th rowSpan="2">Respons pemasok</th></tr>
              <tr><th className="z-p2">M1</th><th className="z-p2">M2</th><th className="z-s2">M3 sampai 4</th><th className="z-s2">M5 sampai 8</th><th className="z-g2">Bulan 3+</th></tr>
            </thead>
            <tbody>
              {mats.map((m) => {
                const z = m.zones, ch = s.changes[m.id];
                const out = ch && Math.abs(ch.now / ch.prev - 1) > TOL;
                return (
                  <React.Fragment key={m.id}>
                    <tr>
                      <td><div className="strong">{m.name}</div><div className="sub">{s.suppliers[m.sid].name}, {m.unit}. Pemilik: {m.owner}</div></td>
                      <td className="c c-p">{n(z.m1)}</td><td className="c c-p">{n(z.m2)}</td>
                      <td className="c c-s">{n(z.s34[0])}-{n(z.s34[1])}</td>
                      <td className={`c c-s c-edit${out ? " c-out" : ""}`}>
                        <button type="button" onClick={() => setEdit(edit === m.id ? null : m.id)} aria-label={`Ubah angka M5 sampai 8 ${m.name}`}>{n(z.s58[0])}-{n(z.s58[1])}<Pencil size={13} aria-hidden="true" /></button>
                      </td>
                      <td className="c c-g">~{n(z.far)}<div className="sub">+{n(z.ambisi)} ambisi</div></td>
                      <td>{s.zoneResp[m.id] ? <Tag tone="ok">{s.zoneResp[m.id]}</Tag> : <Tag>Belum</Tag>}</td>
                    </tr>
                    {edit === m.id && <tr className="row-edit"><td colSpan="7"><EditS58 m={m} onClose={() => setEdit(null)} /></td></tr>}
                    {out && edit !== m.id && (
                      <tr className="row-flag"><td colSpan="7">
                        <div className="flag">
                          <span><b>Di luar toleransi.</b> M5 sampai 8 {m.name} {ch.now > ch.prev ? "naik" : "turun"} {Math.abs(Math.round((ch.now / ch.prev - 1) * 100))}% dari minggu lalu, melebihi batas ±20%. Alasan ({ch.by}): {ch.reason}.</span>
                          {!ch.reviewed && <Btn kind="secondary" size="sm" onClick={() => s.reviewChange(m.id)}>Tandai sudah ditinjau</Btn>}
                          {ch.reviewed && <Tag tone="ok">Sudah ditinjau</Tag>}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="legend"><b>Cara membaca.</b> Hijau berarti pesanan, wajib dikirim. Kuning berarti siapkan kapasitas dalam rentang. Abu-abu berarti perkiraan, belum perlu produksi. Batas zona dan toleransi adalah data ilustrasi.</p>
      </Panel>
      <Panel title="Riwayat perubahan angka">
        {history.length === 0 ? <Empty>Belum ada perubahan minggu ini.</Empty> : (
          <table className="tbl"><thead><tr><th>Material</th><th className="ta-r">Minggu lalu</th><th className="ta-r">Sekarang</th><th>Alasan</th><th>Pemilik</th><th>Waktu</th></tr></thead>
            <tbody>{history.map(([mid, c]) => <tr key={mid}><td className="strong">{s.materials[mid].name}, M5 sampai 8</td><td className="ta-r">{n(c.prev)}</td><td className="ta-r strong">{n(c.now)}</td><td>{c.reason}</td><td>{c.by}</td><td>{c.at}</td></tr>)}</tbody></table>
        )}
      </Panel>
    </Page>
  );
}

function SideDrawer({ open, onClose, title, children }) {
  return (
    <Drawer.Root direction="right" open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="dr-ov" />
        <Drawer.Content className="dr" aria-describedby={undefined}>
          <div className="dr-head"><Drawer.Title>{title}</Drawer.Title><button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={18} /></button></div>
          <div className="dr-body">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function Visibilitas() {
  const s = useHub();
  const [mid, setMid] = useState(null);
  const [f, setF] = useState("all");
  const rows = Object.values(s.materials).map((m) => ({ m, r: riskOf(s, m) }))
    .filter((x) => f === "all" || (f === "impor" ? x.m.impor : x.r.level !== "Aman"))
    .sort((a, b) => (a.r.days ?? 99) - (b.r.days ?? 99));
  const sel = mid && s.materials[mid];
  const selR = sel && riskOf(s, sel);
  const ships = sel ? Object.values(s.shipments).filter((k) => k.mid === mid) : [];
  const c = sel ? caseOf(s, sel) : null;
  return (
    <Page title="Visibilitas stok" desc="Diperbarui hari ini, 08.00. Stok gudang, barang dalam perjalanan, dan stok di pemasok dalam satu tampilan."
      actions={<Seg label="Saring material" value={f} onChange={setF} options={[["all", "Semua"], ["risk", "Berisiko"], ["impor", "Impor"]]} />}>
      <Panel>
        <div className="legend-row"><span><i className="sw s-g" />Gudang RMPM</span><span><i className="sw s-j" />Dalam perjalanan</span><span><i className="sw s-p" />Di pemasok</span></div>
        <div className="scroll">
          <table className="tbl tbl-click">
            <thead><tr><th>Material</th><th>Posisi stok</th><th className="ta-r">Cukup sampai</th><th>Kiriman berikutnya</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map(({ m, r }) => {
                const t = Math.max(1, m.stock + r.transit + m.atSupplier);
                return (
                  <tr key={m.id} onClick={() => setMid(m.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setMid(m.id)}>
                    <td><div className="strong">{m.name}{m.impor && <Tag tone="mute">Impor</Tag>}</div><div className="sub">{s.suppliers[m.sid].name}</div></td>
                    <td className="w-bar">
                      <div className="bar"><span className="s-g" style={{ width: `${(m.stock / t) * 100}%` }} /><span className="s-j" style={{ width: `${(r.transit / t) * 100}%` }} /><span className="s-p" style={{ width: `${(m.atSupplier / t) * 100}%` }} /></div>
                      <div className="sub">{n(m.stock)} gudang, {n(r.transit)} jalan, {n(m.atSupplier)} pemasok ({m.unit})</div>
                    </td>
                    <td className="ta-r"><div className="strong">{r.out ? fmtD(r.out) : "Lebih dari 30 hari"}</div><div className="sub">{r.cover.toFixed(1).replace(".", ",")} hari dari stok gudang</div></td>
                    <td>{r.next ? <><div>{r.next.mode}, ETA {fmtRange(r.next.min, r.next.max)}</div><div className="sub">{n(r.next.qty)} {m.unit}, PO {r.next.po}</div></> : <span className="sub">Belum ada kiriman</span>}</td>
                    <td><Tag>{r.level}</Tag></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <SideDrawer open={!!sel} onClose={() => setMid(null)} title={sel?.name || ""}>
        {sel && <>
          <div className="kv"><span>Status</span><Tag>{selR.level}</Tag></div>
          <div className="kv"><span>Pemakaian harian</span><b>{n(sel.use)} {sel.unit}</b></div>
          <div className="kv"><span>Stok gudang habis</span><b>{selR.out ? fmtD(selR.out) : "Aman 30 hari"}</b></div>
          {selR.level === "Kritis" && selR.next && selR.out < selR.next.min && (
            <p className="note-bad">Stok habis sebelum kiriman tiba. Saran: majukan call off atau pakai sumber alternatif.</p>
          )}
          <h3>Kiriman</h3>
          {ships.length === 0 && <Empty>Belum ada kiriman untuk material ini.</Empty>}
          {ships.map((k) => (
            <div className="ship" key={k.id}>
              <div className="ship-h">{k.mode === "Kapal" ? <Ship size={16} /> : <Truck size={16} />}<b>{n(k.qty)} {sel.unit}, PO {k.po}</b></div>
              <div className="sub">{k.who}, ETA {fmtRange(k.min, k.max)}</div>
              {k.stages && <ol className="stages">{k.stages.map((x) => <li key={x.t} className={x.done ? "done" : ""}><b>{x.t}</b><span>{x.d}</span></li>)}</ol>}
            </div>
          ))}
          {c && <Btn className="w-full" onClick={() => { setMid(null); go("rescue", { mid: sel.id }); }}>Buka Supply Rescue</Btn>}
        </>}
      </SideDrawer>
    </Page>
  );
}

export function Rescue({ q }) {
  const s = useHub();
  const cases = Object.values(s.materials).map((m) => ({ m, c: caseOf(s, m) })).filter((x) => x.c);
  const mid = q.get("mid") && cases.some((x) => x.m.id === q.get("mid")) ? q.get("mid") : cases[0]?.m.id;
  const [pick, setPick] = useState("A");
  const cur = cases.find((x) => x.m.id === mid);
  const opts = cur ? optionsOf(s, cur.m, cur.c) : [];
  const open = s.plans.find((p) => p.mid === mid && p.status !== "approved");
  const sel = opts.find((o) => o.key === pick) || opts[0];
  const LAB = { waiting: "Menunggu konfirmasi", confirmed: "Terkonfirmasi", approved: "Disetujui" };
  return (
    <Page title="Supply Rescue" desc="Bandingkan cara menutup kekurangan sebelum meminta konfirmasi pemasok.">
      {cases.length === 0 ? <Panel><Empty>Tidak ada kekurangan material yang perlu ditutup saat ini.</Empty></Panel> : (
        <div className="cols-rescue">
          <Panel title="Kekurangan">
            <ul className="case-list">
              {cases.map(({ m, c }) => (
                <li key={m.id}><button type="button" className={m.id === mid ? "on" : ""} onClick={() => go("rescue", { mid: m.id })}>
                  <b>{m.name}</b><span>Kurang {n(c.short)} {m.unit}</span><span>Dibutuhkan {fmtD(c.needBy)}</span>
                </button></li>
              ))}
            </ul>
          </Panel>
          <Panel title={`Tutup kekurangan ${cur.m.name}`} desc={`Dibutuhkan ${fmtD(cur.c.needBy)}, kebutuhan ${n(cur.c.need)} ${cur.m.unit}. Biaya adalah data ilustrasi.`}>
            <div className="gap-bar">
              <div className="gap-ok" style={{ width: `${(cur.c.ready / cur.c.need) * 100}%` }}>{n(cur.c.ready)} {cur.m.unit} siap</div>
              <div className="gap-short">{n(cur.c.short)} {cur.m.unit} kurang</div>
            </div>
            <table className="tbl compare">
              <thead><tr><th />{opts.map((o) => (
                <th key={o.key} className={o.key === sel.key ? "on" : ""}><button type="button" aria-pressed={o.key === sel.key} disabled={!!open} onClick={() => setPick(o.key)}>{o.key}. {o.name}</button></th>
              ))}</tr></thead>
              <tbody>
                <tr><th>Pemasok</th>{opts.map((o) => <td key={o.key}>{o.who}</td>)}</tr>
                <tr><th>Tiba</th>{opts.map((o) => <td key={o.key}>{fmtD(o.arrive)}</td>)}</tr>
                <tr><th>Biaya ekstra</th>{opts.map((o) => <td key={o.key}>{rp(o.cost)}</td>)}</tr>
                <tr><th>Kurang pada {fmtD(cur.c.needBy)}</th>{opts.map((o) => <td key={o.key} className={o.leftover ? "bad" : ""}>{n(o.leftover)} {cur.m.unit}</td>)}</tr>
              </tbody>
            </table>
            {open ? (
              <div className="plan-box">
                <div><b>{open.name} untuk {n(open.qty)} {cur.m.unit}</b><div className="sub">{open.who}, tiba {fmtD(open.arrive)}</div></div>
                <Tag>{LAB[open.status]}</Tag>
                {open.status === "confirmed" && <Btn onClick={() => s.approveRescue(open.id)}><Check size={16} />Setujui rencana</Btn>}
              </div>
            ) : (
              <div className="plan-box">
                <div><b>Rencana {sel.key} dipilih</b><div className="sub">{sel.who}, {n(cur.c.short)} {cur.m.unit}, tiba {fmtD(sel.arrive)}. Hanya pemasok yang sudah disetujui.</div></div>
                <Btn onClick={() => s.sendRescue(mid, sel.key)}>Minta konfirmasi pemasok</Btn>
              </div>
            )}
          </Panel>
        </div>
      )}
      {s.plans.length > 0 && (
        <Panel title="Rencana penyelamatan">
          <table className="tbl"><thead><tr><th>Material</th><th>Rencana</th><th>Pemasok</th><th className="ta-r">Jumlah</th><th>Tiba</th><th className="ta-r">Biaya ekstra</th><th>Status</th></tr></thead>
            <tbody>{s.plans.slice().reverse().map((p) => <tr key={p.id}><td className="strong">{s.materials[p.mid].name}</td><td>{p.name}</td><td>{p.who}</td><td className="ta-r">{n(p.qty)} {s.materials[p.mid].unit}</td><td>{fmtD(p.arrive)}</td><td className="ta-r">{rp(p.cost)}</td><td><Tag>{LAB[p.status]}</Tag></td></tr>)}</tbody></table>
        </Panel>
      )}
    </Page>
  );
}

export function Pemasok({ q }) {
  const s = useHub();
  const [sid, setSid] = useState(q.get("sid"));
  React.useEffect(() => { if (q.get("sid")) setSid(q.get("sid")); }, [q.get("sid")]);
  const sup = sid && s.suppliers[sid];
  const sc = sup && scoreOf(sup);
  return (
    <Page title="Pemasok dan rapor" desc="Contoh empat dari 399 pemasok. Tidak mengisi konfirmasi tidak diblokir, tetapi rapor menjadi merah.">
      <Panel>
        <div className="scroll">
          <table className="tbl tbl-click">
            <thead><tr><th>Pemasok</th><th>Tingkat</th><th>Jalur</th><th>Konfirmasi</th><th className="ta-r">Skor</th><th>Rapor</th><th>Sertifikat halal</th><th>EPR</th></tr></thead>
            <tbody>
              {Object.values(s.suppliers).map((x) => {
                const r = Object.values(s.requests).find((q2) => q2.sid === x.id), c = scoreOf(x);
                return (
                  <tr key={x.id} onClick={() => setSid(x.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSid(x.id)}>
                    <td className="strong">{x.name}</td><td>{x.tier}</td><td>{TIERS[x.channel]}</td><td><Tag>{statusLabel(r)}</Tag></td>
                    <td className="ta-r strong">{c.score}</td><td><Tag>{c.color}</Tag></td><td><Tag>{x.docs.halal}</Tag></td><td><Tag>{x.docs.epr}</Tag></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <SideDrawer open={!!sup} onClose={() => { setSid(null); if (q.get("sid")) go("pemasok"); }} title={sup?.name || ""}>
        {sup && <>
          <div className="kv"><span>Jalur</span><b>{TIERS[sup.channel]}</b></div>
          <div className="kv"><span>Skor rapor</span><span><b>{sc.score}</b> <Tag>{sc.color}</Tag></span></div>
          <h3>Rapor</h3>
          {Object.entries(sup.metrics).map(([k, v]) => (
            <div className="metric" key={k}><div className="metric-l"><span>{METRICS[k]}</span><b>{v}%</b></div><div className="meter"><span style={{ width: `${v}%` }} className={k === sc.low ? "low" : ""} /></div></div>
          ))}
          <p className="note">Perbaikan utama: {METRICS[sc.low].toLowerCase()} ({sc.lowV}%). {sc.color === "Merah" ? "Alokasi berikutnya dapat digeser sebagian, pemasok didampingi dan tidak diblokir." : "Pertahankan alokasi."}</p>
          <h3>Dokumen kepatuhan</h3>
          {Object.entries(DOCS).map(([k, t]) => (
            <div className="kv" key={k}><span>{t}</span>
              <span className="kv-r"><Tag>{sup.docs[k]}</Tag>{sup.docs[k] === "Menunggu verifikasi" && <Btn size="sm" onClick={() => s.verifyDoc(sup.id, k)}>Verifikasi</Btn>}</span>
            </div>
          ))}
        </>}
      </SideDrawer>
    </Page>
  );
}
