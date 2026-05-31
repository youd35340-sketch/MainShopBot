import { REST, Routes } from "discord.js";
import * as addproduct from "./commands/addproduct.js";
import * as removeproduct from "./commands/removeproduct.js";
import * as editproduct from "./commands/editproduct.js";
import * as addcategory from "./commands/addcategory.js";
import * as removecategory from "./commands/removecategory.js";
import * as setticket from "./commands/setticket.js";
import * as shop from "./commands/shop.js";
import * as listproducts from "./commands/listproducts.js";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID");
  process.exit(1);
}

const commands = [
  addproduct, removeproduct, editproduct,
  addcategory, removecategory, setticket,
  shop, listproducts,
].map((c) => c.data.toJSON());

const rest = new REST().setToken(TOKEN);

(async () => {
  console.log(`📡 Deploying ${commands.length} slash commands…`);
  await rest.put(Routes.applicationCommands(CLIENT_ID!), { body: commands });
  console.log("✅ All commands deployed!");
})();
