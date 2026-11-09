import React from "react";

export const Btn = ({ kind = "primary", size, className = "", ...p }) => (
  <button type="button" {...p} className={`btn btn-${kind}${size ? " btn-" + size : ""} ${className}`} />
);

const TONES = {
  Segera: "bad", Eskalasi: "bad", Kritis: "bad", Merah: "bad", Kosong: "bad", "Belum jawab": "bad", Tidak: "bad", "Tidak sanggup": "bad",
  Ingatkan: "warn", Waspada: "warn", Kuning: "warn", Sebagian: "warn", Tentatif: "warn", Pantau: "warn", "Menunggu konfirmasi": "warn",
  Aman: "ok", Hijau: "ok", Penuh: "ok", Lengkap: "ok", Disetujui: "ok",
  Tinjau: "info", Setujui: "info", Terkonfirmasi: "info", "Menunggu verifikasi": "info",
};
export const Tag = ({ children, tone }) => <span className={`tag tag-${tone || TONES[children] || "mute"}`}>{children}</span>;

export const statusLabel = (r) => (r.status === "pending" ? "Belum jawab" : r.tentative ? "Tentatif" : { full: "Penuh", partial: "Sebagian", none: "Tidak sanggup" }[r.status]);

export const Page = ({ title, desc, actions, children }) => (
  <div className="page">
    <div className="page-head">
      <div><h1>{title}</h1>{desc && <p>{desc}</p>}</div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
    {children}
  </div>
);

export const Panel = ({ title, desc, right, children, className = "" }) => (
  <section className={`panel ${className}`}>
    {(title || right) && (
      <div className="panel-head">
        <div><h2>{title}</h2>{desc && <p>{desc}</p>}</div>
        {right}
      </div>
    )}
    {children}
  </section>
);

export const Empty = ({ children }) => <p className="empty">{children}</p>;

export function Seg({ options, value, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, t]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{t}</button>
      ))}
    </div>
  );
}

export function useHashRoute() {
  const read = () => {
    const [path, q] = (location.hash.slice(1) || "/antrean").split("?");
    return { parts: path.split("/").filter(Boolean), q: new URLSearchParams(q || "") };
  };
  const [r, set] = React.useState(read);
  React.useEffect(() => {
    const f = () => set(read());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return r;
}
export const go = (to, q) => { location.hash = `/${to}${q ? "?" + new URLSearchParams(q) : ""}`; };
