// pdf.js — pembuat file PDF sederhana TANPA library (jalan offline).
// Dipakai oleh script.js lewat: const d = new MiniPdf.Dokumen(); ... d.bytes();
// Kamu tidak perlu mengubah file ini untuk mengedit aplikasi.

const MiniPdf = (function () {
  // Ukuran kertas A4 dalam satuan point (1 pt = 1/72 inci)
  const LEBAR_HAL = 595.28;
  const TINGGI_HAL = 841.89;
  const MARGIN = 40;
  const BATAS_BAWAH = TINGGI_HAL - 50;
  const TINGGI_BARIS = 18;
  const PAD = 6;
  const BIRU = [37, 99, 235];

  // Lebar tiap huruf Helvetica (per 1000 satuan) untuk karakter ASCII 32..126.
  // Dipakai untuk meratakan teks ke kanan/tengah dan memotong teks yang kepanjangan.
  const W_NORMAL = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
    278, 278, 584, 584, 584, 556, 1015,
    667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
    278, 278, 278, 469, 556, 333,
    556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
    334, 260, 334, 584,
  ];
  const W_TEBAL = [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
    333, 333, 584, 584, 584, 611, 975,
    722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
    333, 278, 333, 584, 556, 333,
    556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500,
    389, 280, 389, 584,
  ];

  // Font bawaan PDF hanya mendukung huruf Latin; karakter lain diganti "?"
  function bersih(s) {
    return String(s).replace(/[^\x20-\x7E -ÿ]/g, "?");
  }

  function lebarTeks(s, ukuran, tebal) {
    const tabel = tebal ? W_TEBAL : W_NORMAL;
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      total += c >= 32 && c <= 126 ? tabel[c - 32] : 556;
    }
    return (total * ukuran) / 1000;
  }

  function potong(s, maks, ukuran, tebal) {
    if (lebarTeks(s, ukuran, tebal) <= maks) return s;
    let t = s;
    while (t.length > 0 && lebarTeks(t + "...", ukuran, tebal) > maks) {
      t = t.slice(0, -1);
    }
    return t + "...";
  }

  function esc(s) {
    return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }
  function warna(c) {
    return c.map(function (v) { return (v / 255).toFixed(3); }).join(" ");
  }
  function n(x) {
    return x.toFixed(2);
  }

  function Dokumen() {
    const halaman = []; // tiap halaman = daftar perintah gambar
    let ops;
    let y = MARGIN; // posisi menulis (dihitung dari atas halaman)

    function halamanBaru() {
      ops = [];
      halaman.push(ops);
      y = MARGIN;
    }
    halamanBaru();

    // ----- Perintah gambar dasar -----
    function teks(s, x, yBaris, o) {
      o = o || {};
      s = bersih(s);
      const ukuran = o.ukuran || 10;
      const w = lebarTeks(s, ukuran, o.tebal);
      if (o.rata === "kanan") x -= w;
      else if (o.rata === "tengah") x -= w / 2;
      ops.push(
        warna(o.warna || [0, 0, 0]) + " rg BT /" + (o.tebal ? "F2" : "F1") + " " + ukuran +
        " Tf 1 0 0 1 " + n(x) + " " + n(TINGGI_HAL - yBaris) + " Tm (" + esc(s) + ") Tj ET"
      );
    }
    function persegi(x, yAtas, w, h, c) {
      ops.push(warna(c) + " rg " + n(x) + " " + n(TINGGI_HAL - yAtas - h) + " " + n(w) + " " + n(h) + " re f");
    }
    function garisH(x1, x2, yy, c) {
      ops.push("0.5 w " + warna(c) + " RG " + n(x1) + " " + n(TINGGI_HAL - yy) + " m " + n(x2) + " " + n(TINGGI_HAL - yy) + " l S");
    }
    function cek(tinggi) {
      if (y + tinggi > BATAS_BAWAH) halamanBaru();
    }

    // ----- Elemen dokumen -----
    this.judulBesar = function (s) {
      y += 18;
      teks(s, MARGIN, y, { ukuran: 18, tebal: true });
      y += 6;
    };
    this.baris = function (s) {
      y += 14;
      teks(s, MARGIN, y, { ukuran: 10, warna: [90, 90, 90] });
    };
    this.subjudul = function (s) {
      cek(60);
      y += 26;
      teks(s, MARGIN, y, { ukuran: 12, tebal: true });
      y += 6;
    };
    this.spasi = function (px) {
      y += px;
    };

    // o.kolom = [{judul, lebar, rata}], o.baris = [[...]], o.foot = [...], o.warnaTeks(baris, kolomKe)
    this.tabel = function (o) {
      const kolom = o.kolom;
      const lebarTotal = kolom.reduce(function (j, k) { return j + k.lebar; }, 0);
      const ukuran = 9.5;

      function sel(s, x, yAtas, k, opsi) {
        const maks = k.lebar - PAD * 2;
        const t = potong(bersih(s), maks, ukuran, opsi.tebal);
        let xx = x + PAD;
        if (k.rata === "kanan") xx = x + k.lebar - PAD;
        else if (k.rata === "tengah") xx = x + k.lebar / 2;
        teks(t, xx, yAtas + TINGGI_BARIS - 6, {
          ukuran: ukuran, tebal: opsi.tebal, warna: opsi.warna, rata: k.rata,
        });
      }

      function kepala() {
        persegi(MARGIN, y, lebarTotal, TINGGI_BARIS, BIRU);
        let x = MARGIN;
        kolom.forEach(function (k) {
          sel(k.judul, x, y, k, { tebal: true, warna: [255, 255, 255] });
          x += k.lebar;
        });
        y += TINGGI_BARIS;
      }

      cek(TINGGI_BARIS * 3);
      kepala();

      o.baris.forEach(function (b, i) {
        if (y + TINGGI_BARIS > BATAS_BAWAH) {
          halamanBaru();
          kepala();
        }
        if (i % 2 === 1) persegi(MARGIN, y, lebarTotal, TINGGI_BARIS, [243, 244, 246]);
        let x = MARGIN;
        b.forEach(function (v, j) {
          const w = o.warnaTeks ? o.warnaTeks(b, j) : null;
          sel(String(v), x, y, kolom[j], { tebal: !!w, warna: w || [0, 0, 0] });
          x += kolom[j].lebar;
        });
        garisH(MARGIN, MARGIN + lebarTotal, y + TINGGI_BARIS, [229, 231, 235]);
        y += TINGGI_BARIS;
      });

      if (o.foot) {
        if (y + TINGGI_BARIS > BATAS_BAWAH) {
          halamanBaru();
          kepala();
        }
        persegi(MARGIN, y, lebarTotal, TINGGI_BARIS, [229, 231, 235]);
        let x = MARGIN;
        o.foot.forEach(function (v, j) {
          sel(String(v), x, y, kolom[j], { tebal: true, warna: [0, 0, 0] });
          x += kolom[j].lebar;
        });
        y += TINGGI_BARIS;
      }
    };

    // ----- Hasil akhir: isi file PDF dalam bentuk byte -----
    this.bytes = function () {
      // Nomor halaman di kaki tiap halaman
      for (let i = 0; i < halaman.length; i++) {
        ops = halaman[i];
        teks("Halaman " + (i + 1) + " dari " + halaman.length, LEBAR_HAL / 2, TINGGI_HAL - 24, {
          ukuran: 9, warna: [120, 120, 120], rata: "tengah",
        });
      }

      // Objek PDF: 1 katalog, 2 daftar halaman, 3-4 font, lalu pasangan (halaman, isi) per halaman
      const objek = [];
      const anak = [];
      halaman.forEach(function (_, i) { anak.push(5 + 2 * i + " 0 R"); });
      objek[1] = "<< /Type /Catalog /Pages 2 0 R >>";
      objek[2] = "<< /Type /Pages /Kids [" + anak.join(" ") + "] /Count " + halaman.length + " >>";
      objek[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
      objek[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
      halaman.forEach(function (perintah, i) {
        const isi = perintah.join("\n");
        objek[5 + 2 * i] =
          "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + LEBAR_HAL + " " + TINGGI_HAL + "] " +
          "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + (6 + 2 * i) + " 0 R >>";
        objek[6 + 2 * i] = "<< /Length " + isi.length + " >>\nstream\n" + isi + "\nendstream";
      });

      let out = "%PDF-1.4\n";
      const posisi = [];
      for (let i = 1; i < objek.length; i++) {
        posisi[i] = out.length;
        out += i + " 0 obj\n" + objek[i] + "\nendobj\n";
      }
      const xref = out.length;
      out += "xref\n0 " + objek.length + "\n0000000000 65535 f \n";
      for (let i = 1; i < objek.length; i++) {
        out += String(posisi[i]).padStart(10, "0") + " 00000 n \n";
      }
      out += "trailer\n<< /Size " + objek.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";

      // Semua karakter <= 255, jadi 1 karakter = 1 byte
      const hasil = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++) hasil[i] = out.charCodeAt(i);
      return hasil;
    };
  }

  return { Dokumen: Dokumen, lebarTeks: lebarTeks, W_NORMAL: W_NORMAL, W_TEBAL: W_TEBAL };
})();
