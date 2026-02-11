# Google Apps Script - CRUD API

## URL Web App
```
https://script.google.com/macros/s/AKfycbxJYL__OE81FMUFKbXecW3T2HFiFwM7RozLje293UQF6X6WNIqgtuJHAF3A6sCyPTNKqw/exec
```

URL ini sudah dikonfigurasi secara default di aplikasi.

## API Endpoints

### GET - Read Data
```
GET {URL}?action=read&sheet=siswa
GET {URL}?action=readOne&sheet=siswa&row=2
```

### POST - Create Data
```json
POST {URL}
Content-Type: text/plain

{
  "action": "create",
  "sheet": "siswa",
  "data": {
    "Nis": "12345",
    "Nama": "Budi",
    "Tanggal Lahir": "2000-01-01"
  }
}
```

### POST - Update Data
```json
POST {URL}
Content-Type: text/plain

{
  "action": "update",
  "sheet": "siswa",
  "row": 2,
  "data": {
    "Nis": "12345",
    "Nama": "Budi Updated"
  }
}
```

### POST - Delete Data
```json
POST {URL}
Content-Type: text/plain

{
  "action": "delete",
  "sheet": "siswa",
  "row": 2
}
```

### POST - Search Data
```json
POST {URL}
Content-Type: text/plain

{
  "action": "search",
  "sheet": "siswa",
  "searchField": "Nama",
  "searchValue": "Budi"
}
```

### POST - Bulk Create
```json
POST {URL}
Content-Type: text/plain

{
  "action": "bulkCreate",
  "sheet": "siswa",
  "data": [
    { "Nis": "001", "Nama": "Siswa 1" },
    { "Nis": "002", "Nama": "Siswa 2" }
  ]
}
```

## Sheet Keys
| Key | Spreadsheet | Sheet Name |
|-----|------------|------------|
| `siswa` | Data Siswa | Siswa |
| `presensi` | Presensi Siswa | Presensi |
| `perkembangan` | Perkembangan Belajar | Perkembangan |
| `nilaiUtbk` | Nilai Siswa | Nilai UTBK |
| `nilaiTkaSma` | Nilai Siswa | Nilai TKA SMA |
| `nilaiTkaSmp` | Nilai Siswa | Nilai TKA SMP |
| `nilaiTkaSd` | Nilai Siswa | Nilai TKA SD |
| `nilaiUtbk` | Nilai Siswa | Nilai UTBK |
| `nilaiTkaSma` | Nilai Siswa | Nilai TKA SMA |
| `nilaiTkaSmp` | Nilai Siswa | Nilai TKA SMP |
| `nilaiTkaSd` | Nilai Siswa | Nilai TKA SD |
| `nilaiTesStandar` | Nilai Siswa | Nilai Tes Standar |
| `nilaiEvaluasi` | Nilai Siswa | Nilai TES EVALUASI |
| `pelayanan` | Pelayanan | Pelayanan |
| `pengajar` | Nama Pengajar | Pengajar |

## Cara Update Apps Script

Jika perlu mengubah kode Apps Script:
1. Buka project di [script.google.com](https://script.google.com)
2. Edit kode di `Code.gs`
3. Klik **Deploy** → **Manage deployments**
4. Klik ✏️ Edit pada deployment aktif
5. Ganti Version ke **New version**
6. Klik **Deploy**
7. URL tetap sama, tidak perlu diubah di aplikasi

## Catatan Penting
- Content-Type menggunakan `text/plain` untuk menghindari CORS preflight
- Body tetap dikirim dalam format JSON string
- Timestamp otomatis ditambahkan saat Create dan Update
- Row index dimulai dari 2 (baris 1 adalah header)
