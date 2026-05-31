import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { getProducts, getConfig, savePostedPanel } from "../database.js";
import { buildShopEmbed } from "../shopSession.js";

const PRODUCTS_PER_PAGE = 8;

export const data = new SlashCommandBuilder()
  .setName("postshop")
  .setDescription("Post the shop panel to a channel — products visible immediately")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName("channelid")
      .setDescription("The channel ID to post the shop in")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guildName = interaction.guild?.name ?? "Shop";
  const channelId = interaction.options
    .getString("channelid", true)
    .trim()
    .replace(/[<#>]/g, "");

  const channel = interaction.guild?.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: `❌ Could not find a text channel with ID \`${channelId}\`. Make sure the ID is correct.`,
      ephemeral: true,
    });
    return;
  }

  const allProducts = getProducts(guildId);
  if (allProducts.length === 0) {
    await interaction.reply({
      content: "❌ No products in the shop yet. Add some with `/addproduct` first.",
      ephemeral: true,
    });
    return;
  }

  const totalPages = Math.max(1, Math.ceil(allProducts.length / PRODUCTS_PER_PAGE));
  const discount = getConfig(guildId).discountPercent;

  const embed = buildShopEmbed(allProducts, 0, totalPages, guildName, "🛍️", discount);

  const buttons: ButtonBuilder[] = [];

  if (totalPages > 1) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`pubshop_nav_${guildId}_1`)
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId(`pubshop_order_${guildId}`)
      .setLabel("🛒 Order")
      .setStyle(ButtonStyle.Success)
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);

  const sent = await (channel as any).send({
    embeds: [embed],
    components: [row],
  });

  savePostedPanel(guildId, { channelId, messageId: sent.id });

  await interaction.reply({
    content: `✅ Shop panel posted to <#${channelId}>! It will update automatically whenever you run \`/discount\`.`,
    ephemeral: true,
  });
}
