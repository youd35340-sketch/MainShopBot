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
      .setDescription("Custom title for the shop embed (default: 🛍️ Shop)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("description")
      .setDescription("Custom description shown at the top of the shop")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const channelId = interaction.options.getString("channelid", true).trim().replace(/[<#>]/g, "");
  const title = interaction.options.getString("title") ?? "🛍️  Welcome to the Shop";
  const description =
    interaction.options.getString("description") ??
    "Browse our products below. Click a category to see what's available and place your order.";

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
      content: "❌ The shop has no products yet. Add some with `/addproduct` first.",
      ephemeral: true,
    });
    return;
  }

  const uniqueCats = categories.length > 0
    ? categories
    : [...new Set(allProducts.map((p) => p.category))].map((name) => ({
        id: name,
        name,
        emoji: "📦",
      }));

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(`${description}\n\u200b`)
    .setTimestamp()
    .setFooter({ text: "Click a category below to start browsing" });

  for (const cat of uniqueCats) {
    const catProducts = allProducts.filter(
      (p) => p.category.toLowerCase() === cat.name.toLowerCase()
    );
    const inStock = catProducts.filter(
      (p) => p.stock === "unlimited" || (typeof p.stock === "number" && p.stock > 0)
    ).length;

    embed.addFields({
      name: `${cat.emoji}  ${cat.name}`,
      value: `\`${catProducts.length}\` product${catProducts.length !== 1 ? "s" : ""} • \`${inStock}\` in stock`,
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
    content: `✅ Shop posted to <#${channelId}>! Anyone in the server can now browse and order.`,
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
