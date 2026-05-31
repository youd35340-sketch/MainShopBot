import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { addCategory, getCategories } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("addcategory")
  .setDescription("Add a product category to the shop")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName("name").setDescription("Category name (e.g. Games, Accounts)").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("emoji").setDescription("Emoji for this category").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString("name", true);
  const emoji = interaction.options.getString("emoji") ?? "📦";

  const existing = getCategories(guildId).find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    await interaction.reply({
      content: `❌ A category named **${name}** already exists.`,
      ephemeral: true,
    });
    return;
  }

  const category = addCategory(guildId, { name, emoji });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("✅ Category Added")
    .setDescription(`${category.emoji} **${category.name}** is now available as a product category.`)
    .setFooter({ text: "Use /addproduct to add products to this category" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
