import {
  Client,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  Events,
  REST,
  Routes,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
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
import { buildShopEmbed, buildComponents, runShopSession } from "./shopSession.js";
import { getProducts, getCategories, getConfig } from "./database.js";

process.on("unhandledRejection", (err) => {
  console.error("⚠️ Unhandled rejection:", err);
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables.");
  process.exit(1);
}

interface Command {
  data: { name: string; toJSON: () => object };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands: Command[] = [
  addproduct, removeproduct, editproduct,
  addcategory, removecategory, setticket,
  shop, listproducts, postshop,
  setstock, stockcheck,
];

const commandMap = new Collection<string, Command>();
for (const cmd of commands) commandMap.set(cmd.data.name, cmd);

async function deployCommands() {
  const rest = new REST().setToken(TOKEN!);
  const body = commands.map((c) => c.data.toJSON());
  console.log(`📡 Registering ${body.length} slash commands globally…`);
  await rest.put(Routes.applicationCommands(CLIENT_ID!), { body });
  console.log("✅ Slash commands registered!");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  await deployCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ── Slash commands ─────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (!interaction.isButton()) return;
    const id = interaction.customId;

    // ── Public shop "Browse & Order" button ────────────────────────────────────
    // Posted by /postshop — visible to everyone. Each user gets their own
    // independent ephemeral session so navigation never affects other users.
    if (id.startsWith("pubshop_open_")) {
      const guildId = id.replace("pubshop_open_", "");
      const guildName = interaction.guild?.name ?? "Shop";

      const allProducts = getProducts(guildId);
      if (allProducts.length === 0) {
        await interaction.reply({
          content: "🛍️ The shop is empty right now. Check back soon!",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const totalPages = Math.max(1, Math.ceil(allProducts.length / 4));
      const pageProds = allProducts.slice(0, 4);

      const reply = await interaction.reply({
        embeds: [buildShopEmbed(allProducts, 0, totalPages, guildName, "🛍️")],
        components: buildComponents(pageProds, 0, totalPages, null),
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
      });

      await runShopSession(
        guildId,
        allProducts,
        guildName,
        "🛍️",
        reply,
        async (data) => { await interaction.editReply(data as any); },
        interaction.user.id
      );
      return;
    }

    // ── Close ticket button ────────────────────────────────────────────────────
    if (id.startsWith("ticket_close_")) {
      const parts = id.replace("ticket_close_", "").split("_");
      const ticketChannelId = parts[0];
      const ticketOwnerId = parts[1];

      const guild = interaction.guild;
      if (!guild) return;

      const config = getConfig(guild.id);
      const member = await guild.members.fetch(interaction.user.id).catch(() => null);
      const isStaff = config.staffRoleId ? member?.roles.cache.has(config.staffRoleId) : false;
      const isOwner = interaction.user.id === ticketOwnerId;

      if (!isStaff && !isOwner) {
        await interaction.reply({
          content: "❌ Only staff or the ticket owner can close this ticket.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const closedBy = interaction.user;
      const closeEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔒 Ticket Closing")
        .setDescription(
          `This ticket was closed by ${closedBy}.\n\n**This channel will be deleted in 5 seconds.**`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [closeEmbed] });

      setTimeout(async () => {
        const channel = guild.channels.cache.get(ticketChannelId);
        if (channel && channel.type === ChannelType.GuildText) {
          await channel.delete(`Ticket closed by ${closedBy.tag}`).catch(() => {});
        }
      }, 5000);
      return;
    }

  } catch (err) {
    console.error("❌ Interaction error:", err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => {});
    }
  }
});

client.login(TOKEN);
