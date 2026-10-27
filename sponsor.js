// sponsor.js — slot iklan sponsor.
// Isi daftar SPONSOR di bawah untuk menampilkan iklan. Jika kosong, slot menampilkan
// ajakan "Pasang iklan di sini". Jika ada beberapa sponsor, satu dipilih acak tiap halaman dibuka.
//
// Contoh isi:
//   { nama: "Warung Kopi Kita", teks: "Diskon 10% untuk mahasiswa", url: "https://contoh.com",
//     gambar: "https://contoh.com/logo.png" }
// "gambar" boleh dikosongkan. Hanya alamat http:// atau https:// yang diterima.
const SPONSOR = [];

// Tujuan tombol "Pasang iklan di sini" (ganti dengan kontakmu)
const KONTAK_SPONSOR = {
  teks: "Pasang iklan di sini",
  url: "mailto:iklan@contoh.com", // GANTI dengan email/WhatsApp/halaman kontakmu
};

function urlAman(u) {
  try {
    const x = new URL(u, location.href);
    return x.protocol === "https:" || x.protocol === "http:" || x.protocol === "mailto:" ? x.href : "";
  } catch (e) {
    return "";
  }
}

function renderSponsor() {
  document.querySelectorAll("[data-sponsor]").forEach(function (slot) {
    slot.innerHTML = "";

    const label = document.createElement("p");
    label.className = "sponsor-label";
    label.textContent = "Iklan";
    slot.appendChild(label);

    const iklan = SPONSOR.length ? SPONSOR[Math.floor(Math.random() * SPONSOR.length)] : null;
    const tautan = document.createElement("a");
    tautan.className = "sponsor-isi";

    if (iklan) {
      // rel="sponsored" menandai tautan berbayar; noopener mencegah halaman tujuan mengakses halaman ini
      tautan.href = urlAman(iklan.url) || "#";
      tautan.target = "_blank";
      tautan.rel = "sponsored noopener noreferrer";

      const gambar = iklan.gambar && /^https?:\/\//i.test(iklan.gambar) ? iklan.gambar : "";
      if (gambar) {
        const img = document.createElement("img");
        img.src = gambar;
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        tautan.appendChild(img);
      }
      const teks = document.createElement("span");
      const judul = document.createElement("strong");
      judul.textContent = iklan.nama || "";
      const isi = document.createElement("span");
      isi.textContent = iklan.teks || "";
      teks.appendChild(judul);
      teks.appendChild(isi);
      tautan.appendChild(teks);
    } else {
      tautan.className += " kosong-iklan";
      tautan.href = urlAman(KONTAK_SPONSOR.url) || "#";
      const teks = document.createElement("span");
      const judul = document.createElement("strong");
      judul.textContent = "Ruang iklan sponsor";
      const isi = document.createElement("span");
      isi.textContent = KONTAK_SPONSOR.teks;
      teks.appendChild(judul);
      teks.appendChild(isi);
      tautan.appendChild(teks);
    }
    slot.appendChild(tautan);
  });
}

renderSponsor();
