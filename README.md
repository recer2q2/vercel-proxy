# uaserials-proxy (Vercel)

CORS-проксі для плагіну UASerials. Лише для HTML-сторінок, не для відео.

## Розгортання
1. Покладіть вміст цієї папки в **окремий** GitHub-репозиторій (корінь репозиторію = ця папка).
2. Vercel → **Add New → Project** → оберіть репозиторій → Framework Preset: **Other** → **Deploy**.
3. Project → **Settings → Environment Variables** → додайте `TOKEN` (довільний секрет) → **Redeploy**.
4. Перевірка в браузері (коротка адреса проєкту з Settings → Domains, не довга з хешем):
   `https://<проєкт>.vercel.app/?key=<TOKEN>&url=https://uaserials.com/` — має показати сторінку сайту.

## Підключення в Lampa
URL плагіну: `…/uaserials.plugin.js?proxy=https://<проєкт>.vercel.app&key=<TOKEN>`
або Налаштування → UASerials → Проксі: `https://<проєкт>.vercel.app/?key=<TOKEN>&url={url}`

## Примітки
- Регіон функцій — `fra1` (Hobby дозволяє один регіон; змінюється в `vercel.json` → `regions`).
- Новий сайт дозволяється одним рядком у `SITES` у `api/proxy.js`.
- Hobby — лише для особистого некомерційного використання.
