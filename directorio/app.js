/* Directorio de comercios — PWA estática, sin dependencias. */
const ZONES = [
  "Aparicio Saravia",
  "El General",
  "Real de San Carlos → ANCAP",
  "Rambla y Centro",
];
const RV = "https://search.google.com/local/writereview?placeid=";
const STUDIO = "https://tocamaderanfc.github.io/herramientas/falconburnstudio.html";
const PAGE = 24;

function fold(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function isHttp(s) {
  return /^https?:\/\//i.test(String(s).trim());
}
function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

const SHOPS = D.map((s) => Object.assign({}, s, { q: fold(s.n + " " + s.r) }));

const store = readJson("soc", {}) || {};
const rej = readJson("rej", {}) || {};
const customUrls = readJson("custom_urls", {}) || {};
const ui = readJson("colonia_ui", {}) || {};

let mode = ui.mode === "social" || ui.mode === "reviews" ? ui.mode : "reviews";
let zone = typeof ui.zone === "string" ? ui.zone : "";
let hideRejected = !!ui.hide;
let onlySaved = !!ui.onlySaved;
let dark = ui.theme === "dark";
let installHidden = !!ui.installHidden;
let query = "";
let limit = PAGE;
let editing = null;
let toastTimer = 0;
let installOpen = true;
let canInstall = false;
let nativePrompt = null;

function saveUi() {
  writeJson("colonia_ui", {
    mode,
    zone,
    hide: hideRejected,
    onlySaved,
    theme: dark ? "dark" : "light",
    installHidden,
  });
}
function saveStore() {
  writeJson("soc", store);
}
function saveRej() {
  writeJson("rej", rej);
}
function saveUrls() {
  writeJson("custom_urls", customUrls);
}

function reviewUrl(id) {
  const custom = customUrls[id];
  if (typeof custom === "string" && isHttp(custom)) return custom.trim();
  return RV + id;
}
function plaqueUrl(name, url) {
  return STUDIO + "?" + new URLSearchParams({ name, url });
}
function mapsUrl(shop) {
  return (
    "https://www.google.com/maps/search/?" +
    new URLSearchParams({
      api: "1",
      query: shop.n + " Colonia del Sacramento",
      query_place_id: shop.id,
    })
  );
}
function webSearch(name, network) {
  const q = '"' + name + '" Colonia del Sacramento ' + network;
  return "https://www.google.com/search?q=" + encodeURIComponent(q.trim());
}

function $(id) {
  return document.getElementById(id);
}
function el(tag, attrs) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const key in attrs) {
      const val = attrs[key];
      if (val == null || val === false) continue;
      if (key === "text") node.textContent = val;
      else if (key === "class") node.className = val;
      else if (key.startsWith("on") && typeof val === "function") node.addEventListener(key.slice(2), val);
      else if (val === true) node.setAttribute(key, "");
      else node.setAttribute(key, String(val));
    }
  }
  for (let i = 2; i < arguments.length; i++) {
    const child = arguments[i];
    if (child) node.appendChild(child);
  }
  return node;
}
function safeHref(url) {
  return isHttp(url) ? url.trim() : "";
}

function applyTheme() {
  document.documentElement.classList.toggle("dark", dark);
  $("iconMoon").toggleAttribute("hidden", dark);
  $("iconSun").toggleAttribute("hidden", !dark);
  $("themeBtn").setAttribute("aria-label", dark ? "Tema claro" : "Tema oscuro");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#14181a" : "#1b4a58");
}

function standalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}
function deviceKind() {
  const ua = navigator.userAgent;
  const iPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || iPad) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function notify(msg) {
  const box = $("toast");
  box.textContent = msg;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    box.hidden = true;
  }, 1600);
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) {}
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
  document.body.appendChild(area);
  area.focus({ preventScroll: true });
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

function setMode(next) {
  mode = next;
  $("tabReviews").classList.toggle("on", mode === "reviews");
  $("tabSocial").classList.toggle("on", mode === "social");
  $("tabReviews").setAttribute("aria-selected", String(mode === "reviews"));
  $("tabSocial").setAttribute("aria-selected", String(mode === "social"));
  $("onlySaved").hidden = mode !== "social";
  $("note").textContent =
    mode === "reviews"
      ? "Copiá el link de reseña de Google o abrilo directo. Lo que marques queda en este celular."
      : "Buscá el perfil, pegá el link verificado y queda guardado en este celular.";
  saveUi();
  resetList();
}

function filtered() {
  const needle = fold(query);
  const out = [];
  for (const name of ZONES) {
    if (zone && zone !== name) continue;
    const items = SHOPS.filter((shop) => {
      if (shop.z !== name) return false;
      if (needle && !shop.q.includes(needle)) return false;
      if (hideRejected && rej[shop.id]) return false;
      if (mode === "social" && onlySaved && !store[shop.id]) return false;
      return true;
    });
    if (!items.length) continue;
    out.push({ kind: "zone", zone: name, count: items.length });
    for (const shop of items) out.push({ kind: "shop", shop });
  }
  return out;
}

function btn(label, className, onClick, href) {
  if (href) {
    const a = el("a", { class: "btn" + (className ? " " + className : ""), text: label, rel: "noopener noreferrer", target: "_blank" });
    const safe = safeHref(href);
    if (safe) a.href = safe;
    else {
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
    }
    return a;
  }
  return el("button", { type: "button", class: "btn" + (className ? " " + className : ""), text: label, onclick: onClick });
}

function shopCard(shop) {
  const rejected = !!rej[shop.id];
  const custom = !!customUrls[shop.id];
  const url = reviewUrl(shop.id);
  const saved = store[shop.id] || "";
  const card = el("article", { class: "item" + (rejected ? " rej" : "") });
  const hd = el("div", { class: "hd" }, el("h3", { text: shop.n }));
  if (rejected) hd.appendChild(el("span", { class: "tag", text: "Rechazado" }));
  card.appendChild(hd);
  card.appendChild(el("p", { class: "rub", text: shop.r }));

  if (mode === "reviews") {
    const urlLine = el("p", { class: "url", title: url, text: (custom ? "Link editado · " : "") + url });
    card.appendChild(urlLine);
    const grid = el("div", { class: "grid" });
    grid.appendChild(btn("Reseña", "ac", null, url));
    grid.appendChild(
      btn("Copiar", "", () =>
        copyText(url)
          .then(() => notify("Copiado"))
          .catch(() => notify("No se pudo copiar"))
      )
    );
    grid.appendChild(btn("Mapa", "", null, mapsUrl(shop)));
    grid.appendChild(btn("Editar", "", () => openEditor(shop)));
    grid.appendChild(btn("Crear placa", "ok", null, plaqueUrl(shop.n, url)));
    const rejBtn = btn(rejected ? "Restaurar" : "Rechazar", "danger" + (rejected ? " on" : ""), () => toggleRej(shop.id));
    grid.appendChild(rejBtn);
    card.appendChild(grid);
  } else {
    const grid = el("div", { class: "grid three" });
    grid.appendChild(btn("Instagram", "", null, webSearch(shop.n, "instagram")));
    grid.appendChild(btn("Facebook", "", null, webSearch(shop.n, "facebook")));
    grid.appendChild(btn("Web", "", null, webSearch(shop.n, "")));
    card.appendChild(grid);
    if (saved) {
      card.appendChild(el("p", { class: "linktxt", title: saved, text: saved }));
      const g2 = el("div", { class: "grid three" });
      g2.appendChild(btn("Abrir", "ac", null, saved));
      g2.appendChild(
        btn("Copiar", "", () =>
          copyText(saved)
            .then(() => notify("Copiado"))
            .catch(() => notify("No se pudo copiar"))
        )
      );
      g2.appendChild(btn("Quitar", "danger", () => removeSocial(shop.id)));
      card.appendChild(g2);
    } else {
      const form = el("form", { class: "sv" });
      const input = el("input", {
        type: "url",
        inputmode: "url",
        placeholder: "Pegá el link verificado",
        "aria-label": "Link de " + shop.n,
      });
      const saveBtn = el("button", { type: "submit", class: "btn ac", text: "Guardar" });
      form.appendChild(input);
      form.appendChild(saveBtn);
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        saveSocial(shop.id, input.value);
      });
      card.appendChild(form);
    }
    card.appendChild(
      el("button", {
        type: "button",
        class: "textbtn",
        text: rejected ? "Quitar rechazo" : "Marcar rechazado",
        onclick: () => toggleRej(shop.id),
      })
    );
  }
  return card;
}

function renderCount(shown) {
  const total = SHOPS.length;
  const nRej = Object.keys(rej).length;
  const nSoc = Object.keys(store).length;
  let text =
    shown === total
      ? total.toLocaleString("es-UY") + " comercios · 4 zonas"
      : shown.toLocaleString("es-UY") + " de " + total.toLocaleString("es-UY");
  if (nRej) text += " · " + nRej + " rechazados";
  if (nSoc) text += " · " + nSoc + " redes";
  $("count").textContent = text;
}

function renderChips() {
  const box = $("chips");
  box.replaceChildren();
  const all = el("button", {
    type: "button",
    class: "chip" + (zone === "" ? " on" : ""),
    text: "Todas",
    onclick: () => {
      zone = "";
      saveUi();
      resetList();
    },
  });
  box.appendChild(all);
  for (const name of ZONES) {
    box.appendChild(
      el("button", {
        type: "button",
        class: "chip" + (zone === name ? " on" : ""),
        text: name,
        onclick: () => {
          zone = name;
          saveUi();
          resetList();
        },
      })
    );
  }
  $("hideRej").classList.toggle("on", hideRejected);
  $("onlySaved").classList.toggle("on", onlySaved);
}

function renderList() {
  const rows = filtered();
  const shopCount = rows.filter((r) => r.kind === "shop").length;
  renderCount(shopCount);
  const visible = rows.slice(0, limit);
  const list = $("list");
  list.replaceChildren();
  if (!visible.length) {
    list.appendChild(
      el(
        "div",
        { class: "empty" },
        el("p", { text: "Sin resultados" }),
        el("p", { class: "m", text: "Probá con otro nombre, rubro o zona." })
      )
    );
  } else {
    for (const row of visible) {
      if (row.kind === "zone") {
        list.appendChild(el("h2", { class: "zh" }, el("span", { text: row.zone }), el("small", { text: String(row.count) })));
      } else {
        list.appendChild(shopCard(row.shop));
      }
    }
  }
  $("sentinel").hidden = limit >= rows.length;
}

function resetList() {
  limit = PAGE;
  renderChips();
  renderList();
}

function toggleRej(id) {
  if (rej[id]) delete rej[id];
  else rej[id] = 1;
  saveRej();
  renderList();
}
function saveSocial(id, value) {
  const link = String(value).trim();
  if (!isHttp(link)) {
    notify("El link tiene que empezar con http");
    return false;
  }
  store[id] = link;
  saveStore();
  notify("Link guardado en este celular");
  renderList();
  return true;
}
function removeSocial(id) {
  delete store[id];
  saveStore();
  renderList();
}

function openEditor(shop) {
  editing = shop;
  $("editWho").textContent = shop.n;
  $("editUrl").value = reviewUrl(shop.id);
  $("editErr").hidden = true;
  $("editErr").textContent = "";
  $("editDlg").showModal();
  $("editUrl").focus();
}
function closeEditor() {
  editing = null;
  $("editDlg").close();
}
function saveDraft() {
  if (!editing) return;
  const value = $("editUrl").value.trim();
  if (value && !isHttp(value)) {
    $("editErr").textContent = "Pegá una URL que empiece con http:// o https://";
    $("editErr").hidden = false;
    return;
  }
  if (!value || value === RV + editing.id) delete customUrls[editing.id];
  else customUrls[editing.id] = value;
  saveUrls();
  closeEditor();
  notify("Link actualizado");
  renderList();
}

function renderInstallSteps() {
  const kind = deviceKind();
  const box = $("installSteps");
  box.replaceChildren();
  if (kind !== "android") {
    const ol = el("ol");
    ol.appendChild(el("li", { text: "Tocá Compartir en Safari (el cuadrado con la flecha)." }));
    ol.appendChild(el("li", { text: "Elegí Agregar a inicio." }));
    ol.appendChild(el("li", { text: "Confirmá. Después abrila desde el ícono." }));
    box.appendChild(el("p", { text: "iPhone", style: "font-weight:600;color:var(--fg);margin:10px 0 0" }));
    // style via setAttribute is ok (not user input). el() will set style attribute.
    box.lastChild.style.fontWeight = "600";
    box.lastChild.style.color = "var(--fg)";
    box.lastChild.style.margin = "10px 0 0";
    box.appendChild(ol);
  }
  if (kind !== "ios") {
    const ol = el("ol");
    ol.appendChild(el("li", { text: "En Chrome, abrí el menú de los tres puntos." }));
    ol.appendChild(el("li", { text: "Tocá Instalar app o Agregar a pantalla principal." }));
    ol.appendChild(el("li", { text: "Abrila desde el ícono, como cualquier app." }));
    const label = el("p", { text: "Android" });
    label.style.fontWeight = "600";
    label.style.color = "var(--fg)";
    label.style.margin = "10px 0 0";
    box.appendChild(label);
    box.appendChild(ol);
  }
}

function syncInstall() {
  const show = !standalone() && !installHidden;
  $("installCard").hidden = !show;
  $("installSteps").hidden = !installOpen;
  $("installToggle").textContent = installOpen ? "Ocultar pasos" : "Ver cómo";
  $("installNative").hidden = !canInstall;
  $("installActions").classList.toggle("two", !canInstall);
  if (canInstall) $("installDismiss").style.gridColumn = "span 2";
  else $("installDismiss").style.gridColumn = "";
}

function onPrompt(event) {
  event.preventDefault();
  nativePrompt = event;
  canInstall = true;
  syncInstall();
}

$("tabReviews").addEventListener("click", () => setMode("reviews"));
$("tabSocial").addEventListener("click", () => setMode("social"));
$("themeBtn").addEventListener("click", () => {
  dark = !dark;
  applyTheme();
  saveUi();
});
$("installBtn").addEventListener("click", () => {
  installHidden = false;
  installOpen = true;
  saveUi();
  renderInstallSteps();
  syncInstall();
  $("installCard").scrollIntoView({ block: "nearest" });
});
$("installToggle").addEventListener("click", () => {
  installOpen = !installOpen;
  if (installOpen) renderInstallSteps();
  syncInstall();
});
$("installDismiss").addEventListener("click", () => {
  installHidden = true;
  saveUi();
  syncInstall();
});
$("installNative").addEventListener("click", async () => {
  if (!nativePrompt) return;
  await nativePrompt.prompt();
  const choice = await nativePrompt.userChoice;
  if (choice.outcome === "accepted") {
    canInstall = false;
    installHidden = true;
    saveUi();
    notify("Listo. Abrila desde el ícono del inicio");
  }
  nativePrompt = null;
  syncInstall();
});
$("hideRej").addEventListener("click", () => {
  hideRejected = !hideRejected;
  saveUi();
  resetList();
});
$("onlySaved").addEventListener("click", () => {
  onlySaved = !onlySaved;
  saveUi();
  resetList();
});
$("searchForm").addEventListener("submit", (ev) => ev.preventDefault());
$("q").addEventListener("input", () => {
  query = $("q").value;
  $("qClear").hidden = !query;
  resetList();
});
$("qClear").addEventListener("click", () => {
  $("q").value = "";
  query = "";
  $("qClear").hidden = true;
  $("q").focus();
  resetList();
});
$("editClose").addEventListener("click", closeEditor);
$("editOrig").addEventListener("click", () => {
  if (!editing) return;
  $("editUrl").value = RV + editing.id;
  $("editErr").hidden = true;
});
$("editSave").addEventListener("click", saveDraft);
$("editDlg").addEventListener("close", () => {
  editing = null;
});

const observer = new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      limit += PAGE;
      renderList();
    }
  },
  { rootMargin: "640px" }
);
observer.observe($("sentinel"));

applyTheme();
setMode(mode);
renderInstallSteps();
syncInstall();
window.addEventListener("beforeinstallprompt", onPrompt);
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
