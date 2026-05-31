import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getProducts, getCategories } from "../database.js";
import {
  buildShopEmbed,
  buildComponents,
  runShopSession,
} from "../shopSession.js";

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

  let selectedCategory = interaction.options.getString("category");

  if (!selectedCategory && categories.length > 0) {
    selectedCategory = categories[0].name;
  } else if (!selectedCategory) {
    selectedCategory = [...new Set(allProducts.map((p) => p.category))][0] ?? "General";
  }

  const catInfo = categories.find(
    (c) => c.name.toLowerCase() === selectedCategory!.toLowerCase()
  );
  const categoryEmoji = catInfo?.emoji ?? "🛒";
  const categoryName = catInfo?.name ?? selectedCategory!;

  let filteredProducts = allProducts.filter(
    (p) => p.category.toLowerCase() === selectedCategory!.toLowerCase()
  );

  if (filteredProducts.length === 0) {
    filteredProducts = allProducts;
    selectedCategory = [...new Set(allProducts.map((p) => p.category))][0];
  }

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / 4));
  const pageProds = filteredProducts.slice(0, 4);

  const reply = await interaction.reply({
    embeds: [buildShopEmbed(filteredProducts, 0, totalPages, categoryName, categoryEmoji)],
    components: buildComponents(pageProds, 0, totalPages, null),
    fetchReply: true,
  });

  await runShopSession(
    guildId,
    guildName,
    selectedCategory!,
    reply,
    async (data) => {
      await interaction.editReply(data as any);
    },
    async (data) => {
      await interaction.followUp({ ...data } as any);
    },
    interaction.user.id,
    false
  );
}
