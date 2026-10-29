export class LANError extends Error {
  isLANError: boolean;
  constructor(message: string) {
    super(message);
    this.name = 'LANError';
    this.isLANError = true;
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('laundrypos_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (res.status === 503) {
      throw new LANError('Server LAN tidak dapat dijangkau. Pastikan komputer server utama menyala dan terhubung ke jaringan lokal.');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || `Permintaan gagal dengan kode HTTP ${res.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err: any) {
    if (err.isLANError) {
      throw err;
    }
    // Network failure
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new LANError('Koneksi terputus ke server lokal toko. Periksa sambungan kabel LAN atau WiFi.');
    }
    throw err;
  }
}

export function formatRupiah(amount: number): string {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID');
}

export function formatKg(grams: number): string {
  const kg = (grams || 0) / 1000;
  return kg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}
