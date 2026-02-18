# Meraki Rapid Configurator

React + TypeScript app for common Cisco Meraki API workflows.

## Features

- API key entry with `Authorization: Bearer {API_KEY}`
- Disconnect / clear in-memory API session
- Auto-selects first organization from `GET /organizations`
- Lists organization networks for user selection
- Operation panels for:
  - Update/create wireless SSID
  - Update appliance VLAN settings
  - Create group policy
  - Create VLAN
  - Auto-create switch port profiles from created VLANs
- Per-operation strict payload schema mode for stronger validation

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
