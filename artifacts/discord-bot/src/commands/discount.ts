import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { getConfig, setConfig, getProducts, clearDeadPanels } from "../database.js";
import { buildShopEmbed } from "../shopSession.js";

export const data = new SlashCommandBuilder()
  .setName("discount")
  .setDescription("Set or clear a sale discount on all products")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addIntegerOption((o) =>
    o
      .setName("percentage")
      .setDescription("Discount % to apply (1–99). Set to 0 to end the sale.")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(99)
  );

async function updateAllPanels(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  guildName: string,
  discountPercent: number | undefined
) {
  const config = getConfig(guildId);
  const panels = config.postedPanels ?? [];
  if (panels.length === 0) return 0;

  const allProducts = getProducts(guildId);
  const totalPages = Math.max(1, Math.ceil(allProducts.length / 8));

  const deadIds: string[] = [];
  let updated = 0;

  for (const panel of panels) {
    try {
      const channel = await interaction.client.channels.fetch(panel.channelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) {
        deadIds.push(panel.messageId);
        continue;
      }
      const message = await channel.messages.fetch(panel.messageId).catch(() => null);
      if (!message) {
        deadIds.push(panel.messageId);
        continue;
      }

      const newEmbed = buildShopEmbed(allProducts, 0, totalPages, guildName, "🛍️", discountPercent);
      await message.edit({ embeds: [newEmbed], components: message.components as any });
      updated++;
    } catch {
      deadIds.push(panel.messageId);
    }
  }

  clearDeadPanels(guildId, deadIds);
  return updated;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guildName = interaction.guild?.name ?? "Shop";
  const percent = interaction.options.getInteger("percentage", true);

  await interaction.deferReply({ ephemeral: true });

  if (percent === 0) {
    setConfig(guildId, { discountPercent: undefined });
    const updated = await updateAllPanels(interaction, guildId, guildName, undefined);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Sale Ended")
      .setDescription(
        `The discount has been removed. All products are back to their regular prices.${updated > 0 ? `\n\n📋 **${updated} posted panel${updated !== 1 ? "s" : ""} updated automatically.**` : ""}`
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  setConfig(guildId, { discountPercent: percent });
  const updated = await updateAllPanels(interaction, guildId, guildName, percent);

  const products = getProducts(guildId);
  const examples = products.slice(0, 3).map((p) => {
    const original = parseFloat(p.price.replace(/[^0-9.]/g, ""));
    if (isNaN(original)) return `${p.emoji} **${p.name}** — \`${p.price}\``;
    const discounted = (original * (1 - percent / 100)).toFixed(2);
    const symbol = p.price.replace(/[0-9.,]/g, "").trim() || "$";
    return `${p.emoji} **${p.name}** — ~~\`${p.price}\`~~ → \`${symbol}${discounted}\``;
  });

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle(`🔥 ${percent}% Sale Is Now Active!`)
    .setDescription(
      [
        `All products now show a **${percent}% discount**. Run \`/discount percentage:0\` to end the sale.`,
        updated > 0 ? `\n📋 **${updated} posted panel${updated !== 1 ? "s" : ""} updated automatically.**` : "\n📋 No panels to update — use `/postshop` to post a panel that auto-updates.",
        "",
        "**Price preview:**",
        ...examples,
      ].join("\n")
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
