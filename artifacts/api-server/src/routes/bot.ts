import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router: IRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../../discord-bot/data/db.json");

interface Product {
  id: string; name: string; emoji: string; category: string;
  price: string; description: string; stock: number | "unlimited"; addedAt: number;
}
interface Category { id: string; name: string; emoji: string; }
interface GuildConfig {
  ticketCategoryId?: string; staffRoleId?: string; welcomeMessage?: string;
  discountPercent?: number; postedPanels?: { channelId: string; messageId: string }[];
}
interface Database {
  products: Record<string, Product[]>;
  categories: Record<string, Category[]>;
  config: Record<string, GuildConfig>;
}

function loadDB(): Database {
  try {
    if (!fs.existsSync(DB_PATH)) return { products: {}, categories: {}, config: {} };
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as Database;
  } catch { return { products: {}, categories: {}, config: {} }; }
}
function saveDB(db: Database) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

const COMMANDS = [
  { name: "/addproduct",     usage: "/addproduct name: emoji: category: price: description: stock:",      desc: "Add a new product to the shop" },
  { name: "/removeproduct",  usage: "/removeproduct name:",                                               desc: "Remove a product by name" },
  { name: "/editproduct",    usage: "/editproduct name: [price:] [description:] [stock:] [emoji:]",       desc: "Edit an existing product's details" },
  { name: "/addcategory",    usage: "/addcategory name: emoji:",                                          desc: "Create a new product category" },
  { name: "/removecategory", usage: "/removecategory name:",                                              desc: "Delete a category" },
  { name: "/shop",           usage: "/shop",                                                              desc: "Open your private shop session (ephemeral)" },
  { name: "/postshop",       usage: "/postshop",                                                         desc: "Post a public shop panel anyone can browse" },
  { name: "/listproducts",   usage: "/listproducts [category:]",                                         desc: "List all products, optionally filtered by category" },
  { name: "/setstock",       usage: "/setstock name: amount:",                                           desc: "Set the stock level for a product (or 'unlimited')" },
  { name: "/stockcheck",     usage: "/stockcheck",                                                       desc: "See current stock levels for all products" },
  { name: "/setticket",      usage: "/setticket category: staffrole: [welcome:]",                        desc: "Configure the ticket system channel and staff role" },
  { name: "/announce",       usage: "/announce message: [channel:] [color:]",                           desc: "Post a formatted announcement embed" },
  { name: "/discount",       usage: "/discount percent:",                                                desc: "Set a % sale discount (0 to remove). Updates all panels instantly" },
];

/* ── guilds ─────────────────────────────────────────────── */
router.get("/guilds", (_req, res) => {
  const db = loadDB();
  const ids = new Set([
    ...Object.keys(db.products),
    ...Object.keys(db.categories),
    ...Object.keys(db.config),
  ]);
  res.json([...ids]);
});

/* ── commands ───────────────────────────────────────────── */
router.get("/commands", (_req, res) => res.json(COMMANDS));

/* ── products ───────────────────────────────────────────── */
router.get("/products/:guildId", (req, res) => {
  res.json(loadDB().products[req.params.guildId] ?? []);
});

router.post("/products/:guildId", (req, res) => {
  const { name, emoji, category, price, description, stock } = req.body as Partial<Product>;
  if (!name || !price) { res.status(400).json({ error: "name and price required" }); return; }
  const db = loadDB();
  if (!db.products[req.params.guildId]) db.products[req.params.guildId] = [];
  const p: Product = {
    id: Date.now().toString(), addedAt: Date.now(),
    name, emoji: emoji ?? "🛍️", category: category ?? "General",
    price, description: description ?? "",
    stock: stock === "unlimited" ? "unlimited" : Number(stock ?? 0),
  };
  db.products[req.params.guildId].push(p);
  saveDB(db);
  res.json(p);
});

router.delete("/products/:guildId/:name", (req, res) => {
  const db = loadDB();
  const list = db.products[req.params.guildId] ?? [];
  const idx = list.findIndex(p => p.name.toLowerCase() === decodeURIComponent(req.params.name).toLowerCase());
  if (idx === -1) { res.json({ success: false }); return; }
  list.splice(idx, 1);
  db.products[req.params.guildId] = list;
  saveDB(db);
  res.json({ success: true });
});

router.patch("/products/:guildId/:name", (req, res) => {
  const db = loadDB();
  const list = db.products[req.params.guildId] ?? [];
  const idx = list.findIndex(p => p.name.toLowerCase() === decodeURIComponent(req.params.name).toLowerCase());
  if (idx === -1) { res.status(404).json({ error: "not found" }); return; }
  list[idx] = { ...list[idx], ...req.body as Partial<Product> };
  db.products[req.params.guildId] = list;
  saveDB(db);
  res.json(list[idx]);
});

/* ── categories ─────────────────────────────────────────── */
router.get("/categories/:guildId", (req, res) => {
  res.json(loadDB().categories[req.params.guildId] ?? []);
});

router.post("/categories/:guildId", (req, res) => {
  const { name, emoji } = req.body as Partial<Category>;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const db = loadDB();
  if (!db.categories[req.params.guildId]) db.categories[req.params.guildId] = [];
  const exists = db.categories[req.params.guildId].find(c => c.name.toLowerCase() === name.toLowerCase());
  if (exists) { res.json(exists); return; }
  const c: Category = { id: Date.now().toString(), name, emoji: emoji ?? "📦" };
  db.categories[req.params.guildId].push(c);
  saveDB(db);
  res.json(c);
});

router.delete("/categories/:guildId/:name", (req, res) => {
  const db = loadDB();
  const list = db.categories[req.params.guildId] ?? [];
  const idx = list.findIndex(c => c.name.toLowerCase() === decodeURIComponent(req.params.name).toLowerCase());
  if (idx === -1) { res.json({ success: false }); return; }
  list.splice(idx, 1);
  db.categories[req.params.guildId] = list;
  saveDB(db);
  res.json({ success: true });
});

/* ── config ─────────────────────────────────────────────── */
router.get("/config/:guildId", (req, res) => {
  res.json(loadDB().config[req.params.guildId] ?? {});
});

router.patch("/config/:guildId", (req, res) => {
  const db = loadDB();
  if (!db.config[req.params.guildId]) db.config[req.params.guildId] = {};
  db.config[req.params.guildId] = { ...db.config[req.params.guildId], ...(req.body as Partial<GuildConfig>) };
  saveDB(db);
  res.json({ success: true });
});

export default router;
