// Datos: usa la última copia bajada de r/comercios_colonia.html; si no hay, data.js.
(function () {
  var K = "directorio-D";
  var SRC = "https://tocamaderanfc.github.io/r/comercios_colonia.html";
  try {
    var s = localStorage.getItem(K);
    if (s) D = JSON.parse(s);
  } catch (e) {}
  if (!navigator.onLine) return;
  fetch(SRC + "?x=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
    .then(function (t) {
      var m = t.match(/const D=(\[[\s\S]*?\]);\s*\n/);
      if (!m) return;
      var nd = JSON.parse(m[1]);
      if (!Array.isArray(nd) || !nd.length) return;
      var js = JSON.stringify(nd);
      if (js === JSON.stringify(D)) return;
      localStorage.setItem(K, js);
      location.reload();
    })
    .catch(function () {});
})();
