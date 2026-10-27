// ===== 1. Ambil elemen HTML =====
const form = document.getElementById("form");
const inputTanggal = document.getElementById("tanggal");
const inputKeterangan = document.getElementById("keterangan");
const inputKategori = document.getElementById("kategori");
const inputNominal = document.getElementById("nominal");
const inputBulan = document.getElementById("bulan");
const daftar = document.getElementById("daftar");
const totalEl = document.getElementById("total");
const jumlahEl = document.getElementById("jumlah");
const ringkasanEl = document.getElementById("ringkasan");
const kosongEl = document.getElementById("kosong");
const labelPeriodeEl = document.getElementById("labelPeriode");
const periodeCetakEl = document.getElementById("periodeCetak");
const tanggalCetakEl = document.getElementById("tanggalCetak");
const fileRestore = document.getElementById("fileRestore");

// Elemen budget
const formBudget = document.getElementById("formBudget");
const inputBudget = document.getElementById("budget");
const budgetInfoEl = document.getElementById("budgetInfo");
const statusBudgetEl = document.getElementById("statusBudget");
const sBatasEl = document.getElementById("sBatas");
const sBatasKetEl = document.getElementById("sBatasKet");
const sSisaEl = document.getElementById("sSisa");
const sSisaKetEl = document.getElementById("sSisaKet");
const barBulanEl = document.getElementById("barBulan");
const blokHariEl = document.getElementById("blokHari");
const sHariEl = document.getElementById("sHari");
const sHariKetEl = document.getElementById("sHariKet");
const barHariEl = document.getElementById("barHari");
const blokSaranEl = document.getElementById("blokSaran");
const sSaranEl = document.getElementById("sSaran");
const sMelebihiEl = document.getElementById("sMelebihi");

// Elemen notifikasi
const notifEl = document.getElementById("notif");
const notifTeksEl = document.getElementById("notifTeks");
const btnNotif = document.getElementById("btnNotif");

// ===== 2. Data: transaksi & budget, dimuat dari localStorage =====
const KUNCI = "pengeluaran-v1";   // sama dengan versi lama, jadi data lama tetap terbaca
const KUNCI_BUDGET = "budget-v1"; // format: { "2026-10": 1500000, ... }
let transaksi = muatData();
let budget = muatBudget();

function muatData() {
  try {
    const d = JSON.parse(localStorage.getItem(KUNCI));
    return Array.isArray(d) ? d : [];
  } catch (e) {
    return [];
  }
}

function muatBudget() {
  try {
    const b = JSON.parse(localStorage.getItem(KUNCI_BUDGET));
    return b && typeof b === "object" && !Array.isArray(b) ? b : {};
  } catch (e) {
    return {};
  }
}

function simpanKe(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch (e) {
    alert("Data tidak bisa disimpan (penyimpanan browser penuh atau diblokir).");
  }
}
function simpanData() { simpanKe(KUNCI, transaksi); }
function simpanBudget() { simpanKe(KUNCI_BUDGET, budget); }

// ===== 3. Fungsi bantu =====
function formatRupiah(angka) {
  const teks = "Rp " + Math.abs(angka).toLocaleString("id-ID");
  return angka < 0 ? "-" + teks : teks;
}

// Tanggal hari ini menurut jam perangkat, format YYYY-MM-DD
function hariIni() {
  const d = new Date();
  return (
    d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

// "2026-10" menjadi "Oktober 2026"
function namaBulan(ym) {
  if (!ym) return "Semua bulan";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

// "2026-10-26" menjadi "26 Oktober 2026"
function formatTanggal(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// "2026-10-26" menjadi "26/10/2026"
function tanggalPendek(ymd) {
  const [y, m, d] = ymd.split("-");
  return d + "/" + m + "/" + y;
}

function tanggalCetak() {
  return new Date().toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// Transaksi sesuai bulan yang dipilih (kosong = semua bulan)
function ambilTerfilter() {
  const bulan = inputBulan.value;
  return transaksi.filter(function (t) {
    return !bulan || t.tanggal.startsWith(bulan);
  });
}

// Unduh file dari teks atau byte
function unduh(namaFile, isi, tipe) {
  const blob = new Blob([isi], { type: tipe });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

// ----- Fungsi bantu khusus budget -----
function hariDalamBulan(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate(); // hari ke-0 bulan berikutnya = hari terakhir bulan ini
}

// Batas pengeluaran harian = uang awal bulan dibagi jumlah hari dalam bulan itu
function batasHarian(ym) {
  return budget[ym] ? Math.floor(budget[ym] / hariDalamBulan(ym)) : 0;
}

// Total pengeluaran tiap tanggal pada satu bulan: { "2026-10-26": 25000, ... }
function totalPerTanggal(ym) {
  const hasil = {};
  transaksi.forEach(function (t) {
    if (t.tanggal.startsWith(ym)) {
      hasil[t.tanggal] = (hasil[t.tanggal] || 0) + t.nominal;
    }
  });
  return hasil;
}

function jumlahkan(objek) {
  return Object.keys(objek).reduce(function (j, k) { return j + objek[k]; }, 0);
}

// ===== 4. Notifikasi =====
let timerNotif;

// Banner di dalam halaman (selalu jalan di HP maupun laptop)
function tampilNotif(teks, level) {
  notifTeksEl.textContent = teks;
  notifEl.className = "notif notif-" + level;
  notifEl.hidden = false;
  clearTimeout(timerNotif);
  timerNotif = setTimeout(function () { notifEl.hidden = true; }, 12000);
  try {
    if (level !== "info" && navigator.vibrate) {
      navigator.vibrate(level === "bahaya" ? [200, 100, 200] : 100);
    }
  } catch (e) {}
}

document.getElementById("notifTutup").addEventListener("click", function () {
  notifEl.hidden = true;
});

// Notifikasi bawaan browser (hanya jika didukung dan sudah diizinkan)
function kirimNotifikasiBrowser(judul, isi) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(judul, { body: isi });
    }
  } catch (e) {
    // Beberapa browser HP tidak mengizinkan; banner di halaman tetap muncul
  }
}

function perbaruiTombolNotif() {
  if (!("Notification" in window)) {
    btnNotif.hidden = true;
    return;
  }
  if (Notification.permission === "granted") {
    btnNotif.textContent = "🔔 Notifikasi browser aktif";
    btnNotif.disabled = true;
  } else if (Notification.permission === "denied") {
    btnNotif.textContent = "🔕 Notifikasi diblokir di pengaturan browser";
    btnNotif.disabled = true;
  } else {
    btnNotif.textContent = "🔔 Aktifkan notifikasi browser";
    btnNotif.disabled = false;
  }
}

btnNotif.addEventListener("click", function () {
  try {
    const hasil = Notification.requestPermission(perbaruiTombolNotif);
    if (hasil && hasil.then) hasil.then(perbaruiTombolNotif);
  } catch (e) {
    perbaruiTombolNotif();
  }
});

// Dipanggil setelah menambah transaksi: cek batas harian & budget bulanan
function cekBatas(tanggal) {
  const ym = tanggal.slice(0, 7);
  if (!budget[ym]) return; // bulan ini belum punya budget

  const batas = batasHarian(ym);
  const perTanggal = totalPerTanggal(ym);
  const totalHari = perTanggal[tanggal] || 0;
  const totalBulan = jumlahkan(perTanggal);

  const pesan = [];
  let level = "peringatan";

  if (totalHari > batas) {
    pesan.push(
      "⚠️ Pengeluaran " + formatTanggal(tanggal) + " (" + formatRupiah(totalHari) +
      ") melebihi batas harian " + formatRupiah(batas) + " sebesar " + formatRupiah(totalHari - batas) + "."
    );
    level = "bahaya";
  } else if (batas > 0 && totalHari >= batas * 0.8) {
    pesan.push(
      "Hati-hati: pengeluaran " + formatTanggal(tanggal) + " sudah " +
      Math.round((totalHari / batas) * 100) + "% dari batas harian (" + formatRupiah(totalHari) +
      " dari " + formatRupiah(batas) + ")."
    );
  }

  if (totalBulan > budget[ym]) {
    pesan.push(
      "⚠️ Total pengeluaran " + namaBulan(ym) + " melebihi budget bulanan sebesar " +
      formatRupiah(totalBulan - budget[ym]) + "."
    );
    level = "bahaya";
  }

  if (pesan.length === 0) return;
  const teks = pesan.join("\n");
  tampilNotif(teks, level);
  kirimNotifikasiBrowser(
    level === "bahaya" ? "Pengeluaran melebihi batas!" : "Pengeluaran hampir mencapai batas",
    teks
  );
}

// ===== 5. Tambah transaksi =====
form.addEventListener("submit", function (e) {
  e.preventDefault(); // cegah halaman reload

  const nominal = Number(inputNominal.value);
  if (!inputKeterangan.value.trim() || !(nominal > 0)) {
    alert("Isi keterangan dan nominal dengan benar.");
    return;
  }

  const tanggalBaru = inputTanggal.value;

  transaksi.push({
    id: Date.now(), // id unik dari waktu
    tanggal: tanggalBaru,
    keterangan: inputKeterangan.value.trim(),
    kategori: inputKategori.value,
    nominal: nominal,
  });

  simpanData();

  // Supaya data baru langsung terlihat, pindahkan filter ke bulan transaksi itu
  const bulanBaru = tanggalBaru.slice(0, 7);
  if (inputBulan.value && inputBulan.value !== bulanBaru) {
    inputBulan.value = bulanBaru;
  }

  tampilkan();
  form.reset();
  inputTanggal.value = hariIni();

  cekBatas(tanggalBaru); // notifikasi jika melewati batas
});

// ===== 6. Hapus transaksi =====
function hapus(id) {
  if (!confirm("Hapus transaksi ini?")) return;
  transaksi = transaksi.filter(function (t) {
    return t.id !== id;
  });
  simpanData();
  tampilkan();
}

// ===== 7. Tampilkan data (sesuai filter bulan) ke layar =====
function tampilkan() {
  const data = ambilTerfilter();

  // Urutkan: tanggal terbaru di atas
  const urut = [...data].sort(function (a, b) {
    return b.tanggal.localeCompare(a.tanggal) || b.id - a.id;
  });

  daftar.innerHTML = "";
  urut.forEach(function (t) {
    const tr = document.createElement("tr");

    // textContent dipakai supaya input pengguna aman (tidak dibaca sebagai HTML)
    [
      ["Tanggal", t.tanggal],
      ["Keterangan", t.keterangan],
      ["Kategori", t.kategori],
      ["Nominal", formatRupiah(t.nominal)],
    ].forEach(function (kolom) {
      const td = document.createElement("td");
      td.dataset.label = kolom[0]; // dipakai tampilan HP
      td.textContent = kolom[1];
      if (kolom[0] === "Nominal") td.className = "angka";
      tr.appendChild(td);
    });

    const tdAksi = document.createElement("td");
    tdAksi.className = "aksi";
    const tombol = document.createElement("button");
    tombol.className = "hapus";
    tombol.type = "button";
    tombol.textContent = "Hapus";
    tombol.addEventListener("click", function () {
      hapus(t.id);
    });
    tdAksi.appendChild(tombol);
    tr.appendChild(tdAksi);

    daftar.appendChild(tr);
  });

  kosongEl.style.display = data.length === 0 ? "block" : "none";
  hitungRingkasan(data);
  tampilkanBudget();

  // Teks periode (ringkasan dan judul cetak)
  const periode = namaBulan(inputBulan.value);
  labelPeriodeEl.textContent = periode;
  periodeCetakEl.textContent = periode;
  tanggalCetakEl.textContent = tanggalCetak();

  // Perbarui panel EXP (exp.js)
  if (typeof renderExp === "function") renderExp();
}

// ===== 8. Total & ringkasan per kategori =====
function hitungRingkasan(data) {
  const total = data.reduce(function (jumlah, t) {
    return jumlah + t.nominal;
  }, 0);
  totalEl.textContent = formatRupiah(total);
  jumlahEl.textContent = data.length + " transaksi";

  // Kelompokkan per kategori
  const perKategori = {};
  data.forEach(function (t) {
    perKategori[t.kategori] = (perKategori[t.kategori] || 0) + t.nominal;
  });

  ringkasanEl.innerHTML = "";
  Object.keys(perKategori).forEach(function (kat) {
    const li = document.createElement("li");
    const nama = document.createElement("span");
    const nilai = document.createElement("span");
    nama.textContent = kat;
    nilai.textContent = formatRupiah(perKategori[kat]);
    li.appendChild(nama);
    li.appendChild(nilai);
    ringkasanEl.appendChild(li);
  });
}

// ===== 9. Panel budget & batas harian =====
// Tingkat peringatan dari persentase pemakaian: ok / peringatan (>=80%) / bahaya (>100%)
function tingkat(persen) {
  if (persen > 100) return "bahaya";
  if (persen >= 80) return "peringatan";
  return "ok";
}

function isiBar(el, persen) {
  el.style.width = Math.min(persen, 100) + "%";
  el.className = "isi " + tingkat(persen);
}

function tampilkanBudget() {
  const ym = inputBulan.value;

  if (!ym) {
    budgetInfoEl.textContent = "Pilih bulan tertentu di bagian Periode untuk mengatur budget.";
    formBudget.hidden = true;
    statusBudgetEl.hidden = true;
    return;
  }

  formBudget.hidden = false;
  budgetInfoEl.textContent = "Uang pegangan awal bulan untuk " + namaBulan(ym) + ".";
  inputBudget.value = budget[ym] || "";

  const uang = budget[ym];
  if (!uang) {
    statusBudgetEl.hidden = true;
    return;
  }
  statusBudgetEl.hidden = false;

  const jumlahHari = hariDalamBulan(ym);
  const batas = batasHarian(ym);
  const perTanggal = totalPerTanggal(ym);
  const totalBulan = jumlahkan(perTanggal);
  const sisa = uang - totalBulan;
  const persenBulan = (totalBulan / uang) * 100;

  // Batas harian
  sBatasEl.textContent = formatRupiah(batas);
  sBatasKetEl.textContent = formatRupiah(uang) + " dibagi " + jumlahHari + " hari";

  // Sisa budget bulan ini
  sSisaEl.textContent = formatRupiah(sisa);
  sSisaEl.className = "nilai teks-" + tingkat(persenBulan);
  isiBar(barBulanEl, persenBulan);
  sSisaKetEl.textContent = sisa >= 0
    ? "Terpakai " + formatRupiah(totalBulan) + " (" + Math.round(persenBulan) + "%)"
    : "Melebihi budget " + formatRupiah(-sisa);

  // Jumlah hari yang melebihi batas
  const hariLebih = Object.keys(perTanggal).filter(function (tg) {
    return perTanggal[tg] > batas;
  }).length;
  sMelebihiEl.textContent = hariLebih + " hari";
  sMelebihiEl.className = "nilai " + (hariLebih > 0 ? "teks-bahaya" : "teks-ok");

  // Bagian khusus bulan berjalan: pemakaian hari ini & saran per hari
  const hariIniStr = hariIni();
  const bulanBerjalan = ym === hariIniStr.slice(0, 7);
  blokHariEl.hidden = !bulanBerjalan;
  blokSaranEl.hidden = !bulanBerjalan;

  if (bulanBerjalan) {
    const terpakai = perTanggal[hariIniStr] || 0;
    const persenHari = batas > 0 ? (terpakai / batas) * 100 : (terpakai > 0 ? 101 : 0);

    sHariEl.textContent = formatRupiah(terpakai);
    sHariEl.className = "nilai teks-" + tingkat(persenHari);
    isiBar(barHariEl, persenHari);
    sHariKetEl.textContent = terpakai > batas
      ? "Melebihi batas " + formatRupiah(terpakai - batas)
      : "Sisa batas hari ini " + formatRupiah(batas - terpakai);

    const sisaHari = jumlahHari - Number(hariIniStr.slice(8));
    sSaranEl.textContent = sisaHari > 0
      ? formatRupiah(Math.floor(Math.max(sisa, 0) / sisaHari)) + " / hari"
      : "Hari terakhir bulan ini";
  }
}

formBudget.addEventListener("submit", function (e) {
  e.preventDefault();
  const ym = inputBulan.value;
  if (!ym) return;

  const nilai = Math.round(Number(inputBudget.value));

  if (!(nilai > 0)) {
    // Kosong atau 0 berarti hapus budget bulan ini
    if (budget[ym]) {
      if (confirm("Hapus budget " + namaBulan(ym) + "?")) {
        delete budget[ym];
        simpanBudget();
      }
      tampilkan();
    } else {
      alert("Isi uang pegangan dengan angka lebih dari 0.");
    }
    return;
  }

  budget[ym] = nilai;
  simpanBudget();
  tampilkan();
  tampilNotif(
    "Budget " + namaBulan(ym) + " disimpan: " + formatRupiah(nilai) +
    ".\nBatas pengeluaran harian: " + formatRupiah(batasHarian(ym)) + ".",
    "info"
  );
});

// ===== 10. Filter bulan =====
inputBulan.addEventListener("change", tampilkan);
document.getElementById("btnSemua").addEventListener("click", function () {
  inputBulan.value = "";
  tampilkan();
});

// ===== 11. Rekap PDF =====
document.getElementById("btnPdf").addEventListener("click", function () {
  const data = ambilTerfilter();
  if (data.length === 0) {
    alert("Tidak ada data pada periode ini.");
    return;
  }

  try {
    const ym = inputBulan.value;
    const periode = namaBulan(ym);
    const total = data.reduce(function (j, t) { return j + t.nominal; }, 0);

    const d = new MiniPdf.Dokumen();
    d.judulBesar("Rekap Pengeluaran");
    d.baris("Periode: " + periode);
    d.baris("Dibuat: " + tanggalCetak());

    // --- Ringkasan ---
    const ringkasan = [
      ["Total pengeluaran", formatRupiah(total)],
      ["Jumlah transaksi", data.length + " transaksi"],
    ];
    if (ym && budget[ym]) {
      const uang = budget[ym];
      const batas = batasHarian(ym);
      const perTanggal = totalPerTanggal(ym);
      const hariLebih = Object.keys(perTanggal).filter(function (tg) {
        return perTanggal[tg] > batas;
      }).length;
      ringkasan.push(["Budget awal bulan", formatRupiah(uang)]);
      ringkasan.push([total <= uang ? "Sisa budget" : "Melebihi budget", formatRupiah(Math.abs(uang - total))]);
      ringkasan.push(["Batas pengeluaran harian", formatRupiah(batas)]);
      ringkasan.push(["Hari melebihi batas", hariLebih + " hari"]);
    }
    d.subjudul("Ringkasan");
    d.tabel({
      kolom: [
        { judul: "Keterangan", lebar: 300 },
        { judul: "Nilai", lebar: 215, rata: "kanan" },
      ],
      baris: ringkasan,
    });

    // --- Per kategori ---
    const perKategori = {};
    data.forEach(function (t) {
      perKategori[t.kategori] = (perKategori[t.kategori] || 0) + t.nominal;
    });
    const barisKategori = Object.keys(perKategori)
      .sort(function (a, b) { return perKategori[b] - perKategori[a]; })
      .map(function (k) {
        return [
          k,
          formatRupiah(perKategori[k]),
          ((perKategori[k] / total) * 100).toFixed(1).replace(".", ",") + "%",
        ];
      });
    d.subjudul("Pengeluaran per kategori");
    d.tabel({
      kolom: [
        { judul: "Kategori", lebar: 255 },
        { judul: "Total", lebar: 160, rata: "kanan" },
        { judul: "Porsi", lebar: 100, rata: "kanan" },
      ],
      baris: barisKategori,
    });

    // --- Rekap per hari (dengan status terhadap batas harian) ---
    const perHari = {};
    data.forEach(function (t) {
      perHari[t.tanggal] = (perHari[t.tanggal] || 0) + t.nominal;
    });
    const tanggalUrut = Object.keys(perHari).sort();
    const adaBudget = tanggalUrut.some(function (tg) { return budget[tg.slice(0, 7)]; });

    const barisHari = tanggalUrut.map(function (tg) {
      const baris = [formatTanggal(tg), formatRupiah(perHari[tg])];
      if (adaBudget) {
        const bulanTg = tg.slice(0, 7);
        const punya = !!budget[bulanTg];
        const batas = batasHarian(bulanTg);
        baris.push(punya ? formatRupiah(batas) : "-");
        baris.push(punya ? (perHari[tg] > batas ? "Melebihi" : "Aman") : "-");
      }
      return baris;
    });

    d.subjudul("Rekap per hari");
    d.tabel({
      kolom: adaBudget
        ? [
            { judul: "Tanggal", lebar: 175 },
            { judul: "Total", lebar: 130, rata: "kanan" },
            { judul: "Batas harian", lebar: 130, rata: "kanan" },
            { judul: "Status", lebar: 80, rata: "tengah" },
          ]
        : [
            { judul: "Tanggal", lebar: 300 },
            { judul: "Total", lebar: 215, rata: "kanan" },
          ],
      baris: barisHari,
      warnaTeks: function (baris, kolomKe) {
        return kolomKe === 3 && baris[3] === "Melebihi" ? [220, 38, 38] : null;
      },
    });

    // --- Rincian transaksi ---
    const urut = [...data].sort(function (a, b) {
      return a.tanggal.localeCompare(b.tanggal) || a.id - b.id;
    });
    d.subjudul("Rincian transaksi");
    d.tabel({
      kolom: [
        { judul: "No", lebar: 30, rata: "tengah" },
        { judul: "Tanggal", lebar: 70 },
        { judul: "Keterangan", lebar: 260 },
        { judul: "Kategori", lebar: 70 },
        { judul: "Nominal", lebar: 85, rata: "kanan" },
      ],
      baris: urut.map(function (t, i) {
        return [i + 1, tanggalPendek(t.tanggal), t.keterangan, t.kategori, formatRupiah(t.nominal)];
      }),
      foot: ["", "", "", "TOTAL", formatRupiah(total)],
    });

    unduh("rekap-pengeluaran-" + (ym || "semua") + ".pdf", d.bytes(), "application/pdf");
  } catch (e) {
    alert("Gagal membuat PDF: " + e.message);
  }
});

// ===== 12. Export CSV (bisa dibuka di Excel / Google Sheets) =====
function amankanCsv(teks) {
  let s = String(teks);
  // Cegah teks yang diawali = + - @ dibaca sebagai rumus di Excel
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

document.getElementById("btnCsv").addEventListener("click", function () {
  const data = ambilTerfilter();
  if (data.length === 0) {
    alert("Tidak ada data pada periode ini.");
    return;
  }

  const urut = [...data].sort(function (a, b) {
    return a.tanggal.localeCompare(b.tanggal) || a.id - b.id;
  });

  // Pemisah titik koma (;) agar Excel berbahasa Indonesia membukanya per kolom
  const baris = [["Tanggal", "Keterangan", "Kategori", "Nominal"].join(";")];
  urut.forEach(function (t) {
    baris.push(
      [t.tanggal, amankanCsv(t.keterangan), amankanCsv(t.kategori), t.nominal].join(";")
    );
  });
  const total = data.reduce(function (j, t) { return j + t.nominal; }, 0);
  baris.push(["", "", "TOTAL", total].join(";"));

  const nama = "pengeluaran-" + (inputBulan.value || "semua") + ".csv";
  unduh(nama, "﻿" + baris.join("\r\n"), "text/csv;charset=utf-8");
});

// ===== 13. Backup & Restore (JSON) =====
document.getElementById("btnBackup").addEventListener("click", function () {
  if (transaksi.length === 0 && Object.keys(budget).length === 0 && riwayatTukar.length === 0) {
    alert("Belum ada data untuk di-backup.");
    return;
  }
  unduh(
    "backup-pengeluaran-" + hariIni() + ".json",
    JSON.stringify({ versi: 3, transaksi: transaksi, budget: budget, tukar: riwayatTukar }, null, 2),
    "application/json"
  );
});

document.getElementById("btnRestore").addEventListener("click", function () {
  fileRestore.click();
});

// Cek bentuk satu transaksi dari file backup
function bersihkan(t) {
  if (!t || typeof t !== "object") return null;
  const nominal = Number(t.nominal);
  if (
    !Number.isFinite(Number(t.id)) ||
    typeof t.tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.tanggal) ||
    typeof t.keterangan !== "string" || !t.keterangan.trim() ||
    typeof t.kategori !== "string" || !t.kategori.trim() ||
    !(nominal > 0)
  ) {
    return null;
  }
  return {
    id: Number(t.id),
    tanggal: t.tanggal,
    keterangan: t.keterangan.trim().slice(0, 100),
    kategori: t.kategori.trim().slice(0, 30),
    nominal: nominal,
  };
}

fileRestore.addEventListener("change", function () {
  const file = fileRestore.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    try {
      const isi = JSON.parse(reader.result);

      // Format lama: array transaksi saja. Format baru: { transaksi: [...], budget: {...} }
      const mentah = Array.isArray(isi) ? isi : (isi && Array.isArray(isi.transaksi) ? isi.transaksi : null);
      if (!mentah) throw new Error("format tidak dikenal");

      const valid = mentah.map(bersihkan).filter(Boolean);

      // Budget dari backup: hanya mengisi bulan yang belum punya budget
      let budgetBaru = 0;
      if (isi && !Array.isArray(isi) && isi.budget && typeof isi.budget === "object") {
        Object.keys(isi.budget).forEach(function (ym) {
          const nilai = Math.round(Number(isi.budget[ym]));
          if (/^\d{4}-(0[1-9]|1[0-2])$/.test(ym) && nilai > 0 && !budget[ym]) {
            budget[ym] = nilai;
            budgetBaru++;
          }
        });
      }

      // Riwayat penukaran EXP: lewati id yang sudah ada
      let tukarBaru = 0;
      if (isi && !Array.isArray(isi) && Array.isArray(isi.tukar)) {
        const idTukar = new Set(riwayatTukar.map(function (x) { return x.id; }));
        isi.tukar.map(bersihkanTukar).filter(Boolean).forEach(function (x) {
          if (!idTukar.has(x.id)) {
            riwayatTukar.push(x);
            idTukar.add(x.id);
            tukarBaru++;
          }
        });
      }

      if (valid.length === 0 && budgetBaru === 0 && tukarBaru === 0) {
        alert("File tidak berisi data pengeluaran yang valid.");
        return;
      }

      // Gabungkan: lewati transaksi yang id-nya sudah ada
      const idAda = new Set(transaksi.map(function (t) { return t.id; }));
      const baru = valid.filter(function (t) { return !idAda.has(t.id); });

      transaksi = transaksi.concat(baru);
      simpanData();
      simpanBudget();
      simpanTukarExp();
      tampilkan();
      alert(
        baru.length + " transaksi ditambahkan, " + (valid.length - baru.length) +
        " dilewati (sudah ada). Budget baru: " + budgetBaru + " bulan. Penukaran EXP baru: " + tukarBaru + "."
      );
    } catch (e) {
      alert("File backup tidak valid.");
    } finally {
      fileRestore.value = ""; // supaya file yang sama bisa dipilih lagi
    }
  };
  reader.readAsText(file);
});

// ===== 14. Jalankan saat halaman dibuka =====
inputTanggal.value = hariIni();
inputBulan.value = hariIni().slice(0, 7); // default: bulan ini
perbaruiTombolNotif();
tampilkan();
