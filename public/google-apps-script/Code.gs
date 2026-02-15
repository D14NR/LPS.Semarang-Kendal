/**
 * ============================================================
 * GOOGLE APPS SCRIPT - CRUD API untuk Sistem Manajemen Akademik
 * ============================================================
 * 
 * URL DEPLOY: 
 * https://script.google.com/macros/s/AKfycbxJYL__OE81FMUFKbXecW3T2HFiFwM7RozLje293UQF6X6WNIqgtuJHAF3A6sCyPTNKqw/exec
 * 
 * CARA DEPLOY:
 * 1. Buka https://script.google.com
 * 2. Buat project baru atau buka project yang sudah ada
 * 3. Copy-paste seluruh kode ini ke dalam Code.gs
 * 4. Klik "Deploy" > "New deployment" 
 * 5. Pilih type "Web app"
 * 6. Set "Execute as" = "Me"
 * 7. Set "Who has access" = "Anyone"
 * 8. Klik "Deploy"
 * 9. Copy URL web app yang diberikan
 * 
 * PENTING: Setiap kali mengubah kode, buat "New deployment" atau
 * "Manage deployments" > Edit > Version "New version" > Deploy
 * ============================================================
 */

// ===================== KONFIGURASI SPREADSHEET =====================
var SPREADSHEET_CONFIG = {
  siswa: {
    spreadsheetId: '1qN1MJ7kVRbSnsV9-WblGikHmCTzLZOTezmuUBgrZ3-k',
    sheetName: 'Siswa',
    headers: ['Nis', 'Nama', 'Tanggal Lahir', 'Asal Sekolah', 'Jenjang Studi', 'No.whatsapp siswa', 'No.whatsapp orang tua', 'Email', 'Kelompok Kelas', 'Cabang', 'Timestamp']
  },
  kelompokKelas: {
    spreadsheetId: '1qN1MJ7kVRbSnsV9-WblGikHmCTzLZOTezmuUBgrZ3-k',
    sheetName: 'Kelompok Kelas',
    headers: ['Kelompok Kelas', 'Timestamp']
  },
  presensi: {
    spreadsheetId: '13oDDldQdcVBg5ai3nS9oGtYuq8ijWsloNRmXK87IHnw',
    sheetName: 'Presensi',
    headers: ['Nis', 'Nama', 'Tanggal', 'Kelas', 'Mata Pelajaran', 'Status', 'Cabang', 'Timestamp']
  },
  perkembangan: {
    spreadsheetId: '1fZmtYB5nPslds7pjQ6sIDHfVYTf_wg1KeTXbmKeUBMw',
    sheetName: 'Perkembangan',
    headers: ['Nis', 'Nama', 'Tanggal', 'Mata Pelajaran', 'Materi', 'Penguasaan', 'Penjelasan', 'Kondisi', 'Catatan', 'Cabang', 'Timestamp']
  },
  nilaiUtbk: {
    spreadsheetId: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheetName: 'Nilai UTBK',
    headers: ['Nis', 'Nama Siswa', 'Tanggal', 'Jenis Tes', 'PU', 'PPU', 'PBM', 'PK', 'LIB', 'LING', 'PM', 'Rerata', 'Total', 'Cabang', 'Timestamp']
  },
  nilaiTkaSma: {
    spreadsheetId: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheetName: 'Nilai TKA SMA',
    headers: ['Nis', 'Nama Siswa', 'Tanggal', 'Jenis Tes', 'MTK', 'B.INDO', 'B.ING', 'MTK TL', 'FIS', 'KIM', 'BIO', 'GEO', 'SEJ', 'SOS', 'EKO', 'PP', 'PKWU', 'IND TL', 'ING TL', 'Rerata', 'Total', 'Cabang', 'Timestamp']
  },
  nilaiTkaSmp: {
    spreadsheetId: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheetName: 'Nilai TKA SMP',
    headers: ['Nis', 'Nama Siswa', 'Tanggal', 'Jenis Tes', 'MTK', 'B.INDO', 'Rerata', 'Total', 'Cabang', 'Timestamp']
  },
  nilaiTkaSd: {
    spreadsheetId: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheetName: 'Nilai TKA SD',
    headers: ['Nis', 'Nama Siswa', 'Tanggal', 'Jenis Tes', 'MTK', 'B.INDO', 'Rerata', 'Total', 'Cabang', 'Timestamp']
  },
  nilaiTesStandar: {
    spreadsheetId: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheetName: 'Nilai Tes Standar',
    headers: ['Nis', 'Nama Siswa', 'Tanggal', 'Jenis Tes', 'MTK', 'B.INDO', 'B.ING', 'MTK TL', 'FIS', 'KIM', 'BIO', 'GEO', 'SEJ', 'SOS', 'EKO', 'PP', 'IPA', 'IPS', 'PKWU', 'IND TL', 'ING TL', 'PU', 'PPU', 'PBM', 'PK', 'LIB', 'LING', 'PM', 'Rerata', 'Total', 'Cabang', 'Timestamp']
  },
  nilaiEvaluasi: {
    spreadsheetId: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheetName: 'Nilai TES EVALUASI',
    headers: ['Nis', 'Nama Siswa', 'Tanggal', 'Jenis Tes', 'MTK', 'B.INDO', 'B.ING', 'MTK TL', 'FIS', 'KIM', 'BIO', 'GEO', 'SEJ', 'SOS', 'EKO', 'PP', 'IPA', 'IPS', 'PKWU', 'IND TL', 'ING TL', 'PU', 'PPU', 'PBM', 'PK', 'LIB', 'LING', 'PM', 'Rerata', 'Total', 'Cabang', 'Timestamp']
  },
  pelayanan: {
    spreadsheetId: '1KcsMCeFmGAmwKHFqnIxiUxDmLDpR6YDBZBd8Zbd-s6w',
    sheetName: 'Pelayanan',
    headers: ['Nis', 'Nama Siswa', 'Tanggal', 'Mata Pelajaran', 'Materi', 'Durasi', 'Pengajar', 'Cabang', 'Timestamp']
  },
  pengajar: {
    spreadsheetId: '1PQNdVQUJa-YQaWv-KZdIC7WE3VVlRAxpX5XT79NMJos',
    sheetName: 'Pengajar',
    headers: ['Pengajar', 'Mata Pelajaran', 'Timestamp']
  }
};

// ===================== HANDLER UTAMA =====================

/**
 * Handle GET requests - Membaca data
 */
function doGet(e) {
  try {
    var params = e.parameter;
    var action = params.action || 'read';
    var sheetKey = params.sheet;
    
    if (!sheetKey || !SPREADSHEET_CONFIG[sheetKey]) {
      return sendResponse(false, 'Sheet key tidak valid. Gunakan: ' + Object.keys(SPREADSHEET_CONFIG).join(', '));
    }
    
    switch (action) {
      case 'read':
        return handleRead(sheetKey);
      case 'readOne':
        var rowIndex = parseInt(params.row);
        return handleReadOne(sheetKey, rowIndex);
      default:
        return sendResponse(false, 'Action tidak valid untuk GET. Gunakan: read, readOne');
    }
  } catch (error) {
    return sendResponse(false, 'Error: ' + error.message);
  }
}

/**
 * Handle POST requests - Create, Update, Delete, Search
 * Menerima content-type: text/plain (untuk menghindari CORS preflight)
 */
function doPost(e) {
  try {
    var body;
    
    // Parse body dari berbagai format
    if (e.postData) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Coba dari parameter jika JSON parse gagal
        if (e.parameter && e.parameter.action) {
          body = e.parameter;
          if (e.parameter.data && typeof e.parameter.data === 'string') {
            body.data = JSON.parse(e.parameter.data);
          }
        } else {
          return sendResponse(false, 'Format data tidak valid: ' + parseErr.message);
        }
      }
    } else if (e.parameter && e.parameter.action) {
      body = e.parameter;
      if (e.parameter.data && typeof e.parameter.data === 'string') {
        body.data = JSON.parse(e.parameter.data);
      }
    } else {
      return sendResponse(false, 'Tidak ada data yang diterima');
    }
    
    var action = body.action;
    var sheetKey = body.sheet;
    
    if (!sheetKey || !SPREADSHEET_CONFIG[sheetKey]) {
      return sendResponse(false, 'Sheet key tidak valid. Gunakan: ' + Object.keys(SPREADSHEET_CONFIG).join(', '));
    }
    
    switch (action) {
      case 'create':
        return handleCreate(sheetKey, body.data);
      case 'update':
        return handleUpdate(sheetKey, parseInt(body.row), body.data);
      case 'delete':
        return handleDelete(sheetKey, parseInt(body.row));
      case 'bulkCreate':
        return handleBulkCreate(sheetKey, body.data);
      case 'search':
        return handleSearch(sheetKey, body.searchField, body.searchValue);
      default:
        return sendResponse(false, 'Action tidak valid. Gunakan: create, update, delete, bulkCreate, search');
    }
  } catch (error) {
    return sendResponse(false, 'Error: ' + error.message);
  }
}

// ===================== CRUD FUNCTIONS =====================

/**
 * READ - Membaca semua data dari sheet
 */
function handleRead(sheetKey) {
  var config = SPREADSHEET_CONFIG[sheetKey];
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = ss.getSheetByName(config.sheetName);
  
  if (!sheet) {
    // Buat sheet jika belum ada
    sheet = ss.insertSheet(config.sheetName);
    ensureHeaders(sheet, config);
    return sendResponse(true, 'Sheet dibuat, belum ada data', { data: [], headers: config.headers, totalRows: 0 });
  }
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1 || lastCol === 0) {
    ensureHeaders(sheet, config);
    return sendResponse(true, 'Tidak ada data', { data: [], headers: config.headers, totalRows: 0 });
  }
  
  var headers = ensureHeaders(sheet, config);
  lastCol = Math.max(lastCol, headers.length);
  var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var values = dataRange.getValues();
  
  var data = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    // Skip empty rows
    var isEmpty = true;
    for (var c = 0; c < row.length; c++) {
      if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) continue;
    
    var obj = { _rowIndex: i + 2 };
    for (var j = 0; j < headers.length; j++) {
      var value = row[j];
      if (value instanceof Date) {
        obj[headers[j]] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      } else {
        obj[headers[j]] = value !== null && value !== undefined ? String(value) : '';
      }
    }
    data.push(obj);
  }
  
  return sendResponse(true, 'Berhasil mengambil ' + data.length + ' data', { 
    data: data, 
    headers: headers, 
    totalRows: data.length 
  });
}

/**
 * READ ONE - Membaca satu baris data
 */
function handleReadOne(sheetKey, rowIndex) {
  var config = SPREADSHEET_CONFIG[sheetKey];
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = ss.getSheetByName(config.sheetName);
  
  if (!sheet) {
    return sendResponse(false, 'Sheet tidak ditemukan');
  }
  
  var lastRow = sheet.getLastRow();
  if (isNaN(rowIndex) || rowIndex < 2 || rowIndex > lastRow) {
    return sendResponse(false, 'Row index tidak valid. Range: 2 - ' + lastRow);
  }
  
  var lastCol = sheet.getLastColumn();
  var headers = ensureHeaders(sheet, config);
  lastCol = Math.max(lastCol, headers.length);
  var rowData = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
  
  var obj = { _rowIndex: rowIndex };
  for (var i = 0; i < headers.length; i++) {
    var value = rowData[i];
    if (value instanceof Date) {
      obj[headers[i]] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    } else {
      obj[headers[i]] = value !== null && value !== undefined ? String(value) : '';
    }
  }
  
  return sendResponse(true, 'Data berhasil diambil', { data: obj });
}

/**
 * CREATE - Menambah data baru
 */
function handleCreate(sheetKey, data) {
  if (!data) {
    return sendResponse(false, 'Data tidak boleh kosong');
  }
  
  var config = SPREADSHEET_CONFIG[sheetKey];
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = ss.getSheetByName(config.sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(config.sheetName);
    ensureHeaders(sheet, config);
  }
  
  // Tambahkan timestamp otomatis
  data['Timestamp'] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
  // Ambil headers dari sheet (normalized)
  var headers = ensureHeaders(sheet, config);
  var lastCol = headers.length;
  
  // Buat array row sesuai urutan header
  var newRow = [];
  for (var i = 0; i < headers.length; i++) {
    var value = data[headers[i]] !== undefined && data[headers[i]] !== null ? data[headers[i]] : '';
    if (typeof value === 'string') {
      value = value.trim();
    }
    newRow.push(value);
  }
  
  // Append row
  sheet.appendRow(newRow);
  var newRowIndex = sheet.getLastRow();
  
  // Buat object response
  var responseObj = { _rowIndex: newRowIndex };
  for (var j = 0; j < headers.length; j++) {
    responseObj[headers[j]] = newRow[j];
  }
  
  return sendResponse(true, 'Data berhasil ditambahkan', { data: responseObj, rowIndex: newRowIndex });
}

/**
 * UPDATE - Mengubah data yang sudah ada
 */
function handleUpdate(sheetKey, rowIndex, data) {
  if (!data) {
    return sendResponse(false, 'Data tidak boleh kosong');
  }
  
  var config = SPREADSHEET_CONFIG[sheetKey];
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = ss.getSheetByName(config.sheetName);
  
  if (!sheet) {
    return sendResponse(false, 'Sheet tidak ditemukan');
  }
  
  var lastRow = sheet.getLastRow();
  if (isNaN(rowIndex) || rowIndex < 2 || rowIndex > lastRow) {
    return sendResponse(false, 'Row index tidak valid: ' + rowIndex + ' (lastRow: ' + lastRow + ')');
  }
  
  var headers = ensureHeaders(sheet, config);
  var lastCol = headers.length;
  
  // Update timestamp
  data['Timestamp'] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
  // Buat array row sesuai urutan header
  var updatedRow = [];
  for (var i = 0; i < headers.length; i++) {
    var value = data[headers[i]] !== undefined && data[headers[i]] !== null ? data[headers[i]] : '';
    if (typeof value === 'string') {
      value = value.trim();
    }
    updatedRow.push(value);
  }
  
  // Update row
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updatedRow]);
  
  // Buat object response
  var responseObj = { _rowIndex: rowIndex };
  for (var j = 0; j < headers.length; j++) {
    responseObj[headers[j]] = updatedRow[j];
  }
  
  return sendResponse(true, 'Data berhasil diperbarui', { data: responseObj });
}

/**
 * DELETE - Menghapus data
 */
function handleDelete(sheetKey, rowIndex) {
  var config = SPREADSHEET_CONFIG[sheetKey];
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = ss.getSheetByName(config.sheetName);
  
  if (!sheet) {
    return sendResponse(false, 'Sheet tidak ditemukan');
  }
  
  var lastRow = sheet.getLastRow();
  if (isNaN(rowIndex) || rowIndex < 2 || rowIndex > lastRow) {
    return sendResponse(false, 'Row index tidak valid: ' + rowIndex + ' (lastRow: ' + lastRow + ')');
  }
  
  // Hapus row
  sheet.deleteRow(rowIndex);
  
  return sendResponse(true, 'Data berhasil dihapus', { deletedRow: rowIndex });
}

/**
 * BULK CREATE - Menambah banyak data sekaligus
 */
function handleBulkCreate(sheetKey, dataArray) {
  if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
    return sendResponse(false, 'Data array tidak boleh kosong');
  }
  
  var config = SPREADSHEET_CONFIG[sheetKey];
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = ss.getSheetByName(config.sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(config.sheetName);
    ensureHeaders(sheet, config);
  }
  
  var headers = ensureHeaders(sheet, config);
  var lastCol = headers.length;
  
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
  // Buat array rows
  var rows = [];
  for (var r = 0; r < dataArray.length; r++) {
    var data = dataArray[r];
    data['Timestamp'] = timestamp;
    var row = [];
    for (var i = 0; i < headers.length; i++) {
          var value = data[headers[i]] !== undefined && data[headers[i]] !== null ? data[headers[i]] : '';
    if (typeof value === 'string') {
      value = value.trim();
    }
    row.push(value);
    }
    rows.push(row);
  }
  
  // Append all rows at once
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
  
  return sendResponse(true, rows.length + ' data berhasil ditambahkan', { totalAdded: rows.length });
}

/**
 * SEARCH - Mencari data berdasarkan field tertentu
 */
function handleSearch(sheetKey, searchField, searchValue) {
  if (!searchField || searchValue === undefined || searchValue === null) {
    return sendResponse(false, 'searchField dan searchValue diperlukan');
  }
  
  var config = SPREADSHEET_CONFIG[sheetKey];
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = ss.getSheetByName(config.sheetName);
  
  if (!sheet) {
    return sendResponse(false, 'Sheet tidak ditemukan');
  }
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) {
    return sendResponse(true, 'Tidak ada data', { data: [], totalResults: 0 });
  }
  
  var headers = ensureHeaders(sheet, config);
  lastCol = Math.max(lastCol, headers.length);
  var searchColIndex = -1;
  for (var h = 0; h < headers.length; h++) {
    if (normalizeHeader(headers[h]) === normalizeHeader(searchField)) {
      searchColIndex = h;
      break;
    }
  }
  
  if (searchColIndex === -1) {
    return sendResponse(false, 'Field "' + searchField + '" tidak ditemukan. Fields tersedia: ' + headers.join(', '));
  }
  
  var allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var results = [];
  
  for (var i = 0; i < allData.length; i++) {
    var row = allData[i];
    var cellValue = String(row[searchColIndex]).toLowerCase();
    if (cellValue.indexOf(String(searchValue).toLowerCase()) !== -1) {
      var obj = { _rowIndex: i + 2 };
      for (var j = 0; j < headers.length; j++) {
        var value = row[j];
        if (value instanceof Date) {
          obj[headers[j]] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        } else {
          obj[headers[j]] = value !== null && value !== undefined ? String(value) : '';
        }
      }
      results.push(obj);
    }
  }
  
  return sendResponse(true, results.length + ' data ditemukan', { data: results, totalResults: results.length });
}

// ===================== HELPER FUNCTIONS =====================

/**
 * Normalize header string (trim, remove BOM, normalize spaces)
 */
function normalizeHeader(header) {
  if (header === null || header === undefined) return '';
  return String(header)
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if actual headers match expected headers (normalized)
 */
function headersMatch(actualHeaders, expectedHeaders) {
  if (!actualHeaders || actualHeaders.length < expectedHeaders.length) return false;
  for (var i = 0; i < expectedHeaders.length; i++) {
    if (normalizeHeader(actualHeaders[i]) !== normalizeHeader(expectedHeaders[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Ensure sheet headers match config headers. If not, reset header row.
 */
function ensureHeaders(sheet, config) {
  var expected = config.headers;
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
    formatHeader(sheet, expected.length);
    return expected;
  }

  var actual = sheet.getRange(1, 1, 1, Math.max(lastCol, expected.length)).getValues()[0];
  if (!headersMatch(actual, expected)) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
    formatHeader(sheet, expected.length);
  }
  return expected;
}

/**
 * Mengirim response dalam format JSON
 */
function sendResponse(success, message, data) {
  var response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  if (data) {
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        response[key] = data[key];
      }
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Format header row
 */
function formatHeader(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  
  for (var i = 1; i <= numCols; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * Test functions - Untuk testing di Apps Script Editor
 */
function testRead() {
  var e = { parameter: { action: 'read', sheet: 'siswa' } };
  var result = doGet(e);
  Logger.log(result.getContent());
}

function testReadPengajar() {
  var e = { parameter: { action: 'read', sheet: 'pengajar' } };
  var result = doGet(e);
  Logger.log(result.getContent());
}

function testCreate() {
  var e = {
    postData: {
      type: 'text/plain',
      contents: JSON.stringify({
        action: 'create',
        sheet: 'pengajar',
        data: {
          'Pengajar': 'Test Pengajar',
          'Mata Pelajaran': 'Matematika'
        }
      })
    }
  };
  var result = doPost(e);
  Logger.log(result.getContent());
}

function testUpdate() {
  var e = {
    postData: {
      type: 'text/plain',
      contents: JSON.stringify({
        action: 'update',
        sheet: 'pengajar',
        row: 2,
        data: {
          'Pengajar': 'Updated Pengajar',
          'Mata Pelajaran': 'Fisika'
        }
      })
    }
  };
  var result = doPost(e);
  Logger.log(result.getContent());
}

function testDelete() {
  var e = {
    postData: {
      type: 'text/plain',
      contents: JSON.stringify({
        action: 'delete',
        sheet: 'pengajar',
        row: 2
      })
    }
  };
  var result = doPost(e);
  Logger.log(result.getContent());
}

function testSearch() {
  var e = {
    postData: {
      type: 'text/plain',
      contents: JSON.stringify({
        action: 'search',
        sheet: 'siswa',
        searchField: 'Nama',
        searchValue: 'test'
      })
    }
  };
  var result = doPost(e);
  Logger.log(result.getContent());
}

/**
 * Fungsi untuk setup awal - Jalankan sekali untuk membuat semua sheet dengan header
 */
function setupAllSheets() {
  var keys = Object.keys(SPREADSHEET_CONFIG);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var config = SPREADSHEET_CONFIG[key];
    try {
      var ss = SpreadsheetApp.openById(config.spreadsheetId);
      var sheet = ss.getSheetByName(config.sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(config.sheetName);
        Logger.log('Sheet "' + config.sheetName + '" dibuat di spreadsheet ' + config.spreadsheetId);
      }
      
      // Set headers
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      
      // Format header
      formatHeader(sheet, config.headers.length);
      
      Logger.log('Setup selesai untuk: ' + key);
    } catch (error) {
      Logger.log('Error setup ' + key + ': ' + error.message);
    }
  }
  Logger.log('===== Setup semua sheet selesai! =====');
}
