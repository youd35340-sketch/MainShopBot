import express from "express";
import cors from "cors";
import {
  getProducts, getCategories, getConfig,
  addProduct, removeProduct, editProduct,
  addCategory, removeCategory, setConfig,
} from "./database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function getAllGuildIds(): string[] {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const db = JSON.parse(raw);
    const ids = new Set<string>([
      ...Object.keys(db.products ?? {}),
      ...Object.keys(db.categories ?? {}),
      ...Object.keys(db.config ?? {}),
    ]);
    return [...ids];
  } catch {
    return [];
  }
}

const COMMANDS = [
  { name: "/addproduct",    usage: "/addproduct name: emoji: category: price: description: stock:",  desc: "Add a new product to the shop" },
  { name: "/removeproduct", usage: "/removeproduct name:",                                           desc: "Remove a product by name" },
  { name: "/editproduct",   usage: "/editproduct name: [price:] [description:] [stock:] [emoji:]",   desc: "Edit an existing product's details" },
  { name: "/addcategory",   usage: "/addcategory name: emoji:",                                      desc: "Create a new product category" },
  { name: "/removecategory",usage: "/removecategory name:",                                          desc: "Delete a category" },
  { name: "/shop",          usage: "/shop",                                                          desc: "Open your private shop session (ephemeral)" },
  { name: "/postshop",      usage: "/postshop",                                                      desc: "Post a public shop panel anyone can browse" },
  { name: "/listproducts",  usage: "/listproducts [category:]",                                      desc: "List all products, optionally filtered by category" },
  { name: "/setstock",      usage: "/setstock name: amount:",                                        desc: "Set the stock level for a product (or 'unlimited')" },
  { name: "/stockcheck",    usage: "/stockcheck",                                                    desc: "See current stock levels for all products" },
  { name: "/setticket",     usage: "/setticket category: staffrole: [welcome:]",                     desc: "Configure the ticket system channel and staff role" },
  { name: "/announce",      usage: "/announce message: [channel:] [color:]",                         desc: "Post a formatted announcement embed" },
  { name: "/discount",      usage: "/discount percent:",                                             desc: "Set a % sale discount (0 to remove). Updates all panels instantly" },
];

export function startDashboard(port: number) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  /* ── API: guilds ───────────────────────────────────────────── */
  app.get("/api/guilds", (_req, res) => {
    res.json(getAllGuildIds());
  });

  /* ── API: products ─────────────────────────────────────────── */
  app.get("/api/products/:guildId", (req, res) => {
    res.json(getProducts(req.params.guildId));
  });

  app.post("/api/products/:guildId", (req, res) => {
    const { name, emoji, category, price, description, stock } = req.body;
    if (!name || !price) { res.status(400).json({ error: "name and price required" }); return; }
    const p = addProduct(req.params.guildId, {
      name, emoji: emoji ?? "🛍️", category: category ?? "General",
      price, description: description ?? "", stock: stock === "unlimited" ? "unlimited" : Number(stock ?? 0),
    });
    res.json(p);
  });

  app.delete("/api/products/:guildId/:name", (req, res) => {
    const ok = removeProduct(req.params.guildId, decodeURIComponent(req.params.name));
    res.json({ success: ok });
  });

  app.patch("/api/products/:guildId/:name", (req, res) => {
    const updated = editProduct(req.params.guildId, decodeURIComponent(req.params.name), req.body);
    if (!updated) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(updated);
  });

  /* ── API: categories ───────────────────────────────────────── */
  app.get("/api/categories/:guildId", (req, res) => {
    res.json(getCategories(req.params.guildId));
  });

  app.post("/api/categories/:guildId", (req, res) => {
    const { name, emoji } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const c = addCategory(req.params.guildId, { name, emoji: emoji ?? "📦" });
    res.json(c);
  });

  app.delete("/api/categories/:guildId/:name", (req, res) => {
    const ok = removeCategory(req.params.guildId, decodeURIComponent(req.params.name));
    res.json({ success: ok });
  });

  /* ── API: config ───────────────────────────────────────────── */
  app.get("/api/config/:guildId", (req, res) => {
    res.json(getConfig(req.params.guildId));
  });

  app.patch("/api/config/:guildId", (req, res) => {
    setConfig(req.params.guildId, req.body);
    res.json({ success: true });
  });

  /* ── API: commands list ────────────────────────────────────── */
  app.get("/api/commands", (_req, res) => {
    res.json(COMMANDS);
  });

  /* ── Dashboard HTML ────────────────────────────────────────── */
  app.get("*", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(DASHBOARD_HTML);
  });

  app.listen(port, () => {
    console.log(`🌐 Dashboard running on port ${port}`);
  });
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Vix Shop Bot — Dashboard</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --bg:#0f1117;--sidebar:#16181f;--card:#1e2029;--border:#2a2d3a;
    --accent:#5865f2;--accent2:#7289da;--green:#3ba55d;--red:#ed4245;
    --yellow:#faa61a;--text:#dcddde;--muted:#72767d;--white:#fff;
  }
  body{font-family:'Segoe UI',sans-serif;background:var(--bg);color:var(--text);display:flex;min-height:100vh}
  /* Sidebar */
  #sidebar{width:220px;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:20px 0;position:fixed;height:100vh;overflow-y:auto}
  .logo{padding:0 20px 24px;border-bottom:1px solid var(--border);margin-bottom:12px}
  .logo h1{font-size:16px;font-weight:700;color:var(--white)}
  .logo span{font-size:11px;color:var(--muted)}
  .nav-section{padding:8px 12px 4px;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
  .nav-item{display:flex;align-items:center;gap:10px;padding:9px 20px;cursor:pointer;border-radius:4px;margin:1px 8px;font-size:14px;color:var(--muted);transition:all .15s}
  .nav-item:hover{background:rgba(255,255,255,.05);color:var(--text)}
  .nav-item.active{background:rgba(88,101,242,.15);color:var(--accent2)}
  .nav-item .icon{font-size:16px;width:20px;text-align:center}
  .status-dot{width:8px;height:8px;border-radius:50%;background:var(--green);margin-left:auto;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  /* Main */
  #main{margin-left:220px;flex:1;padding:32px;min-height:100vh}
  .page{display:none}.page.active{display:block}
  h2{font-size:22px;font-weight:700;color:var(--white);margin-bottom:6px}
  .subtitle{color:var(--muted);font-size:14px;margin-bottom:28px}
  /* Cards */
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:28px}
  .card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
  .card-label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
  .card-value{font-size:28px;font-weight:700;color:var(--white)}
  .card-sub{font-size:12px;color:var(--muted);margin-top:4px}
  .card.green .card-value{color:var(--green)}
  .card.yellow .card-value{color:var(--yellow)}
  .card.accent .card-value{color:var(--accent2)}
  /* Table */
  .table-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:24px}
  .table-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .table-header h3{font-size:15px;font-weight:600;color:var(--white)}
  table{width:100%;border-collapse:collapse}
  th{padding:12px 16px;text-align:left;font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;background:rgba(0,0,0,.2)}
  td{padding:12px 16px;font-size:14px;border-top:1px solid var(--border)}
  tr:hover td{background:rgba(255,255,255,.02)}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
  .badge.green{background:rgba(59,165,93,.15);color:var(--green)}
  .badge.red{background:rgba(237,66,69,.15);color:var(--red)}
  .badge.yellow{background:rgba(250,166,26,.15);color:var(--yellow)}
  .badge.accent{background:rgba(88,101,242,.15);color:var(--accent2)}
  /* Buttons */
  .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s}
  .btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{background:#4752c4}
  .btn-danger{background:transparent;color:var(--red);border:1px solid var(--red)}.btn-danger:hover{background:rgba(237,66,69,.1)}
  .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}.btn-ghost:hover{color:var(--text);border-color:var(--text)}
  .btn-sm{padding:5px 10px;font-size:12px}
  /* Forms */
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .form-group{display:flex;flex-direction:column;gap:6px}
  label{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
  input,select,textarea{background:#0f1117;border:1px solid var(--border);color:var(--text);padding:9px 12px;border-radius:8px;font-size:14px;outline:none;transition:border .15s;font-family:inherit}
  input:focus,select:focus,textarea:focus{border-color:var(--accent)}
  textarea{resize:vertical;min-height:70px}
  .form-actions{display:flex;gap:10px;margin-top:16px}
  /* Modal */
  .modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;align-items:center;justify-content:center}
  .modal-bg.open{display:flex}
  .modal{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto}
  .modal h3{font-size:18px;font-weight:700;color:var(--white);margin-bottom:20px}
  /* Cmd list */
  .cmd-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:10px}
  .cmd-name{font-size:15px;font-weight:700;color:var(--accent2);margin-bottom:4px}
  .cmd-usage{font-size:12px;color:var(--muted);font-family:monospace;background:rgba(0,0,0,.3);padding:4px 8px;border-radius:4px;margin-bottom:8px;word-break:break-all}
  .cmd-desc{font-size:13px;color:var(--text)}
  /* Guild selector */
  .guild-bar{display:flex;align-items:center;gap:12px;margin-bottom:24px;padding:14px 18px;background:var(--card);border:1px solid var(--border);border-radius:10px}
  .guild-bar label{font-size:13px;color:var(--muted);white-space:nowrap}
  .guild-bar select{flex:1;max-width:320px}
  /* Toast */
  #toast{position:fixed;bottom:24px;right:24px;background:#3ba55d;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;transform:translateY(80px);opacity:0;transition:all .3s;z-index:200}
  #toast.show{transform:translateY(0);opacity:1}
  #toast.error{background:var(--red)}
  .empty{padding:40px;text-align:center;color:var(--muted);font-size:14px}
  @media(max-width:768px){
    #sidebar{width:60px}
    .logo,.nav-section,.nav-item span{display:none}
    .nav-item{justify-content:center;padding:10px}
    #main{margin-left:60px;padding:20px}
    .form-row{grid-template-columns:1fr}
    .cards{grid-template-columns:1fr 1fr}
  }
</style>
</head>
<body>

<nav id="sidebar">
  <div class="logo">
    <h1>🛍️ Vix Shop</h1>
    <span>Bot Dashboard</span>
  </div>
  <div class="nav-section">Main</div>
  <div class="nav-item active" data-page="overview"><span class="icon">📊</span><span>Overview</span><span class="status-dot" id="botDot"></span></div>
  <div class="nav-item" data-page="commands"><span class="icon">⌨️</span><span>Commands</span></div>
  <div class="nav-section">Manage</div>
  <div class="nav-item" data-page="products"><span class="icon">📦</span><span>Products</span></div>
  <div class="nav-item" data-page="categories"><span class="icon">🗂️</span><span>Categories</span></div>
  <div class="nav-section">Settings</div>
  <div class="nav-item" data-page="settings"><span class="icon">⚙️</span><span>Settings</span></div>
</nav>

<main id="main">

  <!-- OVERVIEW -->
  <div class="page active" id="page-overview">
    <h2>Overview</h2>
    <p class="subtitle">Live stats for your shop bot</p>
    <div class="cards" id="statsCards">
      <div class="card green"><div class="card-label">Bot Status</div><div class="card-value" id="statStatus">●  Online</div><div class="card-sub">Connected to Discord</div></div>
      <div class="card accent"><div class="card-label">Products</div><div class="card-value" id="statProducts">—</div><div class="card-sub">Across all servers</div></div>
      <div class="card"><div class="card-label">Categories</div><div class="card-value" id="statCategories">—</div><div class="card-sub">Defined</div></div>
      <div class="card yellow"><div class="card-label">Active Discount</div><div class="card-value" id="statDiscount">—</div><div class="card-sub" id="statDiscountSub">No sale running</div></div>
    </div>
    <div class="table-wrap">
      <div class="table-header"><h3>Servers Using This Bot</h3></div>
      <table><thead><tr><th>Guild ID</th><th>Products</th><th>Categories</th><th>Discount</th></tr></thead>
      <tbody id="guildTable"><tr><td colspan="4" class="empty">Loading…</td></tr></tbody></table>
    </div>
  </div>

  <!-- COMMANDS -->
  <div class="page" id="page-commands">
    <h2>Commands</h2>
    <p class="subtitle">All 13 slash commands available in your Discord server</p>
    <div id="cmdList"><div class="empty">Loading…</div></div>
  </div>

  <!-- PRODUCTS -->
  <div class="page" id="page-products">
    <h2>Products</h2>
    <p class="subtitle">Add, edit, or remove products from your shop</p>
    <div class="guild-bar">
      <label>Server:</label>
      <select id="productGuild"><option value="">— select a server —</option></select>
      <button class="btn btn-primary" onclick="openAddProduct()">＋ Add Product</button>
    </div>
    <div class="table-wrap">
      <div class="table-header"><h3 id="productTableTitle">Products</h3></div>
      <table><thead><tr><th>Emoji</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
      <tbody id="productTable"><tr><td colspan="6" class="empty">Select a server above</td></tr></tbody></table>
    </div>
  </div>

  <!-- CATEGORIES -->
  <div class="page" id="page-categories">
    <h2>Categories</h2>
    <p class="subtitle">Organise your products into categories</p>
    <div class="guild-bar">
      <label>Server:</label>
      <select id="categoryGuild"><option value="">— select a server —</option></select>
      <button class="btn btn-primary" onclick="openAddCategory()">＋ Add Category</button>
    </div>
    <div class="table-wrap">
      <div class="table-header"><h3>Categories</h3></div>
      <table><thead><tr><th>Emoji</th><th>Name</th><th>ID</th><th>Actions</th></tr></thead>
      <tbody id="categoryTable"><tr><td colspan="4" class="empty">Select a server above</td></tr></tbody></table>
    </div>
  </div>

  <!-- SETTINGS -->
  <div class="page" id="page-settings">
    <h2>Settings</h2>
    <p class="subtitle">Configure discount and server settings</p>
    <div class="guild-bar">
      <label>Server:</label>
      <select id="settingsGuild"><option value="">— select a server —</option></select>
    </div>
    <div class="table-wrap" style="padding:24px">
      <h3 style="color:var(--white);margin-bottom:20px">Discount / Sale</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Discount %</label>
          <input type="number" id="discountInput" min="0" max="99" placeholder="0 = no discount"/>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveDiscount()">Save Discount</button>
        <button class="btn btn-danger" onclick="removeDiscount()">Remove Sale</button>
      </div>
      <p style="margin-top:16px;font-size:13px;color:var(--muted)">Setting a discount will instantly update all /postshop panels in Discord with sale prices and strikethrough.</p>
    </div>
    <div class="table-wrap" style="padding:24px;margin-top:16px">
      <h3 style="color:var(--white);margin-bottom:8px">Current Config</h3>
      <pre id="configJson" style="font-size:12px;color:var(--muted);overflow-x:auto;white-space:pre-wrap">Select a server above</pre>
    </div>
  </div>
</main>

<!-- Add Product Modal -->
<div class="modal-bg" id="addProductModal">
  <div class="modal">
    <h3>Add Product</h3>
    <div class="form-row">
      <div class="form-group"><label>Name *</label><input id="pName" placeholder="e.g. 1K Instagram Followers"/></div>
      <div class="form-group"><label>Emoji</label><input id="pEmoji" placeholder="🛍️"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Price *</label><input id="pPrice" placeholder="e.g. $4.99"/></div>
      <div class="form-group"><label>Category</label><input id="pCategory" placeholder="e.g. Instagram"/></div>
    </div>
    <div class="form-group" style="margin-bottom:12px"><label>Description</label><textarea id="pDesc" placeholder="What does this service include?"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Stock</label><input id="pStock" placeholder="unlimited or a number"/></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="submitAddProduct()">Add Product</button>
      <button class="btn btn-ghost" onclick="closeModal('addProductModal')">Cancel</button>
    </div>
  </div>
</div>

<!-- Add Category Modal -->
<div class="modal-bg" id="addCategoryModal">
  <div class="modal">
    <h3>Add Category</h3>
    <div class="form-row">
      <div class="form-group"><label>Name *</label><input id="cName" placeholder="e.g. Instagram"/></div>
      <div class="form-group"><label>Emoji</label><input id="cEmoji" placeholder="📸"/></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="submitAddCategory()">Add Category</button>
      <button class="btn btn-ghost" onclick="closeModal('addCategoryModal')">Cancel</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
const BASE = '';
let guilds = [];

/* ── Navigation ──────────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('page-' + el.dataset.page).classList.add('active');
  });
});

/* ── Toast ───────────────────────────────────────────────── */
function toast(msg, err=false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (err ? ' error' : '');
  setTimeout(() => t.className = '', 3000);
}

/* ── Modals ──────────────────────────────────────────────── */
function openAddProduct() {
  if (!document.getElementById('productGuild').value) { toast('Select a server first', true); return; }
  document.getElementById('addProductModal').classList.add('open');
}
function openAddCategory() {
  if (!document.getElementById('categoryGuild').value) { toast('Select a server first', true); return; }
  document.getElementById('addCategoryModal').classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-bg').forEach(m => m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); }));

/* ── API helpers ─────────────────────────────────────────── */
async function api(path, opts={}) {
  const r = await fetch(BASE + path, {headers:{'Content-Type':'application/json'}, ...opts});
  return r.json();
}

/* ── Load guilds ─────────────────────────────────────────── */
async function loadGuilds() {
  guilds = await api('/api/guilds').catch(() => []);
  ['productGuild','categoryGuild','settingsGuild'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">— select a server —</option>' +
      guilds.map(g => \`<option value="\${g}">\${g}</option>\`).join('');
  });
  return guilds;
}

/* ── Overview ────────────────────────────────────────────── */
async function loadOverview() {
  const guilds = await loadGuilds();
  let totalProducts = 0, totalCats = 0, hasDiscount = false, discountPct = 0;
  const rows = await Promise.all(guilds.map(async g => {
    const [prods, cats, cfg] = await Promise.all([
      api('/api/products/' + g),
      api('/api/categories/' + g),
      api('/api/config/' + g),
    ]);
    totalProducts += prods.length;
    totalCats += cats.length;
    if (cfg.discountPercent) { hasDiscount = true; discountPct = cfg.discountPercent; }
    return \`<tr>
      <td style="font-family:monospace;font-size:13px">\${g}</td>
      <td><span class="badge accent">\${prods.length}</span></td>
      <td><span class="badge">\${cats.length}</span></td>
      <td>\${cfg.discountPercent ? \`<span class="badge yellow">\${cfg.discountPercent}% OFF</span>\` : '<span class="badge">—</span>'}</td>
    </tr>\`;
  }));
  document.getElementById('statProducts').textContent = totalProducts;
  document.getElementById('statCategories').textContent = totalCats;
  document.getElementById('statDiscount').textContent = hasDiscount ? discountPct + '%' : '0%';
  document.getElementById('statDiscountSub').textContent = hasDiscount ? discountPct + '% sale active!' : 'No sale running';
  document.getElementById('guildTable').innerHTML = rows.length ? rows.join('') : '<tr><td colspan="4" class="empty">No servers detected yet — use a slash command in Discord first</td></tr>';
}

/* ── Commands ────────────────────────────────────────────── */
async function loadCommands() {
  const cmds = await api('/api/commands');
  document.getElementById('cmdList').innerHTML = cmds.map(c => \`
    <div class="cmd-card">
      <div class="cmd-name">\${c.name}</div>
      <div class="cmd-usage">\${c.usage}</div>
      <div class="cmd-desc">\${c.desc}</div>
    </div>\`).join('');
}

/* ── Products ────────────────────────────────────────────── */
document.getElementById('productGuild').addEventListener('change', loadProducts);
async function loadProducts() {
  const gid = document.getElementById('productGuild').value;
  if (!gid) return;
  const prods = await api('/api/products/' + gid);
  document.getElementById('productTableTitle').textContent = 'Products (' + prods.length + ')';
  document.getElementById('productTable').innerHTML = prods.length ? prods.map(p => \`
    <tr>
      <td style="font-size:20px">\${p.emoji}</td>
      <td style="font-weight:600;color:var(--white)">\${p.name}</td>
      <td><span class="badge accent">\${p.category}</span></td>
      <td style="color:#3ba55d;font-weight:600">\${p.price}</td>
      <td>\${p.stock === 'unlimited' ? '<span class="badge green">Unlimited</span>' : p.stock <= 0 ? '<span class="badge red">Out of Stock</span>' : '<span class="badge yellow">' + p.stock + '</span>'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteProduct('\${encodeURIComponent(p.name)}')">Remove</button></td>
    </tr>\`).join('') : '<tr><td colspan="6" class="empty">No products yet — add one above</td></tr>';
}

async function deleteProduct(name) {
  const gid = document.getElementById('productGuild').value;
  if (!confirm('Remove ' + decodeURIComponent(name) + '?')) return;
  await api('/api/products/' + gid + '/' + name, {method:'DELETE'});
  toast('Product removed');
  loadProducts();
}

async function submitAddProduct() {
  const gid = document.getElementById('productGuild').value;
  const stock = document.getElementById('pStock').value.trim();
  const body = {
    name: document.getElementById('pName').value.trim(),
    emoji: document.getElementById('pEmoji').value.trim() || '🛍️',
    category: document.getElementById('pCategory').value.trim() || 'General',
    price: document.getElementById('pPrice').value.trim(),
    description: document.getElementById('pDesc').value.trim(),
    stock: stock === 'unlimited' ? 'unlimited' : (parseInt(stock) || 0),
  };
  if (!body.name || !body.price) { toast('Name and price are required', true); return; }
  await api('/api/products/' + gid, {method:'POST', body:JSON.stringify(body)});
  toast('Product added!');
  closeModal('addProductModal');
  loadProducts();
  ['pName','pEmoji','pCategory','pPrice','pDesc','pStock'].forEach(id => document.getElementById(id).value = '');
}

/* ── Categories ──────────────────────────────────────────── */
document.getElementById('categoryGuild').addEventListener('change', loadCategories);
async function loadCategories() {
  const gid = document.getElementById('categoryGuild').value;
  if (!gid) return;
  const cats = await api('/api/categories/' + gid);
  document.getElementById('categoryTable').innerHTML = cats.length ? cats.map(c => \`
    <tr>
      <td style="font-size:20px">\${c.emoji}</td>
      <td style="font-weight:600;color:var(--white)">\${c.name}</td>
      <td style="font-family:monospace;font-size:12px;color:var(--muted)">\${c.id}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteCategory('\${encodeURIComponent(c.name)}')">Remove</button></td>
    </tr>\`).join('') : '<tr><td colspan="4" class="empty">No categories yet</td></tr>';
}

async function deleteCategory(name) {
  const gid = document.getElementById('categoryGuild').value;
  if (!confirm('Remove ' + decodeURIComponent(name) + '?')) return;
  await api('/api/categories/' + gid + '/' + name, {method:'DELETE'});
  toast('Category removed');
  loadCategories();
}

async function submitAddCategory() {
  const gid = document.getElementById('categoryGuild').value;
  const body = {
    name: document.getElementById('cName').value.trim(),
    emoji: document.getElementById('cEmoji').value.trim() || '📦',
  };
  if (!body.name) { toast('Name is required', true); return; }
  await api('/api/categories/' + gid, {method:'POST', body:JSON.stringify(body)});
  toast('Category added!');
  closeModal('addCategoryModal');
  ['cName','cEmoji'].forEach(id => document.getElementById(id).value = '');
  loadCategories();
}

/* ── Settings ────────────────────────────────────────────── */
document.getElementById('settingsGuild').addEventListener('change', async () => {
  const gid = document.getElementById('settingsGuild').value;
  if (!gid) return;
  const cfg = await api('/api/config/' + gid);
  document.getElementById('discountInput').value = cfg.discountPercent || 0;
  document.getElementById('configJson').textContent = JSON.stringify(cfg, null, 2);
});

async function saveDiscount() {
  const gid = document.getElementById('settingsGuild').value;
  if (!gid) { toast('Select a server first', true); return; }
  const pct = parseInt(document.getElementById('discountInput').value) || 0;
  await api('/api/config/' + gid, {method:'PATCH', body:JSON.stringify({discountPercent:pct})});
  toast('Discount saved — panels will update on next interaction');
  document.getElementById('settingsGuild').dispatchEvent(new Event('change'));
}

async function removeDiscount() {
  const gid = document.getElementById('settingsGuild').value;
  if (!gid) { toast('Select a server first', true); return; }
  await api('/api/config/' + gid, {method:'PATCH', body:JSON.stringify({discountPercent:0})});
  toast('Sale removed');
  document.getElementById('discountInput').value = 0;
  document.getElementById('settingsGuild').dispatchEvent(new Event('change'));
}

/* ── Boot ────────────────────────────────────────────────── */
loadOverview();
loadCommands();
</script>
</body>
</html>`;
