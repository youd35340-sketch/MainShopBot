import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getProducts, getCategories } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("listproducts")
  .setDescription("List all products in the shop (admin view)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName("category").setDescription("Filter by category").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const categoryFilter = interaction.options.getString("category");
  const allProducts = getProducts(guildId);
  const categories = getCategories(guildId);

  const products = categoryFilter
    ? allProducts.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase())
    : allProducts;

  if (products.length === 0) {
    await interaction.reply({
      content: categoryFilter
        ? `❌ No products found in category **${categoryFilter}**.`
        : "❌ No products in the shop yet. Use `/addproduct` to add some!",
      ephemeral: true,
    });
    return;
  }

  const grouped: Record<string, typeof products> = {};
  for (const p of products) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📋 Product List — Admin View")
    .setDescription(
      `**${products.length}** product${products.length !== 1 ? "s" : ""} across **${Object.keys(grouped).length}** categor${Object.keys(grouped).length !== 1 ? "ies" : "y"}\n\u200b`
    )
    .setTimestamp();

  for (const [cat, prods] of Object.entries(grouped)) {
    const catInfo = categories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
    const catEmoji = catInfo?.emoji ?? "📦";
    const lines = prods.map((p) => {
      const stock =
        p.stock === "unlimited" ? "♾️" : p.stock <= 0 ? "❌ OOS" : `${p.stock}x`;
      return `${p.emoji} **${p.name}** — \`${p.price}\` — ${stock}`;
    });
    embed.addFields({
      name: `${catEmoji} ${cat}`,
      value: lines.join("\n"),
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
