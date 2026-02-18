# Meraki Rapid Configurator

React + TypeScript app for common Cisco Meraki API workflows.

## Features

- API key entry with `Authorization: Bearer {API_KEY}`
- Disconnect / clear in-memory API session
- Auto-selects first organization from `GET /organizations`
- Lists organization networks for user selection
- Operation panels for:
  - Update/create wireless SSID (default SSID 0 = Corp-WiFi, SSID 1 = Guest-WiFi)
  - Update appliance VLAN settings
  - Create group policy
  - Create VLANs in batch table format (5+ rows)
  - Create switch port profiles from live GET switch ports
- Strict payload schema is always enforced (no disable toggle)

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Push to `main` and GitHub Actions deploys `dist/` to GitHub Pages.

## Security Note

This is a static GitHub Pages app. API keys are used in the browser and stored only in memory for the current session.
