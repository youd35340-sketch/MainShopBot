import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { addProduct, getCategories, addCategory } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("addproduct")
  .setDescription("Add a product to the shop")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName("name").setDescription("Product name").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("category").setDescription("Product category").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("price").setDescription("Product price (e.g. $5.00)").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("description").setDescription("Product description").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("emoji").setDescription("Emoji for this product").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("stock")
      .setDescription("Stock amount (number or 'unlimited')")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString("name", true);
  const category = interaction.options.getString("category", true);
  const price = interaction.options.getString("price", true);
  const description = interaction.options.getString("description", true);
  const emoji = interaction.options.getString("emoji") ?? "🛒";
  const stockRaw = interaction.options.getString("stock") ?? "unlimited";
  const stock: number | "unlimited" =
    stockRaw.toLowerCase() === "unlimited" ? "unlimited" : parseInt(stockRaw, 10);

  if (typeof stock === "number" && isNaN(stock)) {
    await interaction.reply({
      content: "❌ Stock must be a number or `unlimited`.",
      ephemeral: true,
    });
    return;
  }

  const categories = getCategories(guildId);
  const exists = categories.find((c) => c.name.toLowerCase() === category.toLowerCase());
  if (!exists) {
    addCategory(guildId, { name: category, emoji: "📦" });
  }

  const product = addProduct(guildId, { name, emoji, category, price, description, stock });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Product Added")
    .addFields(
      { name: "Product", value: `${product.emoji} **${product.name}**`, inline: true },
      { name: "Category", value: `\`${product.category}\``, inline: true },
      { name: "Price", value: `\`${product.price}\``, inline: true },
      {
        name: "Stock",
        value: product.stock === "unlimited" ? "♾️ Unlimited" : `\`${product.stock}\``,
        inline: true,
      },
      { name: "Description", value: product.description, inline: false }
    )
    .setFooter({ text: "Use /shop to view your product listing" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
