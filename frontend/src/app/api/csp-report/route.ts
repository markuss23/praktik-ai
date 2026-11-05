import { NextRequest } from 'next/server';

// Příjem hlášení z `Content-Security-Policy-Report-Only` (viz next.config.ts).
// Jen loguje — z logu kontejneru (`[csp-report]`) se pozná, jestli by vynucená CSP
// rozbila něco legitimního. Endpoint je veřejný (prohlížeč hlásí bez tokenu), proto
// limit velikosti a zkrácený výpis.
const MAX_BODY = 16 * 1024;

export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) {
    return new Response(null, { status: 413 });
  }

  try {
    const data = JSON.parse((await request.text()).slice(0, MAX_BODY));
    const r = data?.['csp-report'];
    if (r) {
      console.warn(
        '[csp-report]',
        JSON.stringify({
          directive: r['effective-directive'] ?? r['violated-directive'],
          blocked: r['blocked-uri'],
          page: r['document-uri'],
          source: r['source-file'],
          line: r['line-number'],
        }).slice(0, 500),
      );
    }
  } catch {
    // nevalidní hlášení ignorujeme
  }

  return new Response(null, { status: 204 });
}
