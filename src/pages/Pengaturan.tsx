import { useState, useEffect } from 'react';
import {
  getAppsScriptUrl,
  setAppsScriptUrl,
  resetAppsScriptUrl,
  getDefaultAppsScriptUrl,
  isAppsScriptConfigured,
  testConnection,
} from '../services/googleSheets';
import {
  Save,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Code,
  BookOpen,
  Zap,
  Shield,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

export default function Pengaturan() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setUrl(getAppsScriptUrl());
  }, []);

  const handleSave = () => {
    setAppsScriptUrl(url);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    resetAppsScriptUrl();
    setUrl(getDefaultAppsScriptUrl());
    setSaved(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!url.trim()) {
      setTestResult({ success: false, message: 'URL belum diisi.' });
      return;
    }
    setAppsScriptUrl(url);
    setTesting(true);
    setTestResult(null);
    const result = await testConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleCopyScript = async () => {
    try {
      const response = await fetch('./google-apps-script/Code.gs');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.open('./google-apps-script/Code.gs', '_blank');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    } catch {
      // fallback
    }
  };

  const isConfigured = isAppsScriptConfigured();
  const defaultUrl = getDefaultAppsScriptUrl();

  const steps = [
    {
      num: 1,
      title: 'Buka Server Database',
      icon: <Code size={18} />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Buka layanan server database Anda dan siapkan project Web App, atau buka project yang sudah ada.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            Pastikan Anda login menggunakan akun Google yang memiliki akses ke semua spreadsheet.
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: 'Copy & Paste Kode Web App',
      icon: <Copy size={18} />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Copy kode Web App berikut, lalu paste ke dalam file{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Code.gs</code>{' '}
            di project server database Anda.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopyScript}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md"
            >
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copied ? 'Kode Berhasil Di-copy!' : 'Copy Kode Apps Script'}
            </button>
            <a
              href="./google-apps-script/Code.gs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <ExternalLink size={16} />
              Lihat Kode
            </a>
          </div>
        </div>
      ),
    },
    {
      num: 3,
      title: 'Deploy sebagai Web App',
      icon: <Zap size={18} />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Di editor server database:</p>
          <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-5">
            <li>
              Klik tombol <strong>"Deploy"</strong> → <strong>"New deployment"</strong>
            </li>
            <li>
              Klik ikon ⚙️ di sebelah "Select type" → pilih <strong>"Web app"</strong>
            </li>
            <li>Isi deskripsi (misalnya: "CRUD API v1")</li>
            <li>
              Set <strong>"Execute as"</strong> → <strong>"Me"</strong> (akun Google Anda)
            </li>
            <li>
              Set <strong>"Who has access"</strong> → <strong>"Anyone"</strong>
            </li>
            <li>
              Klik <strong>"Deploy"</strong>
            </li>
            <li>
              Klik <strong>"Authorize access"</strong> jika diminta
            </li>
            <li>
              <strong>Copy URL</strong> Web App yang diberikan
            </li>
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <strong>Penting:</strong> Jika muncul peringatan "Google hasn't verified this app", klik
            "Advanced" → "Go to (nama project) (unsafe)" → "Allow".
          </div>
        </div>
      ),
    },
    {
      num: 4,
      title: 'Jalankan Setup Awal (Opsional)',
      icon: <Shield size={18} />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Di server database, jalankan fungsi{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">setupAllSheets</code>{' '}
            sekali untuk memformat header di semua dataset.
          </p>
          <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-5">
            <li>
              Pilih fungsi <strong>"setupAllSheets"</strong> dari dropdown di toolbar
            </li>
            <li>
              Klik tombol <strong>▶ Run</strong>
            </li>
            <li>Authorize jika diminta</li>
          </ol>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>
        <p className="text-gray-500 mt-1">Konfigurasi koneksi server database untuk CRUD</p>
      </div>

      {/* Connection Status */}
      <div
        className={`rounded-2xl border p-5 flex items-center gap-4 ${
          isConfigured ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
        }`}
      >
        {isConfigured ? (
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Wifi size={24} className="text-green-600" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
            <WifiOff size={24} className="text-gray-400" />
          </div>
        )}
        <div>
          <h3 className={`font-semibold ${isConfigured ? 'text-green-800' : 'text-gray-600'}`}>
            {isConfigured ? '✅ API Terhubung — CRUD Aktif' : 'Belum Terhubung'}
          </h3>
          <p className={`text-sm ${isConfigured ? 'text-green-600' : 'text-gray-500'}`}>
            {isConfigured
              ? 'Server database sudah dikonfigurasi. Semua operasi CRUD dapat dilakukan.'
              : 'Silakan ikuti langkah-langkah di bawah untuk menghubungkan server database.'}
          </p>
        </div>
      </div>

      {/* URL Configuration Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Zap size={20} className="text-blue-600" />
          URL Server Database (Web App)
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL Web App</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setSaved(false);
                setTestResult(null);
              }}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
            />
            <button
              onClick={handleCopyUrl}
              className="px-3 py-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all"
              title="Copy URL"
            >
              {copiedUrl ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
          </div>
          {url === defaultUrl && (
            <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
              <CheckCircle size={12} />
              Menggunakan URL default yang sudah dikonfigurasi
            </p>
          )}
          {url !== defaultUrl && url.length > 0 && (
            <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
              <AlertCircle size={12} />
              URL custom — klik Simpan untuk menyimpan perubahan
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? 'Tersimpan!' : 'Simpan URL'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !url.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? <RefreshCw size={16} className="animate-spin" /> : <Wifi size={16} />}
            {testing ? 'Menguji...' : 'Test Koneksi'}
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
          >
            <RotateCcw size={16} />
            Reset ke Default
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`flex items-start gap-3 p-4 rounded-xl border animate-in ${
              testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {testResult.success ? '✅ Koneksi Berhasil!' : '❌ Koneksi Gagal'}
              </p>
              <p
                className={`text-xs mt-1 ${
                  testResult.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {testResult.message}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Setup Guide (Accordion) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <BookOpen size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Panduan Deploy Server Database
          </h2>
          <span className="text-xs text-gray-400">(jika ingin deploy sendiri)</span>
        </div>
        <div className="divide-y divide-gray-100">
          {steps.map((step) => (
            <div key={step.num}>
              <button
                onClick={() =>
                  setExpandedStep(expandedStep === step.num ? null : step.num)
                }
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    expandedStep === step.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {step.num}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span
                    className={`${
                      expandedStep === step.num ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    {step.icon}
                  </span>
                  <span className="font-medium text-gray-700">{step.title}</span>
                </div>
                {expandedStep === step.num ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </button>
              {expandedStep === step.num && (
                <div className="px-6 pb-5 pl-20 animate-in">{step.content}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Documentation */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-blue-600" />
          Dokumentasi API
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Operasi</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Method</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Parameter/Body</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 font-medium text-blue-600">Read All</td>
                <td className="px-4 py-3">
                  <code className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                    GET
                  </code>
                </td>
                <td className="px-4 py-3 text-xs font-mono">?action=read&sheet=siswa</td>
                <td className="px-4 py-3 text-gray-500">Membaca semua data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-blue-600">Read One</td>
                <td className="px-4 py-3">
                  <code className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                    GET
                  </code>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  ?action=readOne&sheet=siswa&row=2
                </td>
                <td className="px-4 py-3 text-gray-500">Membaca satu baris</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-emerald-600">Create</td>
                <td className="px-4 py-3">
                  <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    POST
                  </code>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {`{action:"create", sheet:"siswa", data:{...}}`}
                </td>
                <td className="px-4 py-3 text-gray-500">Menambah data baru</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-amber-600">Update</td>
                <td className="px-4 py-3">
                  <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    POST
                  </code>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {`{action:"update", sheet:"siswa", row:2, data:{...}}`}
                </td>
                <td className="px-4 py-3 text-gray-500">Mengubah data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-red-600">Delete</td>
                <td className="px-4 py-3">
                  <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    POST
                  </code>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {`{action:"delete", sheet:"siswa", row:2}`}
                </td>
                <td className="px-4 py-3 text-gray-500">Menghapus data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-violet-600">Search</td>
                <td className="px-4 py-3">
                  <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    POST
                  </code>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {`{action:"search", sheet:"siswa", searchField:"Nama", searchValue:"Ali"}`}
                </td>
                <td className="px-4 py-3 text-gray-500">Mencari data</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-medium text-gray-700 mb-2">Sheet Keys yang tersedia:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'siswa',
              'presensi',
              'perkembangan',
              'nilaiUtbk',
              'nilaiTkaSma',
              'nilaiTkaSmp',
              'nilaiTkaSd',
              'nilaiTesStandar',
              'nilaiEvaluasi',
              'pelayanan',
              'pengajar',
            ].map((k) => (
              <code key={k} className="bg-white border border-gray-200 px-2 py-1 rounded">
                {k}
              </code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
