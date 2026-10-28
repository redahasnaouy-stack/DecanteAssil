import { deliveryFee } from "../shared/delivery.js";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  ShoppingBag,
  ArrowRight,
  Minus,
  Plus,
  X,
  Menu,
  Check,
  MessageCircle,
  ShieldCheck,
  Truck,
  FlaskConical,
  Instagram,
} from "lucide-react";
import "./style.css";
const Admin = React.lazy(() => import("./Admin.jsx"));
const DEFAULT_PHONE = "393509071813";
const categories = [
  {
    name: "Decante homme",
    title: "Décants parfums homme",
    type: "decant",
    gender: "homme",
  },
  { name: "Parfum Nishe", title: "Décants parfums nishe", type: "niche" },
  {
    name: "Decante femme",
    title: "Décants parfums femme",
    type: "decant",
    gender: "femme",
  },
  {
    name: "Parfum complet homme",
    title: "Parfums complets homme",
    type: "full",
    gender: "homme",
  },
  {
    name: "Parfum complet femme",
    title: "Parfums complets femme",
    type: "full",
    gender: "femme",
  },
  { name: "Oud", title: "L’univers du Oud", type: "oud" },
];
const money = (n) => new Intl.NumberFormat("fr-MA").format(n) + " DH";
const descriptions = {
  1: "Un sillage floral et ambré, délicatement musqué. Une signature lumineuse à découvrir au quotidien.",
  2: "La lavande rencontre la fleur d’oranger et la douceur de la vanille. Un parfum au caractère libre et affirmé.",
  3: "Un accord marin et aromatique, accompagné d’un fond boisé. Une invitation à la fraîcheur et à l’évasion.",
  4: "Une rencontre chaleureuse entre la lavande, le miel et la vanille. Un sillage ambré, intense et enveloppant.",
  5: "Des notes de rhum, de vanille et de châtaigne. Une composition chaleureuse au caractère affirmé.",
  6: "La cardamome ouvre un cœur d’iris et de vanille. Une composition boisée, élégante et enveloppante.",
  7: "La douceur de la vanille et de la fève tonka, enveloppée d’ambre. Un parfum chaleureux et intense.",
  8: "Retrouvez les accords chaleureux de rhum, de vanille et de châtaigne dans un flacon complet.",
  9: "Un contraste de gingembre, de bois et de vanille. Un parfum intense au sillage séduisant.",
  10: "L’ananas et la bergamote rencontrent la mousse de chêne. Découvrez une signature de la parfumerie de niche.",
  11: "Le sillage floral, ambré et musqué de Prada Paradoxe, à retrouver en flacon complet.",
  12: "La lavande, la fleur d’oranger et la vanille de Libre, à retrouver en flacon complet.",
};
function readCart() {
  try {
    let data = JSON.parse(localStorage.getItem("da-cart"));
    return Array.isArray(data)
      ? data.filter(
          (p) =>
            p &&
            typeof p.key === "string" &&
            Number.isFinite(p.price) &&
            p.price > 0 &&
            Number.isInteger(p.qty) &&
            p.qty > 0,
        )
      : [];
  } catch {
    return [];
  }
}
function defaultFormat(p) {
  return p.type === "oud"
    ? p.format || "À l’unité"
    : p.type === "full"
      ? "Flacon complet"
      : "10 ml";
}
function singleFormat(p) {
  return p.type === "full" || p.type === "oud";
}
function getPrice(p, size) {
  if (p.type === "oud") return p.price;
  return size === "Flacon complet"
    ? p.fullPrice || p.price
    : size === "5 ml"
      ? Math.round(p.price * 0.58)
      : p.price;
}
function Modal({ className = "", label, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const element = ref.current;
    const controls = () =>
      [
        ...element.querySelectorAll(
          'button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]',
        ),
      ].filter((x) => x.getClientRects().length);
    controls()[0]?.focus();
    function keyboard(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        let nodes = controls();
        if (!nodes.length) return;
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0].focus();
        }
      }
    }
    element.addEventListener("keydown", keyboard);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.removeEventListener("keydown", keyboard);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div className={"backdrop " + className} onClick={onClose}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}
function ProductCard({ p, onAdd, onOpen }) {
  const [size, setSize] = useState(defaultFormat(p));
  return (
    <article className="product-card">
      <button
        className="product-image"
        aria-label={"Découvrir " + p.name}
        onClick={() => onOpen(p)}
      >
        <img src={p.image} alt={`${p.brand} — ${p.name}`} loading="lazy" />
        <span className="product-tag">{p.tag}</span>
      </button>
      <div className="card-body">
        <h3>
          <button onClick={() => onOpen(p)}>
            {p.brand} — {p.name}{" "}
            {singleFormat(p) ? "" : size.replace(" ", "").toUpperCase()}
          </button>
        </h3>
        <p className="description">
          {p.description || descriptions[p.id] || p.notes}
        </p>
        <div className="card-options">
          <span>{p.notes}</span>
          {!singleFormat(p) ? (
            <select
              aria-label={"Format de " + p.name}
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              <option>5 ml</option>
              <option>10 ml</option>
            </select>
          ) : (
            <span className="full-format">{defaultFormat(p)}</span>
          )}
        </div>
        <div className="card-actions">
          <strong className="price-pill">{money(getPrice(p, size))}</strong>
          <button
            className="gold-button"
            disabled={p.inStock === false}
            onClick={() => onAdd(p, size)}
          >
            {p.inStock === false ? "Épuisé" : "Ajouter au panier"}
          </button>
        </div>
      </div>
    </article>
  );
}
function App() {
  const [store, setStore] = useState({
    instagram: "https://www.instagram.com/elabbari10/",
    whatsapp: DEFAULT_PHONE,
  });
  const [ordersEnabled, setOrdersEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [website, setWebsite] = useState("");
  const [orderLink, setOrderLink] = useState("");
  const orderRequest = useRef(null);
  const PHONE = store.whatsapp || DEFAULT_PHONE;
  const [products, setProducts] = useState([]),
    [catalogError, setCatalogError] = useState(false),
    [category, setCategory] = useState("Tous les parfums"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("featured"),
    [menuOpen, setMenuOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [cart, setCart] = useState(readCart),
    [selected, setSelected] = useState(null),
    [detailSize, setDetailSize] = useState("10 ml"),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      name: "",
      phone: "",
      city: "",
      address: "",
      cityOption: "other",
    });
  useEffect(() => {
    async function loadJSON(api, fallback) {
      let response = await fetch(api);
      if (
        response.status === 404 ||
        !(response.headers.get("content-type") || "").includes(
          "application/json",
        )
      )
        response = await fetch(fallback);
      if (!response.ok) throw Error();
      return response.json();
    }
    loadJSON("/api/products", "/catalog.json")
      .then(setProducts)
      .catch(() => setCatalogError(true));
    loadJSON("/api/store", "/store.json")
      .then((data) => {
        setStore(data.settings || data);
        setOrdersEnabled(!!data.ordersEnabled);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("da-cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);
  useEffect(() => {
    if (toast) {
      let timer = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const count = cart.reduce((n, p) => n + p.qty, 0),
    total = cart.reduce((n, p) => n + p.qty * p.price, 0);
  const shipping = cart.length
    ? deliveryFee(form.cityOption === "casablanca" ? "Casablanca" : form.city)
    : 0;
  const grandTotal = Math.round((total + shipping) * 100) / 100;
  function collection(c = "Tous les parfums") {
    setCategory(c);
    setMenuOpen(false);
    requestAnimationFrame(() =>
      document
        .getElementById("produits")
        ?.scrollIntoView({ behavior: "smooth" }),
    );
  }
  function add(p, size) {
    const key = p.id + "-" + size;
    setCart((old) =>
      old.some((x) => x.key === key)
        ? old.map((x) => (x.key === key ? { ...x, qty: x.qty + 1 } : x))
        : [...old, { ...p, key, size, qty: 1, price: getPrice(p, size) }],
    );
    setToast(`${p.name} · ${size} ajouté au panier`);
  }
  function quantity(key, delta) {
    setCart((old) =>
      old
        .map((p) => (p.key === key ? { ...p, qty: p.qty + delta } : p))
        .filter((p) => p.qty > 0),
    );
  }
  function openProduct(p) {
    setDetailSize(defaultFormat(p));
    setSelected(p);
  }
  async function order(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setOrderLink("");
    if (!cart.length) {
      setError("Ajoutez au moins un parfum à votre panier.");
      return;
    }
    if (!form.name.trim() || !form.address.trim()) {
      setError("Merci de compléter votre nom et votre adresse.");
      return;
    }
    if (!/^[+\d\s().-]{8,20}$/.test(form.phone.trim())) {
      setError("Veuillez saisir un numéro de téléphone valide.");
      return;
    }
    const city =
      form.cityOption === "casablanca" ? "Casablanca" : form.city.trim();
    if (!city) {
      setError("Veuillez préciser votre ville.");
      return;
    }
    let items = cart,
      finalTotal = total,
      finalShipping = deliveryFee(city),
      reference = "";
    setSubmitting(true);
    try {
      if (ordersEnabled) {
        const payload = {
          name: form.name.trim(),
          phone: form.phone.trim(),
          city,
          address: form.address.trim(),
          items: cart.map((p) => ({ id: p.id, size: p.size, qty: p.qty })),
          website,
        };
        const fingerprint = JSON.stringify(payload);
        if (orderRequest.current?.fingerprint !== fingerprint)
          orderRequest.current = { fingerprint, key: crypto.randomUUID() };
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            requestKey: orderRequest.current.key,
          }),
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(
            result.error ||
              "Impossible d’enregistrer la commande. Réessayez ou contactez-nous sur WhatsApp.",
          );
        items = result.items;
        finalTotal = result.total;
        finalShipping = result.shippingFee ?? deliveryFee(city);
        reference = "DA-" + result.id.slice(0, 8).toUpperCase();
        setCart((old) =>
          old.map((p) => {
            const item = items.find(
              (i) => String(i.id) === String(p.id) && i.size === p.size,
            );
            return item ? { ...p, price: item.price } : p;
          }),
        );
      }
      const message = `Bonjour DecanteAssil ✨${reference ? "\nCommande : " + reference : ""}\nJe souhaite commander :\n\n${items.map((p) => `• ${p.brand} — ${p.name}\n  ${p.size} × ${p.qty} : ${money(p.price * p.qty)}`).join("\n")}\n\nSous-total indicatif : ${money(finalTotal)}\nLivraison : ${money(finalShipping)}\nTotal avec livraison : ${money(Math.round((finalTotal + finalShipping) * 100) / 100)}\nPrix et disponibilité à confirmer.\n\nNom : ${form.name.trim()}\nTéléphone : ${form.phone.trim()}\nVille : ${city}\nAdresse : ${form.address.trim()}\n\nMerci de confirmer ma commande et le montant final.`;
      const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
      setOrderLink(url);
      window.open(url, "_blank", "noopener,noreferrer");
      setToast(
        reference
          ? `Demande ${reference} enregistrée. Envoyez le message WhatsApp pour la confirmer avec nous.`
          : "Votre message est prêt. Envoyez-le dans WhatsApp pour transmettre votre demande.",
      );
    } catch (err) {
      setError(
        err.message || "Service indisponible. Réessayez dans un instant.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  let filtered = products.filter((p) =>
    `${p.name} ${p.brand} ${p.notes}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  let groups = categories
    .filter((c) => category === "Tous les parfums" || category === c.name)
    .map((c) => ({
      ...c,
      products: filtered
        .filter(
          (p) =>
            p.type === c.type &&
            (!c.gender || p.gender === c.gender || p.gender === "mixte"),
        )
        .sort((a, b) =>
          sort === "asc"
            ? a.price - b.price
            : sort === "desc"
              ? b.price - a.price
              : 0,
        ),
    }));
  let visibleCount = new Set(groups.flatMap((g) => g.products.map((p) => p.id)))
    .size;
  return (
    <>
      <div className="announcement">
        <div>
          {[0, 1, 2].map((n) => (
            <span key={n}>
              PARFUMS ORIGINAUX · DÉCANTS & FLACONS · LIVRAISON AU MAROC ·
              DECANTEASSIL <b>✦</b>
            </span>
          ))}
        </div>
      </div>
      <div className="hero-wrap">
        <header>
          <button
            className="header-icon"
            aria-label="Ouvrir le menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={30} strokeWidth={1.4} />
          </button>
          <a
            className="brand"
            href="#accueil"
            aria-label="DecanteAssil, accueil"
          >
            <img src="/logo.png" alt="DecanteAssil — Parfums originaux" />
          </a>
          <div className="header-actions">
            <button
              className="header-icon"
              aria-label="Rechercher un parfum"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={27} strokeWidth={1.4} />
            </button>
            <button
              className="header-icon header-bag"
              aria-label={`Ouvrir le panier, ${count} articles`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={27} strokeWidth={1.4} />
              <span>{count}</span>
            </button>
          </div>
        </header>
        <section className="hero" id="accueil">
          <div className="hero-copy">
            <span className="eyebrow">VOTRE SIGNATURE, NOTRE PASSION</span>
            <h1>
              Découvrez
              <br />
              <em>l’univers</em> DecanteAssil
            </h1>
            <div className="gold-rule" />
            <p>
              Les plus belles émotions commencent par un parfum. Découvrez notre
              sélection de <strong>décants et parfums originaux</strong>, pour
              homme et femme, et explorez les créations des{" "}
              <strong>grandes maisons et de la parfumerie de niche.</strong>
            </p>
            <button className="hero-button" onClick={() => collection()}>
              DÉCOUVREZ NOS PARFUMS DESIGNER & DE NICHE <ArrowRight size={17} />
            </button>
          </div>
          <div className="hero-scene">
            <img
              src="/hero-perfume.png"
              alt="Jean Paul Gaultier Le Male Elixir et son décant 10 ml"
            />
            <span className="scene-caption">
              UN SILLAGE. UNE ÉMOTION. VOTRE SIGNATURE.
            </span>
          </div>
        </section>
      </div>
      <main>
        <section className="catalog" id="produits">
          <h2 className="ornate-title">
            {category === "Tous les parfums" ? "Tous les parfums" : category}
          </h2>
          <div className="ornament">
            <span />◆<span />
          </div>
          <div className="category-tabs" aria-label="Catégories de parfums">
            {["Tous les parfums", ...categories.map((c) => c.name)].map((c) => (
              <button
                className={category === c ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="catalog-tools">
            <span className="meta-pill">{visibleCount} produits</span>
            <div>
              <label className="sort-label">
                <span className="sr-only">Trier les parfums</span>
                <select
                  aria-label="Trier les parfums"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="featured">Notre sélection</option>
                  <option value="asc">Prix croissant</option>
                  <option value="desc">Prix décroissant</option>
                </select>
              </label>
              <span className="meta-pill">Prix en DH</span>
            </div>
          </div>
          {search && (
            <div className="search-results">
              Recherche : « {search} »{" "}
              <button onClick={() => setSearch("")}>
                Effacer <X size={14} />
              </button>
            </div>
          )}
          {catalogError ? (
            <div className="empty">
              <h3>Le catalogue n’a pas pu être chargé.</h3>
              <button className="gold-button" onClick={() => location.reload()}>
                Réessayer
              </button>
            </div>
          ) : (
            groups
              .filter((g) => g.products.length)
              .map((g) => (
                <section className="product-section" key={g.name}>
                  <h2 className="group-title">{g.title}</h2>
                  <div className="ornament">
                    <span />◆<span />
                  </div>
                  <div className="product-grid">
                    {g.products.map((p) => (
                      <ProductCard
                        p={p}
                        key={p.id}
                        onAdd={add}
                        onOpen={openProduct}
                      />
                    ))}
                  </div>
                </section>
              ))
          )}
          {!catalogError && products.length > 0 && !visibleCount && (
            <div className="empty">
              <h3>Aucun parfum trouvé</h3>
              <p>Essayez un autre nom ou découvrez toute la collection.</p>
              <button
                className="gold-button"
                onClick={() => {
                  setCategory("Tous les parfums");
                  setSearch("");
                }}
              >
                Voir tous les parfums
              </button>
            </div>
          )}
          <p className="price-note">
            Prix de lancement indicatifs, à confirmer avant validation. Les
            décants sont des conditionnements indépendants ; les visuels
            montrent les flacons d’origine. Contenance des flacons complets à
            confirmer. Livraison : 20 DH à Casablanca et 35 DH dans les autres
            villes.
          </p>
        </section>
        <section className="why-us" id="maison">
          <span className="eyebrow">LA MAISON DECANTEASSIL</span>
          <h2>
            Le plaisir du parfum,
            <br />
            <em>dans le format qui vous ressemble.</em>
          </h2>
          <p>
            Découvrez une fragrance, changez de sillage ou retrouvez votre
            parfum préféré.
            <br />
            Notre sélection vous accompagne dans chaque nouvelle découverte.
          </p>
          <div className="benefits">
            <div>
              <FlaskConical />
              <h3>Décants & flacons</h3>
              <p>Votre parfum, votre format.</p>
            </div>
            <div>
              <Truck />
              <h3>Livraison au Maroc</h3>
              <p>Modalités confirmées à la commande.</p>
            </div>
            <div>
              <MessageCircle />
              <h3>Un conseil personnel</h3>
              <p>Échangez avec nous sur WhatsApp.</p>
            </div>
          </div>
          <a
            className="gold-button contact-button"
            href={`https://wa.me/${PHONE}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> Parlons parfum
          </a>
        </section>
      </main>
      {store.instagram && (
        <section className="instagram-section">
          <Instagram size={31} />
          <span className="eyebrow">LE PARFUM SE PARTAGE</span>
          <h2>
            Retrouvez-nous sur <em>Instagram.</em>
          </h2>
          <p>Nos découvertes, nos nouveautés et l’univers DecanteAssil.</p>
          <a
            className="gold-button"
            href={store.instagram}
            target="_blank"
            rel="noreferrer"
          >
            <Instagram size={17} /> @
            {new URL(store.instagram).pathname.split("/").filter(Boolean)[0]}{" "}
            <ArrowRight size={16} />
          </a>
        </section>
      )}
      <footer>
        <a className="footer-logo" href="#accueil">
          <img src="/logo.png" alt="DecanteAssil" />
        </a>
        <p>Décants signature & parfums originaux</p>
        <div className="footer-links">
          <button onClick={() => collection()}>La collection</button>
          <a href="#maison">Notre maison</a>
          {store.instagram && (
            <a href={store.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
          )}
          <a href="/admin">Administration</a>
          <a href={`https://wa.me/${PHONE}`} target="_blank" rel="noreferrer">
            Contact WhatsApp
          </a>
        </div>
        <small>
          © {new Date().getFullYear()} DecanteAssil · Tous droits réservés.
        </small>
      </footer>
      <button
        className="floating-cart"
        aria-label={`Panier flottant, ${count} articles`}
        onClick={() => setCartOpen(true)}
      >
        <ShoppingBag size={25} />
        <span>{count}</span>
      </button>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {menuOpen && (
        <Modal
          className="menu-backdrop"
          label="Menu principal"
          onClose={() => setMenuOpen(false)}
        >
          <div className="dialog-heading">
            <span>La collection</span>
            <button
              aria-label="Fermer le menu"
              onClick={() => setMenuOpen(false)}
            >
              <X />
            </button>
          </div>
          <a
            className="menu-logo"
            href="#accueil"
            onClick={() => setMenuOpen(false)}
          >
            <img src="/logo.png" alt="DecanteAssil" />
          </a>
          <nav>
            {["Tous les parfums", ...categories.map((c) => c.name)].map((c) => (
              <button key={c} onClick={() => collection(c)}>
                {c}
                <ArrowRight size={16} />
              </button>
            ))}
          </nav>
          <a
            className="menu-contact"
            href={`https://wa.me/${PHONE}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> Besoin d’un conseil ?
          </a>
        </Modal>
      )}
      {searchOpen && (
        <Modal
          className="search-backdrop"
          label="Rechercher un parfum"
          onClose={() => setSearchOpen(false)}
        >
          <div className="dialog-heading">
            <span>Trouvez votre parfum</span>
            <button
              aria-label="Fermer la recherche"
              onClick={() => setSearchOpen(false)}
            >
              <X />
            </button>
          </div>
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchOpen(false);
              collection();
            }}
          >
            <label htmlFor="search-input">
              Un parfum, une maison, une note…
            </label>
            <div>
              <Search size={20} />
              <input
                id="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ex. Le Male, Prada, vanille"
              />
              <button type="submit" className="gold-button">
                Rechercher
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          className="product-backdrop"
          label={selected.name}
          onClose={() => setSelected(null)}
        >
          <button
            className="close"
            aria-label="Fermer la fiche produit"
            onClick={() => setSelected(null)}
          >
            <X />
          </button>
          <div className="detail-image">
            <img src={selected.image} alt={selected.name} />
          </div>
          <div className="detail-body">
            <span className="eyebrow">{selected.brand}</span>
            <h2>{selected.name}</h2>
            <p>
              {selected.description ||
                descriptions[selected.id] ||
                selected.notes}
            </p>
            <span className="detail-notes">{selected.notes}</span>
            <label htmlFor="detail-size">Choisir le format</label>
            <select
              id="detail-size"
              value={detailSize}
              onChange={(e) => setDetailSize(e.target.value)}
            >
              {(singleFormat(selected)
                ? [defaultFormat(selected)]
                : [
                    "5 ml",
                    "10 ml",
                    ...(selected.fullPrice ? ["Flacon complet"] : []),
                  ]
              ).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <strong className="detail-price">
              {money(getPrice(selected, detailSize))}
            </strong>
            <small>
              Prix indicatif.{" "}
              {selected.type === "oud"
                ? "Format : " +
                  defaultFormat(selected) +
                  ". Disponibilité à confirmer."
                : detailSize === "Flacon complet"
                  ? "Contenance et disponibilité à confirmer."
                  : "Décant indépendant du flacon original."}
            </small>
            <button
              className="gold-button"
              disabled={selected.inStock === false}
              onClick={() => {
                add(selected, detailSize);
                setSelected(null);
              }}
            >
              Ajouter au panier <ShoppingBag size={18} />
            </button>
          </div>
        </Modal>
      )}
      {cartOpen && (
        <Modal
          className="cart-backdrop"
          label="Votre panier et commande"
          onClose={() => setCartOpen(false)}
        >
          <div className="dialog-heading">
            <span>
              Panier <small>({count})</small>
            </span>
            <button
              aria-label="Fermer le panier"
              onClick={() => setCartOpen(false)}
            >
              <X />
            </button>
          </div>
          <div className="cart-scroll">
            <p className="delivery-note">
              Livraison : 20 DH à Casablanca · 35 DH dans les autres villes.
            </p>
            {cart.length ? (
              <div className="cart-items">
                {cart.map((p) => (
                  <div className="cart-item" key={p.key}>
                    <img src={p.image} alt={p.name} />
                    <div>
                      <span>{p.brand}</span>
                      <h3>{p.name}</h3>
                      <small>{p.size}</small>
                      <div className="quantity">
                        <button
                          aria-label={"Diminuer " + p.name}
                          onClick={() => quantity(p.key, -1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{p.qty}</span>
                        <button
                          aria-label={"Augmenter " + p.name}
                          onClick={() => quantity(p.key, 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-price">
                      <button
                        aria-label={"Retirer " + p.name}
                        onClick={() =>
                          setCart(cart.filter((x) => x.key !== p.key))
                        }
                      >
                        <X size={15} />
                      </button>
                      <strong>{money(p.price * p.qty)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-cart">
                <ShoppingBag size={33} />
                <p>Votre panier attend sa première fragrance.</p>
                <button
                  className="text-button"
                  onClick={() => {
                    setCartOpen(false);
                    collection();
                  }}
                >
                  Découvrir nos parfums <ArrowRight size={15} />
                </button>
              </div>
            )}
            <div className="cart-total">
              <strong>Sous-total</strong>
              <strong>{money(total)}</strong>
            </div>
            <form onSubmit={order} className="checkout-form">
              <label className="field">
                Nom complet
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="field">
                Numéro de téléphone
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={20}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <fieldset>
                <legend>Ville de livraison — choisissez une option</legend>
                <div className="city-options">
                  <label
                    className={form.cityOption === "casablanca" ? "chosen" : ""}
                  >
                    <input
                      type="radio"
                      name="cityOption"
                      checked={form.cityOption === "casablanca"}
                      onChange={() =>
                        setForm({ ...form, cityOption: "casablanca" })
                      }
                    />
                    Casablanca (+20 DH)
                  </label>
                  <label
                    className={form.cityOption === "other" ? "chosen" : ""}
                  >
                    <input
                      type="radio"
                      name="cityOption"
                      checked={form.cityOption === "other"}
                      onChange={() => setForm({ ...form, cityOption: "other" })}
                    />
                    Autre ville (+35 DH)
                  </label>
                </div>
              </fieldset>
              {form.cityOption === "other" && (
                <label className="field">
                  Précisez votre ville
                  <input
                    name="city"
                    autoComplete="address-level2"
                    required
                    placeholder="Précisez votre ville"
                    maxLength={100}
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </label>
              )}
              <label className="field">
                Adresse de livraison
                <textarea
                  name="address"
                  autoComplete="street-address"
                  required
                  maxLength={500}
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </label>
              <div className="delivery-summary" aria-live="polite">
                <div>
                  <span>Frais de livraison</span>
                  <strong>{money(shipping)}</strong>
                </div>
                <div className="grand-total">
                  <strong>Total avec livraison</strong>
                  <strong>{money(grandTotal)}</strong>
                </div>
              </div>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="gold-button order-button"
                disabled={!cart.length || submitting}
              >
                {submitting ? "Enregistrement…" : "Commander sur WhatsApp"}{" "}
                <MessageCircle size={18} />
              </button>
              <label className="order-honeypot" aria-hidden="true">
                Site web
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
              {orderLink && (
                <a
                  className="whatsapp-reopen"
                  href={orderLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir le message WhatsApp <ArrowRight size={15} />
                </a>
              )}
              <p className="privacy">
                <ShieldCheck size={14} />{" "}
                {ordersEnabled
                  ? "Vos coordonnées sont enregistrées pour le traitement et la livraison de votre demande. "
                  : "Vos coordonnées servent à préparer votre message. "}{" "}
                Envoyez le message WhatsApp pour échanger avec notre équipe.
                Aucun paiement n’est prélevé sur ce site.
              </p>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(
  location.pathname === "/admin" || location.pathname.startsWith("/admin/") ? (
    <React.Suspense fallback={<p>Chargement…</p>}>
      <Admin />
    </React.Suspense>
  ) : (
    <App />
  ),
);
