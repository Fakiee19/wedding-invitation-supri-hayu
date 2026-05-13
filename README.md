# Undangan Pernikahan — Supriyadi & Hayu Kartikasari

Situs undangan statis (HTML/CSS/JS) dengan animasi premium, backend **Google Spreadsheet + Apps Script** untuk RSVP dan ucapan tamu.

## Struktur folder

```
/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── appscript.gs          ← salin ke Google Apps Script (bukan di-host di web)
├── assets/
│   ├── README.txt        ← daftar aset opsional
│   ├── hero.mp4          ← (opsional) video hero
│   ├── music.mp3         ← (opsional) backsound
│   └── qris.png          ← (opsional) gambar QRIS
└── README.md
```

## Persiapan aset (opsional)

- **hero.mp4**: video cinematic pendek, loop; jika tidak ada, latar tetap dari gambar + poster.
- **music.mp3**: instrumental; browser biasanya memblok autoplay sampai pengguna mengetuk **Buka Undangan** atau tombol musik.
- **qris.png**: ganti placeholder di section hadiah (tambahkan `<img>` di `index.html` jika perlu).
- **Foto mempelai / OG**: ganti URL Picsum di `index.html` dengan file lokal di `assets/` dan perbarui `og:image`.

## Google Spreadsheet

### Struktur sheet `RSVP`

| Kolom A     | Kolom B    | Kolom C   | Kolom D           | Kolom E     | Kolom F      |
|------------|------------|-----------|-------------------|-------------|--------------|
| Timestamp  | Nama Tamu  | WhatsApp  | Jumlah Kehadiran  | Konfirmasi  | Ucapan & Doa |

Baris pertama = header (dibuat otomatis oleh `setupSheets()`).

### Google Apps Script

1. Buka [Google Sheets](https://sheets.google.com) → spreadsheet baru.
2. Salin **ID** spreadsheet dari URL:  
   `https://docs.google.com/spreadsheets/d/`**`SPREADSHEET_ID`**`/edit`
3. **Extensions** → **Apps Script** → tempel isi file **`appscript.gs`**.
4. Di `appscript.gs`, ganti `ISI_SPREADSHEET_ID_ANDA` dengan ID tersebut.
5. Di editor Apps Script, pilih fungsi **`setupSheets`** → **Run** (izinkan akses spreadsheet).
6. **Deploy** → **New deployment** → ikon roda gigi → **Web app**:
   - **Execute as**: Me
   - **Who has access**: Anyone
7. Salin **URL Web App** (berakhiran `/exec`).

### Endpoint API

- **GET** — daftar ucapan (kolom ucapan terisi), terbaru di atas:  
  `URL_WEB_APP?action=wishes`
- **POST** — body `application/x-www-form-urlencoded`:  
  - `action=rsvp`  
  - `data=` JSON string:  
    `{"name":"","phone":"","count":"1","attendance":"Hadir|Tidak Hadir","wish":""}`

### Integrasi di website

Di **`js/script.js`**, ubah:

```js
const WEB_APP_URL = "https://script.google.com/macros/s/....../exec";
```

Tanpa URL yang valid, RSVP akan memunculkan peringatan dan ucapan tidak dimuat.

**Peta embed:** di `index.html`, ganti `src` iframe Google Maps dengan embed dari lokasi pasti (Maps → Share → Embed map).

## Hosting

### Vercel

1. Push proyek ke GitHub/GitLab (atau pakai [Vercel CLI](https://vercel.com/docs/cli)).
2. **Vercel** → **Add New** → **Project** → import repo.
3. **Root directory**: folder proyek ini; **Framework Preset**: Other / static.
4. Deploy. Setelah live, perbarui `canonical` dan `og:url` / `og:image` di `index.html` ke domain Anda.

### Netlify

1. **Sites** → **Add new site** → **Deploy manually** (drag folder) atau hubungkan Git.
2. **Publish directory**: root (berisi `index.html`).
3. Setelah deploy, sesuaikan meta URL di `index.html`.

Keduanya cocok untuk situs statis tanpa build step.

## Performa & SEO

- Font dengan `preconnect`; gambar galeri **lazy** + `data-src`.
- Gunakan file gambar sendiri (WebP/AVIF) menggantikan Picsum untuk produksi.
- Sesuaikan title, description, dan Open Graph di `<head>`.

## Lisensi penggunaan

Desain dan kode untuk keperluan undangan mempelai; font dan library mengikuti lisensi masing-masing (Google Fonts, GSAP, Lenis, AOS, Lucide, CDN).
