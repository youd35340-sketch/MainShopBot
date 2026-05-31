import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getProducts, getCategories } from "../database.js";
import { buildShopEmbed, buildComponents, runShopSession } from "../shopSession.js";

export const data = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("Browse the shop")
  .addStringOption((o) =>
    o.setName("category").setDescription("Filter by category").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guildName = interaction.guild?.name ?? "Shop";
  const categories = getCategories(guildId);
  const allProducts = getProducts(guildId);

  if (allProducts.length === 0) {
    await interaction.reply({
      content: "🛍️ The shop is empty right now. Check back soon!",
      ephemeral: true,
    });
    return;
  }

  const categoryFilter = interaction.options.getString("category");

  let products = categoryFilter
    ? allProducts.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase())
    : allProducts;

  if (products.length === 0) products = allProducts;

  const displayEmoji = categoryFilter
    ? (categories.find((c) => c.name.toLowerCase() === categoryFilter.toLowerCase())?.emoji ?? "🛒")
    : "🛍️";
  const displayName = categoryFilter
    ? (categories.find((c) => c.name.toLowerCase() === categoryFilter.toLowerCase())?.name ?? categoryFilter)
    : guildName;

  const totalPages = Math.max(1, Math.ceil(products.length / 4));
  const pageProds = products.slice(0, 4);

  const reply = await interaction.reply({
    embeds: [buildShopEmbed(products, 0, totalPages, displayName, displayEmoji)],
    components: buildComponents(pageProds, 0, totalPages, null),
    ephemeral: true,
    fetchReply: true,
  });

  await runShopSession(
    guildId,
    products,
    displayName,
    displayEmoji,
    reply,
    async (data) => { await interaction.editReply(data as any); },
    interaction.user.id
  );
}
