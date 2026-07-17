# Gym

A React Native (Expo) workout logging app with local SQLite storage and ZIP/Excel backup support.

## Features

- **Log** — Start live workouts with a timer, log exercises, sets, reps, and weight (kg/lbs)
- **History** — Browse workouts grouped by month, view details, add past workouts manually
- **Analytics** — Placeholder for future stats
- **Settings** — Manage brands and machines (with optional images)
- **Backup** — Export/import all data as a ZIP containing `backup.xlsx` + machine images

## Getting Started

```bash
npm install
npm start
```

Scan the QR code with Expo Go (Android/iOS) or press `a` / `i` for an emulator.

## Backup Format

Exports produce `gym-backup-YYYY-MM-DD.zip`:

```
backup.xlsx    # one sheet per table + meta sheet
images/        # machine photos referenced by image_filename
```

Import performs a full replace restore inside a single SQLite transaction.

## Tech Stack

- Expo SDK 57 + React Native
- expo-sqlite
- @react-navigation/bottom-tabs
- xlsx + jszip for backup
- expo-document-picker / expo-sharing for file I/O
