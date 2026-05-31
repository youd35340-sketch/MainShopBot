import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { getCategories, getProducts } from "../database.js";
import { buildShopEmbed } from "../shopSession.js";

const PRODUCTS_PER_PAGE = 4;

export const data = new SlashCommandBuilder()
  .setName("postshop")
  .setDescription("Post the shop directly to a channel so everyone can see and use it")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName("channelid")
      .setDescription("The channel ID to post the shop in")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("title")
      .setDescription("Custom shop title (default: your server name)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("description")
      .setDescription("Description shown under the title")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("color")
      .setDescription("Embed border color as a hex code (e.g. #5865F2)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("thumbnail")
      .setDescription("Image URL for the top-right corner (e.g. your logo)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("banner")
      .setDescription("Image URL shown as a large banner at the bottom")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guildName = interaction.guild?.name ?? "Shop";
  const channelId = interaction.options
    .getString("channelid", true)
    .trim()
    .replace(/[<#>]/g, "");

  const title = interaction.options.getString("title") ?? `🛍️  ${guildName}`;
  const description =
    interaction.options.getString("description") ??
    "Browse our products below. When you're ready to buy, press **🛍️ Browse & Order** to open your own interactive shop session.";
  const colorRaw = interaction.options.getString("color");
  const thumbnail = interaction.options.getString("thumbnail");
  const banner = interaction.options.getString("banner");

  let color: number = 0x5865f2;
  if (colorRaw) {
    const parsed = parseInt(colorRaw.replace(/^#/, ""), 16);
    if (!isNaN(parsed)) color = parsed;
  }

  const channel = interaction.guild?.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: `❌ Could not find a text channel with ID \`${channelId}\`. Make sure the ID is correct and the bot has access to it.`,
      ephemeral: true,
    });
    return;
  }

  const allProducts = getProducts(guildId);
  if (allProducts.length === 0) {
    await interaction.reply({
      content: "❌ No products in the shop yet. Add some with `/addproduct` first.",
      ephemeral: true,
    });
    return;
  }

  const categories = getCategories(guildId);
  const totalPages = Math.max(1, Math.ceil(allProducts.length / PRODUCTS_PER_PAGE));

  const totalInStock = allProducts.filter(
    (p) => p.stock === "unlimited" || (typeof p.stock === "number" && p.stock > 0)
  ).length;

  const uniqueCats = categories.length > 0
    ? categories
    : [...new Set(allProducts.map((p) => p.category))].map((name) => ({ id: name, name, emoji: "📦" }));

  const headerEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      [
        description,
        "",
        `> 📦 **${allProducts.length}** products  •  ✅ **${totalInStock}** in stock  •  🗂️ **${uniqueCats.length}** categor${uniqueCats.length !== 1 ? "ies" : "y"}`,
        "",
        "─────────────────────────────",
        `**Categories:** ${uniqueCats.map((c) => `${c.emoji} ${c.name}`).join("  ·  ")}`,
      ].join("\n")
    )
    .setFooter({ text: `Showing all ${allProducts.length} products • Page 1 of ${totalPages}` })
    .setTimestamp();

  if (thumbnail) headerEmbed.setThumbnail(thumbnail);
  if (banner) headerEmbed.setImage(banner);

  const productEmbed = buildShopEmbed(allProducts, 0, totalPages, title.replace(/^[\p{Emoji}\s]+/u, "").trim() || guildName, "🛍️");

  const openRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pubshop_open_${guildId}`)
      .setLabel("🛍️  Browse & Order")
      .setStyle(ButtonStyle.Primary)
  );

  await (channel as any).send({
    embeds: [headerEmbed, productEmbed],
    components: [openRow],
  });

  await interaction.reply({
    content: `✅ Shop posted to <#${channelId}>! Products are visible immediately — users click **🛍️ Browse & Order** to get their own private session to navigate and order.`,
    ephemeral: true,
  });
}
