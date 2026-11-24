# Fısıltı — Anonim Rastgele Sohbet Platformu

Fısıltı; kullanıcıların kimliklerini hiçbir şekilde ifşa etmeden ortak ilgi alanlarına göre gerçek zamanlı eşleşebildiği, KVKK ve güvenlik ilkelerini merkeze alan, Railway üzerinde tek servis olarak çalışmaya hazır Türkçe anonim sohbet uygulamasıdır.

---

## Kurulum Adımları (Yerel)

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
2. `.env.example` dosyasını `.env` olarak kopyalayıp değerleri ayarlayın:
   ```bash
   cp .env.example .env
   ```
3. Geliştirme sunucusunu başlatın (Vite + Express + WebSocket tek portta):
   ```bash
   npm run dev
   ```
4. Üretim derlemesi alıp çalıştırın:
   ```bash
   npm run build
   npm start
   ```

---

## Railway Üzerinde Yayınlama (Script / Tek Servis)

Proje `railway.json` ile hazır gelir:
1. GitHub deponuzu Railway projesine bağlayın (`New Project -> Deploy from GitHub repo`).
2. Railway **Variables** sekmesinde aşağıdaki ortam değişkenlerini tanımlayın (`PORT` Railway tarafından otomatik verilir):
   - `NODE_ENV=production`
   - `ADMIN_USERNAME=<yönetici-kullanıcı-adı>`
   - `ADMIN_PASSWORD=<güçlü-yönetici-şifresi>`
   - `SESSION_SIGNING_SECRET=<rastgele-64-karakter-hex>`
   - `IP_HASH_SALT=<rastgele-32-karakter-hex>`
3. Railway otomatik olarak `npm install && npm run build` çalıştırır, ardından `npm start` (`node server.ts`) ile hem önyüzü hem API'yi hem de `wss://` WebSocket sunucusunu tek port üzerinden ayağa kaldırır.
4. Sağlık kontrolü `/api/health` adresinden otomatik doğrulanır.

---

## Ortam Değişkenleri Listesi

| Değişken | Zorunlu | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `PORT` | Hayır | `3000` | HTTP ve WebSocket sunucu portu (Railway otomatik atar) |
| `NODE_ENV` | Hayır | `development` | `production` modunda `dist/` derlemesi sunulur |
| `ADMIN_USERNAME` | Önerilen | Boş | `/admingiris` yönetici kullanıcı adı (boşsa ilk kurulumda belirlenir) |
| `ADMIN_PASSWORD` | Önerilen | Boş | `/admingiris` yönetici şifresi (boşsa ilk kurulumda belirlenir) |
| `SESSION_SIGNING_SECRET` | Önerilen | Rastgele | Token özetleme (HMAC) anahtarı |
| `IP_HASH_SALT` | Önerilen | Rastgele | IP adreslerini tek yönlü hashlemek için tuz |
| `DAILY_MATCH_LIMIT` | Hayır | `50` | Günlük maksimum eşleşme kotası |
| `REPORT_RETENTION_HOURS` | Hayır | `72` | Şikayet edilmiş sohbet kayıtlarının saklanma süresi (saat) |
| `SECURITY_LOG_TTL_HOURS` | Hayır | `24` | Geçici güvenlik oturum verisi saklama süresi (saat) |
| `AUTO_BAN_REPORT_THRESHOLD` | Hayır | `3` | Otomatik geçici yasaklama için gereken şikayet eşiği |
| `TEMP_BAN_MINUTES` | Hayır | `60` | Otomatik geçici yasaklama süresi (dakika) |

---

## Test Senaryoları (Anonimlik ve Şikayet Akışı)

Otomatik uçtan uca akış testlerini çalıştırmak için (sunucu `PORT=3000` üzerinde çalışırken):
```bash
npm run test:flows
```

### Manuel Doğrulama Senaryoları

1. **Onay Kapısı Doğrulaması**:
   - Ana sayfada 4 onay kutusundan biri bile boşken **"Eşleşmeye Başla"** butonunun pasif olduğunu ve `POST /api/consent` çağrısının sunucu tarafından reddedildiğini doğrulayın.
   - Tüm onaylar verildiğinde sunucuda tarih/saat damgasıyla kaydedildiğini `/admingiris -> Onay Kayıtları` sekmesinde görün.
2. **Anonimlik ve Gerçek Zamanlı Eşleşme**:
   - İki farklı tarayıcı sekmesinde onayları verip **"Eşleşmeye Başla"** deyin (ortak ilgi alanı seçin).
   - Her iki kullanıcıya yalnızca o eşleşmeye özel takma ad ve geometrik SVG avatar atandığını, çevrimiçi durum / son görülme / konum / IP bilgisinin gösterilmediğini doğrulayın.
   - Uygulamadaki canlı aktif kullanıcı sayacının arttığını ve sohbet bitince mesajların + karşı taraf takma adının ekrandan anında silindiğini doğrulayın.
   - Aynı iki kullanıcı art arda yeniden eşleşmeye bastığında arka arkaya eşleşmediğini kontrol edin.
3. **Otomatik Güvenlik ve Kişisel Bilgi Maskeleme**:
   - Sohbette telefon (`0532 123 45 67`), e-posta (`test@example.com`), IBAN (`TR12...`) veya `@kullaniciadi` göndermeyi deneyin; otomatik maskelendiğini ve uyarı çıktığını doğrulayın.
   - Görsel/dosya sürükleyip bırakmayı deneyin; engellendiğini doğrulayın.
   - `"15 yaşındayım"` veya `"reşit değilim"` ifadesi gönderildiğinde oturumun derhal kapatıldığını ve acil yönetici uyarısı tetiklendiğini doğrulayın.
4. **Sessiz Engelleme ve Şikayet Akışı**:
   - Sohbet üst çubuğundan **"Engelle"** seçildiğinde karşı tarafa engellendiği bilgisi gitmeden sohbetin kapandığını ve tekrar eşleşmediklerini doğrulayın.
   - **"Şikayet Et"** ile neden seçip gönderdiğinizde *"Şikayetin alındı, incelenecek."* mesajını gördüğünüzü, `/admingiris` paneline sohbet dökümünün düştüğünü ve şikayet edenin kimliğinin karşıya asla gitmediğini doğrulayın.
   - Yönetici panelinden şikayet durumunu **"İşlem Yapıldı"** yaptığınızda şikayet eden tarayıcıya *"İnceleme tamamlandı, gerekli işlem yapıldı."* bildiriminin ulaştığını doğrulayın.
5. **Yönetici Girişi ve KVKK Veri Silme**:
   - `/admingiris` gizli rotasından kullanıcı adı ve şifre ile giriş yapın; kamuya açık menüde yönetici bağlantısının görünmediğini doğrulayın.
   - Ana ekranda **"Verilerimi ve Oturumumu Sil (KVKK)"** butonuna tıkladığınızda oturum ve onay kayıtlarının silindiğini doğrulayın.
