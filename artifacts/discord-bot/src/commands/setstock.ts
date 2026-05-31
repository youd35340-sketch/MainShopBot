import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getProducts, editProduct } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("setstock")
  .setDescription("Set the stock for a product instantly")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName("name").setDescription("Exact product name").setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("amount")
      .setDescription("New stock amount (number or 'unlimited')")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString("name", true);
  const amountRaw = interaction.options.getString("amount", true);

  const stock: number | "unlimited" =
    amountRaw.toLowerCase() === "unlimited"
      ? "unlimited"
      : parseInt(amountRaw, 10);

  if (typeof stock === "number" && isNaN(stock)) {
    await interaction.reply({
      content: "❌ Amount must be a whole number or `unlimited`.",
      ephemeral: true,
    });
    return;
  }

  const products = getProducts(guildId);
  const existing = products.find((p) => p.name.toLowerCase() === name.toLowerCase());

  if (!existing) {
    await interaction.reply({
      content: `❌ No product found with the name **${name}**. Check the spelling and try again.`,
      ephemeral: true,
    });
    return;
  }

  const previousStock = existing.stock;
  const updated = editProduct(guildId, name, { stock });

  if (!updated) {
    await interaction.reply({
      content: "❌ Failed to update stock. Please try again.",
      ephemeral: true,
    });
    return;
  }

  const previousDisplay =
    previousStock === "unlimited" ? "♾️ Unlimited" : `\`${previousStock}\``;
  const newDisplay =
    updated.stock === "unlimited" ? "♾️ Unlimited" : `\`${updated.stock}\``;

  const isRestock =
    typeof previousStock === "number" &&
    typeof updated.stock === "number" &&
    updated.stock > previousStock;
  const isSoldOut = updated.stock === 0;

  const color = isSoldOut ? 0xed4245 : isRestock ? 0x57f287 : 0xfee75c;
  const icon = isSoldOut ? "❌" : isRestock ? "📦" : "✏️";

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${icon} Stock Updated`)
    .addFields(
      { name: "Product", value: `${updated.emoji} **${updated.name}**`, inline: true },
      { name: "Category", value: `\`${updated.category}\``, inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "Previous Stock", value: previousDisplay, inline: true },
      { name: "New Stock", value: newDisplay, inline: true }
    )
    .setFooter({ text: "Stock changes are live in /shop immediately" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
