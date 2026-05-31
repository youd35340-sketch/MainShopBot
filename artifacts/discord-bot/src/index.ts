import {
  Client,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  Events,
  REST,
  Routes,
  ButtonInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import * as addproduct from "./commands/addproduct.js";
import * as removeproduct from "./commands/removeproduct.js";
import * as editproduct from "./commands/editproduct.js";
import * as addcategory from "./commands/addcategory.js";
import * as removecategory from "./commands/removecategory.js";
import * as setticket from "./commands/setticket.js";
import * as shop from "./commands/shop.js";
import * as listproducts from "./commands/listproducts.js";
import * as postshop from "./commands/postshop.js";
import * as setstock from "./commands/setstock.js";
import * as stockcheck from "./commands/stockcheck.js";
import {
  buildShopEmbed,
  buildComponents,
  runShopSession,
} from "./shopSession.js";
import { getProducts, getCategories } from "./database.js";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error(
    "❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables.\n" +
      "Please set them in your Replit Secrets."
  );
  process.exit(1);
}

interface Command {
  data: { name: string; toJSON: () => object };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands: Command[] = [
  addproduct,
  removeproduct,
  editproduct,
  addcategory,
  removecategory,
  setticket,
  shop,
  listproducts,
  postshop,
  setstock,
  stockcheck,
];

const commandMap = new Collection<string, Command>();
for (const cmd of commands) {
  commandMap.set(cmd.data.name, cmd);
}

async function deployCommands() {
  const rest = new REST().setToken(TOKEN!);
  const body = commands.map((c) => c.data.toJSON());
  console.log(`📡 Registering ${body.length} slash commands globally…`);
  await rest.put(Routes.applicationCommands(CLIENT_ID!), { body });
  console.log("✅ Slash commands registered!");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  await deployCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commandMap.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`❌ Error in /${interaction.commandName}:`, err);
      const reply = {
        content: "❌ Something went wrong while running this command.",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("postshop_cat_")) {
    const parts = interaction.customId.replace("postshop_cat_", "").split("_");
    const guildId = parts[0];
    const categoryName = parts.slice(1).join("_");

    const allProducts = getProducts(guildId);
    const categories = getCategories(guildId);
    const catInfo = categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    const categoryEmoji = catInfo?.emoji ?? "🛒";
    const resolvedName = catInfo?.name ?? categoryName;

    const filteredProducts = allProducts.filter(
      (p) => p.category.toLowerCase() === categoryName.toLowerCase()
    );

    if (filteredProducts.length === 0) {
      await interaction.reply({
        content: `❌ No products found in **${resolvedName}**. Check back later!`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / 4));
    const pageProds = filteredProducts.slice(0, 4);

    const reply = await interaction.reply({
      embeds: [buildShopEmbed(filteredProducts, 0, totalPages, resolvedName, categoryEmoji)],
      components: buildComponents(pageProds, 0, totalPages, null),
      flags: MessageFlags.Ephemeral,
      fetchReply: true,
    });

    await runShopSession(
      guildId,
      interaction.guild?.name ?? "Shop",
      categoryName,
      reply,
      async (data) => {
        await interaction.editReply(data as any);
      },
      async (data) => {
        await interaction.followUp({ ...data, flags: MessageFlags.Ephemeral } as any);
      },
      interaction.user.id,
      false
    );
  }
});

client.login(TOKEN);
