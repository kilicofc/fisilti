import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const WS_BASE = BASE.replace(/^http/, 'ws');

function waitForEvent(
  ws: WebSocket,
  targetEvent: string,
  timeoutMs = 6000,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for WS event: ${targetEvent}`));
    }, timeoutMs);

    const handler = (raw: WebSocket.RawData) => {
      try {
        const parsed = JSON.parse(raw.toString('utf8'));
        if (parsed.event === targetEvent) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve(parsed.payload || {});
        }
      } catch {
        // ignore
      }
    };
    ws.on('message', handler);
  });
}

async function main() {
  console.log('1. Sağlık kontrolü...');
  const healthRes = await fetch(`${BASE}/api/health`);
  assert.equal(healthRes.status, 200);

  console.log('2. Eksik onay reddi kontrolü...');
  const badConsent = await fetch(`${BASE}/api/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ageConfirmed: false,
      termsAccepted: true,
      privacyAccepted: true,
      cookieAccepted: true,
    }),
  });
  assert.equal(badConsent.status, 400);

  console.log('3. İki anonim kullanıcı onayı ve WebSocket eşleşmesi...');
  const c1 = await (
    await fetch(`${BASE}/api/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ageConfirmed: true,
        termsAccepted: true,
        privacyAccepted: true,
        cookieAccepted: true,
      }),
    })
  ).json();
  const c2 = await (
    await fetch(`${BASE}/api/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ageConfirmed: true,
        termsAccepted: true,
        privacyAccepted: true,
        cookieAccepted: true,
      }),
    })
  ).json();

  assert.ok(c1.sessionId && c2.sessionId);

  const ws1 = new WebSocket(`${WS_BASE}/ws?sessionId=${encodeURIComponent(c1.sessionId)}`);
  const ws2 = new WebSocket(`${WS_BASE}/ws?sessionId=${encodeURIComponent(c2.sessionId)}`);

  await Promise.all([
    new Promise((res) => ws1.once('open', res)),
    new Promise((res) => ws2.once('open', res)),
  ]);

  const match1Promise = waitForEvent(ws1, 'match:found');
  const match2Promise = waitForEvent(ws2, 'match:found');

  ws1.send(
    JSON.stringify({
      event: 'match:join',
      payload: { interests: ['Müzik', 'Yazılım & Teknoloji'] },
    }),
  );
  ws2.send(
    JSON.stringify({
      event: 'match:join',
      payload: { interests: ['Müzik'] },
    }),
  );

  const [m1, m2] = await Promise.all([match1Promise, match2Promise]);
  assert.equal(m1.roomId, m2.roomId);
  assert.deepEqual(m1.sharedInterests, ['Müzik']);
  assert.ok(m1.partnerAlias && m2.partnerAlias);

  console.log('4. PII maskeleme testi...');
  const msg2Promise = waitForEvent(ws2, 'chat:message');
  ws1.send(
    JSON.stringify({
      event: 'chat:message',
      payload: {
        roomId: m1.roomId,
        text: 'Numaram 0532 111 22 33 ve mailim test@example.com',
      },
    }),
  );
  const received = await msg2Promise;
  assert.ok(String(received.text).includes('[TELEFON GİZLENDİ]'));
  assert.ok(String(received.text).includes('[E-POSTA GİZLENDİ]'));

  console.log('5. Şikayet gönderme ve onay bildirimi testi...');
  const repRes = await (
    await fetch(`${BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: m1.roomId,
        sessionId: c1.sessionId,
        reason: 'scam',
        description: 'Kişisel bilgi talep edildi.',
      }),
    })
  ).json();
  assert.equal(repRes.ok, true);
  assert.equal(repRes.confirmationMessage, 'Şikayetin alındı, incelenecek.');

  console.log('6. KVKK veri silme testi...');
  const delRes = await (
    await fetch(`${BASE}/api/session/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: c1.sessionId }),
    })
  ).json();
  assert.equal(delRes.ok, true);

  ws1.close();
  ws2.close();
  console.log('Tüm anonimlik, güvenlik, eşleşme ve şikayet testleri başarıyla geçti!');
}

main().catch((err) => {
  console.error('Test hatası:', err);
  process.exit(1);
});
