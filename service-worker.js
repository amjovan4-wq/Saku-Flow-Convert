// service-worker.js — membuat aplikasi bisa dibuka offline.
// Setiap kali kamu mengubah file aplikasi, NAIKKAN nomor versi di bawah
// (misalnya v1 -> v2) supaya HP mengambil file terbaru.
const VERSI = "pengeluaran-v2";

// Semua file aplikasi yang disimpan untuk offline
const FILE_APLIKASI = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./exp.js",
  "./sponsor.js",
  "./pdf.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
];

// Pasang: simpan semua file ke cache
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSI).then(function (cache) { return cache.addAll(FILE_APLIKASI); })
  );
  self.skipWaiting();
});

// Aktifkan: hapus cache versi lama
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (nama) {
      return Promise.all(
        nama.filter(function (n) { return n !== VERSI; }).map(function (n) { return caches.delete(n); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Ambil: tampilkan dari cache dulu (cepat & offline), sambil memperbarui cache di belakang layar.
// Hanya file dari alamat aplikasi sendiri; iklan/gambar dari situs lain tidak disentuh.
self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(VERSI).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (tersimpan) {
        const dariJaringan = fetch(req)
          .then(function (res) {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(function () {
            return tersimpan || (req.mode === "navigate" ? cache.match("./index.html") : undefined);
          });
        return tersimpan || dariJaringan;
      });
    })
  );
});
