import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { removeProduct } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("removeproduct")
  .setDescription("Remove a product from the shop")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName("name").setDescription("Exact product name to remove").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString("name", true);

  const removed = removeProduct(guildId, name);

  if (!removed) {
    await interaction.reply({
      content: `❌ No product found with the name **${name}**. Check spelling and try again.`,
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🗑️ Product Removed")
    .setDescription(`**${name}** has been removed from the shop.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
