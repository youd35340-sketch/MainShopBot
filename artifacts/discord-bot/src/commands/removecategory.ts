import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { removeCategory } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("removecategory")
  .setDescription("Remove a product category")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName("name").setDescription("Category name to remove").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString("name", true);

  const removed = removeCategory(guildId, name);

  if (!removed) {
    await interaction.reply({
      content: `❌ No category found with the name **${name}**.`,
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🗑️ Category Removed")
    .setDescription(
      `**${name}** has been removed. Products in this category still exist but will no longer appear under a named category.`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
