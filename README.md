# RondaManager 🛡️

Sistema di controllo ronde notturne con app mobile (Flutter) e pannello web (React).

## Architettura

```
RondaManager/
├── mobile/          # App Android (Flutter)
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/       # Modelli dati
│   │   ├── services/     # Servizi (NFC, DB, Crypto, Supabase, GPS)
│   │   ├── providers/    # Stato globale (Provider)
│   │   ├── screens/      # Schermate UI
│   │   └── utils/        # Costanti e utility
│   └── pubspec.yaml
├── web/             # Pannello amministrativo (React + TypeScript)
│   ├── src/
│   │   ├── components/   # Componenti UI
│   │   ├── pages/        # Pagine
│   │   ├── services/     # Servizi Supabase
│   │   ├── utils/        # Utility (crittografia)
│   │   └── types/        # Tipi TypeScript
│   ├── index.html
│   └── package.json
└── supabase-migration.sql  # Schema database Supabase
```

## Setup Sviluppo

### App Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

### Pannello Web (React)

```bash
cd web
npm install
npm run dev
```

## Setup Supabase

### Database Tables

Esegui `supabase-migration.sql` nel SQL Editor di Supabase.

### Storage Buckets

Crea i seguenti bucket pubblici:

- `ronde-csv` - CSV cifrati dei turni
- `ronde-foto` - Foto scattate durante le ronde
- `ronde-apk` - APK per la distribuzione

### Credenziali

1. Copia `.env.example` in `.env` (mobile) o `.env.local` (web)
2. Inserisci Supabase URL e Anon Key
3. Le credenziali saranno incluse nel QR Code di configurazione

## Sicurezza

- **AES-256-GCM** per cifratura dati sul dispositivo
- **QR Code cifrato** per la configurazione iniziale
- **PIN nel KeyStore** Android
- **CSV cifrati** prima dell'invio a Supabase
- Supabase agisce solo come "cassetta postale"
