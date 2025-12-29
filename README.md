# Kniha PZ - Evidencia poľovného revíru

[![Release](https://img.shields.io/badge/release-v1.0.0-green.svg)](https://github.com/lackor-risik/kniha-pz/releases/tag/v1.0.0)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)

Mobilná PWA aplikácia na evidenciu poľovného revíru, návštev, úlovkov, oznámenia a rezervácie chaty.

## 🦌 Funkcie

- **Návštevy revíru** - evidencia príchodov a odchodov členov z lokalít
- **Úlovky** - záznam úlovkov s podrobnými informáciami a fotkami (fullscreen prehliadanie)
- **Plán lovu** - sledovanie sezónnych kvót a čerpania
- **Oznamy** - zdieľanie informácií s push notifikáciami
- **Rezervácie chaty** - kalendár rezervácií poľovníckej chaty
- **Administrácia** - správa členov, lokalít, druhov zveri a sezón
- **Admin hesla** - nastavenie hesla a vynútená zmena pri prvom prihlásení
- **Delegácia návštev** - admin môže začať návštevu v mene iného člena
- **Editácia návštev** - úprava poznámok aj po ukončení návštevy

## 🚀 Rýchly štart (lokálny vývoj)

### Požiadavky

- Node.js 20+
- PostgreSQL 15+
- Google OAuth credentials

### Inštalácia

```bash
# Klonovanie repozitára
git clone https://github.com/lackor-risik/kniha-pz.git
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
npm run db:seed

# Spustenie vývojového servera
npm run dev
```

Aplikácia bude dostupná na `http://localhost:3000`

## 🐳 Docker Deployment (Synology NAS)

### Požiadavky

- Synology NAS s nainštalovaným **Container Manager** (Docker)
- SSH prístup k NAS
- Doména s HTTPS (voliteľné, ale odporúčané)

### Krok 1: Príprava súborov

```bash
# SSH do NAS
ssh admin@vas-nas-ip

# Vytvorenie priečinkov
cd /volume1/docker
mkdir -p kniha-pz
cd kniha-pz

# Klonovanie repozitára
git clone https://github.com/lackor-risik/kniha-pz.git .

# Vytvorenie priečinkov pre dáta
mkdir -p data/uploads data/postgres
```

### Krok 2: Konfigurácia prostredia

Vytvorte `.env` súbor:

```bash
nano .env
```

S obsahom:

```env
# NextAuth
NEXTAUTH_URL=https://vasa-domena.sk
NEXTAUTH_SECRET=vygenerujte_openssl_rand_-base64_32

# Google OAuth
GOOGLE_CLIENT_ID=vas-google-client-id
GOOGLE_CLIENT_SECRET=vas-google-client-secret

# VAPID (push notifikácie) - vygenerujte: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=vasa_vapid_public_key
VAPID_PRIVATE_KEY=vasa_vapid_private_key
VAPID_SUBJECT=mailto:vas@email.com

# Cron (automatické ukončenie návštev o polnoci)
CRON_SECRET=nahodny_retazec_pre_cron
```

**Generovanie NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Krok 3: Spustenie

```bash
docker-compose up -d --build
```

Prvé spustenie:
- Automaticky vytvorí databázu
- Spustí migrácie
- Naplní databázu základnými dátami (lokality, druhy, sezóna)

### Krok 4: Reverse Proxy (voliteľné)

Pre HTTPS prístup cez Synology:

1. **Control Panel** → **Login Portal** → **Advanced** → **Reverse Proxy**
2. Pridajte pravidlo:
   - **Source**: HTTPS, `vasa-domena.sk`, port 443
   - **Destination**: HTTP, `localhost`, port 3000
3. V **Custom Header** pridajte:
   - `X-Forwarded-For` → `$proxy_add_x_forwarded_for`
   - `X-Forwarded-Proto` → `$scheme`

### Kde sú uložené dáta

| Dáta | Cesta |
|------|-------|
| PostgreSQL databáza | `/volume1/docker/kniha-pz/data/postgres/` |
| Nahrané fotky | `/volume1/docker/kniha-pz/data/uploads/` |

### Užitočné príkazy

```bash
# Pozrieť logy
docker-compose logs -f app

# Reštartovať aplikáciu
docker-compose restart

# Aktualizovať z GitHub
git pull
docker-compose down
docker-compose up -d --build

# Záloha databázy
docker-compose exec db pg_dump -U kniha_pz kniha_pz > backup.sql

# Obnova databázy
docker-compose exec -T db psql -U kniha_pz kniha_pz < backup.sql
```

## ⚙️ Konfigurácia

### Premenné prostredia

| Premenná | Popis | Povinná |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ (auto v Docker) |
| `NEXTAUTH_URL` | URL aplikácie | ✅ |
| `NEXTAUTH_SECRET` | Tajný kľúč pre NextAuth | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ |
| `VAPID_PUBLIC_KEY` | VAPID verejný kľúč pre push notifikácie | ❌ |
| `VAPID_PRIVATE_KEY` | VAPID súkromný kľúč | ❌ |
| `VAPID_SUBJECT` | VAPID subject (mailto: alebo URL) | ❌ |
| `CRON_SECRET` | Tajný kľúč pre cron endpointy | ❌ |

### Google OAuth Setup

1. Prejdite na [Google Cloud Console](https://console.cloud.google.com/)
2. Vytvorte nový projekt alebo vyberte existujúci
3. Prejdite na **APIs & Services** > **Credentials**
4. Vytvorte **OAuth 2.0 Client ID** typu "Web application"
5. Pridajte:
   - Authorized JavaScript origins: `https://vasa-domena.sk`
   - Authorized redirect URIs: `https://vasa-domena.sk/api/auth/callback/google`
6. Skopírujte Client ID a Client Secret do `.env`

### Generovanie VAPID kľúčov

```bash
npx web-push generate-vapid-keys
```

## ⏰ Automatické ukončovanie návštev

Aplikácia obsahuje endpoint na automatické ukončenie všetkých neukončených návštev o polnoci.

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
│   ├── migrations/        # Databázové migrácie
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
├── data/
│   ├── uploads/           # Nahrané fotky (bind mount)
│   └── postgres/          # PostgreSQL dáta (bind mount)
├── docker-compose.yml
├── Dockerfile
├── docker-entrypoint.sh   # Startup script (migrácie + seed)
└── package.json
```

## 🔧 Vývoj

```bash
# Spustenie vývojového servera
npm run dev

# Lint kontrola
npm run lint

# Type check
npm run type-check

# Build produkcie
npm run build

# Spustenie produkcie
npm start

# Prisma Studio (GUI pre databázu)
npm run db:studio
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
