/**
 * One-off script: convert workout logs into an importable gym backup.
 * Run:
 *   node scripts/generate-workout-backup.mjs
 *   node scripts/generate-workout-backup.mjs --friend-july
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import JSZip from "jszip";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "generated-backup");

const BACKUP_FORMAT_VERSION = 2;
const SCHEMA_VERSION = 2;
const APP_VERSION = "1.0.0";

const ONE_RM_PERCENTAGE = {
  1: 1.0,
  2: 0.97,
  3: 0.94,
  4: 0.92,
  5: 0.89,
  6: 0.86,
  7: 0.83,
  8: 0.81,
  9: 0.78,
  10: 0.75,
  11: 0.73,
  12: 0.71,
  13: 0.7,
  14: 0.68,
  15: 0.67,
  16: 0.65,
  17: 0.64,
  18: 0.63,
  19: 0.61,
  20: 0.6,
  21: 0.59,
  22: 0.58,
  23: 0.57,
  24: 0.56,
  25: 0.55,
  26: 0.54,
  27: 0.53,
  28: 0.52,
  29: 0.51,
  30: 0.5,
};

function estimateOneRepMax(weight, reps) {
  if (
    !Number.isFinite(weight) ||
    weight < 0 ||
    !Number.isFinite(reps) ||
    reps <= 0
  )
    return 0;
  const pct = reps >= 30 ? 0.5 : (ONE_RM_PERCENTAGE[Math.floor(reps)] ?? 0.5);
  return weight / pct;
}

const APRIL_LOG = `
WWTTC

Panatta - Super Inclined Bench Press - 75kg
11 75kg
7 75kg
3 75kg

Free weight - Paused Bench Press - 60kg
9 60kg
6 60kg
6 60kg

New Tech - Standing Lateral Raise - 35kg
15 35kg
8 35kg
7 35kg

Free Weight - Tricep Pushdown (Vbar) - 57.5kg
7 57.5kg
4 57.5kg
2 57.5kg

Free weight - JM Press - 20kg
12 20kg
10 20kg
7 20kg

Free weight - Cable crunch
13
6
5

Efx Cheung sha wan

Panatta - Pullover machine - 55kg
11 55kg
9 55kg

ERROR - ERROR - 40kg
15 40kg
11 40kg

Free weight - Barbell row - 50kg
13 50kg
11 50kg

Panatta - Super High row - 20kg
11 20kg
12 20kg

Free weight - Cable hammer curl - 16.5kg
12 16.5kg
10 16.5kg

Life fitness - Biceps curl - 30kg
13 30kg
11 30kg

New Tech - Standing Lateral Raise - 40kg
9 40kg
6 40kg

Free weight - Reverse Cable fly - 37.5kg
10 37.5kg

Tsing Yi maritime

Free weight - Weighted pullup - 20kg
10 20kg
6 20kg
5 20kg

Free weight - Lat Pulldown - 50kg
9 50kg
5 50kg

Free weight - Reverse Cable fly - 10kg
13 10kg
11 10kg
9 10kg

Free weight - Seated Preacher curl - 10kg
12 10kg
7 10kg
6 10kg

WWTTC

Panatta - Super Inclined Bench Press - 75kg
12 75kg
6 75kg
5 75kg

Free weight - Paused Bench Press - 60kg
9 60kg
6 60kg
7 60kg

New Tech - Standing Lateral Raise - 40kg
7 40kg
6 40kg
5 40kg

Free Weight - Tricep Pushdown (Vbar) - 57.5kg
11 57.5kg
6 57.5kg
5 57.5kg

Free weight - JM Press - 20kg
17 20kg
9 20kg
6 20kg

Fotan

Nautilus - Incline Press - 85kg
14 85kg
6 85kg
5 85kg

Free weight - Paused Bench Press - 60kg
11 60kg
6 60kg
5 60kg

Free weight - Back extension - 5kg
15 5kg
15 5kg

Free Weight - Tricep Pushdown (Vbar) - 25.25kg
7 25.25kg
9 21.75kg

Free weight - JM Press - 25kg
9 25kg
6 25kg

WWTTC

Panatta - Super Inclined Bench Press - 80kg
9 80kg
6 80kg
4 80kg

New Tech - Seated Chest Press - 75kg
13 75kg
9 75kg
8 75kg

New Tech - Pec Dec Fly/Rear Deltoid (Pec Dec Fly) - 40kg
9 40kg
12 35kg

New Tech - Shoulder Press - 30kg
8 30kg
4 30kg

New Tech - Standing Lateral Raise - 40kg
8 40kg
7 40kg
6 40kg

Free Weight - Tricep Pushdown (Vbar) - 57.5kg
5 57.5kg
10 45kg
10 45kg

Free weight - Smith JM Press - 35kg
10 35kg
8 35kg
9 35kg

WWTTC

Panatta - Lat Pulldown Circular - 80kg
9 80kg
6 80kg
6 75kg

Panatta - Super High Row - 30kg
9 30kg
8 30kg

New Tech - M-Torture Standing & Seated Combo Row - 30kg
8 30kg
8 25kg

Panatta - Super low row - 20kg
8 20kg
7 20kg

Free weight - Reverse cable fly - 15kg
9 15kg
8 15kg
11 10kg

New Tech - Arm curl (Hammer) - 40kg
12 40kg
8 40kg
7 40kg

Free weight - Cable Bayesian Curl - 20kg
11 20kg
7 20kg
6 20kg

Ashley road

Free weight - Barbell squat - 100kg
6 100kg
5 100kg

Hammer Strength - Leg extension - 70kg
13 70kg
9 70kg
8 70kg

Free weight - Back extension - 10kg
12 10kg
9 10kg

WWTTC

Panatta - Super Inclined Bench Press - 80kg
11 80kg
6 80kg
4 80kg

New Tech - Seated Chest Press - 80kg
11 80kg
7 80kg
6 80kg

Free weight - Cable fly - 15kg
9 15kg
8 15kg

New Tech - Standing Lateral Raise - 40kg
11 40kg
5 40kg
6 35kg

Free Weight - Tricep Pushdown (Vbar) - 60kg
5 60kg
9 45kg
3 45kg

Free weight - Katana extension - 20kg
6 20kg
10 20kg

Free weight - Back extension - 10kg
14 10kg
10 10kg
`.trim();

const MAY_LOG = `
Hang hau

Panatta - Lat Pulldown Circular - 80kg
10 80kg
6 80kg
5 80kg

Free weight - Seated cable row - 41kg
10 41kg
9 38.25kg

Free weight - Standing Preacher curl - 12.5kg
6 12.5kg
4 12.5kg

Hou king

Free weight - Barbell squat - 100kg
8 100kg
6 100kg
5 100kg

Hammer strength - Leg extension - 77.5kg
11 77.5kg
6 77.5kg

WWTTC

Panatta - Lat Pulldown Circular - 80kg
11 80kg
5 80kg
4 80kg

New Tech - M-Torture Standing & Seated Combo Row - 25kg
10 25kg
10 25kg

Panatta - Super High Row - 30kg
10 30kg
8 30kg

New Tech - Pec Dec Fly/Rear Deltoid (Rear Deltoid) - 10kg
7 10kg
4 10kg
10 5kg

New Tech - Arm curl (Normal) - 45kg
8 45kg
5 45kg
6 40kg

Kennedy

Free weight - Bench Press - 85kg
6 85kg
2 85kg
4 75kg

Hammer strength - Lateral Raise - 48.5kg
10 48.5kg
5 48.5kg

Free Weight - Tricep Pushdown (Vbar) - 31.25kg
13 31.25kg
9 31.25kg

Free weight - JM Press - 25kg
10 25kg
10 25kg

Free weight - Cable crunch - 40kg
11 40kg
6 40kg

WWTTC

Panatta - Lat Pulldown Circular - 80kg
11 80kg
5 80kg
5 70kg

Free weight - Seated Cable row - 37.5kg
11 37.5kg
8 37.5kg

New Tech - Pec Dec Fly/Rear Deltoid (Rear Deltoid) - 25kg
10 25kg
9 20kg
7 20kg

New Tech - Arm curl (Normal) - 45kg
9 45kg
5 45kg

Free weight - Cable Bayesian Curl - 20kg
12 20kg
`.trim();

const JUN_JUL_LOG = `
Hollywood Plaza

Panatta - Lat Pulldown Circular - 70kg
13 70kg
6 70kg
6 70kg

Free weight - Seated Cable row - 42.5kg
11 42.5kg
8 42.5kg
9 42.5kg

Hammer Strength - Pectoral Fly/Rear Deltoid (Rear Deltoid) - 26kg
14 26kg
10 26kg
10 26kg

Free weight - Standing Preacher Curl - 10kg
11 10kg
6 10kg
4 10kg

Free weight - Back extension - 10kg
15 10kg
9 10kg
6 10kg

WWTTC

Panatta - Super Inclined Bench Press - 70kg
9 70kg
5 70kg
2 70kg

Free weight - Paused Bench Press - 60kg
5 60kg
7 50kg

New Tech - Standing Lateral Raise - 35kg
6 35kg
6 30kg

Free Weight - Tricep Pushdown (Vbar) - 50kg
12 50kg
9 50kg

APM

Free weight - Weighted pullup - 20kg
8 20kg
4 20kg
5 20kg

Free weight - Seated cable row - 37.5kg
13 37.5kg
12 37.5kg
8 37.5kg

New Tech - Pec Dec Fly/Rear Deltoid (Rear Deltoid) - 20kg
12 20kg
11 20kg
8 20kg

Free weight - Standing Preacher curl - 12kg
7 12kg
4 12kg
2 12kg

Free weight - Cable Bayesian Curl - 10kg
13 10kg
8 10kg
9 10kg

WWTTC

Panatta - Super Inclined Bench Press - 70kg
9 70kg
4 70kg
4 70kg

Free weight - Paused Bench Press - 50kg
11 50kg
6 50kg
4 50kg

New Tech - Standing Lateral Raise - 30kg
11 30kg
7 30kg
6 30kg

Free Weight - Tricep Pushdown (Vbar) - 50kg
7 50kg
7 30kg rope
5 30kg

Free weight - JM Press - 20kg
7 20kg
5 20kg
5 20kg

Free weight - Back extension - 10kg
15 10kg
7 10kg
4 10kg

Maritime

Free weight - Weighted pullup - 20kg
8 20kg
5 20kg
3 20kg

Free weight - Pullup
9
5

Free weight - Seated cable row - 35kg
14 35kg
9 35kg

Technogym - Pectoral/Reverse Fly (Reverse Fly) - 10kg
13 10kg
9 10kg
8 10kg

Free weight - Seated Preacher curl - 12kg
8 12kg
3 12kg
2 12kg

Free weight - Back extension - 10kg
15 10kg
12 10kg
10 10kg

WWTTC

Panatta - Super Inclined Bench Press - 70kg
9 70kg
5 70kg
3 70kg

Free weight - Paused Bench Press - 50kg
13 50kg
5 50kg
8 40kg

New Tech - Standing Lateral Raise - 30kg
12 30kg
7 30kg
6 30kg

Free weight - Tricep Pushdown (rope) - 35kg
15 35kg
10 35kg
7 35kg

Maritime

Free weight - Barbell Squat - 100kg
8 100kg
5 90kg
6 100kg

WWTTC

Free weight - Weighted pullup - 20kg
9 20kg
5 20kg
5 20kg

Free weight - Pullup
7
4

Free weight - Seated Cable row - 45kg
11 45kg
6 45kg
5 45kg

New Tech - Pec Dec Fly/Rear Deltoid (Rear Deltoid) - 25kg
14 25kg
10 25kg
10 25kg

Free weight - Standing Preacher curl - 12kg
6 12kg
3 12kg
4 10kg

Free weight - Cable Bayesian Curl - 15kg
12 15kg
9 15kg

Free weight - Back extension - 10kg
15 10kg
14 10kg

Maritime

Free weight - Bench Press - 60kg
9 60kg
5 60kg
5 60kg

Free weight - Paused Bench Press - 45kg
12 45kg
11 45kg

WWTTC

Panatta - Lat Pulldown Circular - 80kg
10 80kg
5 80kg
5 70kg

Panatta - Super High Row - 30kg
9 30kg
8 30kg

Free weight - Seated Cable row - 45kg
13 45kg
7 45kg

Free weight - Reverse Cable Fly
15
9
8

Free weight - Cable Bayesian Curl - 20kg
14 20kg
9 20kg
10 20kg

Free weight - Hammer curl - 7kg
12 7kg

Maritime

Free weight - Barbell Squat - 105kg
8 105kg
4 105kg
4 105kg

Free weight - Smith Calf raise - 110kg
17 110kg
12 110kg

Free weight - Back extension - 10kg
15 10kg
15 10kg
10 10kg

Mei Foo

Hammer strength - Iso Lateral Incline Press - 90kg
9 90kg
4 90kg

New Tech - Seated Chest Press - 75kg
12 75kg
8 75kg

Panatta - Standing Multi Flight (Lateral Raise) - 45kg
12 45kg
8 45kg
7 45kg

Free weight - Tricep pushdown (rope) - 9.1kg
7 9.1kg
12 6.8kg
8 6.8kg

Free weight - Cable crunch - 38.6kg
11 38.6kg
7 38.6kg
6 38.6kg

Hollywood Plaza

Panatta - Lat Pulldown Circular - 80kg
13 80kg
8 80kg
5 80kg

Free weight - Seated cable row - 45kg
10 45kg
8 45kg
7 45kg

Panatta - Peck/Back (Back) - 15kg
17 15kg
11 15kg
7 15kg

Free weight - Standing preacher curl - 12.5kg
4 12.5kg
8 10kg
5 10kg

Free weight - Cable Bayesian Curl - 8.75kg
11 8.75kg
5 8.75kg

Mei Foo

Hammer strength - Linear Hack squat - 40kg
15 40kg
16 40kg
11 40kg

New Tech - Leg extension - 65kg
10 65kg
10 65kg

Life Fitness - Seated Leg curl - 52.5kg
10 52.5kg
15 52.5kg

Maritime

Free weight - Bench press - 65kg
11 65kg
7 65kg
5 65kg

Free weight - Paused Bench Press - 45kg
9 45kg
9 45kg

Free weight - Dumbbell Lateral raise - 8kg
12 8kg
10 8kg
7 8kg

Hollywood Plaza

Panatta - Lat Pulldown Circular - 85kg
9 85kg
5 85kg
4 80kg

Free weight - Seated cable row - 45kg
13 45kg
8 45kg
7 40kg

Hammer Strength - Pectoral Fly/Rear Deltoid (Rear Deltoid) - 33kg
16 33kg
11 33kg
10 33kg

Free weight - Standing Preacher curl - 10kg
10 10kg
7 10kg

Free weight - Cable Bayesian Curl - 8.75kg
12 8.75kg
7 8.75kg
6 8.75kg

Central 3rd

Free weight - Barbell squat - 110kg
7 110kg
4 110kg
3 110kg

Panatta - Leg extension - 65kg
10 65kg

WWTTC

New Tech - Seated Chest Press - 105kg
10 105kg
6 105kg
9 97.5kg

Free weight - Inclined dumbbell press - 24kg
9 24kg
4 24kg
8 24kg

Panatta - Standing Multi flight (Lateral Raise) - 45kg
5 45kg
9 35kg
8 35kg

Free Weight - Tricep Pushdown (Vbar) - 35kg
12 35kg
7 35kg
4 35kg

Free weight - Back extension - 10kg
15 10kg
15 10kg

Panatta - Belt Squat - 170kg
22 170kg
`.trim();

const FRIEND_JULY_LOG = `
Mei Foo

Hammer strength - Iso Lateral Incline Press - 10kg
9 10kg
5 10kg

New Tech - Seated Chest Press - 22.5kg
5 22.5kg
14 15kg

Panatta - Standing Multi Flight (Lateral Raise) - 10kg
15 10kg
9 10kg
2 15kg

Free weight - Tricep Pushdown (rope) - 4.6kg
14 4.6kg
10 4.6kg
9 4.6kg

Free weight - Cable crunch - 20.4kg
13 20.4kg
12 25kg
10 22.7kg

Hollywood Plaza

Panatta - Lat Pulldown Circular - 20kg
14 20kg
7 20kg
6 20kg

Free weight - Seated cable row - 15kg
20 15kg
18 15kg
7 20kg

Free weight - Reverse Cable fly - 5kg
7 5kg
7 5kg
8 5kg

Free weight - Standing Preacher curl - 3kg
4 3kg
16 2kg

Free weight - Cable Bayesian Curl - 1.25kg
9 1.25kg
8 1.25kg

Panatta - Hip Thrust - 60kg
8 60kg

Mei Foo

Hammer strength - Linear Hack squat - 40kg
9 40kg
13 30kg
11 30kg

New Tech - Leg extension - 20kg
18 20kg
28 25kg

Life Fitness - Seated Leg curl - 30kg
36 30kg
21 41.25kg

Mei Foo

New Tech - Seated Chest Press - 15kg
15 15kg
15 15kg
7 22.5kg

Panatta - Standing Multi Flight (Lateral Raise) - 10kg
15 10kg
15 10kg
15 10kg

Free Weight - Tricep Pushdown (rope) - 4.6kg
15 4.6kg
15 4.6kg
15 4.6kg

Hollywood Plaza

Panatta - Lat Pulldown Circular - 25kg
9 25kg
9 25kg
3 25kg

Free weight - Seated cable row - 20kg
14 20kg
13 20kg
9 20kg

Hammer Strength - Pectoral Fly/Rear Deltoid (Rear Deltoid) - 12.5kg
12 12.5kg
6 10kg
7 10kg

Free weight - Standing Preacher curl - 3kg
12 3kg
9 3kg
4 3kg

Free weight - Cable Bayesian Curl - 1.25kg
29 1.25kg
10 1.875kg

WWTTC

New Tech - Seated Chest Press - 22.5kg
12 22.5kg
9 22.5kg
10 22.5kg

Free weight - Inclined dumbbell press - 5kg
10 5kg
10 5kg
10 5kg

Panatta - Standing Multi flight (Lateral Raise) - 10kg
13 10kg
9 10kg

Free Weight - Tricep Pushdown (rope) - 15kg
9 15kg
9 15kg
6 15kg

Panatta - Belt Squat - 80kg
10 80kg
`.trim();

const LOCATION_BY_KEY = new Map([
  ['wwttc', 'WWTTC'],
  ['apm', 'APM'],
  ['maritime', 'Maritime'],
  ['mei foo', 'Mei Foo'],
  ['hollywood plaza', 'Hollywood Plaza'],
  ['central 3rd', 'Central 3rd'],
  ['hang hau', 'Hang Hau'],
  ['hou king', 'Hou King'],
  ['kennedy', 'Kennedy'],
  ['efx cheung sha wan', 'EFX Cheung Sha Wan'],
  ['tsing yi maritime', 'Tsing Yi Maritime'],
  ['fotan', 'Fotan'],
  ['ashley road', 'Ashley Road'],
]);

function titleKey(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeLocation(name) {
  const key = titleKey(name);
  return LOCATION_BY_KEY.get(key) ?? name.trim();
}

function isKnownLocation(line) {
  return LOCATION_BY_KEY.has(titleKey(line));
}

function normalizeBrand(raw) {
  const t = raw.trim().replace(/\s+/g, ' ');
  const lower = t.toLowerCase();
  if (lower === 'free weight' || lower === 'free weights') return 'Free weights';
  if (lower === 'hammer strength') return 'Hammer Strength';
  if (lower === 'new tech') return 'New Tech';
  if (lower === 'life fitness') return 'Life Fitness';
  if (lower === 'panatta') return 'Panatta';
  if (lower === 'technogym') return 'Technogym';
  if (lower === 'nautilus') return 'Nautilus';
  if (lower === 'error') return 'Unknown';
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeMachineName(name) {
  const t = name.trim().replace(/\s+/g, ' ');
  const lower = t.toLowerCase();
  const aliases = {
    'seated cable row': 'Seated Cable row',
    'standing preacher curl': 'Standing Preacher Curl',
    'seated preacher curl': 'Seated Preacher Curl',
    'tricep pushdown': 'Tricep Pushdown',
    'cable bayesian curl': 'Cable Bayesian Curl',
    'jm press': 'JM Press',
    'smith jm press': 'Smith JM Press',
    'cable crunch': 'Cable crunch',
    'barbell squat': 'Barbell squat',
    'barbell row': 'Barbell row',
    'leg extension': 'Leg extension',
    'lateral raise': 'Lateral Raise',
    'bench press': 'Bench Press',
    'arm curl': 'Arm curl',
    'm-torture standing & seated combo row': 'M-Torture Standing & Seated Combo Row',
    'super high row': 'Super High Row',
    'super low row': 'Super Low Row',
    'reverse cable fly': 'Reverse Cable fly',
    'pullover machine': 'Pullover machine',
    'cable hammer curl': 'Cable hammer curl',
    'biceps curl': 'Biceps curl',
    'lat pulldown': 'Lat Pulldown',
    'incline press': 'Incline Press',
    'seated chest press': 'Seated Chest Press',
    'shoulder press': 'Shoulder Press',
    'cable fly': 'Cable fly',
    'katana extension': 'Katana extension',
    error: 'Unknown machine',
  };
  return aliases[lower] ?? t;
}

/** Parse "Brand - Machine (Mode?) - 35kg" or "Brand - Machine" */
function parseExerciseHeader(line) {
  // Strip trailing weight summary: " - 35kg" or " - 42.5kg"
  const weightMatch = line.match(/\s-\s(\d+(?:\.\d+)?)\s*kg\s*$/i);
  let core = line;
  if (weightMatch) {
    core = line.slice(0, -weightMatch[0].length).trim();
  }

  const firstDash = core.indexOf(" - ");
  if (firstDash < 0) return null;

  const brand = normalizeBrand(core.slice(0, firstDash));
  let machinePart = core.slice(firstDash + 3).trim();

  let mode = null;
  const modeMatch = machinePart.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (modeMatch) {
    machinePart = modeMatch[1].trim();
    mode = modeMatch[2].trim();
  }

  return {
    brand,
    machineName: normalizeMachineName(machinePart),
    mode,
  };
}

function parseSetLine(line) {
  const trimmed = line.trim();
  // "13 35kg" or "7 30kg rope" or "9"
  const withWeight = trimmed.match(
    /^(\d+)\s+(\d+(?:\.\d+)?)\s*kg(?:\s+(.+))?$/i,
  );
  if (withWeight) {
    const modeSuffix = withWeight[3]?.trim() || null;
    return {
      reps: parseInt(withWeight[1], 10),
      weight: parseFloat(withWeight[2]),
      unit: "kg",
      modeSuffix,
    };
  }
  const repsOnly = trimmed.match(/^(\d+)$/);
  if (repsOnly) {
    return {
      reps: parseInt(repsOnly[1], 10),
      weight: 0,
      unit: "kg",
      modeSuffix: null,
    };
  }
  return null;
}

function parseLog(raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const sessions = [];
  let current = null;
  let currentExercise = null;

  const flushExercise = () => {
    if (current && currentExercise && currentExercise.sets.length > 0) {
      current.exercises.push(currentExercise);
    }
    currentExercise = null;
  };

  const flushSession = () => {
    flushExercise();
    if (current && current.exercises.length > 0) {
      sessions.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    if (!line) continue;

    if (isKnownLocation(line)) {
      flushSession();
      current = { location: normalizeLocation(line), exercises: [] };
      continue;
    }

    if (!current) continue;

    const set = parseSetLine(line);
    if (set && currentExercise) {
      if (
        set.modeSuffix &&
        titleKey(set.modeSuffix) !== titleKey(currentExercise.mode || "")
      ) {
        const { brand, machineName } = currentExercise;
        flushExercise();
        currentExercise = {
          brand,
          machineName,
          mode: set.modeSuffix,
          sets: [{ reps: set.reps, weight: set.weight, unit: set.unit }],
        };
        continue;
      }
      currentExercise.sets.push({
        reps: set.reps,
        weight: set.weight,
        unit: set.unit,
      });
      continue;
    }

    const header = parseExerciseHeader(line);
    if (header) {
      flushExercise();
      currentExercise = { ...header, sets: [] };
      continue;
    }

    console.warn("Unrecognized line:", line);
  }

  flushSession();
  return sessions;
}

function spacedTimestamp(index, count, rangeStart, rangeEnd) {
  if (count <= 1) return rangeStart.getTime();
  const spanMs = rangeEnd.getTime() - rangeStart.getTime();
  return rangeStart.getTime() + Math.round((spanMs * index) / (count - 1));
}

function buildTables(sessions) {
  const aprilStart = new Date(Date.UTC(2026, 3, 1, 18, 0, 0)); // 1 Apr 2026
  const aprilEnd = new Date(Date.UTC(2026, 3, 30, 18, 0, 0)); // 30 Apr 2026
  const mayStart = new Date(Date.UTC(2026, 4, 1, 18, 0, 0)); // 1 May 2026
  const mayEnd = new Date(Date.UTC(2026, 4, 31, 18, 0, 0)); // 31 May 2026
  const junJulStart = new Date(Date.UTC(2026, 5, 1, 18, 0, 0)); // 1 Jun 2026
  const junJulEnd = new Date(Date.UTC(2026, 6, 19, 18, 0, 0)); // 19 Jul 2026
  const julyStart = new Date(Date.UTC(2026, 6, 1, 18, 0, 0)); // 1 Jul 2026
  const julyEnd = new Date(Date.UTC(2026, 6, 19, 18, 0, 0)); // 19 Jul 2026
  const catalogCreatedAt = aprilStart;

  const periodRanges = {
    april: { start: aprilStart, end: aprilEnd },
    may: { start: mayStart, end: mayEnd },
    junjul: { start: junJulStart, end: junJulEnd },
    july: { start: julyStart, end: julyEnd },
  };

  const periodCounts = {
    april: sessions.filter((s) => s.period === 'april').length,
    may: sessions.filter((s) => s.period === 'may').length,
    junjul: sessions.filter((s) => s.period === 'junjul').length,
    july: sessions.filter((s) => s.period === 'july').length,
  };
  const periodIndexes = { april: 0, may: 0, junjul: 0, july: 0 };

  const gymLocations = [];
  const locationByName = new Map();
  const brands = [];
  const brandByKey = new Map();
  const machines = [];
  const machineByKey = new Map();
  const machineModes = [];
  const modeByKey = new Map();
  const workouts = [];
  const workoutEntries = [];
  const exerciseSets = [];

  let locId = 1;
  let brandId = 1;
  let machineId = 1;
  let modeId = 1;
  let workoutId = 1;
  let entryId = 1;
  let setId = 1;

  const ensureLocation = (name) => {
    if (locationByName.has(name)) return locationByName.get(name);
    const row = {
      id: locId++,
      name,
      created_at: catalogCreatedAt.toISOString(),
    };
    locationByName.set(name, row);
    gymLocations.push(row);
    return row;
  };

  const ensureBrand = (name) => {
    const key = titleKey(name);
    if (brandByKey.has(key)) return brandByKey.get(key);
    const row = {
      id: brandId++,
      name,
      created_at: catalogCreatedAt.toISOString(),
    };
    brandByKey.set(key, row);
    brands.push(row);
    return row;
  };

  const ensureMachine = (brand, machineName, isMultipurpose) => {
    const key = `${brand.id}::${titleKey(machineName)}`;
    if (machineByKey.has(key)) {
      const existing = machineByKey.get(key);
      if (isMultipurpose && !existing.is_multipurpose) {
        existing.is_multipurpose = 1;
      }
      return existing;
    }
    const row = {
      id: machineId++,
      brand_id: brand.id,
      machine_name: machineName,
      is_multipurpose: isMultipurpose ? 1 : 0,
      image_filename: null,
      created_at: catalogCreatedAt.toISOString(),
    };
    machineByKey.set(key, row);
    machines.push(row);
    return row;
  };

  const ensureMode = (machine, modeName) => {
    const key = `${machine.id}::${titleKey(modeName)}`;
    if (modeByKey.has(key)) return modeByKey.get(key);
    const row = {
      id: modeId++,
      machine_id: machine.id,
      mode_name: modeName,
      created_at: catalogCreatedAt.toISOString(),
    };
    modeByKey.set(key, row);
    machineModes.push(row);
    return row;
  };

  // Ensure Free weights exists as the seeded default brand.
  ensureBrand("Free weights");

  sessions.forEach((session) => {
    const period = session.period in periodRanges ? session.period : 'junjul';
    const range = periodRanges[period];
    const startedAt = new Date(
      spacedTimestamp(
        periodIndexes[period],
        periodCounts[period],
        range.start,
        range.end,
      ),
    );
    periodIndexes[period] += 1;
    const endedAt = new Date(startedAt.getTime() + 60 * 60 * 1000);
    const location = ensureLocation(session.location);

    workouts.push({
      id: workoutId,
      workout_name: `${session.location} Session`,
      gym_location_id: location.id,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: 3600,
      created_at: startedAt.toISOString(),
    });

    session.exercises.forEach((ex, exIndex) => {
      const brand = ensureBrand(ex.brand);
      const machine = ensureMachine(brand, ex.machineName, Boolean(ex.mode));
      const mode = ex.mode ? ensureMode(machine, ex.mode) : null;

      workoutEntries.push({
        id: entryId,
        workout_id: workoutId,
        machine_id: machine.id,
        machine_mode_id: mode ? mode.id : null,
        entry_order: exIndex + 1,
        created_at: startedAt.toISOString(),
      });

      ex.sets.forEach((set, setIndex) => {
        const estimated = estimateOneRepMax(set.weight, set.reps);
        exerciseSets.push({
          id: setId++,
          workout_entry_id: entryId,
          set_number: setIndex + 1,
          reps: set.reps,
          weight_value: set.weight,
          weight_unit: set.unit,
          estimated_1rm: Math.round(estimated * 1000) / 1000,
          created_at: startedAt.toISOString(),
        });
      });

      entryId += 1;
    });

    workoutId += 1;
  });

  return {
    gym_locations: gymLocations,
    brands,
    machines,
    machine_modes: machineModes,
    workouts,
    workout_entries: workoutEntries,
    exercise_sets: exerciseSets,
    user_profile: [],
    body_weight_logs: [],
  };
}

function sheetFromRows(columns, rows) {
  if (rows.length === 0) return XLSX.utils.aoa_to_sheet([columns]);
  // Ensure column order
  const ordered = rows.map((row) => {
    const out = {};
    for (const col of columns) out[col] = row[col] ?? null;
    return out;
  });
  return XLSX.utils.json_to_sheet(ordered, { header: columns });
}

function buildWorkbook(tables) {
  const columns = {
    gym_locations: ["id", "name", "created_at"],
    brands: ["id", "name", "created_at"],
    machines: [
      "id",
      "brand_id",
      "machine_name",
      "is_multipurpose",
      "image_filename",
      "created_at",
    ],
    machine_modes: ["id", "machine_id", "mode_name", "created_at"],
    workouts: [
      "id",
      "workout_name",
      "gym_location_id",
      "started_at",
      "ended_at",
      "duration_seconds",
      "created_at",
    ],
    workout_entries: [
      "id",
      "workout_id",
      "machine_id",
      "machine_mode_id",
      "entry_order",
      "created_at",
    ],
    exercise_sets: [
      "id",
      "workout_entry_id",
      "set_number",
      "reps",
      "weight_value",
      "weight_unit",
      "estimated_1rm",
      "created_at",
    ],
    user_profile: ["id", "birth_date", "sex", "created_at", "updated_at"],
    body_weight_logs: [
      "id",
      "weight_value",
      "weight_unit",
      "recorded_at",
      "created_at",
    ],
  };

  const workbook = XLSX.utils.book_new();
  const meta = [
    {
      backup_format_version: BACKUP_FORMAT_VERSION,
      app_version: APP_VERSION,
      schema_version: SCHEMA_VERSION,
      export_timestamp: new Date().toISOString(),
    },
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(meta),
    "meta",
  );

  for (const [name, cols] of Object.entries(columns)) {
    XLSX.utils.book_append_sheet(
      workbook,
      sheetFromRows(cols, tables[name]),
      name,
    );
  }
  return workbook;
}

async function main() {
  const friendJulyOnly = process.argv.includes('--friend-july');
  const sessions = friendJulyOnly
    ? parseLog(FRIEND_JULY_LOG).map((session) => ({ ...session, period: 'july' }))
    : [
        ...parseLog(APRIL_LOG).map((session) => ({ ...session, period: 'april' })),
        ...parseLog(MAY_LOG).map((session) => ({ ...session, period: 'may' })),
        ...parseLog(JUN_JUL_LOG).map((session) => ({
          ...session,
          period: 'junjul',
        })),
      ];
  console.log(`Parsed ${sessions.length} workouts`);
  sessions.forEach((s, i) => {
    const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
    console.log(
      `  ${i + 1}. [${s.period}] ${s.location}: ${s.exercises.length} exercises, ${sets} sets`,
    );
  });

  const tables = buildTables(sessions);
  console.log(
    `Locations=${tables.gym_locations.length}, brands=${tables.brands.length}, machines=${tables.machines.length}, modes=${tables.machine_modes.length}, workouts=${tables.workouts.length}, entries=${tables.workout_entries.length}, sets=${tables.exercise_sets.length}`,
  );

  const workbook = buildWorkbook(tables);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outputBase = friendJulyOnly ? "friend-july-backup" : "backup";
  const zipBase = friendJulyOnly ? "friend-july-gym-backup-from-log" : "gym-backup-from-log";
  const summaryBase = friendJulyOnly ? "friend-july-summary.json" : "summary.json";
  const xlsxPath = path.join(OUT_DIR, `${outputBase}.xlsx`);
  XLSX.writeFile(workbook, xlsxPath);

  const zip = new JSZip();
  const xlsxBuf = fs.readFileSync(xlsxPath);
  zip.file("backup.xlsx", xlsxBuf);
  zip.folder("images");
  const zipBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  const zipPath = path.join(OUT_DIR, `${zipBase}.zip`);
  fs.writeFileSync(zipPath, zipBuf);

  // Also write a JSON summary for inspection
  fs.writeFileSync(
    path.join(OUT_DIR, summaryBase),
    JSON.stringify(
      {
        workouts: tables.workouts.map((w) => ({
          id: w.id,
          name: w.workout_name,
          location_id: w.gym_location_id,
          started_at: w.started_at,
        })),
        locations: tables.gym_locations,
        brands: tables.brands,
        machines: tables.machines,
        modes: tables.machine_modes,
      },
      null,
      2,
    ),
  );

  console.log(`Wrote ${xlsxPath}`);
  console.log(`Wrote ${zipPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
