import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { Command } from "cmdk";
import { Bell, Layers, Warehouse, LifeBuoy, Users, Search, Smartphone, RotateCcw } from "lucide-react";
import "./styles.css";
import "./material.css";
import "./oldschool.css";
import { useHub, signalsOf } from "./store";
import { useHashRoute, go } from "./ui";
import { Antrean, Papan, Visibilitas, Rescue, Pemasok } from "./planner";
import { Portal, EmptyPortal } from "./portal";

const NAV = [["antrean", "Antrean sinyal", Bell], ["papan", "Papan komitmen", Layers], ["visibilitas", "Visibilitas stok", Warehouse], ["rescue", "Supply Rescue", LifeBuoy], ["pemasok", "Pemasok dan rapor", Users]];

function Palette({ open, setOpen }) {
  const s = useHub();
  const run = (fn) => { setOpen(false); fn(); };
  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Cari" className="cmd" overlayClassName="dr-ov">
      <Command.Input placeholder="Cari halaman, material, atau pemasok" />
      <Command.List>
        <Command.Empty>Tidak ditemukan.</Command.Empty>
        <Command.Group heading="Halaman">{NAV.map(([k, t]) => <Command.Item key={k} onSelect={() => run(() => go(k))}>{t}</Command.Item>)}</Command.Group>
        <Command.Group heading="Material">{Object.values(s.materials).map((m) => <Command.Item key={m.id} onSelect={() => run(() => go("visibilitas"))}>{m.name}</Command.Item>)}</Command.Group>
        <Command.Group heading="Pemasok">{Object.values(s.suppliers).map((x) => <Command.Item key={x.id} onSelect={() => run(() => go("pemasok", { sid: x.id }))}>{x.name}</Command.Item>)}</Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function Planner({ page, q }) {
  const s = useHub();
  const count = signalsOf(s).length;
  const [cmd, setCmd] = useState(false);
  const [dock, setDock] = useState(() => window.innerWidth >= 1200 && q.get("dock") !== "0");
  const [sid, setSid] = useState(q.get("sup") || "sari");
  useEffect(() => {
    const f = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); } };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  const View = { antrean: Antrean, papan: Papan, visibilitas: Visibilitas, rescue: Rescue, pemasok: Pemasok }[page] || Antrean;
  return (
    <div className={`shell${dock ? " has-dock" : ""}`}>
      <header className="appbar">
        <a className="appname" href="#/antrean">Supplier Collaboration Hub</a>
        <span className="appnote">Prototipe, data ilustrasi</span>
        <div className="appbar-r">
          <button type="button" className="ab-btn" aria-label="Cari" onClick={() => setCmd(true)}><Search size={16} aria-hidden="true" /><span className="ab-t">Cari</span><kbd>Ctrl K</kbd></button>
          <button type="button" className="ab-btn ab-dock" aria-pressed={dock} onClick={() => setDock(!dock)}><Smartphone size={16} aria-hidden="true" />Ponsel pemasok</button>
          <button type="button" className="ab-btn" aria-label="Reset demo" onClick={() => s.reset()}><RotateCcw size={16} aria-hidden="true" /><span className="ab-t">Reset demo</span></button>
        </div>
      </header>
      <nav className="sidenav" aria-label="Menu planner">
        {NAV.map(([k, t, I]) => (
          <a key={k} href={`#/${k}`} className={page === k ? "on" : ""} aria-current={page === k ? "page" : undefined}>
            <I size={18} aria-hidden="true" /><span>{t}</span>{k === "antrean" && count > 0 && <em>{count}</em>}
          </a>
        ))}
      </nav>
      <main className="content"><View q={q} key={page} /></main>
      {dock && (
        <aside className="dock" aria-label="Tampilan ponsel pemasok">
          <label className="dock-h">Lihat sebagai
            <select value={sid} onChange={(e) => setSid(e.target.value)}>{Object.values(s.suppliers).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.tier})</option>)}</select>
          </label>
          <div className="device"><Portal sid={sid} key={sid} /></div>
        </aside>
      )}
      <Palette open={cmd} setOpen={setCmd} />
    </div>
  );
}

function App() {
  const { parts, q } = useHashRoute();
  const suppliers = useHub((s) => s.suppliers);
  if (parts[0] === "p") return <div className="portal-full">{suppliers[parts[1]] ? <Portal sid={parts[1]} /> : <EmptyPortal />}</div>;
  return <Planner page={parts[0] || "antrean"} q={q} />;
}

const narrow = window.innerWidth < 640;
createRoot(document.getElementById("root")).render(<><App /><Toaster position={narrow ? "top-center" : "bottom-left"} /></>);
