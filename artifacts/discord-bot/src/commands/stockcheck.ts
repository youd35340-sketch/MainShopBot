import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getProducts, getCategories } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("stockcheck")
  .setDescription("View all products that are low on stock or sold out")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addIntegerOption((o) =>
    o
      .setName("threshold")
      .setDescription("Show products with stock at or below this number (default: 5)")
      .setMinValue(0)
      .setMaxValue(100)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const threshold = interaction.options.getInteger("threshold") ?? 5;
  const allProducts = getProducts(guildId);
  const categories = getCategories(guildId);

  if (allProducts.length === 0) {
    await interaction.reply({
      content: "❌ No products in the shop yet. Use `/addproduct` to get started.",
      ephemeral: true,
    });
    return;
  }

  const soldOut = allProducts.filter(
    (p) => typeof p.stock === "number" && p.stock === 0
  );
  const low = allProducts.filter(
    (p) => typeof p.stock === "number" && p.stock > 0 && p.stock <= threshold
  );
  const unlimited = allProducts.filter((p) => p.stock === "unlimited");
  const healthy = allProducts.filter(
    (p) => typeof p.stock === "number" && p.stock > threshold
  );

  const embed = new EmbedBuilder()
    .setColor(
      soldOut.length > 0 ? 0xed4245 : low.length > 0 ? 0xfee75c : 0x57f287
    )
    .setTitle("📊 Stock Overview")
    .setDescription(
      `Showing products with stock ≤ **${threshold}** as low.\n` +
        `**${soldOut.length}** sold out • **${low.length}** low • **${unlimited.length}** unlimited • **${healthy.length}** healthy\n\u200b`
    )
    .setTimestamp()
    .setFooter({ text: "Use /setstock to update any product's inventory" });

  if (soldOut.length > 0) {
    embed.addFields({
      name: "❌ Sold Out",
      value: soldOut
        .map((p) => {
          const cat = categories.find((c) => c.name.toLowerCase() === p.category.toLowerCase());
          return `${p.emoji} **${p.name}** — ${cat?.emoji ?? "📦"} ${p.category}`;
        })
        .join("\n"),
      inline: false,
    });
  }

  if (low.length > 0) {
    embed.addFields({
      name: `⚠️ Low Stock (≤ ${threshold})`,
      value: low
        .map((p) => {
          const cat = categories.find((c) => c.name.toLowerCase() === p.category.toLowerCase());
          return `${p.emoji} **${p.name}** — \`${p.stock}\` left — ${cat?.emoji ?? "📦"} ${p.category}`;
        })
        .join("\n"),
      inline: false,
    });
  }

  if (soldOut.length === 0 && low.length === 0) {
    embed.addFields({
      name: "✅ All Good!",
      value: `All products are either unlimited or have more than **${threshold}** in stock.`,
      inline: false,
    });
  }

  if (healthy.length > 0 || unlimited.length > 0) {
    embed.addFields({
      name: "✅ In Stock",
      value:
        [
          ...unlimited.map((p) => `${p.emoji} **${p.name}** — ♾️ Unlimited`),
          ...healthy.map((p) => `${p.emoji} **${p.name}** — \`${p.stock}\` in stock`),
        ].join("\n") || "None",
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
