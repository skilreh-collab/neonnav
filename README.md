# NeonNav

Private Navigations-App mit Blitzerwarner, Fahrtkosten-Rechner und Fahrtenbuch.

## Auf GitHub Pages veröffentlichen
1. Neues Repository anlegen (z. B. `neonnav`).
2. **Alle** Dateien aus diesem Ordner hochladen (index.html, sw.js, manifest.webmanifest, Icons).
3. Settings → Pages → Branch `main`, Ordner `/ (root)` → Save.
4. Nach 1–2 Minuten: `https://DEIN-NAME.github.io/neonnav/`

## Aufs Handy installieren
- **iPhone (Safari):** Link öffnen → Teilen ⬆️ → „Zum Home-Bildschirm“.
- **Android (Chrome):** Link öffnen → „Installieren“ antippen (oder Menü ⋮ → „App installieren“).

## Datenquellen
- Karte: © OpenStreetMap-Mitwirkende, © CARTO
- Routing: FOSSGIS-OSRM (routing.openstreetmap.de)
- Suche: Nominatim
- Blitzer: OpenStreetMap (`highway=speed_camera`) über die Overpass API
- Spritpreise: Tankerkönig (eigener API-Schlüssel, nur lokal gespeichert)

Alle persönlichen Daten (Fahrten, Meldungen, Fahrzeug, API-Schlüssel) bleiben im Speicher deines Handys.
