import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

import { downloadDbFromFirestore, scheduleDbSync } from './src/firestore-sync.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Vercel compatibility
const isVercel = process.env.VERCEL === '1';
const dbPath = isVercel 
  ? path.resolve("/tmp", "rapportini.db")
  : path.resolve(__dirname, "storage", "rapportini.db");

console.log(`[SERVER] Database path: ${dbPath} (Vercel: ${isVercel})`);

const storageDir = path.dirname(dbPath);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

let db: Database.Database;

async function initDatabase() {
  await downloadDbFromFirestore(dbPath);
  
  const dbExists = fs.existsSync(dbPath);
  console.log(`[DB] Initializing database at: ${dbPath}`);
  if (!dbExists) {
    console.log(`[DB] Database file not found. A new one will be created.`);
  } else {
    const stats = fs.statSync(dbPath);
    console.log(`[DB] Database file found. Size: ${stats.size} bytes. Last modified: ${stats.mtime}`);
  }

  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  try {
    // Initialize Database
    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        km REAL DEFAULT 0,
        uuid TEXT
      );

      CREATE TABLE IF NOT EXISTS client_machines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        brand TEXT,
        type TEXT,
        serial_number TEXT,
        year TEXT,
        FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS technicians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialization TEXT,
        phone TEXT,
        email TEXT,
        notes TEXT,
        code TEXT UNIQUE,
        uuid TEXT
      );

      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        price REAL DEFAULT 0,
        stock REAL DEFAULT 0,
        uuid TEXT
      );

      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        vat TEXT,
        email TEXT,
        logo TEXT,
        uuid TEXT
      );

      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        technician_id INTEGER,
        machine_id INTEGER,
        company_id INTEGER,
        description TEXT,
        signature_client TEXT,
        signature_tech TEXT,
        client_km REAL DEFAULT 0,
        extra_km REAL DEFAULT 0,
        uuid TEXT,
        FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(machine_id) REFERENCES client_machines(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS report_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER,
        date TEXT,
        travel_hours REAL DEFAULT 0,
        work_hours REAL DEFAULT 0,
        meals INTEGER DEFAULT 0,
        overnight BOOLEAN DEFAULT 0,
        FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS report_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER,
        article_id INTEGER,
        quantity REAL,
        FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE,
        FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        time TEXT,
        description TEXT,
        alert BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS technician_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        technician_id INTEGER,
        report_id INTEGER,
        date TEXT,
        type TEXT,
        description TEXT,
        FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
        FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      -- Default settings
      INSERT OR IGNORE INTO settings (key, value) VALUES ('password', 'pab2000srl');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_code', 'admin123');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('logo', '');
    `);
    console.log("[DB] Database initialized successfully.");
  } catch (err) {
    console.error("CRITICAL: Database initialization failed:", err);
    process.exit(1);
  }

  // Add UUID columns if they don't exist
  try { db.prepare("ALTER TABLE articles ADD COLUMN price REAL DEFAULT 0").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE articles ADD COLUMN stock REAL DEFAULT 0").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE reports ADD COLUMN uuid TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE clients ADD COLUMN uuid TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE companies ADD COLUMN uuid TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE technicians ADD COLUMN uuid TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE articles ADD COLUMN uuid TEXT").run(); } catch (e) {}

  try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_uuid ON reports(uuid)").run(); } catch (e) {}
  try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_uuid ON clients(uuid)").run(); } catch (e) {}
  try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_uuid ON companies(uuid)").run(); } catch (e) {}
  try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_technicians_uuid ON technicians(uuid)").run(); } catch (e) {}
  try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_uuid ON articles(uuid)").run(); } catch (e) {}

  // Migration: Add missing columns and fix constraints
  const tablesToFix = [
    { name: 'clients', sql: `CREATE TABLE clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      km REAL DEFAULT 0,
      uuid TEXT
    )` },
    { name: 'client_machines', sql: `CREATE TABLE client_machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      brand TEXT,
      type TEXT,
      serial_number TEXT,
      year TEXT,
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
    )` },
    { name: 'technicians', sql: `CREATE TABLE technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialization TEXT,
      phone TEXT,
      email TEXT,
      notes TEXT,
      code TEXT UNIQUE,
      uuid TEXT
    )` },
    { name: 'articles', sql: `CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      uuid TEXT
    )` },
    { name: 'companies', sql: `CREATE TABLE companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      vat TEXT,
      email TEXT,
      logo TEXT,
      uuid TEXT
    )` },
    { name: 'reports', sql: `CREATE TABLE reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      technician_id INTEGER,
      machine_id INTEGER,
      company_id INTEGER,
      description TEXT,
      signature_client TEXT,
      signature_tech TEXT,
      client_km REAL DEFAULT 0,
      extra_km REAL DEFAULT 0,
      uuid TEXT,
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
      FOREIGN KEY(machine_id) REFERENCES client_machines(id) ON DELETE SET NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL
    )` },
    { name: 'report_days', sql: `CREATE TABLE report_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER,
      date TEXT,
      travel_hours REAL DEFAULT 0,
      work_hours REAL DEFAULT 0,
      meals INTEGER DEFAULT 0,
      overnight BOOLEAN DEFAULT 0,
      FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
    )` },
    { name: 'report_items', sql: `CREATE TABLE report_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER,
      article_id INTEGER,
      quantity REAL,
      FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE,
      FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
    )` },
    { name: 'technician_events', sql: `CREATE TABLE technician_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      technician_id INTEGER,
      report_id INTEGER,
      date TEXT,
      type TEXT,
      description TEXT,
      FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
      FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
    )` }
  ];

  db.pragma('foreign_keys = OFF');
  for (const table of tablesToFix) {
    const currentSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table.name)?.sql;
    const needsMigration = !currentSql || 
                           (table.name !== 'clients' && table.name !== 'articles' && table.name !== 'companies' && table.name !== 'technicians' && !currentSql.includes('CASCADE')) ||
                           (table.name === 'technicians' && !currentSql.includes('UNIQUE')) ||
                           (table.name === 'technician_events' && !currentSql.includes('report_id')) ||
                           (table.name === 'reports' && !currentSql.includes('company_id')) ||
                           (table.name === 'reports' && currentSql.includes('REFERENCES client_machines(id) ON DELETE CASCADE')) ||
                           (currentSql.includes('_old'));
    
    if (needsMigration) {
      console.log(`Force migrating ${table.name}...`);
      try {
        db.transaction(() => {
          db.exec(`DROP TABLE IF EXISTS ${table.name}_temp`);
          if (currentSql) {
            db.exec(`CREATE TABLE ${table.name}_temp AS SELECT * FROM ${table.name}`);
          }
          db.exec(`DROP TABLE IF EXISTS ${table.name}`);
          db.exec(`DROP TABLE IF EXISTS ${table.name}_old`);
          db.exec(table.sql);
          if (currentSql) {
            const columns = (db.prepare(`PRAGMA table_info(${table.name})`).all() as any[]).map(c => c.name);
            const tempColumns = (db.prepare(`PRAGMA table_info(${table.name}_temp)`).all() as any[]).map(c => c.name);
            const commonColumns = columns.filter(c => tempColumns.includes(c));
            if (commonColumns.length > 0) {
              const cols = commonColumns.join(', ');
              db.exec(`INSERT INTO ${table.name} (${cols}) SELECT ${cols} FROM ${table.name}_temp`);
            }
            db.exec(`DROP TABLE ${table.name}_temp`);
          }
        })();
      } catch (e) {
        console.error(`Failed to migrate ${table.name}:`, e);
      }
    }
  }
  db.pragma('foreign_keys = ON');

  const tables = {
    clients: ['km'],
    technicians: ['specialization', 'phone', 'email', 'notes', 'code'],
    reports: ['client_km', 'extra_km', 'machine_id', 'company_id']
  };

  for (const [table, columns] of Object.entries(tables)) {
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    const existingColumns = tableInfo.map(c => c.name);
    for (const col of columns) {
      if (!existingColumns.includes(col)) {
        try {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${col === 'km' || col.endsWith('_km') ? 'REAL DEFAULT 0' : 'TEXT'}`);
        } catch (e) {
          console.error(`Error adding column ${col} to ${table}:`, e);
        }
      }
    }
  }

  // Watch for database file changes and sync to Firestore
  fs.watch(dbPath, (eventType) => {
    if (eventType === 'change') {
      scheduleDbSync(dbPath);
    }
  });
}

async function startServer() {
  console.log("[SERVER] Starting server initialization...");
  await initDatabase();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/ping", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      port: PORT
    });
  });

  // API Routes
  console.log("[SERVER] Registering API routes...");
  app.get("/api/dashboard", (req, res) => {
    const { technicianId } = req.query;
    let reportsCount;
    if (technicianId) {
      reportsCount = db.prepare("SELECT COUNT(*) as count FROM reports WHERE technician_id = ?").get(technicianId).count;
    } else {
      reportsCount = db.prepare("SELECT COUNT(*) as count FROM reports").get().count;
    }
    const clientsCount = db.prepare("SELECT COUNT(*) as count FROM clients").get().count;
    const techniciansCount = db.prepare("SELECT COUNT(*) as count FROM technicians").get().count;
    const articlesCount = db.prepare("SELECT COUNT(*) as count FROM articles").get().count;
    res.json({ reportsCount, clientsCount, techniciansCount, articlesCount });
  });

  // Translation endpoint to avoid exposing API Key to client side
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text) {
        return res.json({ translation: "" });
      }
      
      let apiKey = process.env.GEMINI_API_KEY?.trim();
      
      if (apiKey) {
        // Remove surrounding quotes if the user accidentally pasted them
        apiKey = apiKey.replace(/^["']|["']$/g, '');
      }

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'undefined') {
        throw new Error("GEMINI_API_KEY is missing or invalid. Please check your Secrets configuration.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Translate the following job description to ${targetLanguage}. Preserve technical terms and original formatting/newlines.\n\nText:\n${text}`;
      
      const model = "gemini-3.1-pro-preview";
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { temperature: 0.1 }
      });
      
      res.json({ translation: response.text?.trim() || text });
    } catch (error: any) {
      console.error("[API] Translation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clients
  app.get("/api/clients", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients").all();
    for (const client of clients) {
      client.machines = db.prepare("SELECT * FROM client_machines WHERE client_id = ?").all(client.id);
    }
    res.json(clients);
  });

  app.get("/api/clients/:id", (req, res) => {
    try {
      const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
      if (client) {
        client.machines = db.prepare("SELECT * FROM client_machines WHERE client_id = ?").all(client.id);
        res.json(client);
      } else {
        res.status(404).json({ error: "Client not found" });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/clients", (req, res) => {
    try {
      const { uuid, name, address, phone, email, km, machines } = req.body;
      
      // Check if UUID exists
      if (uuid) {
        const existing = db.prepare("SELECT id FROM clients WHERE uuid = ?").get(uuid) as { id: number };
        if (existing) {
          console.log(`[API] Client with UUID ${uuid} already exists (ID: ${existing.id}). Returning existing ID.`);
          const existingClient = db.prepare("SELECT * FROM clients WHERE id = ?").get(existing.id) as any;
          if (existingClient) {
            existingClient.machines = db.prepare("SELECT * FROM client_machines WHERE client_id = ?").all(existing.id);
          }
          return res.json(existingClient);
        }
      }

      const insertClient = db.transaction((clientData, machineData) => {
        const info = db.prepare("INSERT INTO clients (uuid, name, address, phone, email, km) VALUES (?, ?, ?, ?, ?, ?)").run(clientData.uuid || null, name, address, phone, email, km || 0);
        const clientId = info.lastInsertRowid;
        const machineStmt = db.prepare("INSERT INTO client_machines (client_id, brand, type, serial_number, year) VALUES (?, ?, ?, ?, ?)");
        for (const m of machineData || []) {
          machineStmt.run(clientId, m.brand, m.type, m.serial_number, m.year);
        }
        return clientId;
      });
      const id = insertClient({ uuid, name, address, phone, email, km }, machines);
      const newClient = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as any;
      if (newClient) {
        newClient.machines = db.prepare("SELECT * FROM client_machines WHERE client_id = ?").all(id);
      }
      res.json(newClient);
    } catch (err) {
      console.error("[API] Error creating client:", err);
      res.status(500).json({ error: "Failed to create client: " + (err as Error).message });
    }
  });

  app.put("/api/clients/:id", (req, res) => {
    try {
      const { name, address, phone, email, km, machines } = req.body;
      let notFound = false;
      const updateClient = db.transaction((clientData, machineData) => {
        const clientId = parseInt(req.params.id, 10);
        const info = db.prepare("UPDATE clients SET name = ?, address = ?, phone = ?, email = ?, km = ? WHERE id = ?").run(name, address, phone, email, km || 0, clientId);
        if (info.changes === 0) {
          notFound = true;
          return;
        }
        const existingMachines = db.prepare("SELECT id FROM client_machines WHERE client_id = ?").all(clientId) as { id: number }[];
        const existingIds = new Set(existingMachines.map(m => m.id));
        
        const insertMachine = db.prepare("INSERT INTO client_machines (client_id, brand, type, serial_number, year) VALUES (?, ?, ?, ?, ?)");
        const updateMachine = db.prepare("UPDATE client_machines SET brand = ?, type = ?, serial_number = ?, year = ? WHERE id = ?");
        const deleteMachine = db.prepare("DELETE FROM client_machines WHERE id = ?");
        
        const incomingIds = new Set<number>();
        for (const m of machineData || []) {
          const mId = Number(m.id);
          if (mId && existingIds.has(mId)) {
            updateMachine.run(m.brand, m.type, m.serial_number, m.year, mId);
            incomingIds.add(mId);
          } else {
            insertMachine.run(clientId, m.brand, m.type, m.serial_number, m.year);
          }
        }
        
        for (const id of existingIds) {
          if (!incomingIds.has(id)) {
            db.prepare("UPDATE reports SET machine_id = NULL WHERE machine_id = ?").run(id);
            deleteMachine.run(id);
          }
        }
      });
      updateClient({ name, address, phone, email, km }, machines);
      
      if (notFound) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      const updatedClient = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id) as any;
      if (updatedClient) {
        updatedClient.machines = db.prepare("SELECT * FROM client_machines WHERE client_id = ?").all(req.params.id);
      }
      res.json(updatedClient);
    } catch (err) {
      console.error("[API] Error updating client:", err);
      res.status(500).json({ error: "Failed to update client: " + (err as Error).message });
    }
  });

  app.delete("/api/clients", (req, res) => {
    try {
      console.log("[DELETE] Deleting ALL clients...");
      const deleteAllTx = db.transaction(() => {
        // 1. Get all reports linked to clients
        const reports = db.prepare("SELECT id FROM reports WHERE client_id IS NOT NULL").all() as { id: number }[];
        console.log(`[DELETE] Found ${reports.length} reports linked to clients`);

        for (const report of reports) {
           db.prepare("DELETE FROM report_items WHERE report_id = ?").run(report.id);
           db.prepare("DELETE FROM report_days WHERE report_id = ?").run(report.id);
           db.prepare("DELETE FROM technician_events WHERE report_id = ?").run(report.id);
           db.prepare("DELETE FROM reports WHERE id = ?").run(report.id);
        }

        // 2. Delete machines
        db.prepare("DELETE FROM client_machines").run();

        // 3. Delete clients
        const result = db.prepare("DELETE FROM clients").run();
        console.log(`[DELETE] Deleted ${result.changes} clients`);
      });

      deleteAllTx();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete all clients error:", err);
      res.status(500).json({ error: "Failed to delete clients" });
    }
  });

  app.delete("/api/clients/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[DELETE] Client request for ID: ${id}`);
      
      const deleteClientTx = db.transaction((clientId: number) => {
        const reports = db.prepare("SELECT id FROM reports WHERE client_id = ?").all(clientId) as { id: number }[];
        console.log(`Found ${reports.length} reports for client ${clientId}`);
        
        for (const report of reports) {
          db.prepare("DELETE FROM report_items WHERE report_id = ?").run(report.id);
          db.prepare("DELETE FROM report_days WHERE report_id = ?").run(report.id);
          db.prepare("DELETE FROM technician_events WHERE report_id = ?").run(report.id);
          db.prepare("DELETE FROM reports WHERE id = ?").run(report.id);
        }
        
        db.prepare("DELETE FROM client_machines WHERE client_id = ?").run(clientId);
        return db.prepare("DELETE FROM clients WHERE id = ?").run(clientId);
      });

      const result = deleteClientTx(id);
      console.log(`Client ${id} deleted. Changes: ${result.changes}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete client error:", err);
      res.status(500).json({ error: "Errore nell'eliminazione del cliente: " + (err as Error).message });
    }
  });

  // Companies API
  app.get("/api/companies", (req, res) => {
    try {
      const companies = db.prepare("SELECT * FROM companies ORDER BY name").all();
      res.json(companies);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/companies/:id", (req, res) => {
    try {
      const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(req.params.id);
      if (company) {
        res.json(company);
      } else {
        res.status(404).json({ error: "Company not found" });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/companies", (req, res) => {
    try {
      const { name, address, phone, vat, email, logo, uuid } = req.body;
      
      // Check if UUID exists
      const existing = db.prepare("SELECT * FROM companies WHERE uuid = ? AND uuid IS NOT NULL").get(uuid || null) as any;
      if (existing) {
        console.log(`[API] Company with UUID ${uuid} already exists (ID: ${existing.id}). Returning existing ID.`);
        return res.json(existing);
      }

      const result = db.prepare(
        "INSERT INTO companies (name, address, phone, vat, email, logo, uuid) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(name, address, phone, vat, email, logo, uuid || null);
      res.json({ id: result.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put("/api/companies/:id", (req, res) => {
    try {
      const { name, address, phone, vat, email, logo, uuid } = req.body;
      const info = db.prepare(
        "UPDATE companies SET name = ?, address = ?, phone = ?, vat = ?, email = ?, logo = ?, uuid = COALESCE(?, uuid) WHERE id = ?"
      ).run(name, address, phone, vat, email, logo, uuid || null, req.params.id);
      
      if (info.changes === 0) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/companies/:id", (req, res) => {
    try {
      db.transaction(() => {
        db.prepare("UPDATE reports SET company_id = NULL WHERE company_id = ?").run(req.params.id);
        db.prepare("DELETE FROM companies WHERE id = ?").run(req.params.id);
      })();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

const serverTranslations = {
  it: {
    company: 'Azienda',
    name: 'Nome / Ragione Sociale',
    address: 'Indirizzo',
    phone: 'Telefono',
    email: 'Email',
    vat: 'Partita IVA',
    logo: 'Logo',
    km: 'KM Sede',
    brand: 'Brand',
    type: 'Tipo',
    serial_number: 'Matricola',
    year: 'Anno',
    code: 'Codice',
    description: 'Descrizione',
    client: 'Cliente',
    technician: 'Tecnico',
    date: 'Data',
    work_hours: 'Ore Lavoro',
    travel_hours: 'Ore Viaggio',
    meals: 'Pasti',
    overnight: 'Pernottamenti',
    client_km: 'Km Cliente',
    extra_km: 'Km Extra',
    materials: 'Materiali'
  },
  en: {
    company: 'Company',
    name: 'Name / Company',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    vat: 'VAT Number',
    logo: 'Logo',
    km: 'Base KM',
    brand: 'Brand',
    type: 'Type',
    serial_number: 'Serial Number',
    year: 'Year',
    code: 'Code',
    description: 'Description',
    client: 'Client',
    technician: 'Technician',
    date: 'Date',
    work_hours: 'Work Hours',
    travel_hours: 'Travel Hours',
    meals: 'Meals',
    overnight: 'Overnight',
    client_km: 'Client KM',
    extra_km: 'Extra KM',
    materials: 'Materials'
  },
  es: {
    company: 'Empresa',
    name: 'Nombre / Empresa',
    address: 'Dirección',
    phone: 'Teléfono',
    email: 'Email',
    vat: 'NIF/CIF',
    logo: 'Logo',
    km: 'KM Base',
    brand: 'Marca',
    type: 'Tipo',
    serial_number: 'Matrícula',
    year: 'Año',
    code: 'Código',
    description: 'Descripción',
    client: 'Cliente',
    technician: 'Técnico',
    date: 'Fecha',
    work_hours: 'Horas Trabajo',
    travel_hours: 'Horas Viaje',
    meals: 'Comidas',
    overnight: 'Pernoctación',
    client_km: 'KM Cliente',
    extra_km: 'KM Extra',
    materials: 'Materiales'
  }
};

// Helper to find value by multiple possible keys (case-insensitive)
const getValue = (row: any, keys: (string | undefined)[]) => {
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    if (!key) continue;
    // Direct match
    if (row[key] !== undefined) return row[key];
    
    // Case-insensitive match
    const foundKey = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
    if (foundKey && row[foundKey] !== undefined) return row[foundKey];
  }
  return undefined;
};

// ... existing code ...

  app.get("/api/export/clients", (req, res) => {
    try {
      const lang = (req.query.lang as string) || 'it';
      const t = serverTranslations[lang as keyof typeof serverTranslations] || serverTranslations.it;

      const clients = db.prepare(`
        SELECT c.name, c.address, c.phone, c.email, c.km,
               m.brand, m.type, m.serial_number, m.year
        FROM clients c
        LEFT JOIN client_machines m ON c.id = m.client_id
      `).all();
      
      let data = clients.map((c: any) => ({
        [t.name]: c.name,
        [t.address]: c.address,
        [t.phone]: c.phone,
        [t.email]: c.email,
        [t.km]: c.km,
        [t.brand]: c.brand,
        [t.type]: c.type,
        [t.serial_number]: c.serial_number,
        [t.year]: c.year
      }));

      if (data.length === 0) {
        data = [{
          [t.name]: '',
          [t.address]: '',
          [t.phone]: '',
          [t.email]: '',
          [t.km]: '',
          [t.brand]: '',
          [t.type]: '',
          [t.serial_number]: '',
          [t.year]: ''
        }];
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clienti");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=clients.xlsx');
      res.send(buffer);
    } catch (err) {
      console.error('Export clients error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/import/clients", (req, res) => {
    try {
      const { data } = req.body;
      const workbook = XLSX.read(data, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const insertClientStmt = db.prepare("INSERT INTO clients (name, address, phone, email, km) VALUES (?, ?, ?, ?, ?)");
      const updateClientStmt = db.prepare("UPDATE clients SET address = ?, phone = ?, email = ?, km = ? WHERE id = ?");
      const machineStmt = db.prepare("INSERT INTO client_machines (client_id, brand, type, serial_number, year) VALUES (?, ?, ?, ?, ?)");
      const checkMachineStmt = db.prepare("SELECT id FROM client_machines WHERE client_id = ? AND brand = ? AND type = ? AND serial_number = ?");
      const getClientStmt = db.prepare("SELECT id FROM clients WHERE name = ?");

      const transaction = db.transaction((rows: any[]) => {
        for (const row of rows) {
          // Map headers from any language
          const name = getValue(row, [serverTranslations.it.name, serverTranslations.en.name, serverTranslations.es.name, 'name', 'nome', 'ragione sociale', 'azienda', 'cliente', 'client']);
          const address = getValue(row, [serverTranslations.it.address, serverTranslations.en.address, serverTranslations.es.address, 'address', 'indirizzo', 'via', 'dirección']);
          const phone = getValue(row, [serverTranslations.it.phone, serverTranslations.en.phone, serverTranslations.es.phone, 'phone', 'telefono', 'tel', 'teléfono']);
          const email = getValue(row, [serverTranslations.it.email, serverTranslations.en.email, serverTranslations.es.email, 'email', 'e-mail', 'correo']);
          const km = getValue(row, [serverTranslations.it.km, serverTranslations.en.km, serverTranslations.es.km, 'km', 'chilometri', 'kilometers']);
          
          const brand = getValue(row, [serverTranslations.it.brand, serverTranslations.en.brand, serverTranslations.es.brand, 'brand', 'marca']);
          const type = getValue(row, [serverTranslations.it.type, serverTranslations.en.type, serverTranslations.es.type, 'type', 'tipo', 'modello', 'model']);
          const serial = getValue(row, [serverTranslations.it.serial_number, serverTranslations.en.serial_number, serverTranslations.es.serial_number, 'serial_number', 'matricola', 'serial', 'numero di serie']);
          const year = getValue(row, [serverTranslations.it.year, serverTranslations.en.year, serverTranslations.es.year, 'year', 'anno', 'año']);

          if (name) {
            let client = getClientStmt.get(name) as { id: number };
            if (client) {
              updateClientStmt.run(address || '', phone || '', email || '', Number(km || 0), client.id);
            } else {
              const info = insertClientStmt.run(name, address || '', phone || '', email || '', Number(km || 0));
              client = { id: info.lastInsertRowid as number };
            }
            
            if (client && brand) {
              const existingMachine = checkMachineStmt.get(client.id, brand, type || '', serial || '');
              if (!existingMachine) {
                machineStmt.run(client.id, brand, type || '', serial || '', year || '');
              }
            }
          }
        }
      });
      transaction(rows);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Import failed: ' + (e as Error).message });
    }
  });

  app.post("/api/clients/:id/machines", (req, res) => {
    try {
      const { brand, type, serial_number, year } = req.body;
      const clientId = parseInt(req.params.id, 10);
      const info = db.prepare("INSERT INTO client_machines (client_id, brand, type, serial_number, year) VALUES (?, ?, ?, ?, ?)").run(clientId, brand, type, serial_number, year);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      console.error("[API] Error creating machine:", err);
      res.status(500).json({ error: "Failed to create machine: " + (err as Error).message });
    }
  });

  app.get("/api/export/reports", (req, res) => {
    try {
      const lang = (req.query.lang as string) || 'it';
      const t = serverTranslations[lang as keyof typeof serverTranslations] || serverTranslations.it;

      const reports = db.prepare(`
        SELECT r.*, c.name as client_name, t.name as technician_name, co.name as company_name, co.address as company_address, co.phone as company_phone, co.vat as company_vat, co.email as company_email
        FROM reports r 
        LEFT JOIN clients c ON r.client_id = c.id 
        LEFT JOIN technicians t ON r.technician_id = t.id
        LEFT JOIN companies co ON r.company_id = co.id
      `).all();
      
      let data = reports.map((r: any) => {
        // Get hours from report_days
        const days = db.prepare("SELECT * FROM report_days WHERE report_id = ?").all(r.id) as any[];
        const totalWorkHours = days.reduce((acc, d) => acc + (d.work_hours || 0), 0);
        const totalTravelHours = days.reduce((acc, d) => acc + (d.travel_hours || 0), 0);
        const totalMeals = days.reduce((acc, d) => acc + (d.meals || 0), 0);
        const totalOvernight = days.reduce((acc, d) => acc + (d.overnight ? 1 : 0), 0);
        const dates = days.map(d => d.date).join(', ');

        // Get items
        const items = db.prepare(`
          SELECT ri.quantity, a.description 
          FROM report_items ri 
          JOIN articles a ON ri.article_id = a.id 
          WHERE ri.report_id = ?
        `).all(r.id) as any[];
        
        const itemsStr = items.map(i => `${i.description} (${i.quantity})`).join('; ');

        return {
          [t.company]: r.company_name,
          [t.address]: r.company_address,
          [t.phone]: r.company_phone,
          [t.vat]: r.company_vat,
          [t.email]: r.company_email,
          [t.client]: r.client_name,
          [t.technician]: r.technician_name,
          [t.date]: dates || r.date,
          [t.work_hours]: totalWorkHours,
          [t.travel_hours]: totalTravelHours,
          [t.meals]: totalMeals,
          [t.overnight]: totalOvernight,
          [t.client_km]: r.client_km,
          [t.extra_km]: r.extra_km,
          [t.materials]: itemsStr
        };
      });

      if (data.length === 0) {
        data = [{
          [t.company]: '',
          [t.address]: '',
          [t.phone]: '',
          [t.vat]: '',
          [t.email]: '',
          [t.client]: '',
          [t.technician]: '',
          [t.date]: '',
          [t.work_hours]: '',
          [t.travel_hours]: '',
          [t.meals]: '',
          [t.overnight]: '',
          [t.client_km]: '',
          [t.extra_km]: '',
          [t.materials]: ''
        }];
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rapportini");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=reports.xlsx');
      res.send(buffer);
    } catch (err) {
      console.error('Export reports error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/import/reports", (req, res) => {
    try {
      const { data } = req.body;
      // data is base64 string
      const workbook = XLSX.read(data, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const insertReport = db.transaction((rows: any[]) => {
        const reportStmt = db.prepare(`
          INSERT INTO reports (client_id, technician_id, description, client_km, extra_km) 
          VALUES (?, ?, ?, ?, ?)
        `);
        const dayStmt = db.prepare(`
          INSERT INTO report_days (report_id, date, work_hours, travel_hours) 
          VALUES (?, ?, ?, ?)
        `);

        for (const row of rows) {
          const clientName = getValue(row, [serverTranslations.it.client, serverTranslations.en.client, serverTranslations.es.client, 'Cliente', 'Client']);
          const techName = getValue(row, [serverTranslations.it.technician, serverTranslations.en.technician, serverTranslations.es.technician, 'Tecnico', 'Technician']);
          const dateVal = getValue(row, [serverTranslations.it.date, serverTranslations.en.date, serverTranslations.es.date, 'Data', 'Date', 'Fecha']);
          const clientKm = getValue(row, [serverTranslations.it.client_km, serverTranslations.en.client_km, serverTranslations.es.client_km, 'Km Cliente', 'Client Km']);
          const extraKm = getValue(row, [serverTranslations.it.extra_km, serverTranslations.en.extra_km, serverTranslations.es.extra_km, 'Km Extra', 'Extra Km']);
          const workHours = getValue(row, [serverTranslations.it.work_hours, serverTranslations.en.work_hours, serverTranslations.es.work_hours, 'Ore Lavoro', 'Work Hours']);
          const travelHours = getValue(row, [serverTranslations.it.travel_hours, serverTranslations.en.travel_hours, serverTranslations.es.travel_hours, 'Ore Viaggio', 'Travel Hours']);

          // Find Client ID
          let clientId = null;
          if (clientName) {
            const client = db.prepare("SELECT id FROM clients WHERE name = ?").get(clientName) as { id: number };
            if (client) clientId = client.id;
            else {
               const info = db.prepare("INSERT INTO clients (name) VALUES (?)").run(clientName);
               clientId = info.lastInsertRowid;
            }
          }

          // Find Technician ID
          let techId = null;
          if (techName) {
            const tech = db.prepare("SELECT id FROM technicians WHERE name = ?").get(techName) as { id: number };
            if (tech) techId = tech.id;
            else {
               const info = db.prepare("INSERT INTO technicians (name) VALUES (?)").run(techName);
               techId = info.lastInsertRowid;
            }
          }

          const info = reportStmt.run(
            clientId, 
            techId, 
            `Importato: ${clientName || ''}`, 
            clientKm || 0, 
            extraKm || 0
          );
          const reportId = info.lastInsertRowid;

          // Handle Date(s)
          // Dates might be comma separated if multiple days
          const dateStr = dateVal ? String(dateVal) : new Date().toISOString().split('T')[0];
          const dates = dateStr.split(',').map(d => d.trim());
          
          // Distribute hours across days (simple logic: all hours on first day or split? Let's put all on first day for now or split evenly)
          // Better: just put on the first date found

          if (dates.length > 0) {
             // If multiple dates, we just add one entry for the first date with total hours, 
             // as we don't have detailed breakdown in the export.
             // Or we could create multiple entries with 0 hours for others.
             // Let's just add one entry for simplicity as per the export format limitation.
             dayStmt.run(reportId, dates[0], workHours || 0, travelHours || 0);
          }
        }
      });

      insertReport(rows);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Import failed: ' + (e as Error).message });
    }
  });

  // Technicians
  app.get("/api/technicians", (req, res) => res.json(db.prepare("SELECT * FROM technicians").all()));
  app.get("/api/technicians_info", (req, res) => res.json(db.pragma('table_info(technicians)')));
  app.get("/api/technicians/:id", (req, res) => {
    const tech = db.prepare("SELECT * FROM technicians WHERE id = ?").get(req.params.id);
    if (tech) res.json(tech);
    else res.status(404).json({ error: "Technician not found" });
  });
  app.post("/api/technicians", (req, res) => {
    try {
      const { name, specialization, phone, email, notes, code, uuid } = req.body;
      
      // Check if UUID or code exists
      const existing = db.prepare("SELECT * FROM technicians WHERE (uuid = ? AND uuid IS NOT NULL) OR (code = ? AND code IS NOT NULL AND code != '')").get(uuid || null, code || null) as any;
      if (existing) {
        console.log(`[API] Technician with UUID ${uuid} or code ${code} already exists (ID: ${existing.id}). Returning existing ID.`);
        return res.json(existing);
      }

      const info = db.prepare("INSERT INTO technicians (name, specialization, phone, email, notes, code, uuid) VALUES (?, ?, ?, ?, ?, ?, ?)").run(name, specialization, phone, email, notes, code || null, uuid || null);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      console.error("[API] Error creating technician:", err);
      res.status(500).json({ error: "Failed to create technician: " + (err as Error).message });
    }
  });
  app.put("/api/technicians/:id", (req, res) => {
    try {
      const { name, specialization, phone, email, notes, code, uuid } = req.body;
      const info = db.prepare("UPDATE technicians SET name = ?, specialization = ?, phone = ?, email = ?, notes = ?, code = ?, uuid = COALESCE(?, uuid) WHERE id = ?").run(name, specialization, phone, email, notes, code || null, uuid || null, req.params.id);
      if (info.changes === 0) {
        return res.status(404).json({ error: "Technician not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[API] Error updating technician:", err);
      res.status(500).json({ error: "Failed to update technician: " + (err as Error).message });
    }
  });

  // Technicians Export
  app.get("/api/export/technicians", (req, res) => {
    try {
      const lang = (req.query.lang as string) || 'it';
      // const t = serverTranslations[lang as keyof typeof serverTranslations] || serverTranslations.it;

      const technicians = db.prepare("SELECT * FROM technicians").all();
      
      let data = technicians.map((tech: any) => ({
        'Nome': tech.name,
        'Specializzazione': tech.specialization,
        'Telefono': tech.phone,
        'Email': tech.email,
        'Note': tech.notes,
        'Codice Accesso': tech.code
      }));

      if (data.length === 0) {
        data = [{
          'Nome': '',
          'Specializzazione': '',
          'Telefono': '',
          'Email': '',
          'Note': '',
          'Codice Accesso': ''
        }];
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tecnici");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=technicians.xlsx');
      res.send(buffer);
    } catch (err) {
      console.error('Export technicians error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Technicians Import
  app.post("/api/import/technicians", (req, res) => {
    try {
      const { data } = req.body;
      const workbook = XLSX.read(data, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const insertStmt = db.prepare("INSERT INTO technicians (name, specialization, phone, email, notes, code) VALUES (?, ?, ?, ?, ?, ?)");
      const updateStmt = db.prepare("UPDATE technicians SET specialization = ?, phone = ?, email = ?, notes = ?, code = ? WHERE id = ?");
      const getStmt = db.prepare("SELECT id FROM technicians WHERE name = ?");

      const transaction = db.transaction((rows: any[]) => {
        for (const row of rows) {
          const name = getValue(row, ['Nome', 'Name', 'Nombre', 'name', 'nome', 'tecnico', 'technician']);
          const specialization = getValue(row, ['Specializzazione', 'Specialization', 'Especialización', 'specialization', 'specializzazione']);
          const phone = getValue(row, ['Telefono', 'Phone', 'Teléfono', 'phone', 'telefono', 'tel']);
          const email = getValue(row, ['Email', 'email', 'e-mail', 'correo']);
          const notes = getValue(row, ['Note', 'Notes', 'Notas', 'notes', 'note']);
          const code = getValue(row, ['Codice Accesso', 'Access Code', 'Código de Acceso', 'code', 'codice', 'password', 'pin']);

          if (name) {
            const tech = getStmt.get(name) as { id: number };
            if (tech) {
              updateStmt.run(specialization || '', phone || '', email || '', notes || '', code || null, tech.id);
            } else {
              insertStmt.run(name, specialization || '', phone || '', email || '', notes || '', code || null);
            }
          }
        }
      });
      transaction(rows);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Import failed: ' + (e as Error).message });
    }
  });

  // Technician Events
  app.get("/api/technicians/:id/events", (req, res) => {
    const events = db.prepare("SELECT * FROM technician_events WHERE technician_id = ?").all(req.params.id);
    res.json(events);
  });

  app.post("/api/technicians/:id/events", (req, res) => {
    try {
      const { date, type, description } = req.body;
      const techId = parseInt(req.params.id, 10);
      console.log("[API] Creating event for tech:", techId, "body:", req.body);
      const info = db.prepare("INSERT INTO technician_events (technician_id, date, type, description) VALUES (?, ?, ?, ?)").run(techId, date, type, description);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      console.error("[API] Error creating event:", err);
      res.status(500).json({ error: "Failed to create event: " + (err as Error).message });
    }
  });

  app.get("/api/export/calendar", (req, res) => {
    try {
      const { technician_id, month, year } = req.query;
      const lang = (req.query.lang as string) || 'it';
      const t = serverTranslations[lang as keyof typeof serverTranslations] || serverTranslations.it;
      
      const techId = Number(technician_id);
      const m = Number(month);
      const y = Number(year);

      if (!techId || !m || !y) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = `${y}-${String(m).padStart(2, '0')}-31`;

      const events = db.prepare(`
        SELECT 
          e.*, 
          t.name as technician_name,
          rd.work_hours,
          rd.travel_hours
        FROM technician_events e
        JOIN technicians t ON e.technician_id = t.id
        LEFT JOIN report_days rd ON e.report_id = rd.report_id AND e.date = rd.date
        WHERE e.technician_id = ? AND e.date BETWEEN ? AND ?
        ORDER BY e.date ASC
      `).all(techId, startDate, endDate) as any[];

      const data = events.map(e => ({
        [t.date]: e.date,
        [t.technician]: e.technician_name,
        'Tipo Evento': e.type,
        [t.work_hours]: e.work_hours || 0,
        [t.travel_hours]: e.travel_hours || 0,
        [t.description]: e.description
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Calendario");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=calendar_${y}_${m}.xlsx`);
      res.send(buffer);
    } catch (err) {
      console.error('Export calendar error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/events/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM technician_events WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("[API] Error deleting event:", err);
      res.status(500).json({ error: "Failed to delete event: " + (err as Error).message });
    }
  });

  app.delete("/api/technicians", (req, res) => {
    try {
      console.log(`[DELETE] All technicians request`);
      const deleteAllTx = db.transaction(() => {
        // Delete all reports first (and their items/days) because they reference technicians
        const reports = db.prepare("SELECT id FROM reports").all() as { id: number }[];
        for (const report of reports) {
          db.prepare("DELETE FROM report_items WHERE report_id = ?").run(report.id);
          db.prepare("DELETE FROM report_days WHERE report_id = ?").run(report.id);
        }
        db.prepare("DELETE FROM technician_events").run();
        db.prepare("DELETE FROM reports").run();
        db.prepare("DELETE FROM technicians").run();
      });
      deleteAllTx();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete all technicians error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/technicians/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[DELETE] Technician request for ID: ${id}`);
      
      const deleteTechTx = db.transaction((techId: number) => {
        const reports = db.prepare("SELECT id FROM reports WHERE technician_id = ?").all(techId) as { id: number }[];
        console.log(`Found ${reports.length} reports for technician ${techId}`);
        
        for (const report of reports) {
          db.prepare("DELETE FROM report_items WHERE report_id = ?").run(report.id);
          db.prepare("DELETE FROM report_days WHERE report_id = ?").run(report.id);
          db.prepare("DELETE FROM technician_events WHERE report_id = ?").run(report.id);
          db.prepare("DELETE FROM reports WHERE id = ?").run(report.id);
        }
        
        db.prepare("DELETE FROM technician_events WHERE technician_id = ?").run(techId);
        return db.prepare("DELETE FROM technicians WHERE id = ?").run(techId);
      });

      const result = deleteTechTx(id);
      console.log(`Technician ${id} deleted. Changes: ${result.changes}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete technician error:", err);
      res.status(500).json({ error: "Errore nell'eliminazione del tecnico: " + (err as Error).message });
    }
  });

  // Articles
  app.get("/api/articles", (req, res) => res.json(db.prepare("SELECT * FROM articles").all()));
  
  app.delete("/api/articles", (req, res) => {
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM report_items").run();
        db.prepare("DELETE FROM articles").run();
      })();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete all articles error:", err);
      res.status(500).json({ error: "Failed to delete articles" });
    }
  });

  app.post("/api/articles", (req, res) => {
    try {
      const { code, description, uuid, price, stock } = req.body;
      
      // Check if UUID or code exists
      const existing = db.prepare("SELECT * FROM articles WHERE (uuid = ? AND uuid IS NOT NULL) OR (code = ? AND code IS NOT NULL AND code != '')").get(uuid || null, code || null) as any;
      if (existing) {
        console.log(`[API] Article with UUID ${uuid} or code ${code} already exists (ID: ${existing.id}). Returning existing ID.`);
        return res.json(existing);
      }

      const info = db.prepare("INSERT INTO articles (code, description, uuid, price, stock) VALUES (?, ?, ?, ?, ?)").run(code, description, uuid || null, price || 0, stock || 0);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      console.error("[API] Error creating article:", err);
      res.status(500).json({ error: "Failed to create article: " + (err as Error).message });
    }
  });
  app.delete("/api/articles/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[DELETE] Article request for ID: ${id}`);
      
      const deleteArticleTx = db.transaction((articleId: number) => {
        db.prepare("DELETE FROM report_items WHERE article_id = ?").run(articleId);
        return db.prepare("DELETE FROM articles WHERE id = ?").run(articleId);
      });

      const result = deleteArticleTx(id);
      console.log(`Article ${id} deleted. Changes: ${result.changes}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete article error:", err);
      res.status(500).json({ error: "Errore nell'eliminazione dell'articolo: " + (err as Error).message });
    }
  });

  app.get("/api/export/articles", (req, res) => {
    try {
      const lang = (req.query.lang as string) || 'it';
      const t = serverTranslations[lang as keyof typeof serverTranslations] || serverTranslations.it;

      const articles = db.prepare("SELECT code, description FROM articles").all();
      
      let data = articles.map((a: any) => ({
        [t.code]: a.code,
        [t.description]: a.description
      }));

      if (data.length === 0) {
        data = [{
          [t.code]: '',
          [t.description]: ''
        }];
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Articoli");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=articles.xlsx');
      res.send(buffer);
    } catch (err) {
      console.error('Export articles error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/import/articles", (req, res) => {
    try {
      const { data } = req.body;
      const workbook = XLSX.read(data, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const insertStmt = db.prepare("INSERT INTO articles (code, description) VALUES (?, ?)");
      const updateStmt = db.prepare("UPDATE articles SET description = ? WHERE id = ?");
      const getStmt = db.prepare("SELECT id FROM articles WHERE code = ?");

      const transaction = db.transaction((rows: any[]) => {
        for (const row of rows) {
          const code = getValue(row, [serverTranslations.it.code, serverTranslations.en.code, serverTranslations.es.code, 'code', 'codice', 'id', 'articolo']);
          const description = getValue(row, [serverTranslations.it.description, serverTranslations.en.description, serverTranslations.es.description, 'description', 'descrizione', 'desc']);

          if (code) {
            const article = getStmt.get(code) as { id: number };
            if (article) {
              updateStmt.run(description || '', article.id);
            } else {
              insertStmt.run(code, description || '');
            }
          }
        }
      });
      transaction(rows);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Import failed: ' + (e as Error).message });
    }
  });

  app.get("/api/export/companies", (req, res) => {
    try {
      const lang = (req.query.lang as string) || 'it';
      const t = serverTranslations[lang as keyof typeof serverTranslations] || serverTranslations.it;

      const companies = db.prepare("SELECT name, address, phone, vat, email FROM companies").all();
      
      let data = companies.map((c: any) => ({
        [t.name]: c.name,
        [t.address]: c.address,
        [t.phone]: c.phone,
        [t.vat]: c.vat,
        [t.email]: c.email
      }));

      if (data.length === 0) {
        data = [{
          [t.name]: '',
          [t.address]: '',
          [t.phone]: '',
          [t.vat]: '',
          [t.email]: ''
        }];
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Aziende");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=companies.xlsx');
      res.send(buffer);
    } catch (err) {
      console.error('Export companies error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/import/companies", (req, res) => {
    try {
      const { data } = req.body;
      const workbook = XLSX.read(data, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const insertStmt = db.prepare("INSERT INTO companies (name, address, phone, vat, email, logo) VALUES (?, ?, ?, ?, ?, ?)");
      const updateStmt = db.prepare("UPDATE companies SET address = ?, phone = ?, vat = ?, email = ?, logo = ? WHERE name = ?");
      const checkStmt = db.prepare("SELECT id FROM companies WHERE name = ?");

      const transaction = db.transaction((rows: any[]) => {
        for (const row of rows) {
          const name = getValue(row, [serverTranslations.it.name, serverTranslations.en.name, serverTranslations.es.name, 'name', 'nome', 'azienda', 'company', 'ragione sociale']);
          const address = getValue(row, [serverTranslations.it.address, serverTranslations.en.address, serverTranslations.es.address, 'address', 'indirizzo', 'via']);
          const phone = getValue(row, [serverTranslations.it.phone, serverTranslations.en.phone, serverTranslations.es.phone, 'phone', 'telefono', 'tel']);
          const vat = getValue(row, [serverTranslations.it.vat, serverTranslations.en.vat, serverTranslations.es.vat, 'vat', 'piva', 'partita iva', 'cif']);
          const email = getValue(row, [serverTranslations.it.email, serverTranslations.en.email, serverTranslations.es.email, 'email', 'e-mail']);
          const logo = getValue(row, [serverTranslations.it.logo, serverTranslations.en.logo, serverTranslations.es.logo, 'logo', 'immagine']);

          if (name) {
            const existing = checkStmt.get(name);
            if (existing) {
              updateStmt.run(address || '', phone || '', vat || '', email || '', logo || '', name);
            } else {
              insertStmt.run(name, address || '', phone || '', vat || '', email || '', logo || '');
            }
          }
        }
      });
      transaction(rows);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Import failed: ' + (e as Error).message });
    }
  });

  app.put("/api/articles/:id", (req, res) => {
    try {
      const { code, description, uuid, price, stock } = req.body;
      const info = db.prepare("UPDATE articles SET code = ?, description = ?, uuid = COALESCE(?, uuid), price = ?, stock = ? WHERE id = ?").run(code, description, uuid || null, price || 0, stock || 0, req.params.id);
      if (info.changes === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[API] Error updating article:", err);
      res.status(500).json({ error: "Failed to update article: " + (err as Error).message });
    }
  });

  // Reports
  app.get("/api/reports", (req, res) => {
    const reports = db.prepare(`
      SELECT r.*, c.name as client_name, c.address as client_address, c.email as client_email, t.name as technician_name,
             m.brand as machine_brand, m.type as machine_type, m.serial_number as machine_serial, m.year as machine_year,
             (SELECT MIN(date) FROM report_days WHERE report_id = r.id) as date,
             co.name as company_name, co.address as company_address, co.phone as company_phone, co.vat as company_vat, co.email as company_email, co.logo as company_logo
      FROM reports r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN technicians t ON r.technician_id = t.id
      LEFT JOIN client_machines m ON r.machine_id = m.id
      LEFT JOIN companies co ON r.company_id = co.id
      ORDER BY date DESC
    `).all();
    for (const report of reports) {
      report.days = db.prepare("SELECT * FROM report_days WHERE report_id = ?").all(report.id);
      report.items = db.prepare(`
        SELECT ri.*, a.code, a.description
        FROM report_items ri
        JOIN articles a ON ri.article_id = a.id
        WHERE ri.report_id = ?
      `).all(report.id);
    }
    res.json(reports);
  });

  // Reports
  app.get("/api/reports/:id", (req, res) => {
    const report = db.prepare(`
      SELECT r.*, c.name as client_name, c.address as client_address, t.name as technician_name,
             m.brand as machine_brand, m.type as machine_type, m.serial_number as machine_serial,
             co.name as company_name, co.address as company_address, co.phone as company_phone, co.vat as company_vat, co.email as company_email, co.logo as company_logo
      FROM reports r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN technicians t ON r.technician_id = t.id
      LEFT JOIN client_machines m ON r.machine_id = m.id
      LEFT JOIN companies co ON r.company_id = co.id
      WHERE r.id = ?
    `).get(req.params.id);
    
    if (report) {
      report.days = db.prepare("SELECT * FROM report_days WHERE report_id = ?").all(req.params.id);
      report.items = db.prepare(`
        SELECT ri.*, a.code, a.description
        FROM report_items ri
        JOIN articles a ON ri.article_id = a.id
        WHERE ri.report_id = ?
      `).all(req.params.id);
    }
    res.json(report);
  });

  app.post("/api/reports/:id/archive", (req, res) => {
    try {
      const { pdfBase64 } = req.body;
      const reportId = req.params.id;
      
      if (!pdfBase64) {
        return res.status(400).json({ error: "No PDF data provided" });
      }

      const reportsDir = path.join(__dirname, 'storage', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `rapportino_${reportId}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      
      const buffer = Buffer.from(pdfBase64.split("base64,")[1], 'base64');
      fs.writeFileSync(filePath, buffer);
      
      console.log(`[ARCHIVE] Report ${reportId} archived at ${filePath}`);
      res.json({ success: true, path: filePath });
    } catch (error) {
      console.error("Archive error:", error);
      res.status(500).json({ error: "Failed to archive report" });
    }
  });

  // Helper to validate IDs and prevent temp IDs from reaching DB
  const safeId = (id: any, table: string, optional = false) => {
    if (!id && optional) return null;
    const num = Number(id);
    if (isNaN(num) || num <= 0 || num >= 1000000000000) {
      if (optional) return null;
      throw new Error(`Invalid ID for ${table}: ${id}`);
    }
    try {
      const exists = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(num);
      if (!exists) {
        if (optional) return null;
        throw new Error(`ID not found in ${table}: ${id}`);
      }
      return num;
    } catch (e: any) {
      throw new Error(`Database error checking ${table}: ${e.message}`);
    }
  };

  app.post("/api/reports", (req, res) => {
    try {
      const { uuid, client_id, technician_id, machine_id, company_id, description, signature_client, signature_tech, client_km, extra_km, days, items } = req.body;
      
      const insertReport = db.transaction((reportData, reportDays, reportItems) => {
        const validatedClientId = safeId(reportData.client_id, 'clients');
        const validatedTechId = safeId(reportData.technician_id, 'technicians');
        const validatedMachineId = safeId(reportData.machine_id, 'client_machines', true);
        const validatedCompanyId = safeId(reportData.company_id, 'companies', true);

        const info = db.prepare(`
          INSERT INTO reports (uuid, client_id, technician_id, machine_id, company_id, description, signature_client, signature_tech, client_km, extra_km) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          reportData.uuid || null,
          validatedClientId, 
          validatedTechId, 
          validatedMachineId,
          validatedCompanyId,
          reportData.description, 
          reportData.signature_client, 
          reportData.signature_tech,
          reportData.client_km || 0,
          reportData.extra_km || 0
        );
        
        const reportId = info.lastInsertRowid;
        console.log(`[DB] Report created with ID: ${reportId} for Tech: ${validatedTechId}`);

        const dayStmt = db.prepare("INSERT INTO report_days (report_id, date, travel_hours, work_hours, meals, overnight) VALUES (?, ?, ?, ?, ?, ?)");
        const eventStmt = db.prepare("INSERT INTO technician_events (technician_id, report_id, date, type, description) VALUES (?, ?, ?, ?, ?)");
        
        let clientName = 'Cliente';
        const client = db.prepare("SELECT name FROM clients WHERE id = ?").get(validatedClientId) as { name: string };
        if (client) clientName = client.name;

        for (const day of reportDays || []) {
          dayStmt.run(reportId, day.date, day.travel_hours || 0, day.work_hours || 0, day.meals || 0, day.overnight ? 1 : 0);
          
          eventStmt.run(
            validatedTechId, 
            reportId, 
            day.date, 
            'trasferta', 
            `Rapportino: ${clientName}`
          );
          console.log(`[DB] Calendar event created for Tech ${validatedTechId} on ${day.date}`);
        }

        const itemStmt = db.prepare("INSERT INTO report_items (report_id, article_id, quantity) VALUES (?, ?, ?)");
        for (const item of reportItems || []) {
          const validatedArticleId = safeId(item.article_id, 'articles', true);
          if (validatedArticleId) {
            itemStmt.run(reportId, validatedArticleId, item.quantity);
          }
        }
        return reportId;
      });

      const reportId = insertReport({ uuid, client_id, technician_id, machine_id, company_id, description, signature_client, signature_tech, client_km, extra_km }, days, items);
      res.json({ id: reportId });
    } catch (err: any) {
      console.error("[API] Error creating report:", err);
      res.status(500).json({ error: "Failed to create report: " + err.message });
    }
  });

  app.put("/api/reports/:id", (req, res) => {
    try {
      const { client_id, technician_id, machine_id, company_id, description, signature_client, signature_tech, client_km, extra_km, days, items } = req.body;
      
      const updateReport = db.transaction((reportData, reportDays, reportItems) => {
        const validatedClientId = safeId(reportData.client_id, 'clients');
        const validatedTechId = safeId(reportData.technician_id, 'technicians');
        const validatedMachineId = safeId(reportData.machine_id, 'client_machines', true);
        const validatedCompanyId = safeId(reportData.company_id, 'companies', true);
        const reportId = parseInt(req.params.id, 10);

        const info = db.prepare(`
          UPDATE reports 
          SET client_id = ?, technician_id = ?, machine_id = ?, company_id = ?, description = ?, signature_client = ?, signature_tech = ?, client_km = ?, extra_km = ?
          WHERE id = ?
        `).run(
          validatedClientId, 
          validatedTechId, 
          validatedMachineId,
          validatedCompanyId,
          reportData.description, 
          reportData.signature_client, 
          reportData.signature_tech,
          reportData.client_km || 0,
          reportData.extra_km || 0,
          reportId
        );
        
        if (info.changes === 0) {
          throw new Error("REPORT_NOT_FOUND");
        }
        
        db.prepare("DELETE FROM report_days WHERE report_id = ?").run(reportId);
        db.prepare("DELETE FROM technician_events WHERE report_id = ?").run(reportId);
        
        const dayStmt = db.prepare("INSERT INTO report_days (report_id, date, travel_hours, work_hours, meals, overnight) VALUES (?, ?, ?, ?, ?, ?)");
        const eventStmt = db.prepare("INSERT INTO technician_events (technician_id, report_id, date, type, description) VALUES (?, ?, ?, ?, ?)");
        
        let clientName = 'Cliente';
        const client = db.prepare("SELECT name FROM clients WHERE id = ?").get(validatedClientId) as { name: string };
        if (client) clientName = client.name;

        for (const day of reportDays || []) {
          dayStmt.run(reportId, day.date, day.travel_hours || 0, day.work_hours || 0, day.meals || 0, day.overnight ? 1 : 0);
          
          eventStmt.run(
            validatedTechId, 
            reportId, 
            day.date, 
            'trasferta', 
            `Rapportino: ${clientName}`
          );
          console.log(`[DB] Calendar event updated for Tech ${validatedTechId} on ${day.date}`);
        }

        db.prepare("DELETE FROM report_items WHERE report_id = ?").run(reportId);
        const itemStmt = db.prepare("INSERT INTO report_items (report_id, article_id, quantity) VALUES (?, ?, ?)");
        for (const item of reportItems || []) {
          const validatedArticleId = safeId(item.article_id, 'articles', true);
          if (validatedArticleId) {
            itemStmt.run(reportId, validatedArticleId, item.quantity);
          }
        }
      });

      updateReport({ client_id, technician_id, machine_id, company_id, description, signature_client, signature_tech, client_km, extra_km }, days, items);
      res.json({ success: true });
    } catch (err: any) {
      if (err.message === "REPORT_NOT_FOUND") {
        return res.status(404).json({ error: "Report not found" });
      }
      console.error("Error updating report:", err);
      res.status(500).json({ error: err.message || "Failed to update report" });
    }
  });

  app.delete("/api/reports", (req, res) => {
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM report_items").run();
        db.prepare("DELETE FROM report_days").run();
        db.prepare("DELETE FROM technician_events WHERE report_id IS NOT NULL").run();
        db.prepare("DELETE FROM reports").run();
      })();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete all reports error:", err);
      res.status(500).json({ error: "Failed to delete reports" });
    }
  });

  app.delete("/api/reports/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[DELETE] Report request for ID: ${id}`);
      
      const deleteReportTx = db.transaction((reportId: number) => {
        db.prepare("DELETE FROM report_items WHERE report_id = ?").run(reportId);
        db.prepare("DELETE FROM report_days WHERE report_id = ?").run(reportId);
        db.prepare("DELETE FROM technician_events WHERE report_id = ?").run(reportId);
        return db.prepare("DELETE FROM reports WHERE id = ?").run(reportId);
      });

      const result = deleteReportTx(id);
      console.log(`Report ${id} deleted. Changes: ${result.changes}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete report error:", err);
      res.status(500).json({ error: "Errore nell'eliminazione del rapportino: " + (err as Error).message });
    }
  });

  // Appointments
  app.get("/api/appointments", (req, res) => res.json(db.prepare("SELECT * FROM appointments").all()));
  app.post("/api/appointments", (req, res) => {
    try {
      const { date, time, description, alert } = req.body;
      const info = db.prepare("INSERT INTO appointments (date, time, description, alert) VALUES (?, ?, ?, ?)").run(date, time, description, alert ? 1 : 0);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      console.error("[API] Error creating appointment:", err);
      res.status(500).json({ error: "Failed to create appointment: " + (err as Error).message });
    }
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const result = {};
    settings.forEach(s => result[s.key] = s.value);
    res.json(result);
  });
  app.post("/api/settings", (req, res) => {
    try {
      const { key, value } = req.body;
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
      res.json({ success: true });
    } catch (err) {
      console.error("[API] Error updating setting:", err);
      res.status(500).json({ error: "Failed to update setting: " + (err as Error).message });
    }
  });

  // Public report view
  app.get("/public/report/:id", (req, res) => {
    const { id } = req.params;
    const report = db.prepare(`
      SELECT r.*, c.name as client_name, c.address as client_address, t.name as technician_name,
             m.brand as machine_brand, m.type as machine_type, m.serial_number as machine_serial, m.year as machine_year,
             co.name as company_name, co.address as company_address, co.phone as company_phone, co.vat as company_vat, co.email as company_email, co.logo as company_logo
      FROM reports r 
      LEFT JOIN clients c ON r.client_id = c.id 
      LEFT JOIN technicians t ON r.technician_id = t.id
      LEFT JOIN client_machines m ON r.machine_id = m.id
      LEFT JOIN companies co ON r.company_id = co.id
      WHERE r.id = ?
    `).get(id) as any;

    if (!report) {
      return res.status(404).send("Report not found");
    }

    const days = db.prepare("SELECT * FROM report_days WHERE report_id = ?").all(id) as any[];
    const items = db.prepare(`
      SELECT ri.quantity, a.code, a.description 
      FROM report_items ri 
      JOIN articles a ON ri.article_id = a.id 
      WHERE ri.report_id = ?
    `).all(id) as any[];

    const settingsArr = db.prepare("SELECT * FROM settings").all() as any[];
    const settings: any = {};
    settingsArr.forEach(s => settings[s.key] = s.value);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rapportino #${id.toString().padStart(4, '0')}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            .no-print { display: none; }
            body { background: white; }
            .report-container { border: none; shadow: none; margin: 0; padding: 0; width: 100%; }
          }
          body { background-color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
        </style>
      </head>
      <body class="p-4 sm:p-8">
        <div class="max-w-4xl mx-auto no-print mb-6 flex justify-between items-center">
          <h1 class="text-slate-500 font-medium">Visualizzazione Rapportino</h1>
          <button onclick="window.print()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-indigo-700 transition-colors">
            Stampa / Salva PDF
          </button>
        </div>

        <div class="report-container bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-4xl mx-auto flex flex-col gap-8">
          <div class="flex justify-between items-start border-b border-slate-100 pb-6">
            <div class="flex flex-col gap-2">
              ${settings.logo ? `<img src="${settings.logo}" class="h-12 object-contain self-start" />` : `<h2 class="text-2xl font-black text-indigo-600 tracking-tighter">RAPPORTINI<span class="text-slate-400">PRO</span></h2>`}
              <p class="text-xs text-slate-500 uppercase font-bold tracking-widest">Documento di intervento tecnico</p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold uppercase text-slate-400">Rapportino N°</p>
              <p class="text-3xl font-black text-slate-900">#${id.toString().padStart(4, '0')}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Cliente</span>
              <p class="text-lg font-bold text-slate-900">${report.client_name}</p>
              <p class="text-sm text-slate-500">${report.client_address || ''}</p>
              ${report.machine_brand ? `
                <div class="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span class="text-[10px] font-bold uppercase text-slate-400 block mb-1">Macchina</span>
                  <p class="text-sm font-bold text-slate-900">${report.machine_brand} ${report.machine_type || ''}</p>
                  <p class="text-xs text-slate-500">Matricola: ${report.machine_serial || '-'} - Anno: ${report.machine_year || '-'}</p>
                </div>
              ` : ''}
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tecnico</span>
              <p class="text-lg font-bold text-slate-900">${report.technician_name}</p>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Giornate Intervento</span>
            <div class="border border-slate-100 rounded-2xl overflow-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th class="px-4 py-3">Data</th>
                    <th class="px-4 py-3 text-center">Ore Viaggio</th>
                    <th class="px-4 py-3 text-center">Ore Lavoro</th>
                    <th class="px-4 py-3 text-center">Pasti</th>
                    <th class="px-4 py-3 text-center">Pernottamento</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${days.map(day => `
                    <tr>
                      <td class="px-4 py-3 font-medium">${day.date ? new Date(day.date).toLocaleDateString('it-IT') : '-'}</td>
                      <td class="px-4 py-3 text-center">${day.travel_hours}h</td>
                      <td class="px-4 py-3 text-center">${day.work_hours}h</td>
                      <td class="px-4 py-3 text-center">${day.meals}</td>
                      <td class="px-4 py-3 text-center">${day.overnight ? 'Sì' : 'No'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Descrizione Intervento</span>
            <p class="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">${report.description}</p>
          </div>

          ${items.length > 0 ? `
            <div class="flex flex-col gap-3">
              <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ricambi / Articoli</span>
              <div class="border border-slate-100 rounded-2xl overflow-hidden">
                <table class="w-full text-left text-sm">
                  <thead class="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                    <tr>
                      <th class="px-4 py-3">Codice</th>
                      <th class="px-4 py-3">Descrizione</th>
                      <th class="px-4 py-3 text-right">Quantità</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${items.map(item => `
                      <tr>
                        <td class="px-4 py-3 font-mono text-xs text-indigo-600">${item.code}</td>
                        <td class="px-4 py-3">${item.description}</td>
                        <td class="px-4 py-3 text-right font-bold">${item.quantity}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <div class="grid grid-cols-2 gap-8 mt-4">
            <div class="flex flex-col gap-3">
              <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Firma Tecnico</span>
              ${report.signature_tech ? `<img src="${report.signature_tech}" class="h-24 object-contain border border-slate-100 rounded-2xl p-2 bg-slate-50" />` : '<div class="h-24 border border-dashed border-slate-200 rounded-2xl"></div>'}
            </div>
            <div class="flex flex-col gap-3">
              <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Firma Cliente</span>
              ${report.signature_client ? `<img src="${report.signature_client}" class="h-24 object-contain border border-slate-100 rounded-2xl p-2 bg-slate-50" />` : '<div class="h-24 border border-dashed border-slate-200 rounded-2xl"></div>'}
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-slate-100 text-center">
            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Generato con Rapportini Pro</p>
          </div>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  });

  // Account management
  app.post("/api/reset-data", (req, res) => {
    console.log(`[RESET] Data reset requested at ${new Date().toISOString()}`);
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM report_items").run();
        db.prepare("DELETE FROM report_days").run();
        db.prepare("DELETE FROM technician_events").run();
        db.prepare("DELETE FROM reports").run();
        db.prepare("DELETE FROM appointments").run();
        db.prepare("DELETE FROM articles").run();
        db.prepare("DELETE FROM technicians").run();
        db.prepare("DELETE FROM client_machines").run();
        db.prepare("DELETE FROM clients").run();
        db.prepare("DELETE FROM settings WHERE key NOT IN ('password', 'admin_code')").run();
      })();
      res.json({ success: true });
    } catch (err) {
      console.error("Reset error:", err);
      res.status(500).json({ error: "Failed to reset data" });
    }
  });

  app.post("/api/restore", (req, res) => {
    console.log(`[RESTORE] Data restore requested at ${new Date().toISOString()}`);
    try {
      const backupData = req.body;
      
      db.transaction(() => {
        // Clear existing data
        db.prepare("DELETE FROM report_items").run();
        db.prepare("DELETE FROM report_days").run();
        db.prepare("DELETE FROM technician_events").run();
        db.prepare("DELETE FROM reports").run();
        db.prepare("DELETE FROM appointments").run();
        db.prepare("DELETE FROM articles").run();
        db.prepare("DELETE FROM technicians").run();
        db.prepare("DELETE FROM client_machines").run();
        db.prepare("DELETE FROM clients").run();
        db.prepare("DELETE FROM companies").run();
        db.prepare("DELETE FROM settings").run();

        // Restore Settings
        if (backupData.settings) {
          const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
          for (const [key, value] of Object.entries(backupData.settings)) {
            insertSetting.run(key, String(value));
          }
        }

        // Restore Companies
        if (backupData.companies && Array.isArray(backupData.companies)) {
          const insertCompany = db.prepare("INSERT INTO companies (id, uuid, name, address, phone, vat, email, logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          for (const c of backupData.companies) {
            insertCompany.run(c.id, c.uuid || null, c.name, c.address, c.phone, c.vat, c.email, c.logo || null);
          }
        }

        // Restore Articles
        if (backupData.articles && Array.isArray(backupData.articles)) {
          const insertArticle = db.prepare("INSERT INTO articles (id, uuid, code, description, price, stock) VALUES (?, ?, ?, ?, ?, ?)");
          for (const a of backupData.articles) {
            insertArticle.run(a.id, a.uuid || null, a.code, a.description, a.price || 0, a.stock || 0);
          }
        }

        // Restore Technicians
        if (backupData.technicians && Array.isArray(backupData.technicians)) {
          const insertTech = db.prepare("INSERT INTO technicians (id, uuid, name, specialization, phone, email, notes, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          for (const t of backupData.technicians) {
            insertTech.run(t.id, t.uuid || null, t.name, t.specialization, t.phone, t.email, t.notes, t.code || null);
          }
        }

        // Restore Clients
        if (backupData.clients && Array.isArray(backupData.clients)) {
          const insertClient = db.prepare("INSERT INTO clients (id, name, address, phone, email, km) VALUES (?, ?, ?, ?, ?, ?)");
          const insertMachine = db.prepare("INSERT INTO client_machines (id, client_id, brand, type, serial_number, year) VALUES (?, ?, ?, ?, ?, ?)");
          
          for (const c of backupData.clients) {
            insertClient.run(c.id, c.name, c.address, c.phone, c.email, c.km || 0);
            if (c.machines && Array.isArray(c.machines)) {
              for (const m of c.machines) {
                insertMachine.run(m.id, c.id, m.brand, m.type, m.serial_number, m.year);
              }
            }
          }
        }

        // Restore Reports
        if (backupData.reports && Array.isArray(backupData.reports)) {
          const insertReport = db.prepare("INSERT INTO reports (id, client_id, technician_id, machine_id, company_id, description, signature_client, signature_tech, client_km, extra_km) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
          const insertDay = db.prepare("INSERT INTO report_days (id, report_id, date, travel_hours, work_hours, meals, overnight) VALUES (?, ?, ?, ?, ?, ?, ?)");
          const insertItem = db.prepare("INSERT INTO report_items (id, report_id, article_id, quantity) VALUES (?, ?, ?, ?)");
          
          for (const r of backupData.reports) {
            insertReport.run(r.id, r.client_id, r.technician_id, r.machine_id || null, r.company_id || null, r.description, r.signature_client, r.signature_tech, r.client_km || 0, r.extra_km || 0);
            
            if (r.days && Array.isArray(r.days)) {
              for (const d of r.days) {
                insertDay.run(d.id, r.id, d.date, d.travel_hours || 0, d.work_hours || 0, d.meals || 0, d.overnight ? 1 : 0);
              }
            }
            
            if (r.items && Array.isArray(r.items)) {
              for (const i of r.items) {
                insertItem.run(i.id, r.id, i.article_id, i.quantity || 1);
              }
            }
          }
        }
      })();
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error restoring data:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API 404 handler
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  // Vite middleware for development
  console.log("[SERVER] Configuring middleware (NODE_ENV: " + process.env.NODE_ENV + ")...");
  if (process.env.NODE_ENV !== "production" && !isVercel) {
    console.log("[SERVER] Initializing Vite dev server...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[SERVER] Vite middleware attached.");
    } catch (e) {
      console.error("[SERVER] Failed to initialize Vite dev server:", e);
    }
  } else {
    console.log("[SERVER] Serving static files from dist...");
    const distPath = isVercel ? path.resolve(process.cwd(), "dist") : path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  if (!isVercel) process.exit(1);
  throw err;
});

// Export for Vercel
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
