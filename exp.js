// exp.js — EXP Hemat: EXP dari kebiasaan mencatat & hemat, bisa ditukar menjadi Rupiah.
// Dimuat SEBELUM script.js. Memakai data/fungsi dari script.js (transaksi, budget, hariIni,
// batasHarian, totalPerTanggal, jumlahkan, formatRupiah, tanggalPendek, tampilNotif)
// hanya saat renderExp() dipanggil.
//
// CATATAN: aplikasi ini tidak menyimpan/memindahkan uang sungguhan. Penukaran hanya
// MENCATAT hadiah yang boleh kamu ambil sendiri (misalnya dari tabungan).

// ===== Pengaturan nilai tukar & aturan EXP (ubah di sini) =====
const NILAI_EXP = 100;          // 1 EXP = Rp 100
const MIN_TUKAR = 100;          // minimal sekali tukar: 100 EXP (= Rp 10.000)

const EXP_HEMAT = 15;           // pengeluaran hari itu <= 80% batas harian
const EXP_AMAN = 8;             // pengeluaran hari itu 80% - 100% batas harian
const EXP_MINIM = 1;            // melewati batas, belum lengkap, atau bulan tanpa budget
const BATAS_HEMAT = 0.8;        // 80% dari batas harian
const BATAS_MINIMAL = 0.1;      // di bawah 10% batas harian = dianggap belum lengkap dicatat
const BONUS_STREAK = 2;         // tambahan per hari beruntun (mulai hari ke-2)
const MAKS_BONUS_STREAK = 10;
const MAKS_TELAT = 2;           // catatan ditambah > 2 hari setelah tanggalnya tidak dihitung
const BULAN_MIN_HARI = 15;      // bonus bulanan: minimal 15 hari dicatat
const BULAN_MIN_SISA = 10;      // ... dan sisa budget minimal 10%
const MAKS_BONUS_BULAN = 60;    // +1 EXP tiap 1% sisa, maksimal 60

// ===== Data penukaran (localStorage) =====
// Format: [{ id, tanggal: "2026-10-27", exp: 100, rupiah: 10000 }, ...]
// Rupiah disimpan saat penukaran, jadi mengubah NILAI_EXP tidak mengubah riwayat lama.
const KUNCI_TUKAR = "exp-tukar-v1";
let riwayatTukar = muatTukarExp();

function bersihkanTukar(x) {
  if (!x || typeof x !== "object") return null;
  const exp = Math.floor(Number(x.exp));
  const rupiah = Math.round(Number(x.rupiah));
  if (
    !Number.isFinite(Number(x.id)) ||
    typeof x.tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x.tanggal) ||
    !(exp > 0) || !(rupiah > 0)
  ) {
    return null;
  }
  return { id: Number(x.id), tanggal: x.tanggal, exp: exp, rupiah: rupiah };
}

function muatTukarExp() {
  try {
    const d = JSON.parse(localStorage.getItem(KUNCI_TUKAR));
    return Array.isArray(d) ? d.map(bersihkanTukar).filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function simpanTukarExp() {
  try {
    localStorage.setItem(KUNCI_TUKAR, JSON.stringify(riwayatTukar));
  } catch (e) {
    alert("Data penukaran tidak bisa disimpan (penyimpanan browser penuh atau diblokir).");
  }
}

// ===== Fungsi bantu tanggal =====
function nomorHariExp(ymd) {
  const p = ymd.split("-").map(Number);
  return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
}
function geserHariExp(ymd, n) {
  const d = new Date((nomorHariExp(ymd) + n) * 86400000);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}

// ===== Hitung EXP dari data transaksi + budget =====
// EXP dihitung ulang tiap tampilan diperbarui. EXP hari ini sementara (belum bisa ditukar);
// EXP "final" = hari-hari sebelum hari ini + bonus hemat bulanan.

// Tanggal (YYYY-MM-DD) saat catatan dibuat, dibaca dari id (id = waktu pembuatan)
function tanggalDariId(id) {
  const d = new Date(id);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Catatan terlambat = dibuat lebih dari MAKS_TELAT hari setelah tanggal transaksinya
function terlambatExp(t) {
  if (!(t.id > 1e12)) return false; // id lama/impor tanpa cap waktu dianggap tepat waktu
  return nomorHariExp(tanggalDariId(t.id)) - nomorHariExp(t.tanggal) > MAKS_TELAT;
}

// Nilai dasar satu hari: jenis, EXP dasar, dan apakah ikut streak
function nilaiHari(total, ym) {
  if (!budget[ym]) return { jenis: "tanpaBudget", dasar: EXP_MINIM, hemat: false };
  const batas = batasHarian(ym);
  if (total > batas) return { jenis: "lewat", dasar: EXP_MINIM, hemat: false };
  if (total < batas * BATAS_MINIMAL) return { jenis: "kurang", dasar: EXP_MINIM, hemat: false };
  if (total <= batas * BATAS_HEMAT) return { jenis: "hemat", dasar: EXP_HEMAT, hemat: true };
  return { jenis: "aman", dasar: EXP_AMAN, hemat: true };
}

function hitungExp() {
  const hari = hariIni();
  const bulanIni = hari.slice(0, 7);
  const kemarin = geserHariExp(hari, -1);

  // Total per tanggal (semua catatan) + penanda hari yang punya catatan tepat waktu
  const perTanggal = {};
  const tepatWaktu = {};
  transaksi.forEach(function (t) {
    if (t.tanggal > hari) return;
    perTanggal[t.tanggal] = (perTanggal[t.tanggal] || 0) + t.nominal;
    if (!terlambatExp(t)) tepatWaktu[t.tanggal] = true;
  });
  // Hanya hari dengan catatan tepat waktu yang menghasilkan EXP
  const tanggalUrut = Object.keys(perTanggal).filter(function (tg) { return tepatWaktu[tg]; }).sort();

  let expFinal = 0, expHariIni = 0, streak = 0, streakTerpanjang = 0, prev = null;
  tanggalUrut.forEach(function (tg) {
    const n = nilaiHari(perTanggal[tg], tg.slice(0, 7));
    let poin = n.dasar;
    if (n.hemat) {
      const lanjut = prev && prev.hemat && nomorHariExp(tg) - nomorHariExp(prev.tg) === 1;
      streak = lanjut ? streak + 1 : 1;
      poin += Math.min(MAKS_BONUS_STREAK, BONUS_STREAK * (streak - 1));
    } else {
      streak = 0;
    }
    streakTerpanjang = Math.max(streakTerpanjang, streak);
    if (tg === hari) expHariIni = poin;
    else expFinal += poin;
    prev = { tg: tg, hemat: n.hemat };
  });
  const streakSekarang = prev && prev.hemat && (prev.tg === hari || prev.tg === kemarin) ? streak : 0;

  // Bonus hemat bulanan: hanya bulan yang sudah lewat
  let bonusBulanan = 0;
  Object.keys(budget).forEach(function (ym) {
    if (ym >= bulanIni || !(budget[ym] > 0)) return;
    const total = jumlahkan(totalPerTanggal(ym));
    const hariValid = new Set();
    transaksi.forEach(function (t) {
      if (t.tanggal.startsWith(ym) && !terlambatExp(t)) hariValid.add(t.tanggal);
    });
    const persen = Math.floor(((budget[ym] - total) / budget[ym]) * 100);
    if (hariValid.size >= BULAN_MIN_HARI && total <= budget[ym] && persen >= BULAN_MIN_SISA) {
      bonusBulanan += Math.min(MAKS_BONUS_BULAN, persen);
    }
  });
  expFinal += bonusBulanan;

  const punyaBudget = !!budget[bulanIni];
  const totalHari = perTanggal[hari] || 0;
  return {
    expFinal: expFinal,
    expHariIni: expHariIni,
    bonusBulanan: bonusBulanan,
    streakSekarang: streakSekarang,
    streakTerpanjang: streakTerpanjang,
    adaCatatan: Object.keys(perTanggal).length > 0,
    totalHari: totalHari,
    jenisHariIni: totalHari > 0 ? nilaiHari(totalHari, bulanIni).jenis : "kosong",
    punyaBudget: punyaBudget,
    batas: batasHarian(bulanIni),
    lewatBulan: punyaBudget && jumlahkan(totalPerTanggal(bulanIni)) > budget[bulanIni],
  };
}

function jumlahExp(angka) { return angka.toLocaleString("id-ID"); }

const DAFTAR_BADGE = [
  { ikon: "⭐", nama: "Mulai mengumpulkan", ket: "Catat pengeluaran pertama", buka: function (g) { return g.adaCatatan; } },
  { ikon: "🔥", nama: "Beruntun 3 hari", ket: "Hemat 3 hari berturut-turut", buka: function (g) { return g.streakTerpanjang >= 3; } },
  { ikon: "⚡", nama: "Beruntun 7 hari", ket: "Hemat 7 hari berturut-turut", buka: function (g) { return g.streakTerpanjang >= 7; } },
  { ikon: "💰", nama: "Hemat sebulan", ket: "Dapat bonus hemat bulanan", buka: function (g) { return g.bonusBulanan > 0; } },
  { ikon: "🎁", nama: "Tukar pertama", ket: "Tukar EXP menjadi Rupiah", buka: function () { return riwayatTukar.length > 0; } },
  {
    ikon: "🏆", nama: "Total Rp 100.000", ket: "Total hadiah yang sudah ditukar mencapai Rp 100.000",
    buka: function () { return riwayatTukar.reduce(function (j, x) { return j + x.rupiah; }, 0) >= 100000; },
  },
];

// Jumlah EXP yang bisa ditukar saat ini
function expTersedia(g) {
  const sudah = riwayatTukar.reduce(function (j, x) { return j + x.exp; }, 0);
  return Math.max(0, g.expFinal - sudah);
}

// ===== Tampilkan ke layar =====
function renderExp() {
  const elTersedia = document.getElementById("eTersedia");
  if (!elTersedia) return;

  const g = hitungExp();
  const tersedia = expTersedia(g);
  const totalRupiahDitukar = riwayatTukar.reduce(function (j, x) { return j + x.rupiah; }, 0);

  elTersedia.textContent = jumlahExp(tersedia) + " EXP";
  document.getElementById("eNilai").textContent =
    "= " + formatRupiah(tersedia * NILAI_EXP) + "  (1 EXP = " + formatRupiah(NILAI_EXP) + ")";

  const persen = Math.min(100, Math.round((tersedia / MIN_TUKAR) * 100));
  const barTukar = document.getElementById("barTukar");
  barTukar.style.width = persen + "%";
  document.getElementById("eMin").textContent = tersedia >= MIN_TUKAR
    ? "Sudah bisa ditukar (minimal " + MIN_TUKAR + " EXP = " + formatRupiah(MIN_TUKAR * NILAI_EXP) + ")"
    : "Butuh " + (MIN_TUKAR - tersedia) + " EXP lagi untuk penukaran minimal (" + MIN_TUKAR + " EXP = " +
      formatRupiah(MIN_TUKAR * NILAI_EXP) + ")";

  document.getElementById("eTotal").textContent = jumlahExp(g.expFinal) + " EXP";
  document.getElementById("eDitukar").textContent = formatRupiah(totalRupiahDitukar);
  document.getElementById("eStreak").textContent = g.streakSekarang + " hari";
  document.getElementById("eStreakKet").textContent = "Terpanjang " + g.streakTerpanjang + " hari";
  document.getElementById("eHariIni").textContent = g.expHariIni > 0 ? "+" + g.expHariIni + " EXP" : "Belum ada";

  const inputTukar = document.getElementById("inputTukar");
  inputTukar.min = MIN_TUKAR;
  inputTukar.max = tersedia;
  // Daftar aturan dibuat dari konstanta, jadi selalu sama dengan perhitungan
  const persenMin = Math.round(BATAS_MINIMAL * 100);
  const persenHemat = Math.round(BATAS_HEMAT * 100);
  const daftarAturan = [
    "Pengeluaran hari itu antara " + persenMin + "% dan " + persenHemat + "% batas harian: +" + EXP_HEMAT +
      " EXP. Antara " + persenHemat + "% dan 100%: +" + EXP_AMAN + " EXP.",
    "Bonus beruntun: +" + BONUS_STREAK + " EXP untuk tiap hari hemat berturut-turut (hari ke-2 +" + BONUS_STREAK +
      ", hari ke-3 +" + BONUS_STREAK * 2 + ", maksimal +" + MAKS_BONUS_STREAK +
      "). Streak putus jika ada hari yang melewati batas, tidak dicatat, atau belum lengkap.",
    "Melewati batas harian, pengeluaran di bawah " + persenMin + "% batas (dianggap belum lengkap dicatat), atau bulan itu belum punya budget: hanya +" + EXP_MINIM + " EXP.",
    "Catatan yang ditambahkan lebih dari " + MAKS_TELAT + " hari setelah tanggalnya tidak dihitung untuk EXP.",
    "Bonus hemat bulanan: bulan yang sudah lewat dicatat minimal " + BULAN_MIN_HARI + " hari dan sisa budget minimal " +
      BULAN_MIN_SISA + "%, +1 EXP tiap 1% sisa (maksimal +" + MAKS_BONUS_BULAN + ").",
    "Nilai tukar: 1 EXP = " + formatRupiah(NILAI_EXP) + ". Minimal sekali tukar " + MIN_TUKAR +
      " EXP (" + formatRupiah(MIN_TUKAR * NILAI_EXP) + ").",
    "EXP hari ini bersifat sementara, baru bisa ditukar setelah hari berakhir.",
    "Aplikasi ini tidak memindahkan uang sungguhan. Penukaran hanya mencatat hadiah yang boleh kamu ambil sendiri, misalnya dari tabunganmu.",
  ];
  const elAturan = document.getElementById("eAturan");
  elAturan.innerHTML = "";
  daftarAturan.forEach(function (teks) {
    const li = document.createElement("li");
    li.textContent = teks;
    elAturan.appendChild(li);
  });

  // Pesan untuk pengguna
  let pesan, level;
  if (g.lewatBulan) {
    pesan = "Total pengeluaran bulan ini sudah melewati budget, jadi bonus hemat bulanan tidak akan didapat. Tahan pengeluaran sampai akhir bulan.";
    level = "bahaya";
  } else if (g.jenisHariIni === "lewat") {
    pesan = "Pengeluaran hari ini melewati batas harian: hanya +" + EXP_MINIM + " EXP dan streak putus. Besok mulai lagi.";
    level = "bahaya";
  } else if (g.jenisHariIni === "kurang") {
    pesan = "Pengeluaran hari ini masih di bawah " + Math.round(BATAS_MINIMAL * 100) +
      "% batas harian, jadi dianggap belum lengkap dicatat (+" + EXP_MINIM + " EXP). Catat semua pengeluaranmu hari ini.";
    level = "peringatan";
  } else if (!g.adaCatatan) {
    pesan = "Catat pengeluaran pertamamu untuk mulai mengumpulkan EXP.";
    level = "ok";
  } else if (!g.punyaBudget) {
    pesan = "Bulan ini belum punya budget, jadi tiap catatan hanya +" + EXP_MINIM + " EXP. Atur budget untuk dapat sampai +" + EXP_HEMAT + " EXP per hari.";
    level = "peringatan";
  } else if (g.jenisHariIni === "kosong") {
    pesan = "Belum ada catatan hari ini. Catat pengeluaranmu untuk menambah EXP dan menjaga streak.";
    level = "peringatan";
  } else if (g.jenisHariIni === "aman") {
    pesan = "Hari ini masih di bawah batas, tapi sudah lewat " + Math.round(BATAS_HEMAT * 100) +
      "%: +" + EXP_AMAN + " EXP. Tahan sedikit lagi untuk +" + EXP_HEMAT + " EXP.";
    level = "ok";
  } else {
    pesan = "Hemat! Hari ini di bawah " + Math.round(BATAS_HEMAT * 100) + "% batas harian: +" + EXP_HEMAT +
      " EXP. Baru bisa ditukar setelah hari berakhir.";
    level = "ok";
  }
  const elPesan = document.getElementById("ePesan");
  elPesan.textContent = pesan;
  elPesan.className = "pesan-game " + level;

  // Badge
  const elBadge = document.getElementById("eBadge");
  elBadge.innerHTML = "";
  DAFTAR_BADGE.forEach(function (b) {
    const terbuka = b.buka(g);
    const li = document.createElement("li");
    li.className = "badge " + (terbuka ? "terbuka" : "terkunci");
    li.textContent = (terbuka ? b.ikon : "🔒") + " " + b.nama;
    li.title = b.ket;
    elBadge.appendChild(li);
  });

  // Riwayat penukaran (terbaru di atas)
  const elRiwayat = document.getElementById("eRiwayat");
  const kosong = document.getElementById("eRiwayatKosong");
  elRiwayat.innerHTML = "";
  kosong.hidden = riwayatTukar.length > 0;
  [...riwayatTukar].sort(function (a, b) { return b.id - a.id; }).forEach(function (x) {
    const li = document.createElement("li");
    const teks = document.createElement("span");
    teks.textContent = tanggalPendek(x.tanggal) + " — " + jumlahExp(x.exp) + " EXP → " + formatRupiah(x.rupiah);
    const tombol = document.createElement("button");
    tombol.type = "button";
    tombol.className = "hapus";
    tombol.textContent = "Batalkan";
    tombol.addEventListener("click", function () { batalkanTukar(x.id); });
    li.appendChild(teks);
    li.appendChild(tombol);
    elRiwayat.appendChild(li);
  });
}

// ===== Tukar & batalkan =====
function batalkanTukar(id) {
  if (!confirm("Batalkan penukaran ini? EXP akan dikembalikan.")) return;
  riwayatTukar = riwayatTukar.filter(function (x) { return x.id !== id; });
  simpanTukarExp();
  renderExp();
}

const formTukarEl = document.getElementById("formTukar");
if (formTukarEl) {
  formTukarEl.addEventListener("submit", function (e) {
    e.preventDefault();
    const inputTukar = document.getElementById("inputTukar");
    const jumlah = Math.floor(Number(inputTukar.value));
    const tersedia = expTersedia(hitungExp());

    if (!(jumlah >= MIN_TUKAR)) {
      alert("Minimal penukaran " + MIN_TUKAR + " EXP.");
      return;
    }
    if (jumlah > tersedia) {
      alert("EXP yang bisa ditukar hanya " + jumlahExp(tersedia) + " EXP.");
      return;
    }
    const rupiah = jumlah * NILAI_EXP;
    if (!confirm("Tukar " + jumlahExp(jumlah) + " EXP menjadi " + formatRupiah(rupiah) + "?")) return;

    riwayatTukar.push({ id: Date.now(), tanggal: hariIni(), exp: jumlah, rupiah: rupiah });
    simpanTukarExp();
    inputTukar.value = "";
    renderExp();
    tampilNotif(
      "🎁 Berhasil menukar " + jumlahExp(jumlah) + " EXP menjadi " + formatRupiah(rupiah) +
      ".\nAmbil uangnya dari tabunganmu sebagai hadiah.",
      "info"
    );
  });

  document.getElementById("btnTukarSemua").addEventListener("click", function () {
    const tersedia = expTersedia(hitungExp());
    if (tersedia < MIN_TUKAR) {
      alert("EXP belum cukup. Minimal penukaran " + MIN_TUKAR + " EXP.");
      return;
    }
    document.getElementById("inputTukar").value = tersedia;
  });
}
