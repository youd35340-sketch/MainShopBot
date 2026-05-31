import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getConfig, setConfig, getProducts } from "../database.js";

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

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const percent = interaction.options.getInteger("percentage", true);

  if (percent === 0) {
    setConfig(guildId, { discountPercent: undefined });

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🏷️ Sale Ended")
      .setDescription("The discount has been removed. All products are back to their regular prices.")
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  setConfig(guildId, { discountPercent: percent });

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
        `All products in the shop now show a **${percent}% discount**.\nRun \`/discount percentage:0\` to end the sale.`,
        "",
        "**Price preview:**",
        ...examples,
      ].join("\n")
    )
    .setFooter({ text: "The sale is live in /shop and /postshop right now." })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
