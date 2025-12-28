# Kniha PZ - Evidencia poľovného revíru

Mobilná PWA aplikácia na evidenciu poľovného revíru, návštev, úlovkov, oznámenia a rezervácie chaty.

## 🦌 Funkcie

- **Návštevy revíru** - evidencia príchodov a odchodov členov z lokalít
- **Úlovky** - záznam úlovkov s podrobnými informáciami a fotkami
- **Plán lovu** - sledovanie sezónnych kvót a čerpania
- **Oznamy** - zdieľanie informácií s push notifikáciami
- **Rezervácie chaty** - kalendár rezervácií poľovníckej chaty
- **Administrácia** - správa členov, lokalít, druhov zveri a sezón

## 🚀 Rýchly štart

### Požiadavky

- Node.js 18+
- PostgreSQL 15+
- Google OAuth credentials

### Inštalácia

```bash
# Klonovanie repozitára
git clone <repository-url>
cd kniha-pz

# Inštalácia závislostí
npm install

# Konfigurácia prostredia
cp .env.example .env
# Upravte .env súbor s vašimi údajmi

# Generovanie Prisma klienta
npx prisma generate

# Migrácia databázy
npx prisma migrate dev

# Seed dát (voliteľné)
npx prisma db seed

# Spustenie vývojového servera
npm run dev
```

Aplikácia bude dostupná na `http://localhost:3000`

## 🐳 Docker Deployment

```bash
# Build a spustenie
docker-compose up -d

# Migrácia databázy (prvé spustenie)
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

## ⚙️ Konfigurácia

### Premenné prostredia

| Premenná | Popis | Povinná |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXTAUTH_URL` | URL aplikácie | ✅ |
| `NEXTAUTH_SECRET` | Tajný kľúč pre NextAuth | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ |
| `VAPID_PUBLIC_KEY` | VAPID verejný kľúč pre push notifikácie | ❌ |
| `VAPID_PRIVATE_KEY` | VAPID súkromný kľúč | ❌ |
| `VAPID_SUBJECT` | VAPID subject (mailto: alebo URL) | ❌ |
| `STORAGE_TYPE` | `filesystem` alebo `minio` | ❌ |
| `UPLOADS_PATH` | Cesta pre ukladanie fotiek | ❌ |
| `CRON_SECRET` | Tajný kľúč pre cron endpointy | ❌ |

### Generovanie VAPID kľúčov

```bash
npx web-push generate-vapid-keys
```

## ⏰ Automatické ukončovanie návštev

Aplikácia obsahuje endpoint na automatické ukončenie všetkých neukončených návštev. Odporúča sa spúšťať denne o polnoci.

### Nastavenie

1. Vygenerujte tajný kľúč a pridajte do `.env`:
```bash
CRON_SECRET=vas-nahodny-tajny-kluc
```

2. Nastavte cron job (systémový crontab alebo Task Scheduler na Synology):
```bash
# Linux/macOS crontab - spustenie o 0:05
5 0 * * * curl -X POST https://vasa-domena.sk/api/cron/close-visits -H "Authorization: Bearer VAS_CRON_SECRET"

# Alternatívne pre localhost
5 0 * * * curl -X POST http://localhost:3000/api/cron/close-visits -H "Authorization: Bearer VAS_CRON_SECRET"
```

### Synology Task Scheduler

1. Otvorte **Control Panel** → **Task Scheduler**
2. **Create** → **Scheduled Task** → **User-defined script**
3. Nastavte:
   - **Task:** Ukončiť návštevy
   - **User:** root
   - **Schedule:** Denne o 0:05
   - **Command:**
   ```bash
   curl -X POST http://localhost:3000/api/cron/close-visits -H "Authorization: Bearer VAS_CRON_SECRET"
   ```

### Google OAuth Setup

1. Prejdite na [Google Cloud Console](https://console.cloud.google.com/)
2. Vytvorte nový projekt alebo vyberte existujúci
3. Prejdite na "APIs & Services" > "Credentials"
4. Vytvorte "OAuth 2.0 Client ID" typu "Web application"
5. Pridajte Authorized JavaScript origins: `http://localhost:3000`
6. Pridajte Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Skopírujte Client ID a Client Secret do `.env`

## 📱 PWA Inštalácia

Aplikácia je Progressive Web App a môže byť nainštalovaná na:
- **Android**: Otvorte v Chrome > Menu > "Pridať na plochu"
- **iOS**: Otvorte v Safari > Zdieľať > "Na plochu"

## 🔐 Autorizácia

- **Admin**: Plné práva, správa všetkých entít
- **Member**: Vlastné návštevy a úlovky, čítanie oznámov, rezervácie chaty

Členovia musia byť vytvorení adminom pred prvým prihlásením.

## 📁 Štruktúra projektu

```
kniha-pz/
├── prisma/
│   ├── schema.prisma      # Databázová schéma
│   └── seed.ts            # Seed dáta
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API endpointy
│   │   ├── admin/         # Admin stránky
│   │   ├── visits/        # Návštevy
│   │   ├── catches/       # Úlovky
│   │   ├── announcements/ # Oznamy
│   │   ├── cabin/         # Rezervácie chaty
│   │   └── harvest-plan/  # Plán lovu
│   ├── components/        # React komponenty
│   └── lib/               # Pomocné knižnice
├── public/
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service worker
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🔧 Vývoj

```bash
# Spustenie vývojového servera
npm run dev

# Lint kontrola
npm run lint

# Build produkcie
npm run build

# Spustenie produkcie
npm start

# Prisma Studio (GUI pre databázu)
npx prisma studio
```

## 📊 API Endpointy

### Auth
- `GET /api/auth/[...nextauth]` - NextAuth handlers
- `GET /api/me` - Aktuálny používateľ

### Členovia (Admin)
- `GET /api/members` - Zoznam členov
- `POST /api/members` - Vytvoriť člena
- `PUT /api/members/[id]` - Upraviť člena

### Lokality
- `GET /api/localities` - Zoznam lokalít (s obsadenosťou)
- `POST /api/localities` - Vytvoriť lokalitu (Admin)

### Druhy zveri
- `GET /api/species` - Zoznam druhov
- `POST /api/species` - Vytvoriť druh (Admin)

### Návštevy
- `GET /api/visits` - Zoznam návštev
- `POST /api/visits` - Začať návštevu
- `GET /api/visits/[id]` - Detail návštevy
- `POST /api/visits/[id]/end` - Ukončiť návštevu

### Úlovky
- `GET /api/visits/[visitId]/catches` - Úlovky návštevy
- `POST /api/visits/[visitId]/catches` - Pridať úlovok
- `GET /api/catches/[id]` - Detail úlovku
- `POST /api/catches/[id]/photos` - Nahrať fotku

### Sezóny a plán lovu
- `GET /api/seasons` - Zoznam sezón
- `GET /api/seasons/[id]/harvest-plan` - Plán lovu so štatistikami
- `PUT /api/seasons/[id]/harvest-plan` - Upraviť plán (Admin)

### Oznamy
- `GET /api/announcements` - Zoznam oznámov
- `POST /api/announcements` - Vytvoriť oznam
- `POST /api/announcements/[id]/read` - Označiť ako prečítané

### Push notifikácie
- `GET /api/push/vapid-public-key` - VAPID verejný kľúč
- `POST /api/push/subscribe` - Prihlásiť na notifikácie
- `POST /api/push/unsubscribe` - Odhlásiť z notifikácií

### Rezervácie chaty
- `GET /api/cabins` - Zoznam chát
- `GET /api/cabin-bookings` - Zoznam rezervácií
- `POST /api/cabin-bookings` - Vytvoriť rezerváciu
- `POST /api/cabin-bookings/[id]/cancel` - Zrušiť rezerváciu

## 📜 Licencia

Proprietárny softvér. Všetky práva vyhradené.
