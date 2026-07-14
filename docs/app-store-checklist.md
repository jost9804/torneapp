# App Store / Play Store checklist

Not needed for the demo — this is the roadmap for shipping TorneApp to the stores with EAS (Expo Application Services).

## Accounts

- [ ] Apple Developer Program — $99/year, needed for TestFlight and the App Store
- [ ] Google Play Console — $25 one-time
- [ ] Expo account (free tier is enough to start) — `npx eas login`

## Before building

- [ ] Final app name and availability check (App Store, Play Store, domain)
- [ ] Bundle identifiers in `app.json`: `ios.bundleIdentifier`, `android.package` (e.g. `com.torneapp.app`)
- [ ] Final icon (1024×1024, no transparency for iOS) and splash screen
- [ ] Version + build number strategy (`expo.version`, autoIncrement in EAS)
- [ ] Production API hosted with HTTPS (stores reject plain-HTTP backends; iOS ATS requires TLS)
- [ ] Auth/accounts decision: if the app has user accounts, Apple requires account deletion in-app

## Legal / privacy

- [ ] Privacy policy URL (required by both stores)
- [ ] Data-collection disclosure: App Store privacy "nutrition labels" and Play Data Safety form
- [ ] If minors can use it, review COPPA/family policies

## Build & submit with EAS

```bash
npx eas build:configure
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
npx eas submit --platform ios
npx eas submit --platform android
```

- [ ] Test with TestFlight (iOS) and Internal Testing track (Android) before public release
- [ ] Screenshots for every required device size (EAS/simulator captures work)
- [ ] Store listing texts in Spanish and English

## Review-guideline pitfalls to avoid

- Crashes or obviously unfinished sections (Apple rejects "demo-quality" apps)
- Login walls without a reason; offer guest/read-only viewing of tournaments
- Placeholder content or broken links in the listing
- Asking for permissions the app does not clearly need
