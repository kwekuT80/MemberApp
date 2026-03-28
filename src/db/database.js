import * as SQLite from 'expo-sqlite';

let _db = null;

export function getDb() {
  if (!_db) {
    _db = SQLite.openDatabaseSync('members.db');
  }
  return _db;
}

export async function initDb() {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS tblMembers (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Title TEXT, Surname TEXT, "First Name" TEXT,
      "Other Name(s)" TEXT, "Date of Birth" TEXT,
      "Place of Birth (Town)" TEXT, "Place of Birth (Region)" TEXT,
      Nationality TEXT, HomeTown TEXT, HomeRegion TEXT,
      "Residential Address" TEXT, "Postal Address" TEXT,
      "Phone No" TEXT, "Mobile No" TEXT, Email TEXT,
      "Father's Name" TEXT, "Mother's Name" TEXT,
      "Marital Status" TEXT, "Emp Status" TEXT,
      Occupation TEXT, Workplace TEXT, "Job Status" TEXT,
      "Work Address" TEXT,
      "Uniform, Cadet & Commandery Positions" TEXT,
      "1st Degree Place" TEXT, "2nd & 3rd Degree Place" TEXT,
      "4th Degree Place" TEXT, "Noble Degree Place" TEXT,
      "Date Joined" TEXT
    );
    CREATE TABLE IF NOT EXISTS tblChildren (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      MemberID INTEGER NOT NULL, ChildName TEXT,
      BirthDate TEXT, BirthPlace TEXT
    );
    CREATE TABLE IF NOT EXISTS tblPositions (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      MemberID INTEGER NOT NULL, PositionTitle TEXT,
      DateFrom TEXT, DateTo TEXT
    );
    CREATE TABLE IF NOT EXISTS tblEmergencyContacts (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      MemberID INTEGER NOT NULL, ContactName TEXT,
      Relationship TEXT, Phone1 TEXT, Phone2 TEXT
    );
    CREATE TABLE IF NOT EXISTS tblMilitary (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      MemberID INTEGER NOT NULL UNIQUE,
      IsMilitary INTEGER DEFAULT 0,
      UniformBlessedDate TEXT, FirstUniformUseDate TEXT,
      CurrentRank TEXT, Commission TEXT
    );
    CREATE TABLE IF NOT EXISTS tblDegrees (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      MemberID INTEGER NOT NULL, DegreeType TEXT,
      DegreeDate TEXT, DegreePlace TEXT
    );
    CREATE TABLE IF NOT EXISTS tblSpouse (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      MemberID INTEGER NOT NULL UNIQUE,
      SpouseName TEXT, SpouseDOB TEXT,
      SpouseNationality TEXT, SpouseDenomination TEXT,
      SpouseIsSister INTEGER DEFAULT 0,
      SpouseParish TEXT, AuxiliaryName TEXT,
      AuxiliaryNumber TEXT, SpouseNotes TEXT
    );
    CREATE TABLE IF NOT EXISTS tblRegions (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      RegionName TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS tblDegreeTypes (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      DegreeTypeName TEXT UNIQUE
    );
  `);

  const regionCount = db.getFirstSync(`SELECT COUNT(*) as cnt FROM tblRegions;`);
  if (regionCount.cnt === 0) {
    const regions = [
      'Ahafo','Ashanti','Bono','Bono East','Central','Eastern',
      'Greater Accra','North East','Northern','Oti','Savannah',
      'Upper East','Upper West','Volta','Western','Western North',
    ];
    regions.forEach(r => {
      db.runSync(`INSERT OR IGNORE INTO tblRegions (RegionName) VALUES (?);`, [r]);
    });
  }

  const degreeCount = db.getFirstSync(`SELECT COUNT(*) as cnt FROM tblDegreeTypes;`);
  if (degreeCount.cnt === 0) {
    ['1st Degree','2nd & 3rd Degree','4th Degree','Noble Degree'].forEach(d => {
      db.runSync(`INSERT OR IGNORE INTO tblDegreeTypes (DegreeTypeName) VALUES (?);`, [d]);
    });
  }
}

export function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const rows = getDb().getAllSync(sql, params);
      resolve({ rows: { length: rows.length, item: i => rows[i] } });
    } catch (e) {
      reject(e);
    }
  });
}

export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const result = getDb().runSync(sql, params);
      resolve({ insertId: result.lastInsertRowId, rowsAffected: result.changes });
    } catch (e) {
      reject(e);
    }
  });
}