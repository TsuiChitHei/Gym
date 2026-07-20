export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS gym_locations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY,
    brand_id INTEGER NOT NULL,
    machine_name TEXT NOT NULL,
    is_multipurpose INTEGER NOT NULL DEFAULT 0
        CHECK (is_multipurpose IN (0, 1)),
    image_filename TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    UNIQUE(brand_id, machine_name),
    UNIQUE(image_filename)
);

CREATE TABLE IF NOT EXISTS machine_modes (
    id INTEGER PRIMARY KEY,
    machine_id INTEGER NOT NULL,
    mode_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    UNIQUE(machine_id, mode_name)
);

CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY,
    workout_name TEXT NOT NULL,
    gym_location_id INTEGER,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER
        CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_location_id) REFERENCES gym_locations(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workout_entries (
    id INTEGER PRIMARY KEY,
    workout_id INTEGER NOT NULL,
    machine_id INTEGER NOT NULL,
    machine_mode_id INTEGER,
    entry_order INTEGER NOT NULL
        CHECK (entry_order >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_id) REFERENCES workouts(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (machine_mode_id) REFERENCES machine_modes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    UNIQUE(workout_id, entry_order)
);

CREATE TABLE IF NOT EXISTS exercise_sets (
    id INTEGER PRIMARY KEY,
    workout_entry_id INTEGER NOT NULL,
    set_number INTEGER NOT NULL
        CHECK (set_number >= 1),
    reps INTEGER NOT NULL
        CHECK (reps >= 0),
    weight_value REAL NOT NULL
        CHECK (weight_value >= 0),
    weight_unit TEXT NOT NULL
        CHECK (weight_unit IN ('kg', 'lbs')),
    estimated_1rm REAL
        CHECK (estimated_1rm IS NULL OR estimated_1rm >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_entry_id) REFERENCES workout_entries(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    UNIQUE(workout_entry_id, set_number)
);

CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    birth_date TEXT,
    sex TEXT
        CHECK (sex IS NULL OR sex IN ('male', 'female')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS body_weight_logs (
    id INTEGER PRIMARY KEY,
    weight_value REAL NOT NULL
        CHECK (weight_value > 0),
    weight_unit TEXT NOT NULL
        CHECK (weight_unit IN ('kg', 'lbs')),
    recorded_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
