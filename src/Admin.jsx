import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Settings,
  LogOut,
  Plus,
  Search,
  Printer,
  X,
  RefreshCw,
  Download,
  Instagram,
  ArrowUpRight,
  ImagePlus,
  Menu,
  Check,
  ChevronRight,
} from "lucide-react";
import "./admin.css";
const STATUS = {
  pending: "Nouveau",
  confirmed: "Confirmé",
  shipped: "Expédié",
  delivered: "Livré",
  cancelled: "Annulé",
};
const money = (n) =>
  new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(n) +
  " DH";
const date = (v) =>
  new Date(v).toLocaleString("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  });
const reference = (o) => "DA-" + o.id.slice(0, 8).toUpperCase();
const emptyProduct = {
  name: "",
  brand: "",
  type: "decant",
  gender: "homme",
  price: 100,
  fullPrice: "",
  image: "/products/1.jpg",
  notes: "",
  tag: "Nouveau",
  description: "",
  active: true,
  inStock: true,
};
async function api(path, options = {}) {
  const response = await fetch("/api/admin/" + path, {
    ...options,
    headers: {
      ...(options.body && typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(
      "API administration indisponible. Vérifiez la configuration Cloudflare.",
    );
  }
  if (!response.ok)
    throw Object.assign(Error(data.error || "Une erreur est survenue."), {
      status: response.status,
    });
  return data;
}
function downloadCSV(rows, filename) {
  const escape = (v) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const content =
    "\ufeff" + rows.map((row) => row.map(escape).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Ticket({ order, onClose }) {
  return (
    <div
      className="ticket-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={"Ticket " + reference(order)}
    >
      <div className="ticket-dialog">
        <div className="ticket-toolbar">
          <span>Ticket de préparation / livraison</span>
          <div>
            <button onClick={() => window.print()}>
              <Printer size={17} /> Imprimer
            </button>
            <button aria-label="Fermer le ticket" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <article className="print-ticket">
          <div className="ticket-brand">
            <img src="/logo.png" alt="DecanteAssil" />
            <div>
              <strong>DECANTEASSIL</strong>
              <span>PARFUMS ORIGINAUX</span>
            </div>
          </div>
          <div className="ticket-id">
            <h1>{reference(order)}</h1>
            <p>{date(order.createdAt)}</p>
            <span>{STATUS[order.status]}</span>
          </div>
          <div className="ticket-customer">
            <h2>DESTINATAIRE</h2>
            <strong>{order.customer.name}</strong>
            <p className="ticket-phone">{order.customer.phone}</p>
            <p>{order.customer.address}</p>
            <strong>{order.customer.city}</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Article / format</th>
                <th>Qté</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((p, i) => (
                <tr key={i}>
                  <td>
                    <strong>
                      {p.brand} — {p.name}
                    </strong>
                    <span>{p.size}</span>
                  </td>
                  <td>{p.qty}</td>
                  <td>{money(p.price * p.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ticket-total">
            <span>Total produits</span>
            <strong>{money(order.total)}</strong>
          </div>
          <p className="ticket-disclaimer">
            Livraison en supplément, montant à confirmer avec le vendeur. Ce
            ticket n’est pas une preuve de paiement.
          </p>
          <div className="ticket-checks">
            □ Préparé &nbsp;&nbsp; □ Vérifié &nbsp;&nbsp; □ Expédié
          </div>
          <p className="ticket-thanks">
            Merci pour votre confiance ✧ DecanteAssil
          </p>
          <small>Référence complète : {order.id}</small>
        </article>
      </div>
    </div>
  );
}
function ProductEditor({ product, onClose, onSaved, onError }) {
  const [form, setForm] = useState({ ...emptyProduct, ...product }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("products" + (product?.id ? "/" + product.id : ""), {
        method: product?.id ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          fullPrice: form.fullPrice === "" ? null : Number(form.fullPrice),
        }),
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file) {
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 524288
    ) {
      setError("Choisissez une image JPG, PNG ou WebP de 512 Ko maximum.");
      return;
    }
    setBusy(true);
    try {
      const result = await api("media", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      set("image", result.url);
    } catch (e) {
      setError(e.message);
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-modal-backdrop">
      <section
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label={product?.id ? "Modifier le produit" : "Nouveau produit"}
      >
        <div className="admin-modal-heading">
          <h2>{product?.id ? "Modifier le produit" : "Nouveau produit"}</h2>
          <button aria-label="Fermer le produit" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="editor-image">
            <img src={form.image} alt="Aperçu produit" />
            <label className="admin-secondary">
              <ImagePlus size={16} /> Importer une image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => upload(e.target.files[0])}
              />
            </label>
            <small>JPG, PNG ou WebP · 512 Ko max.</small>
          </div>
          <label>
            Adresse de l’image
            <input
              required
              maxLength={2000}
              value={form.image}
              onChange={(e) => set("image", e.target.value)}
            />
          </label>
          <div className="admin-form-grid">
            <label>
              Nom du parfum
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label>
              Marque
              <input
                required
                maxLength={100}
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
              />
            </label>
            <label>
              Type
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="decant">Décant designer</option>
                <option value="niche">Parfum nishe</option>
                <option value="full">Flacon complet</option>
              </select>
            </label>
            <label>
              Genre
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                {form.type === "niche" && <option value="mixte">Mixte</option>}
              </select>
            </label>
            <label>
              {form.type === "full"
                ? "Prix flacon (DH)"
                : "Prix décant 10 ml (DH)"}
              <input
                type="number"
                required
                min="1"
                max="100000"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </label>
            {form.type !== "full" && (
              <label>
                Prix flacon complet (facultatif)
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="0.01"
                  value={form.fullPrice}
                  onChange={(e) => set("fullPrice", e.target.value)}
                />
              </label>
            )}
          </div>
          <label>
            Notes olfactives
            <input
              maxLength={250}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
          <label>
            Badge
            <input
              maxLength={40}
              value={form.tag}
              onChange={(e) => set("tag", e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={1200}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <div className="admin-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
              />{" "}
              Visible sur la boutique
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) => set("inStock", e.target.checked)}
              />{" "}
              Disponible à la commande
            </label>
          </div>
          <p className="admin-hint">
            Le prix du décant 5 ml est calculé à 58 % du prix 10 ml, arrondi au
            dirham. Les commandes existantes gardent leurs prix d’origine.
          </p>
          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          <div className="editor-actions">
            <button type="button" className="admin-secondary" onClick={onClose}>
              Annuler
            </button>
            <button className="admin-primary" disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer le produit"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
export default function Admin() {
  const [session, setSession] = useState(null),
    [password, setPassword] = useState(""),
    [loginBusy, setLoginBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [data, setData] = useState({
      products: [],
      orders: [],
      settings: { instagram: "", whatsapp: "" },
    }),
    [tab, setTab] = useState("overview"),
    [loading, setLoading] = useState(false),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [period, setPeriod] = useState("all"),
    [editor, setEditor] = useState(null),
    [ticket, setTicket] = useState(null),
    [detail, setDetail] = useState(null),
    [navOpen, setNavOpen] = useState(false),
    [settings, setSettings] = useState(null),
    [saving, setSaving] = useState(false),
    [updating, setUpdating] = useState(null);
  useEffect(() => {
    document.title = "Administration — DecanteAssil";
    api("session")
      .then(setSession)
      .catch((e) => {
        setError(e.message);
        setSession({ authenticated: false, configured: false });
      });
  }, []);
  useEffect(() => {
    if (session?.authenticated) refresh();
  }, [session?.authenticated]);
  useEffect(() => {
    if (notice) {
      const id = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(id);
    }
  }, [notice]);
  function handleError(e) {
    setError(e.message);
    if (e.status === 401) {
      setSession({ authenticated: false, configured: true });
      setData({ products: [], orders: [], settings: {} });
      setDetail(null);
      setTicket(null);
      setEditor(null);
    }
  }
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const next = await api("data");
      setData(next);
      setSettings(next.settings);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }
  async function login(e) {
    e.preventDefault();
    setLoginBusy(true);
    setError("");
    try {
      await api("login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setSession({ authenticated: true, configured: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoginBusy(false);
    }
  }
  async function logout() {
    try {
      await api("logout", { method: "POST" });
      setSession({ authenticated: false, configured: true });
      setData({ products: [], orders: [], settings: {} });
      setDetail(null);
      setTicket(null);
    } catch (e) {
      handleError(e);
    }
  }
  async function changeStatus(order, value) {
    setUpdating(order.id);
    try {
      await api("orders/" + order.id, {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      });
      setData((old) => ({
        ...old,
        orders: old.orders.map((o) =>
          o.id === order.id ? { ...o, status: value } : o,
        ),
      }));
      if (detail?.id === order.id) setDetail({ ...order, status: value });
      setNotice("Statut de la commande enregistré.");
    } catch (e) {
      handleError(e);
    } finally {
      setUpdating(null);
    }
  }
  async function remove(p) {
    if (
      !window.confirm(
        `Supprimer « ${p.name} » ? Les commandes existantes seront conservées.`,
      )
    )
      return;
    try {
      await api("products/" + p.id, { method: "DELETE" });
      await refresh();
      setNotice("Produit supprimé.");
    } catch (e) {
      handleError(e);
    }
  }
  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const next = await api("settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setData({ ...data, settings: next });
      setNotice("Paramètres enregistrés.");
    } catch (e) {
      handleError(e);
    } finally {
      setSaving(false);
    }
  }
  function navigate(next) {
    setTab(next);
    setSearch("");
    setStatus("all");
    setNavOpen(false);
  }
  const start = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
  const orders = data.orders.filter(
    (o) => new Date(o.createdAt).getTime() >= start,
  );
  const delivered = orders.filter((o) => o.status === "delivered");
  const customers = Object.values(
    data.orders.reduce((map, o) => {
      const key = o.customer.phone.replace(/[^\d]/g, "");
      if (!map[key])
        map[key] = { ...o.customer, count: 0, total: 0, last: o.createdAt };
      map[key].count++;
      if (o.status === "delivered") map[key].total += o.total;
      return map;
    }, {}),
  );
  const orderList = orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      `${reference(o)} ${o.customer.name} ${o.customer.phone} ${o.customer.city}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const productList = data.products.filter((p) =>
    `${p.brand} ${p.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const tabs = [
    ["overview", "Vue d’ensemble", LayoutDashboard],
    ["orders", "Commandes & tickets", ShoppingBag],
    ["products", "Produits", Package],
    ["customers", "Clients", Users],
    ["settings", "Paramètres", Settings],
  ];
  if (!session)
    return <div className="admin-loading">Chargement de l’administration…</div>;
  if (!session.authenticated)
    return (
      <main className="admin-login">
        <div>
          <a href="/">
            <img src="/logo.png" alt="DecanteAssil" />
          </a>
          <span className="admin-eyebrow">ESPACE PRIVÉ</span>
          <h1>Bienvenue chez vous.</h1>
          <p>Connectez-vous pour gérer votre boutique et vos commandes.</p>
          <form onSubmit={login}>
            <label>
              Mot de passe administrateur
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={12}
                maxLength={512}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <div className="admin-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="admin-primary"
              disabled={loginBusy || !session.configured}
            >
              {loginBusy ? "Connexion…" : "Se connecter"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </form>
          {!session.configured && (
            <div className="admin-setup">
              <strong>Configuration Cloudflare nécessaire</strong>
              <p>
                La base D1 et les secrets ADMIN_PASSWORD (12 caractères minimum)
                et SESSION_SECRET (32 caractères minimum) doivent être
                configurés. Consultez ADMIN_SETUP.md dans le dépôt. Ne partagez
                aucun secret dans le chat.
              </p>
            </div>
          )}
          <a className="back-to-store" href="/">
            ← Retour à la boutique
          </a>
        </div>
      </main>
    );
  return (
    <div className="admin-root">
      <aside className={"admin-sidebar " + (navOpen ? "open" : "")}>
        <a className="admin-brand" href="/">
          <img src="/logo.png" alt="DecanteAssil" />
          <span>
            DECANTEASSIL<small>ADMINISTRATION</small>
          </span>
        </a>
        <nav>
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => navigate(key)}
            >
              <Icon size={19} />
              {label}
              {key === "orders" &&
                data.orders.some((o) => o.status === "pending") && (
                  <b>
                    {data.orders.filter((o) => o.status === "pending").length}
                  </b>
                )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer">
            Voir la boutique <ArrowUpRight size={16} />
          </a>
          <button onClick={logout}>
            <LogOut size={17} /> Déconnexion
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <button
              className="admin-nav-toggle"
              aria-label="Menu administration"
              onClick={() => setNavOpen(!navOpen)}
            >
              <Menu />
            </button>
            <span>Votre boutique, en un regard.</span>
          </div>
          <div>
            <span className="admin-live-dot" /> Administration privée
            <button
              aria-label="Actualiser les données"
              disabled={loading}
              onClick={refresh}
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">
                DECANTEASSIL · GESTION DE LA BOUTIQUE
              </span>
              <h1>{tabs.find((x) => x[0] === tab)?.[1]}</h1>
              <p>
                {tab === "orders"
                  ? "Suivez chaque demande, préparez son ticket et mettez à jour son statut."
                  : tab === "products"
                    ? "Vos parfums, vos prix, votre sélection."
                    : tab === "customers"
                      ? "Les coordonnées issues de vos demandes de commande."
                      : tab === "settings"
                        ? "Les liens et coordonnées affichés sur votre boutique."
                        : "Les chiffres de votre activité, sans perdre de vue l’essentiel."}
              </p>
            </div>
            {["overview", "orders"].includes(tab) && (
              <select
                aria-label="Période"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="all">Toute la période</option>
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
              </select>
            )}
          </div>
          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="admin-notice" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
          {loading && (
            <p className="admin-hint" role="status">
              Actualisation des données…
            </p>
          )}
          {tab === "overview" && (
            <>
              <div className="stat-grid">
                {[
                  [
                    ShoppingBag,
                    "Demandes de commande",
                    orders.length,
                    "Toutes les demandes enregistrées",
                  ],
                  [
                    Package,
                    "À préparer",
                    orders.filter((o) =>
                      ["pending", "confirmed"].includes(o.status),
                    ).length,
                    "Nouvelles et confirmées",
                  ],
                  [
                    Check,
                    "Montant des commandes livrées",
                    money(delivered.reduce((n, o) => n + o.total, 0)),
                    "Produits uniquement, hors livraison",
                  ],
                  [
                    Users,
                    "Clients",
                    customers.length,
                    "Clients de toute la période",
                  ],
                ].map(([Icon, label, value, hint]) => (
                  <article className="stat-card" key={label}>
                    <div>
                      <span>{label}</span>
                      <Icon size={19} />
                    </div>
                    <strong>{value}</strong>
                    <small>{hint}</small>
                  </article>
                ))}
              </div>
              <div className="admin-overview-grid">
                <section className="admin-panel">
                  <div className="panel-heading">
                    <h2>Les 7 derniers jours</h2>
                    <span>Demandes enregistrées</span>
                  </div>
                  <div className="order-chart">
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = new Date(Date.now() - (6 - i) * 86400000);
                      const dayKey = day.toLocaleDateString("en-CA", {
                        timeZone: "Africa/Casablanca",
                      });
                      const value = data.orders.filter(
                        (o) =>
                          new Date(o.createdAt).toLocaleDateString("en-CA", {
                            timeZone: "Africa/Casablanca",
                          }) === dayKey,
                      ).length;
                      const max = Math.max(
                        1,
                        ...Array.from(
                          { length: 7 },
                          (_, j) =>
                            data.orders.filter(
                              (o) =>
                                new Date(o.createdAt).toLocaleDateString(
                                  "en-CA",
                                  { timeZone: "Africa/Casablanca" },
                                ) ===
                                new Date(
                                  Date.now() - j * 86400000,
                                ).toLocaleDateString("en-CA", {
                                  timeZone: "Africa/Casablanca",
                                }),
                            ).length,
                        ),
                      );
                      return (
                        <div className="chart-column" key={dayKey}>
                          <span>{value}</span>
                          <div
                            style={{
                              height: Math.max(3, (value / max) * 110) + "px",
                            }}
                          />
                          <small>
                            {day.toLocaleDateString("fr-MA", {
                              weekday: "short",
                              timeZone: "Africa/Casablanca",
                            })}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="admin-panel">
                  <div className="panel-heading">
                    <h2>État des commandes</h2>
                  </div>
                  <div className="status-summary">
                    {Object.entries(STATUS).map(([key, label]) => (
                      <div key={key}>
                        <span className={"status-dot " + key} />
                        <span>{label}</span>
                        <strong>
                          {orders.filter((o) => o.status === key).length}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <section className="admin-panel">
                <div className="panel-heading">
                  <h2>Dernières commandes</h2>
                  <button onClick={() => navigate("orders")}>
                    Tout voir <ChevronRight size={15} />
                  </button>
                </div>
                {orders.length ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Commande</th>
                          <th>Client</th>
                          <th>Ville</th>
                          <th>Montant</th>
                          <th>Statut</th>
                          <th>Ticket</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 6).map((o) => (
                          <tr key={o.id}>
                            <td>
                              <button
                                className="order-link"
                                onClick={() => setDetail(o)}
                              >
                                {reference(o)}
                              </button>
                              <small>{date(o.createdAt)}</small>
                            </td>
                            <td>{o.customer.name}</td>
                            <td>{o.customer.city}</td>
                            <td>{money(o.total)}</td>
                            <td>
                              <span className={"status-badge " + o.status}>
                                {STATUS[o.status]}
                              </span>
                            </td>
                            <td>
                              <button
                                className="icon-action"
                                aria-label={"Imprimer " + reference(o)}
                                onClick={() => setTicket(o)}
                              >
                                <Printer size={17} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty text="Vos premières commandes apparaîtront ici." />
                )}
              </section>
              <p className="admin-hint">
                Une demande enregistrée ne confirme ni l’envoi du message
                WhatsApp ni le paiement. Les anciens échanges WhatsApp ne sont
                pas importés. Vue limitée aux 1 000 dernières demandes.
              </p>
            </>
          )}
          {tab === "orders" && (
            <>
              <div className="admin-toolbar">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Référence, client, téléphone, ville…"
                />
                <select
                  aria-label="Statut des commandes"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  {Object.entries(STATUS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  className="admin-secondary"
                  onClick={() =>
                    downloadCSV(
                      [
                        [
                          "Référence",
                          "Date",
                          "Nom",
                          "Téléphone",
                          "Ville",
                          "Adresse",
                          "Total produits (DH)",
                          "Statut",
                        ],
                        ...orderList.map((o) => [
                          reference(o),
                          date(o.createdAt),
                          o.customer.name,
                          o.customer.phone,
                          o.customer.city,
                          o.customer.address,
                          o.total,
                          STATUS[o.status],
                        ]),
                      ],
                      "decanteassil-commandes.csv",
                    )
                  }
                >
                  <Download size={16} /> Exporter CSV
                </button>
              </div>
              <section className="admin-panel">
                {orderList.length ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Commande</th>
                          <th>Client / Téléphone</th>
                          <th>Ville</th>
                          <th>Montant</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderList.map((o) => (
                          <tr key={o.id}>
                            <td>
                              <button
                                className="order-link"
                                onClick={() => setDetail(o)}
                              >
                                {reference(o)}
                              </button>
                              <small>{date(o.createdAt)}</small>
                            </td>
                            <td>
                              {o.customer.name}
                              <small>{o.customer.phone}</small>
                            </td>
                            <td>{o.customer.city}</td>
                            <td>{money(o.total)}</td>
                            <td>
                              <select
                                className={"status-select " + o.status}
                                disabled={updating === o.id}
                                aria-label={"Statut de " + reference(o)}
                                value={o.status}
                                onChange={(e) =>
                                  changeStatus(o, e.target.value)
                                }
                              >
                                {Object.entries(STATUS).map(([key, label]) => (
                                  <option key={key} value={key}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button onClick={() => setDetail(o)}>
                                  Détails
                                </button>
                                <button
                                  className="admin-secondary"
                                  onClick={() => setTicket(o)}
                                >
                                  <Printer size={15} /> Ticket
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty text="Aucune commande pour ces critères." />
                )}
              </section>
              <p className="admin-hint">
                Vue limitée aux 1 000 dernières demandes. Les tickets n’incluent
                pas de frais de livraison non confirmés.
              </p>
            </>
          )}
          {tab === "products" && (
            <>
              <div className="admin-toolbar">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Rechercher un parfum ou une marque…"
                />
                <button className="admin-primary" onClick={() => setEditor({})}>
                  <Plus size={17} /> Ajouter un produit
                </button>
              </div>
              <section className="admin-panel">
                {productList.length ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Catégorie</th>
                          <th>Prix</th>
                          <th>Disponibilité</th>
                          <th>Visibilité</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productList.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="admin-product-cell">
                                <img src={p.image} alt="" />
                                <div>
                                  <strong>{p.name}</strong>
                                  <small>{p.brand}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              {p.type === "niche"
                                ? "Parfum nishe"
                                : p.type === "full"
                                  ? "Flacon complet"
                                  : "Décant"}
                              <small>{p.gender}</small>
                            </td>
                            <td>
                              {money(p.price)}
                              <small>
                                {p.type === "full" ? "Flacon" : "10 ml"}
                              </small>
                            </td>
                            <td>
                              <span
                                className={
                                  "status-badge " +
                                  (p.inStock ? "delivered" : "cancelled")
                                }
                              >
                                {p.inStock ? "Disponible" : "Épuisé"}
                              </span>
                            </td>
                            <td>{p.active ? "Visible" : "Masqué"}</td>
                            <td>
                              <div className="row-actions">
                                <button onClick={() => setEditor(p)}>
                                  Modifier
                                </button>
                                <button
                                  className="danger-action"
                                  onClick={() => remove(p)}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty text="Aucun produit trouvé." />
                )}
              </section>
            </>
          )}
          {tab === "customers" && (
            <>
              <div className="admin-toolbar">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Rechercher un client…"
                />
              </div>
              <section className="admin-panel">
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Téléphone</th>
                        <th>Ville</th>
                        <th>Demandes</th>
                        <th>Total livré</th>
                        <th>Dernière demande</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers
                        .filter((c) =>
                          `${c.name} ${c.phone} ${c.city}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )
                        .map((c) => (
                          <tr key={c.phone}>
                            <td>{c.name}</td>
                            <td>{c.phone}</td>
                            <td>{c.city}</td>
                            <td>{c.count}</td>
                            <td>{money(c.total)}</td>
                            <td>{date(c.last)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!customers.length && (
                  <Empty text="Vos clients apparaîtront après les premières demandes." />
                )}
              </section>
              <p className="admin-hint">
                Clients regroupés par numéro de téléphone, sur les 1 000
                dernières demandes. Aucun suivi de lecture ou d’envoi de
                messages WhatsApp.
              </p>
            </>
          )}
          {tab === "settings" && settings && (
            <section className="admin-panel settings-panel">
              <h2>Coordonnées de la boutique</h2>
              <form onSubmit={saveSettings}>
                <label>
                  <Instagram size={17} /> Lien Instagram
                  <input
                    type="url"
                    placeholder="https://www.instagram.com/votrecompte/"
                    value={settings.instagram || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, instagram: e.target.value })
                    }
                  />
                </label>
                <label>
                  Numéro WhatsApp
                  <input
                    required
                    pattern="[0-9]{8,15}"
                    value={settings.whatsapp || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: e.target.value })
                    }
                  />
                  <small>
                    Indicatif pays inclus, chiffres uniquement. Exemple :
                    393509071813.
                  </small>
                </label>
                <button className="admin-primary" disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer les paramètres"}
                </button>
              </form>
              <div className="admin-setup">
                <strong>Accès administrateur</strong>
                <p>
                  Le mot de passe et la clé de session se changent dans
                  Cloudflare → Settings → Variables and Secrets. Modifier l’un
                  de ces secrets invalide les sessions existantes.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>
      {editor && (
        <ProductEditor
          product={editor}
          onClose={() => setEditor(null)}
          onSaved={refresh}
          onError={handleError}
        />
      )}
      {detail && (
        <div className="admin-modal-backdrop">
          <section
            className="admin-modal order-detail"
            role="dialog"
            aria-modal="true"
            aria-label={"Commande " + reference(detail)}
          >
            <div className="admin-modal-heading">
              <h2>{reference(detail)}</h2>
              <button
                aria-label="Fermer la commande"
                onClick={() => setDetail(null)}
              >
                <X />
              </button>
            </div>
            <p className="admin-hint">{date(detail.createdAt)}</p>
            <div className="detail-customer">
              <strong>{detail.customer.name}</strong>
              <p>{detail.customer.phone}</p>
              <p>{detail.customer.address}</p>
              <p>{detail.customer.city}</p>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((p, i) => (
                  <tr key={i}>
                    <td>
                      {p.brand} — {p.name}
                      <small>{p.size}</small>
                    </td>
                    <td>{p.qty}</td>
                    <td>{money(p.qty * p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="order-detail-total">
              <span>Total produits, hors livraison</span>
              <strong>{money(detail.total)}</strong>
            </div>
            <label>
              Statut
              <select
                value={detail.status}
                disabled={updating === detail.id}
                onChange={(e) => changeStatus(detail, e.target.value)}
              >
                {Object.entries(STATUS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="admin-primary"
              onClick={() => {
                setTicket(detail);
                setDetail(null);
              }}
            >
              <Printer size={17} /> Imprimer le ticket
            </button>
          </section>
        </div>
      )}
      {ticket && <Ticket order={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}
function Empty({ text }) {
  return (
    <div className="admin-empty">
      <ShoppingBag size={27} />
      <p>{text}</p>
    </div>
  );
}
function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="admin-search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
