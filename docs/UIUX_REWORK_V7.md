# NUCLEA ERP — UI/UX Rework v7 "Lead & Cherenkov"

Rombak visual menyeluruh. **Tidak ada perubahan route, query, nama field form, `id`, atau logika backend** — hanya lapisan tampilan (CSS + markup EJS).

## 1. Konsep template

NUCLEA memproduksi radiofarmaka, jadi antarmukanya dirancang seperti **konsol hot-cell**: tenang, presisi, dan bisa dibaca saat ritme kerja tinggi.

- **Shell berwarna timbal (lead-ink)**: sidebar gelap permanen. Logo NUCLEA memang dibuat untuk latar gelap (huruf perak + biru), jadi di sini akhirnya terbaca penuh.
- **Meja kerja dingin berwarna netral**: halaman abu kebiruan, konten di atas "lembar" putih bergaris tipis (bukan kartu bayangan).
- **Satu warna bercahaya — biru Cherenkov**: hanya dipakai untuk fokus, menu aktif, aksi utama, dan status "in process". Warna lain hanya untuk makna status GMP.
- **Satu momen yang diingat**: indikator menu aktif yang menyala di sidebar, dan kurva peluruhan (half-life) di halaman login.

### Referensi (pola, bukan salinan)
| ERP / sistem | Yang diambil |
|---|---|
| SAP Fiori (Horizon) | Shell bar tetap + breadcrumb hierarki, toolbar tabel, judul kolom sentence-case |
| Oracle Redwood | Permukaan netral dominan dengan satu aksen, hierarki tipografi yang jelas |
| Odoo | Navigasi dikelompokkan per area kerja, satu aksi utama per layar |
| Veeva Vault / MasterControl (QMS & batch record farmasi) | Status record berkode warna tetap (released, quarantine, rejected, hold) dan selalu disertai teks |
| Linear / Stripe Dashboard | Angka tabular, fokus keyboard yang jelas, ketenangan visual |

## 2. Design tokens (`public/css/nuclea-ds.css`)

**Warna**
| Peran | Token | Light |
|---|---|---|
| Shell | `--lead-950 … --lead-100` | `#0A131B` → `#D6E0E8` |
| Aksi / fokus | `--ch-600` (primary), `--ch-400` (glow & dark mode) | `#0A76A8`, `#2AA8DE` |
| Halaman / lembar | `--nu-page`, `--nu-sheet`, `--nu-sunken` | `#EDF1F4`, `#FFFFFF`, `#F4F7F9` |
| Garis | `--nu-line`, `--nu-hair`, `--nu-input-line` | `#D9E2E9`, `#E7EDF1`, `#8497A6` |
| Released / OK | `--st-ok` | `#17825A` |
| Quarantine / perhatian | `--st-warn` | `#E2A010` |
| Rejected / OOS | `--st-bad` | `#C2362B` |
| In process | `--st-info` | `#0A76A8` |
| Hold | `--st-hold` | `#6B4FBB` |

Tema gelap memakai nama token yang sama (`[data-bs-theme="dark"]`), jadi tombol tema di header tetap berfungsi tanpa perubahan.

**Tipografi** — Bricolage Grotesque (judul, angka KPI) · IBM Plex Sans (UI & tabel, angka tabular) · IBM Plex Mono (kode/identifier). Judul kolom tabel dan label memakai sentence-case, bukan huruf kapital.

**Bentuk** — empat tingkat radius: chip 5px, kontrol 7px, lembar 10px, modal 14px. Lembar tanpa bayangan; bayangan hanya untuk overlay (modal, dropdown).

**Tekstur & efek** — kisi heksagon sangat tipis di latar halaman (gema motif molekul di artwork brand), grain halus + cahaya Cherenkov di sidebar, kurva peluruhan di panel login. Semua statis, tanpa animasi.

## 3. Komponen

Semua komponen Bootstrap yang sudah dipakai di 40 view otomatis mengikuti tema, karena variabel `--bs-*` dijembatani dan varian tombol/input/badge/alert ditimpa secara global.

- **Tombol** — `btn-primary` (aksi utama), `btn-outline-secondary` (aksi sekunder), `btn-dark`, `btn-success/danger/warning`, ukuran `btn-sm` 30px, normal 36px.
- **Kolom input** — tinggi 38px, garis 3:1 terhadap latar, cincin fokus Cherenkov, `readonly/disabled` tampil sunken.
- **Badge → chip status** — `badge bg-success/warning/danger/primary/secondary` otomatis menjadi chip lembut berteks. Badge penghitung notifikasi tetap solid. Kelas baru opsional: `.chip .chip-ok .chip-warn .chip-bad .chip-info .chip-hold`.
- **Tabel** — header sunken sentence-case, garis tipis, hover biru muda; striping & `table-warning` Bootstrap tetap bekerja.
- **Modal / dropdown / SweetAlert2** — radius 14/10, bayangan overlay, warna dari token.

## 4. File yang disentuh

| File | Perubahan |
|---|---|
| `public/css/nuclea-ds.css` | **Baru** — seluruh design system |
| `views/partials/header.ejs` | ±290 baris CSS inline yang bertumpuk diganti satu `<link>`; font baru; `polyfill.io` dihapus |
| `views/partials/sidebar.ejs` | Label grup sentence-case, `aria-current`, landmark `nav` |
| `views/partials/headbar.ejs` | Tombol ikon & avatar pakai kelas baru; `<style>` lokal dipindah ke CSS |
| `views/partials/footer.ejs` | Warna toast dari token (logika JS modalize/heartbeat tidak diubah) |
| `views/partials/layout.ejs` | Wrapper legacy kini memakai shell yang sama |
| `views/dashboard.ejs` | Header + pintasan modul sesuai role, strip instrumen KPI, warna Chart.js dari token |
| `views/login.ejs`, `views/signup.ejs` | Layout split, field/route/ID alur autentikasi tidak berubah |
| `views/production/{calculation,masterlist,schedule,tracking}.ejs`, `views/scm/{distribution,tracking}.ejs`, `views/roadmap/assets.ejs`, `views/profile.ejs` | CSS lokal dipetakan ke token; grafik peluruhan memakai warna aksen |

**Sengaja tidak diubah:** `labels/print.ejs`, `erp/delivery-order-print.ejs`, `roadmap/record-print.ejs` (dokumen cetak/controlled record), serta semua file backend.

## 5. Konektivitas antar modul

Perbandingan otomatis `action`, `href`, `id`, `name`, `data-*`, dan jumlah ekspresi `<% %>` antara versi asli dan hasil rombak: **tidak ada token wiring yang hilang** di halaman fungsional. Penambahan hanya berupa stylesheet baru, `id` label untuk aksesibilitas, dan tiga tautan pintasan dashboard ke route yang sudah ada (`/manufacturing/planning`, `/manufacturing/execution`, `/erp/distribution`).

## 6. Verifikasi & batasan

- Kompilasi sintaks 53 template EJS (pemeriksa EJS-kompatibel offline) dan `node --check` untuk `index.js`, `erp-integrated.js`, `roadmap-erp.js`: lolos.
- Login, signup, dan dashboard dirender dengan data contoh dan diperiksa di 1440px (terang & gelap) dan 390px: tanpa overflow horizontal.
- **Belum diuji di browser dengan CDN penuh**: Bootstrap 5.3, Bootstrap Icons, dan Google Fonts tidak bisa dimuat di lingkungan pengerjaan. Halaman modul berbasis tabel/form (inventory, batch record, partner, dst.) divalidasi lewat struktur CSS dan perbandingan markup, bukan tangkapan layar. Jalankan `npm run check`, lalu telusuri tiap modul dengan `docs/UAT_CHECKLIST_V6.md` sebelum dipakai.
- Warna status tidak pernah menjadi satu-satunya penanda: badge selalu memuat teks status.

## 7. Menyesuaikan

Ubah warna/radius/font cukup di blok `:root` dan `[data-bs-theme="dark"]` pada `public/css/nuclea-ds.css`. Naikkan `?v=7` pada `<link>` di `header.ejs`, `login.ejs`, `signup.ejs` bila perlu memaksa browser memuat ulang.

## 8. Catatan keamanan

- `header.ejs` memuat `polyfill.io`, domain yang pernah dibajak untuk menyisipkan skrip berbahaya. Dihapus karena browser modern tidak memerlukannya.
- `simple-datatables@latest` dan `chart.js` dimuat tanpa versi terkunci; kunci ke versi tertentu sebelum produksi.
