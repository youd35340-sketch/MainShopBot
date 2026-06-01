import { useState, useEffect, useCallback } from "react";

const API = "/api/bot";

type Product = { id: string; name: string; emoji: string; category: string; price: string; description: string; stock: number | "unlimited"; };
type Category = { id: string; name: string; emoji: string; };
type Config = { discountPercent?: number; ticketCategoryId?: string; staffRoleId?: string; };
type Command = { name: string; usage: string; desc: string; };

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(API + path, { headers: { "Content-Type": "application/json" }, ...opts });
  return r.json();
}

function Toast({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl font-semibold text-white text-sm shadow-lg transition-all ${type === "ok" ? "bg-green-600" : "bg-red-500"}`}>
      {msg}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("overview");
  const [guilds, setGuilds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => setToast({ msg, type }), []);

  useEffect(() => { api("/guilds").then(setGuilds).catch(() => {}); }, []);

  const nav = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "commands", icon: "⌨️", label: "Commands" },
    { id: "products", icon: "📦", label: "Products" },
    { id: "categories", icon: "🗂️", label: "Categories" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-[#dcddde] font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-[#16181f] border-r border-[#2a2d3a] flex flex-col py-5 fixed h-screen z-10">
        <div className="px-5 pb-5 border-b border-[#2a2d3a] mb-3">
          <div className="text-white font-bold text-base">🛍️ Vix Shop</div>
          <div className="text-xs text-[#72767d] mt-0.5">Bot Dashboard</div>
        </div>
        <div className="px-3 py-1 text-[10px] font-semibold text-[#72767d] uppercase tracking-wider mt-1">Main</div>
        {nav.slice(0, 2).map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            className={`flex items-center gap-2.5 px-4 py-2 mx-2 rounded text-sm text-left transition-colors ${page === n.id ? "bg-indigo-500/20 text-indigo-300" : "text-[#72767d] hover:bg-white/5 hover:text-[#dcddde]"}`}>
            <span className="text-base w-5 text-center">{n.icon}</span> {n.label}
            {n.id === "overview" && <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          </button>
        ))}
        <div className="px-3 py-1 text-[10px] font-semibold text-[#72767d] uppercase tracking-wider mt-3">Manage</div>
        {nav.slice(2, 4).map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            className={`flex items-center gap-2.5 px-4 py-2 mx-2 rounded text-sm text-left transition-colors ${page === n.id ? "bg-indigo-500/20 text-indigo-300" : "text-[#72767d] hover:bg-white/5 hover:text-[#dcddde]"}`}>
            <span className="text-base w-5 text-center">{n.icon}</span> {n.label}
          </button>
        ))}
        <div className="px-3 py-1 text-[10px] font-semibold text-[#72767d] uppercase tracking-wider mt-3">Settings</div>
        {nav.slice(4).map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            className={`flex items-center gap-2.5 px-4 py-2 mx-2 rounded text-sm text-left transition-colors ${page === n.id ? "bg-indigo-500/20 text-indigo-300" : "text-[#72767d] hover:bg-white/5 hover:text-[#dcddde]"}`}>
            <span className="text-base w-5 text-center">{n.icon}</span> {n.label}
          </button>
        ))}
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-8 min-h-screen">
        {page === "overview" && <Overview guilds={guilds} showToast={showToast} />}
        {page === "commands" && <Commands />}
        {page === "products" && <Products guilds={guilds} showToast={showToast} />}
        {page === "categories" && <Categories guilds={guilds} showToast={showToast} />}
        {page === "settings" && <Settings guilds={guilds} showToast={showToast} />}
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ── Overview ──────────────────────────────────────────── */
function Overview({ guilds, showToast }: { guilds: string[]; showToast: (m: string, t?: "ok" | "err") => void }) {
  const [rows, setRows] = useState<{ id: string; products: number; cats: number; discount?: number }[]>([]);

  useEffect(() => {
    if (!guilds.length) return;
    Promise.all(guilds.map(async g => {
      const [prods, cats, cfg] = await Promise.all([
        api(`/products/${g}`), api(`/categories/${g}`), api(`/config/${g}`)
      ]);
      return { id: g, products: (prods as Product[]).length, cats: (cats as Category[]).length, discount: (cfg as Config).discountPercent };
    })).then(setRows);
  }, [guilds]);

  const totalProds = rows.reduce((s, r) => s + r.products, 0);
  const totalCats = rows.reduce((s, r) => s + r.cats, 0);
  const activeDiscount = rows.find(r => r.discount && r.discount > 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Overview</h2>
      <p className="text-[#72767d] text-sm mt-1 mb-7">Live stats for your shop bot</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Bot Status", value: "● Online", sub: "Connected to Discord", color: "text-green-400" },
          { label: "Total Products", value: String(totalProds), sub: "Across all servers", color: "text-indigo-400" },
          { label: "Categories", value: String(totalCats), sub: "Defined", color: "text-white" },
          { label: "Active Discount", value: activeDiscount?.discount ? `${activeDiscount.discount}%` : "0%", sub: activeDiscount?.discount ? `${activeDiscount.discount}% sale active!` : "No sale running", color: "text-yellow-400" },
        ].map(c => (
          <div key={c.label} className="bg-[#1e2029] border border-[#2a2d3a] rounded-xl p-5">
            <div className="text-xs text-[#72767d] uppercase tracking-wider mb-2">{c.label}</div>
            <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-[#72767d] mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#1e2029] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2d3a]">
          <h3 className="text-white font-semibold">Servers Using This Bot</h3>
        </div>
        <table className="w-full">
          <thead><tr className="bg-black/20 text-xs text-[#72767d] uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Guild ID</th>
            <th className="px-4 py-3 text-left">Products</th>
            <th className="px-4 py-3 text-left">Categories</th>
            <th className="px-4 py-3 text-left">Discount</th>
          </tr></thead>
          <tbody>
            {rows.length ? rows.map(r => (
              <tr key={r.id} className="border-t border-[#2a2d3a] hover:bg-white/[0.02] text-sm">
                <td className="px-4 py-3 font-mono text-xs text-[#dcddde]">{r.id}</td>
                <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300">{r.products}</span></td>
                <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#dcddde]">{r.cats}</span></td>
                <td className="px-4 py-3">{r.discount ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400">{r.discount}% OFF</span> : <span className="text-[#72767d]">—</span>}</td>
              </tr>
            )) : <tr><td colSpan={4} className="px-4 py-10 text-center text-[#72767d] text-sm">No servers yet — use a slash command in Discord first</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Commands ──────────────────────────────────────────── */
function Commands() {
  const [cmds, setCmds] = useState<Command[]>([]);
  useEffect(() => { api("/commands").then(setCmds); }, []);
  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Commands</h2>
      <p className="text-[#72767d] text-sm mt-1 mb-7">All 13 slash commands available in your Discord server</p>
      <div className="space-y-3">
        {cmds.map(c => (
          <div key={c.name} className="bg-[#1e2029] border border-[#2a2d3a] rounded-xl p-4">
            <div className="text-indigo-300 font-bold text-[15px] mb-1">{c.name}</div>
            <div className="font-mono text-xs text-[#72767d] bg-black/30 px-2.5 py-1 rounded mb-2 break-all">{c.usage}</div>
            <div className="text-sm text-[#dcddde]">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Products ──────────────────────────────────────────── */
function Products({ guilds, showToast }: { guilds: string[]; showToast: (m: string, t?: "ok" | "err") => void }) {
  const [gid, setGid] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", emoji: "", category: "", price: "", description: "", stock: "" });

  const load = useCallback(async (g: string) => {
    if (!g) return;
    const data = await api(`/products/${g}`);
    setProducts(data as Product[]);
  }, []);

  useEffect(() => { load(gid); }, [gid, load]);

  const del = async (name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    await api(`/products/${gid}/${encodeURIComponent(name)}`, { method: "DELETE" });
    showToast("Product removed");
    load(gid);
  };

  const submit = async () => {
    if (!form.name || !form.price) { showToast("Name and price are required", "err"); return; }
    await api(`/products/${gid}`, {
      method: "POST",
      body: JSON.stringify({ ...form, emoji: form.emoji || "🛍️", category: form.category || "General", stock: form.stock === "unlimited" ? "unlimited" : parseInt(form.stock) || 0 }),
    });
    showToast("Product added!");
    setShowAdd(false);
    setForm({ name: "", emoji: "", category: "", price: "", description: "", stock: "" });
    load(gid);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Products</h2>
      <p className="text-[#72767d] text-sm mt-1 mb-6">Add, edit, or remove products from your shop</p>

      <div className="flex items-center gap-3 bg-[#1e2029] border border-[#2a2d3a] rounded-xl px-4 py-3 mb-5">
        <span className="text-sm text-[#72767d] whitespace-nowrap">Server:</span>
        <select value={gid} onChange={e => setGid(e.target.value)} className="flex-1 max-w-xs bg-[#0f1117] border border-[#2a2d3a] text-[#dcddde] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
          <option value="">— select a server —</option>
          {guilds.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={() => { if (!gid) { showToast("Select a server first", "err"); return; } setShowAdd(true); }}
          className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          ＋ Add Product
        </button>
      </div>

      <div className="bg-[#1e2029] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2d3a]">
          <h3 className="text-white font-semibold text-sm">Products ({products.length})</h3>
        </div>
        <table className="w-full">
          <thead><tr className="bg-black/20 text-xs text-[#72767d] uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Emoji</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Category</th>
            <th className="px-4 py-3 text-left">Price</th>
            <th className="px-4 py-3 text-left">Stock</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr></thead>
          <tbody>
            {products.length ? products.map(p => (
              <tr key={p.id} className="border-t border-[#2a2d3a] hover:bg-white/[0.02] text-sm">
                <td className="px-4 py-3 text-xl">{p.emoji}</td>
                <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300">{p.category}</span></td>
                <td className="px-4 py-3 text-green-400 font-semibold">{p.price}</td>
                <td className="px-4 py-3">
                  {p.stock === "unlimited" ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">Unlimited</span>
                    : (p.stock as number) <= 0 ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">Out of Stock</span>
                    : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400">{p.stock}</span>}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => del(p.name)} className="px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">Remove</button>
                </td>
              </tr>
            )) : <tr><td colSpan={6} className="px-4 py-12 text-center text-[#72767d] text-sm">{gid ? "No products yet" : "Select a server above"}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="bg-[#1e2029] border border-[#2a2d3a] rounded-2xl p-7 w-full max-w-lg">
            <h3 className="text-white font-bold text-lg mb-5">Add Product</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[["Name *", "name", "e.g. 1K Instagram Followers"], ["Emoji", "emoji", "🛍️"], ["Price *", "price", "e.g. $4.99"], ["Category", "category", "e.g. Instagram"]].map(([lbl, key, ph]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#72767d] uppercase tracking-wider">{lbl}</label>
                  <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                    className="bg-[#0f1117] border border-[#2a2d3a] text-[#dcddde] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="text-xs font-semibold text-[#72767d] uppercase tracking-wider">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this service include?" rows={3}
                className="bg-[#0f1117] border border-[#2a2d3a] text-[#dcddde] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none" />
            </div>
            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-xs font-semibold text-[#72767d] uppercase tracking-wider">Stock</label>
              <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="unlimited or a number"
                className="bg-[#0f1117] border border-[#2a2d3a] text-[#dcddde] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={submit} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Add Product</button>
              <button onClick={() => setShowAdd(false)} className="border border-[#2a2d3a] text-[#72767d] hover:text-[#dcddde] px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Categories ────────────────────────────────────────── */
function Categories({ guilds, showToast }: { guilds: string[]; showToast: (m: string, t?: "ok" | "err") => void }) {
  const [gid, setGid] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", emoji: "" });

  const load = useCallback(async (g: string) => { if (!g) return; setCats(await api(`/categories/${g}`)); }, []);
  useEffect(() => { load(gid); }, [gid, load]);

  const del = async (name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    await api(`/categories/${gid}/${encodeURIComponent(name)}`, { method: "DELETE" });
    showToast("Category removed");
    load(gid);
  };

  const submit = async () => {
    if (!form.name) { showToast("Name is required", "err"); return; }
    await api(`/categories/${gid}`, { method: "POST", body: JSON.stringify({ name: form.name, emoji: form.emoji || "📦" }) });
    showToast("Category added!");
    setShowAdd(false);
    setForm({ name: "", emoji: "" });
    load(gid);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Categories</h2>
      <p className="text-[#72767d] text-sm mt-1 mb-6">Organise your products into categories</p>

      <div className="flex items-center gap-3 bg-[#1e2029] border border-[#2a2d3a] rounded-xl px-4 py-3 mb-5">
        <span className="text-sm text-[#72767d] whitespace-nowrap">Server:</span>
        <select value={gid} onChange={e => setGid(e.target.value)} className="flex-1 max-w-xs bg-[#0f1117] border border-[#2a2d3a] text-[#dcddde] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
          <option value="">— select a server —</option>
          {guilds.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={() => { if (!gid) { showToast("Select a server first", "err"); return; } setShowAdd(true); }}
          className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          ＋ Add Category
        </button>
      </div>

      <div className="bg-[#1e2029] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-black/20 text-xs text-[#72767d] uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Emoji</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">ID</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr></thead>
          <tbody>
            {cats.length ? cats.map(c => (
              <tr key={c.id} className="border-t border-[#2a2d3a] hover:bg-white/[0.02] text-sm">
                <td className="px-4 py-3 text-xl">{c.emoji}</td>
                <td className="px-4 py-3 font-semibold text-white">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#72767d]">{c.id}</td>
                <td className="px-4 py-3">
                  <button onClick={() => del(c.name)} className="px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">Remove</button>
                </td>
              </tr>
            )) : <tr><td colSpan={4} className="px-4 py-12 text-center text-[#72767d] text-sm">{gid ? "No categories yet" : "Select a server above"}</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="bg-[#1e2029] border border-[#2a2d3a] rounded-2xl p-7 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-5">Add Category</h3>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[["Name *", "name", "e.g. Instagram"], ["Emoji", "emoji", "📸"]].map(([lbl, key, ph]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#72767d] uppercase tracking-wider">{lbl}</label>
                  <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                    className="bg-[#0f1117] border border-[#2a2d3a] text-[#dcddde] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={submit} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Add Category</button>
              <button onClick={() => setShowAdd(false)} className="border border-[#2a2d3a] text-[#72767d] hover:text-[#dcddde] px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Settings ──────────────────────────────────────────── */
function Settings({ guilds, showToast }: { guilds: string[]; showToast: (m: string, t?: "ok" | "err") => void }) {
  const [gid, setGid] = useState("");
  const [cfg, setCfg] = useState<Config>({});
  const [discount, setDiscount] = useState(0);

  const load = useCallback(async (g: string) => {
    if (!g) return;
    const c = await api(`/config/${g}`) as Config;
    setCfg(c);
    setDiscount(c.discountPercent ?? 0);
  }, []);
  useEffect(() => { load(gid); }, [gid, load]);

  const saveDiscount = async () => {
    if (!gid) { showToast("Select a server first", "err"); return; }
    await api(`/config/${gid}`, { method: "PATCH", body: JSON.stringify({ discountPercent: discount }) });
    showToast("Discount saved! Panels will update on next interaction.");
    load(gid);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Settings</h2>
      <p className="text-[#72767d] text-sm mt-1 mb-6">Configure discount and server settings</p>

      <div className="flex items-center gap-3 bg-[#1e2029] border border-[#2a2d3a] rounded-xl px-4 py-3 mb-5">
        <span className="text-sm text-[#72767d] whitespace-nowrap">Server:</span>
        <select value={gid} onChange={e => setGid(e.target.value)} className="flex-1 max-w-xs bg-[#0f1117] border border-[#2a2d3a] text-[#dcddde] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
          <option value="">— select a server —</option>
          {guilds.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="bg-[#1e2029] border border-[#2a2d3a] rounded-xl p-6 mb-4">
        <h3 className="text-white font-semibold mb-4">Discount / Sale</h3>
        <div className="flex items-end gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#72767d] uppercase tracking-wider">Discount %</label>
            <input type="number" value={discount} onChange={e => setDiscount(parseInt(e.target.value) || 0)} min={0} max={99} placeholder="0 = no discount"
              className="w-40 bg-[#0f1117] border border-[#2a2d3a] text-[#dcddde] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveDiscount} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Save</button>
            <button onClick={async () => { if (!gid) return; setDiscount(0); await api(`/config/${gid}`, { method: "PATCH", body: JSON.stringify({ discountPercent: 0 }) }); showToast("Sale removed"); load(gid); }}
              className="border border-red-500/30 text-red-400 hover:bg-red-500/10 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Remove Sale</button>
          </div>
        </div>
        <p className="text-xs text-[#72767d]">Setting a discount will show sale prices and strikethrough on all /postshop panels in Discord.</p>
      </div>

      {gid && (
        <div className="bg-[#1e2029] border border-[#2a2d3a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">Current Server Config</h3>
          <pre className="text-xs text-[#72767d] overflow-x-auto whitespace-pre-wrap bg-black/30 rounded-lg p-4">{JSON.stringify(cfg, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
