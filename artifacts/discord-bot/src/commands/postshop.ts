import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import { getCategories, getProducts } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("postshop")
  .setDescription("Post the interactive shop to a channel for everyone to use")
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
      .setDescription("Shop title shown at the top (default: 🛍️ Welcome to the Shop)")
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
      .setDescription("Embed border color as a hex code (e.g. #5865F2 or FF0000)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("thumbnail")
      .setDescription("Image URL shown in the top-right corner of the embed (e.g. your logo)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("banner")
      .setDescription("Image URL shown as a large banner at the bottom of the embed")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("footer")
      .setDescription("Custom footer text (default: 'Click a category below to start browsing')")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guildName = interaction.guild?.name ?? "Shop";
  const channelId = interaction.options
    .getString("channelid", true)
    .trim()
    .replace(/[<#>]/g, "");

  const title =
    interaction.options.getString("title") ?? `🛍️  Welcome to ${guildName}`;
  const description =
    interaction.options.getString("description") ??
    "We offer a variety of products and services at the best prices.\nBrowse our categories below and click **Order** to make a purchase!";
  const colorRaw = interaction.options.getString("color");
  const thumbnail = interaction.options.getString("thumbnail");
  const banner = interaction.options.getString("banner");
  const footerText =
    interaction.options.getString("footer") ??
    "⬇️  Select a category to browse products and place your order";

  let color: number = 0x5865f2;
  if (colorRaw) {
    const hex = colorRaw.replace(/^#/, "");
    const parsed = parseInt(hex, 16);
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

  const categories = getCategories(guildId);
  const allProducts = getProducts(guildId);

  if (allProducts.length === 0) {
    await interaction.reply({
      content:
        "❌ The shop has no products yet. Add some with `/addproduct` first.",
      ephemeral: true,
    });
    return;
  }

  const uniqueCats =
    categories.length > 0
      ? categories
      : [...new Set(allProducts.map((p) => p.category))].map((name) => ({
          id: name,
          name,
          emoji: "📦",
        }));

  const totalInStock = allProducts.filter(
    (p) =>
      p.stock === "unlimited" ||
      (typeof p.stock === "number" && p.stock > 0)
  ).length;
  const totalProducts = allProducts.length;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      [
        description,
        "",
        `> 📦 **${totalProducts}** product${totalProducts !== 1 ? "s" : ""} available  •  ✅ **${totalInStock}** in stock  •  🗂️ **${uniqueCats.length}** categor${uniqueCats.length !== 1 ? "ies" : "y"}`,
        "",
        "─────────────────────────────",
      ].join("\n")
    )
    .setFooter({ text: footerText })
    .setTimestamp();

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (banner) embed.setImage(banner);

  for (const cat of uniqueCats) {
    const catProducts = allProducts.filter(
      (p) => p.category.toLowerCase() === cat.name.toLowerCase()
    );
    const inStock = catProducts.filter(
      (p) =>
        p.stock === "unlimited" ||
        (typeof p.stock === "number" && p.stock > 0)
    ).length;
    const outOfStock = catProducts.length - inStock;

    const stockLine =
      outOfStock === 0
        ? `✅ All ${catProducts.length} in stock`
        : `✅ ${inStock} in stock  •  ❌ ${outOfStock} sold out`;

    embed.addFields({
      name: `${cat.emoji}  ${cat.name}`,
      value: stockLine,
      inline: true,
    });
  }

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const chunks = chunkArray(uniqueCats, 5);

  for (const chunk of chunks) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      chunk.map((cat) =>
        new ButtonBuilder()
          .setCustomId(`postshop_cat_${guildId}_${cat.name}`)
          .setLabel(cat.name)
          .setEmoji(cat.emoji)
          .setStyle(ButtonStyle.Primary)
      )
    );
    rows.push(row);
  }

  await (channel as any).send({ embeds: [embed], components: rows });

  await interaction.reply({
    content: `✅ Shop posted to <#${channelId}>!`,
    ephemeral: true,
  });
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
