import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("assets.db");

// --- Database Schema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('Hardware', 'Software', 'GSM', 'Other'))
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    position TEXT,
    department TEXT,
    projectId INTEGER,
    email TEXT,
    phone TEXT,
    FOREIGN KEY (projectId) REFERENCES projects (id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    subcategory TEXT,
    name TEXT NOT NULL COLLATE NOCASE,
    totalQty INTEGER DEFAULT 0,
    availableQty INTEGER DEFAULT 0,
    assignedQty INTEGER DEFAULT 0,
    returnedQty INTEGER DEFAULT 0,
    damagedQty INTEGER DEFAULT 0,
    projectId INTEGER,
    UNIQUE(name, projectId) COLLATE NOCASE,
    FOREIGN KEY (projectId) REFERENCES projects (id)
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    employeeId INTEGER,
    projectId INTEGER,
    inventoryId INTEGER,
    description TEXT,
    status TEXT DEFAULT 'Requested',
    processorName TEXT,
    requestDate TEXT,
    deliveryDate TEXT,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employees (id),
    FOREIGN KEY (projectId) REFERENCES projects (id),
    FOREIGN KEY (inventoryId) REFERENCES inventory (id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER,
    inventoryId INTEGER,
    assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    returnedAt DATETIME,
    status TEXT DEFAULT 'Assigned',
    FOREIGN KEY (employeeId) REFERENCES employees (id),
    FOREIGN KEY (inventoryId) REFERENCES inventory (id)
  );
`);

// --- Seed Initial Data (EMAAR and others) ---
const seed = () => {
  // Deduplicate Inventory (One-time cleanup)
  const cleanupInventory = () => {
    const duplicates = db.prepare(`
      SELECT name, projectId, COUNT(*) as count 
      FROM inventory 
      GROUP BY name, projectId 
      HAVING count > 1
    `).all() as any[];

    for (const dup of duplicates) {
      const items = db.prepare("SELECT id, availableQty, totalQty, assignedQty FROM inventory WHERE name = ? AND projectId = ?")
        .all(dup.name, dup.projectId) as any[];
      
      const primary = items[0];
      const others = items.slice(1);
      
      // Update primary with sums
      const totalAvailable = items.reduce((sum, i) => sum + i.availableQty, 0);
      const totalTotal = items.reduce((sum, i) => sum + i.totalQty, 0);
      const totalAssigned = items.reduce((sum, i) => sum + i.assignedQty, 0);
      
      db.prepare("UPDATE inventory SET availableQty = ?, totalQty = ?, assignedQty = ? WHERE id = ?")
        .run(totalAvailable, totalTotal, totalAssigned, primary.id);
      
      // Re-point requests to primary then delete others
      for (const other of others) {
        db.prepare("UPDATE requests SET inventoryId = ? WHERE inventoryId = ?").run(primary.id, other.id);
        db.prepare("DELETE FROM inventory WHERE id = ?").run(other.id);
      }
    }
  };
  cleanupInventory();

  const projectCount = db.prepare("SELECT count(*) as count FROM projects").get() as { count: number };
  if (projectCount.count > 0) return;

  console.log("Seeding initial data...");

  const insertProject = db.prepare("INSERT INTO projects (name, description) VALUES (?, ?)");
  const emaarId = insertProject.run("EMAAR", "Emaar Square Construction Project").lastInsertRowid;
  
  // Specific Inventory for EMAAR
  const items = [
    { cat: 'Hardware', sub: 'Laptop', name: 'High-End Gaming/Eng Laptop', qty: 50 },
    { cat: 'Hardware', sub: 'Desktop', name: 'Standard Office Desktop', qty: 20 },
    { cat: 'Hardware', sub: 'Monitor', name: 'Dell 27" 4K Monitor', qty: 30 },
    { cat: 'Hardware', sub: 'Keyboard & Mouse', name: 'Logitech Wireless Set', qty: 40 },
    { cat: 'Hardware', sub: 'Printer', name: 'Sharp Site Multifunction', qty: 5 },
    { cat: 'Software', sub: 'Office', name: 'Microsoft 365 License', qty: 100 },
    { cat: 'Software', sub: 'Engineering', name: 'AutoCAD Commercial', qty: 15 },
    { cat: 'GSM', sub: 'SIM', name: 'Duo 110 Local Call Plan', qty: 50 }
  ];

  const insertInv = db.prepare("INSERT INTO inventory (category, subcategory, name, totalQty, availableQty, projectId) VALUES (?, ?, ?, ?, ?, ?)");
  items.forEach(item => {
    insertInv.run(item.cat, item.sub, item.name, item.qty, item.qty, emaarId);
  });

  // Note: Detailed data parsing from user's CSV would go here. 
  // For brevity, I'll add a few key employees and requests.
  const insertEmp = db.prepare("INSERT INTO employees (name, position, projectId, email, phone) VALUES (?, ?, ?, ?, ?)");
  insertEmp.run("ARUN SASIDHARAN", "HSE OFFICER", emaarId, "arun.sasidharan@falghanim.com", "919745645609");
  insertEmp.run("Richard Ennin", "HSE Engineer", emaarId, "richard.ennin@falghanim.com", "97334481401");
};

seed();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const stats = {
      totalProjects: db.prepare("SELECT count(*) as count FROM projects").get(),
      totalEmployees: db.prepare("SELECT count(*) as count FROM employees").get(),
      totalRequests: db.prepare("SELECT count(*) as count FROM requests").get(),
      pendingRequests: db.prepare("SELECT count(*) as count FROM requests WHERE status = 'Requested'").get(),
      lowStock: db.prepare("SELECT count(*) as count FROM inventory WHERE availableQty < 5").get(),
    };
    res.json(stats);
  });

  // Projects
  app.get("/api/projects", (req, res) => {
    res.json(db.prepare("SELECT * FROM projects").all());
  });

  app.post("/api/projects", (req, res) => {
    const { name, description } = req.body;
    try {
      const info = db.prepare("INSERT INTO projects (name, description) VALUES (?, ?)").run(name, description);
      res.json({ id: info.lastInsertRowid, name, description });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Employees
  app.get("/api/employees", (req, res) => {
    const employees = db.prepare("SELECT e.*, p.name as projectName FROM employees e LEFT JOIN projects p ON e.projectId = p.id").all();
    res.json(employees);
  });

  app.post("/api/employees", (req, res) => {
    const { name, position, department, projectId, email, phone } = req.body;
    try {
      const info = db.prepare("INSERT INTO employees (name, position, department, projectId, email, phone) VALUES (?, ?, ?, ?, ?, ?)")
        .run(name, position, department, projectId, email, phone);
      res.json({ id: info.lastInsertRowid, name, position, department, projectId, email, phone });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Inventory
  app.get("/api/inventory", (req, res) => {
    const { projectId } = req.query;
    let query = "SELECT * FROM inventory";
    const params = [];
    if (projectId && projectId !== 'all') {
      query += " WHERE projectId = ?";
      params.push(projectId);
    }
    res.json(db.prepare(query).all(...params));
  });

  // Requests
  app.get("/api/requests", (req, res) => {
    const query = `
      SELECT r.*, e.name as employeeName, e.position as employeePosition, p.name as projectName, i.name as itemName
      FROM requests r
      LEFT JOIN employees e ON r.employeeId = e.id
      LEFT JOIN projects p ON r.projectId = p.id
      LEFT JOIN inventory i ON r.inventoryId = i.id
      ORDER BY r.createdAt DESC
    `;
    res.json(db.prepare(query).all());
  });

  app.post("/api/requests", (req, res) => {
    const { type, employeeId, projectId, inventoryId, description, status, requestDate, deliveryDate, notes } = req.body;
    
    // Using a transaction to ensure stock is only deducted if item is available
    const dbTrans = db.transaction(() => {
      const activeRequestDate = requestDate || new Date().toISOString().split('T')[0];
      const activeDeliveryDate = status === 'Delivered' ? (deliveryDate || new Date().toISOString().split('T')[0]) : null;

      // Insert request
      const info = db.prepare("INSERT INTO requests (type, employeeId, projectId, inventoryId, description, status, requestDate, deliveryDate, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(type, employeeId, projectId, inventoryId || null, description, status || 'Requested', activeRequestDate, activeDeliveryDate, notes);

      // If status is 'Delivered' immediately, deduct from stock
      if (status === 'Delivered' && inventoryId) {
        const update = db.prepare("UPDATE inventory SET availableQty = availableQty - 1, assignedQty = assignedQty + 1 WHERE id = ? AND availableQty > 0").run(inventoryId);
        if (update.changes === 0) {
          throw new Error("Item not available in stock");
        }
      }
      return info.lastInsertRowid;
    });

    try {
      const id = dbTrans();
      res.json({ id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/requests/:id", (req, res) => {
    const { status } = req.body;
    const requestRow = db.prepare("SELECT * FROM requests WHERE id = ?").get(req.params.id) as any;
    
    if (!requestRow) {
      return res.status(404).json({ error: "Request not found" });
    }

    const dbTrans = db.transaction(() => {
      let deliveryDate = requestRow.deliveryDate;

      // If moving to Delivered from another status, deduct stock and set delivery date
      if (status === 'Delivered' && requestRow.status !== 'Delivered') {
        deliveryDate = new Date().toISOString().split('T')[0];
        if (requestRow.inventoryId) {
          const update = db.prepare("UPDATE inventory SET availableQty = availableQty - 1, assignedQty = assignedQty + 1 WHERE id = ? AND availableQty > 0").run(requestRow.inventoryId);
          if (update.changes === 0) {
            throw new Error("Item not available in stock");
          }
        }
      }
      // If moving AWAY from Delivered (e.g. Returned), return stock and clear delivery date
      if (requestRow.status === 'Delivered' && status !== 'Delivered' && requestRow.inventoryId) {
        db.prepare("UPDATE inventory SET availableQty = availableQty + 1, assignedQty = assignedQty - 1 WHERE id = ?").run(requestRow.inventoryId);
        deliveryDate = null;
      }

      db.prepare("UPDATE requests SET status = ?, deliveryDate = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(status, deliveryDate, req.body.notes || requestRow.notes, req.params.id);
    });

    try {
      dbTrans();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Employees
  app.get("/api/employees", (req, res) => {
    res.json(db.prepare("SELECT * FROM employees").all());
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
