# Luna Park Coupon System - PRD

## Problem Statement
Sistema di coupon per Luna Park in Italia con due interfacce:
1. **App Cliente**: Cerca luna park, visualizza e usa coupon per giostre
2. **App Organizzatore**: Gestisce giostre e coupon personalizzabili
3. **Admin Panel**: Approva luna park

## User Personas
- **Clienti**: Famiglie e giovani che visitano luna park, cercano sconti
- **Organizzatori**: Gestori di luna park che vogliono offrire promozioni
- **Admin**: Gestisce approvazioni e supervisione

## Core Requirements
- Ricerca luna park per nome/città/regione
- Coupon personalizzabili (nome giostra, numero, sconto, cognome titolare)
- Sistema cooldown configurabile per ogni luna park
- Conferma visiva utilizzo coupon
- Registrazione opzionale per clienti
- Self-registration organizzatori con approvazione admin

## Tech Stack
- Frontend: React + Tailwind CSS
- Backend: FastAPI + MongoDB
- Auth: JWT

## What's Been Implemented (13 Marzo 2026)
✅ Homepage con lista luna park e ricerca
✅ Pagina dettaglio luna park con coupon
✅ Sistema "Usa Ora" con conferma e cooldown
✅ Autenticazione (login/register) per tutti i ruoli
✅ Dashboard organizzatore (gestione giostre/coupon)
✅ Admin panel (approvazione luna park)
✅ Design tema notturno stile luna park italiano
✅ Dati demo (3 luna park, giostre, coupon)
✅ Device ID per utenti non registrati
✅ **Upload immagini** per luna park (13 Marzo 2026)
✅ **Tasto "Iscriviti Gratis"** visibile nell'header (13 Marzo 2026)

## Backlog (P0/P1/P2)

### P0 - Critico
- Nessuno (MVP completo)

### P1 - Importante
- Geolocalizzazione per trovare luna park vicini
- Notifiche push per nuovi coupon
- QR Code per validazione coupon

### P2 - Nice to have
- Integrazione pubblicità (AdMob/Google Ads)
- Statistiche avanzate per organizzatori
- Sistema recensioni luna park
- Coupon validi solo in determinati giorni/ore (già predisposto nel DB)
- Google OAuth login

## Next Tasks
1. Implementare geolocalizzazione
2. Aggiungere upload immagini
3. Integrare sistema pubblicità
