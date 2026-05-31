import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { editProduct } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("editproduct")
  .setDescription("Edit an existing product in the shop")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName("name").setDescription("Exact product name to edit").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("newname").setDescription("New product name").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("price").setDescription("New price").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("description").setDescription("New description").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("emoji").setDescription("New emoji").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("category").setDescription("New category").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("stock").setDescription("New stock (number or 'unlimited')").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString("name", true);

  const updates: Record<string, string | number | "unlimited"> = {};
  const newName = interaction.options.getString("newname");
  const price = interaction.options.getString("price");
  const description = interaction.options.getString("description");
  const emoji = interaction.options.getString("emoji");
  const category = interaction.options.getString("category");
  const stockRaw = interaction.options.getString("stock");

  if (newName) updates.name = newName;
  if (price) updates.price = price;
  if (description) updates.description = description;
  if (emoji) updates.emoji = emoji;
  if (category) updates.category = category;
  if (stockRaw) {
    updates.stock =
      stockRaw.toLowerCase() === "unlimited"
        ? "unlimited"
        : parseInt(stockRaw, 10);
    if (typeof updates.stock === "number" && isNaN(updates.stock as number)) {
      await interaction.reply({
        content: "❌ Stock must be a number or `unlimited`.",
        ephemeral: true,
      });
      return;
    }
  }

  if (Object.keys(updates).length === 0) {
    await interaction.reply({
      content: "❌ Please provide at least one field to update.",
      ephemeral: true,
    });
    return;
  }

  const updated = editProduct(guildId, name, updates as any);

  if (!updated) {
    await interaction.reply({
      content: `❌ No product found with the name **${name}**.`,
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("✏️ Product Updated")
    .addFields(
      { name: "Product", value: `${updated.emoji} **${updated.name}**`, inline: true },
      { name: "Category", value: `\`${updated.category}\``, inline: true },
      { name: "Price", value: `\`${updated.price}\``, inline: true },
      {
        name: "Stock",
        value: updated.stock === "unlimited" ? "♾️ Unlimited" : `\`${updated.stock}\``,
        inline: true,
      },
      { name: "Description", value: updated.description }
    )
    .setFooter({ text: "Changes are live in /shop" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
