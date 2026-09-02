# Panduan Integrasi Inline Editor

Dokumen ini menjelaskan cara mengaktifkan fitur edit-inline (`editor.js` + `editor.css`) di template HTML apa pun. Editor ini bekerja murni berdasarkan **atribut `data-*`**, jadi bisa dipakai di desain/template mana saja tanpa mengubah kode JS.

---

## 1. Cara Pasang

Tambahkan dua file ini di halaman:

```html
<link rel="stylesheet" href="static/editor.css">
```

```html
<script src="static/editor.js"></script>
```

Setelah itu, editor otomatis aktif untuk elemen mana pun di halaman yang punya atribut yang dijelaskan di bawah — tidak perlu inisialisasi manual.

### Syarat agar Save berfungsi

- URL halaman **wajib** mengandung `?website_id=...`, karena ID ini dipakai editor untuk tahu halaman mana yang sedang disimpan.
- Saat halaman dimuat, editor otomatis mengarahkan user ke login Keycloak jika belum login. Save tidak akan bisa dipakai tanpa sesi login yang valid — ini di luar kendali template, jadi cukup pastikan halaman diakses lewat alur yang sudah terhubung ke Keycloak.
- Domain diambil otomatis dari `?domain=...` di URL, atau kalau tidak ada, dari hostname halaman itu sendiri. Tidak perlu diatur manual di template.

Ketiga hal di atas murni soal environment/deploy, bukan sesuatu yang ditulis di HTML template.

---

## 2. Field Teks Biasa (`data-editor="text"`)

Untuk konten satuan (judul, deskripsi, harga, dll) yang bukan bagian dari daftar/array.

### Atribut yang dipakai

| Atribut | Wajib? | Keterangan |
|---|---|---|
| `data-editor="text"` | Ya | Menandai elemen ini bisa diklik untuk diedit |
| `data-name="..."` | Ya | Nama field, jadi *key* saat disimpan |
| `data-editor-maxlength="..."` | Opsional | Batas jumlah karakter. Kalau user melebihi batas, teks otomatis dipotong dan muncul notifikasi |

### Contoh sederhana

```html
<h1 data-editor="text" data-name="title">Judul Halaman</h1>
<p data-editor="text" data-name="subtitle" data-editor-maxlength="120">
  Deskripsi singkat di bawah judul.
</p>
```

Saat disimpan, payload yang dikirim ke `onSave` akan berbentuk:

```json
{
  "fields": {
    "title": "Judul Halaman",
    "subtitle": "Deskripsi singkat di bawah judul."
  },
  "collections": {},
  "deletedItems": {}
}
```

### ⚠️ Aturan penting: satu `data-name` = satu titik edit

Kalau nilai yang sama tampil di beberapa tempat di halaman (misalnya judul muncul di navbar, hero, dan footer), **jangan** kasih `data-editor="text"` dengan `data-name` yang sama di lebih dari satu elemen. Karena key-nya sama, elemen yang diedit terakhir akan menimpa yang lain saat disimpan.

Solusinya: pilih **satu** lokasi sebagai titik edit "kanonik" (biasanya yang paling utama/terlihat jelas), lokasi lain biarkan tampil apa adanya — nanti otomatis ikut ter-update setelah data disimpan dan halaman di-render ulang dari server.

```html
<!-- Kanonik: boleh diedit -->
<h1 data-editor="text" data-name="title">{{ .title }}</h1>

<!-- Duplikat tampilan saja: TIDAK diberi data-editor -->
<div class="brand">{{ .title }}</div>
```

### Perilaku edit yang perlu diketahui (tidak perlu diatur, otomatis)

- Klik pada field langsung masuk mode edit (contentEditable), cursor otomatis diletakkan di akhir teks.
- User boleh mengedit beberapa field sekaligus sebelum menekan Save — tidak harus satu-satu.
- Paste dari clipboard otomatis dipaksa jadi plain text, jadi format/HTML dari sumber luar (mis. copy dari Word) tidak ikut masuk.
- `Esc` = batalkan semua perubahan (dengan konfirmasi), `Ctrl/Cmd+Enter` = simpan.
- Menutup/meninggalkan halaman saat ada perubahan belum tersimpan akan memunculkan konfirmasi browser.

---

## 3. Koleksi / Array (`data-editor-collection`)

Untuk data berulang seperti daftar fitur, testimoni, harga paket, sesi kelas, dll — di mana user perlu bisa **menambah** dan **menghapus** item, bukan cuma edit teks.

**Tombol "+ Tambah" dan tombol hapus per-item TIDAK perlu ditulis di HTML.** Keduanya otomatis di-generate oleh `editor.js` saat halaman load. Template cukup berisi data mentah + penanda `data-*`, tidak ada elemen UI editor sama sekali.

### Atribut yang dipakai

| Atribut | Ditaruh di | Wajib? | Keterangan |
|---|---|---|---|
| `data-editor-collection="nama_koleksi"` | Container (div/ul) | Ya | Nama koleksi, jadi *key* saat disimpan |
| `data-editor-add-label="+ Tambah ..."` | Container yang sama | Opsional | Teks tombol tambah. Default: "+ Tambah item" |
| `data-editor-template="#id-template"` | Container yang sama | Opsional | Selector ke `<template>` custom. Kalau tidak diisi, item baru otomatis diturunkan dari item pertama yang sudah ada (isinya dikosongkan) |
| `data-editor-item` | Setiap item | Ya | Menandai elemen ini satu item dalam koleksi |
| `data-item-id="..."` | Setiap item yang sudah ada (bukan baru) | Ya | ID unik item, biasanya index/ID dari database |
| `data-editor="text"` + `data-name="..."` | Field di dalam item | Ya | Sama seperti field biasa, tapi otomatis dikelompokkan ke koleksinya |

Tombol tambah dan tombol hapus (`data-editor-action="add-item"` / `"delete-item"`) tetap boleh ditulis manual kalau butuh styling/posisi khusus — script akan mendeteksi dan **tidak** membuat duplikat. Tapi untuk kebanyakan kasus, biarkan auto-generated saja.

### Contoh sederhana: daftar fitur (array string)

```html
<div class="feature-grid"
     data-editor-collection="features"
     data-editor-add-label="+ Tambah fitur">

  <!-- Item yang sudah ada, dari data server. Cukup ini saja, tanpa
       tombol hapus atau markup editor apa pun. -->
  <div class="feature-item" data-editor-item data-item-id="0">
    <span data-editor="text" data-name="text">Materi video HD</span>
  </div>

  <div class="feature-item" data-editor-item data-item-id="1">
    <span data-editor="text" data-name="text">Akses seumur hidup</span>
  </div>
</div>
```

Itu saja. Saat halaman dimuat, `editor.js` otomatis:
1. Menambahkan tombol hapus (×) ke setiap `.feature-item`
2. Menambahkan tombol "+ Tambah fitur" di akhir container
3. Menyiapkan item baru dengan meng-clone struktur item pertama (field teksnya dikosongkan)

Payload yang dihasilkan:

```json
{
  "fields": {},
  "collections": {
    "features": [
      { "id": "0", "text": "Materi video HD" },
      { "id": "1", "text": "Akses seumur hidup" },
      { "id": "new-1729-ab12cd", "text": "Fitur baru" }
    ]
  },
  "deletedItems": {}
}
```

> Item baru punya ID sementara berformat `new-<timestamp>-<random>` — backend cukup mengabaikan/menimpanya dengan ID asli saat menyimpan ke database.

### Contoh: item dengan lebih dari satu field (mis. `stats`)

Kalau satu item punya beberapa nilai (bukan cuma satu teks), tambahkan beberapa `data-editor="text"` dalam satu `data-editor-item`:

```html
<div class="stat-row" data-editor-collection="stats" data-editor-add-label="+ Tambah statistik">
  <div class="stat" data-editor-item data-item-id="0">
    <div data-editor="text" data-name="value">500+</div>
    <div data-editor="text" data-name="label">Siswa aktif</div>
  </div>
</div>
```

Tidak perlu `<template>` — karena sudah ada satu item contoh (`data-item-id="0"`), item baru otomatis mengikuti struktur dua field itu (value + label) dengan isi dikosongkan. Hasilnya, satu item jadi satu object dengan dua field:

```json
{
  "collections": {
    "stats": [
      { "id": "0", "value": "500+", "label": "Siswa aktif" }
    ]
  }
}
```

### ⚠️ Kalau container-nya `<ul>`

Tidak perlu penanganan khusus — cukup pasang atributnya seperti biasa:

```html
<ul data-editor-collection="benefits" data-editor-add-label="+ Tambah benefit">
  <li data-editor-item data-item-id="0">
    <span data-editor="text" data-name="text">Gratis konsultasi</span>
  </li>
</ul>
```

`editor.js` otomatis tahu kalau container-nya `<ul>`/`<ol>` dan akan membungkus tombol "+ Tambah" dengan `<li>` sendiri (karena `<button>` tidak valid sebagai anak langsung `<ul>`), jadi HTML tetap valid tanpa Anda perlu memikirkannya.

---

## 4. Hapus Item Lama vs Item Baru

Perilakunya beda otomatis, tidak perlu setting tambahan:

- **Item baru** (belum pernah disimpan) → klik hapus langsung membuang dari DOM, tidak masuk ke payload sama sekali.
- **Item lama** (sudah punya `data-item-id` dari server) → klik hapus hanya menandai visual "akan dihapus" (masih bisa dibatalkan lewat tombol Cancel, atau lewat `Esc`). ID-nya masuk ke `payload.deletedItems`:

```json
{
  "deletedItems": {
    "features": ["3", "7"]
  }
}
```

---

## 5. Menyimpan ke Backend (opsional untuk override)

Secara default, Save sudah otomatis mengirim payload ke backend (`POST /api/websites/save`) lengkap dengan `website_id`, `domain`, dan token login Keycloak di header `Authorization`. Untuk kebutuhan template biasa, **tidak ada yang perlu dikonfigurasi** di bagian ini.

Kalau butuh perilaku custom (misalnya endpoint berbeda atau integrasi khusus), `onSave` bisa ditimpa lewat:

```html
<script>
  InlineEditor.configure({
    onSave: async (payload) => {
      const res = await fetch("/api/page/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return { ok: false, message: "Gagal menyimpan ke server" };
      }
      return { ok: true };
    },
  });
</script>
```

Taruh script ini **setelah** `<script src="static/editor.js"></script>`.

---

## 6. Checklist Cepat Integrasi ke Template Baru

- [ ] `editor.css` dan `editor.js` sudah di-link di halaman
- [ ] Halaman diakses dengan `?website_id=...` di URL
- [ ] Field satuan (judul, deskripsi, harga, dll) → `data-editor="text" data-name="..."`
- [ ] Tidak ada `data-name` yang sama dipakai di lebih dari satu elemen edit
- [ ] Daftar berulang (fitur, testimoni, dll) → container dengan `data-editor-collection="..."`
- [ ] Tiap item punya `data-editor-item` dan `data-item-id` (untuk item yang sudah ada)
- [ ] Minimal ada 1 item contoh di setiap koleksi (jadi acuan struktur item baru) — atau sediakan `<template>` kalau koleksinya boleh kosong sejak awal
- [ ] Tombol tambah/hapus **tidak perlu ditulis manual** — cukup pastikan tidak sengaja menghapus behavior default-nya

---

## 7. Batasan Saat Ini

- Hanya mengedit **teks** (`textContent`), belum bisa edit atribut seperti `href`, `src`, atau `data-*` lain.
- Belum ada fitur *reorder* (drag untuk mengubah urutan item dalam koleksi).
- Satu toolbar global per halaman — didesain untuk satu sesi edit per page load, bukan multi-editor independen dalam satu halaman.
- Kalau koleksi dimulai dalam keadaan kosong (tidak ada item contoh sama sekali) dan tidak diberi `data-editor-template`, tombol "+ Tambah" tidak akan tahu struktur item yang harus dibuat — wajib sediakan minimal satu item contoh atau satu `<template>` untuk kasus ini.