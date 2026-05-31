import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "db.json");

export interface Product {
  id: string;
  name: string;
  emoji: string;
  category: string;
  price: string;
  description: string;
  stock: number | "unlimited";
  addedAt: number;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface PostedPanel {
  channelId: string;
  messageId: string;
}

export interface GuildConfig {
  ticketCategoryId?: string;
  staffRoleId?: string;
  welcomeMessage?: string;
  discountPercent?: number;
  postedPanels?: PostedPanel[];
}

export function savePostedPanel(guildId: string, panel: PostedPanel): void {
  const db = loadDB();
  if (!db.config[guildId]) db.config[guildId] = {};
  const panels = db.config[guildId].postedPanels ?? [];
  panels.push(panel);
  db.config[guildId].postedPanels = panels;
  saveDB(db);
}

export function clearDeadPanels(guildId: string, deadMessageIds: string[]): void {
  if (deadMessageIds.length === 0) return;
  const db = loadDB();
  if (!db.config[guildId]) return;
  db.config[guildId].postedPanels = (db.config[guildId].postedPanels ?? []).filter(
    (p) => !deadMessageIds.includes(p.messageId)
  );
  saveDB(db);
}

interface Database {
  products: Record<string, Product[]>;
  categories: Record<string, Category[]>;
  config: Record<string, GuildConfig>;
}

function loadDB(): Database {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      saveDB({ products: {}, categories: {}, config: {} });
    }
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw) as Database;
  } catch {
    return { products: {}, categories: {}, config: {} };
  }
}

function saveDB(db: Database): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function getProducts(guildId: string): Product[] {
  const db = loadDB();
  return db.products[guildId] ?? [];
}

export function getProductsByCategory(guildId: string, category: string): Product[] {
  return getProducts(guildId).filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  );
}

export function addProduct(guildId: string, product: Omit<Product, "id" | "addedAt">): Product {
  const db = loadDB();
  if (!db.products[guildId]) db.products[guildId] = [];
  const newProduct: Product = {
    ...product,
    id: Date.now().toString(),
    addedAt: Date.now(),
  };
  db.products[guildId].push(newProduct);
  saveDB(db);
  return newProduct;
}

export function removeProduct(guildId: string, name: string): boolean {
  const db = loadDB();
  const list = db.products[guildId] ?? [];
  const idx = list.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return false;
  list.splice(idx, 1);
  db.products[guildId] = list;
  saveDB(db);
  return true;
}

export function editProduct(
  guildId: string,
  name: string,
  updates: Partial<Omit<Product, "id" | "addedAt">>
): Product | null {
  const db = loadDB();
  const list = db.products[guildId] ?? [];
  const idx = list.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  db.products[guildId] = list;
  saveDB(db);
  return list[idx];
}

export function decrementStock(guildId: string, productId: string): boolean {
  const db = loadDB();
  const list = db.products[guildId] ?? [];
  const product = list.find((p) => p.id === productId);
  if (!product) return false;
  if (product.stock !== "unlimited") {
    if (product.stock <= 0) return false;
    product.stock--;
  }
  db.products[guildId] = list;
  saveDB(db);
  return true;
}

export function getCategories(guildId: string): Category[] {
  const db = loadDB();
  return db.categories[guildId] ?? [];
}

export function addCategory(guildId: string, category: Omit<Category, "id">): Category {
  const db = loadDB();
  if (!db.categories[guildId]) db.categories[guildId] = [];
  const existing = db.categories[guildId].find(
    (c) => c.name.toLowerCase() === category.name.toLowerCase()
  );
  if (existing) return existing;
  const newCat: Category = { ...category, id: Date.now().toString() };
  db.categories[guildId].push(newCat);
  saveDB(db);
  return newCat;
}

export function removeCategory(guildId: string, name: string): boolean {
  const db = loadDB();
  const list = db.categories[guildId] ?? [];
  const idx = list.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return false;
  list.splice(idx, 1);
  db.categories[guildId] = list;
  saveDB(db);
  return true;
}

export function getConfig(guildId: string): GuildConfig {
  const db = loadDB();
  return db.config[guildId] ?? {};
}

export function setConfig(guildId: string, config: Partial<GuildConfig>): void {
  const db = loadDB();
  if (!db.config[guildId]) db.config[guildId] = {};
  db.config[guildId] = { ...db.config[guildId], ...config };
  saveDB(db);
}
