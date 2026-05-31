import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  ButtonInteraction,
  MessageFlags,
} from "discord.js";
import { getProducts, getCategories, getConfig, Product } from "../database.js";

const PRODUCTS_PER_PAGE = 4;

function buildShopEmbed(
  products: Product[],
  page: number,
  totalPages: number,
  categoryName: string,
  categoryEmoji: string,
  guildName: string
): EmbedBuilder {
  const start = page * PRODUCTS_PER_PAGE;
  const pageProducts = products.slice(start, start + PRODUCTS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${categoryEmoji} ${categoryName} — Shop`)
    .setDescription(
      `> Browse our selection of **${categoryName}** products below.\n> Press **🛒 Order** on any item to open a purchase ticket.\n\u200b`
    )
    .setFooter({
      text: `Page ${page + 1} of ${totalPages} • ${products.length} product${products.length !== 1 ? "s" : ""} in this category`,
    })
    .setTimestamp();

  if (pageProducts.length === 0) {
    embed.addFields({ name: "No products yet", value: "Check back soon!" });
    return embed;
  }

  for (const product of pageProducts) {
    const stockDisplay =
      product.stock === "unlimited"
        ? "♾️ In Stock"
        : product.stock <= 0
        ? "❌ Out of Stock"
        : product.stock <= 5
        ? `⚠️ Only ${product.stock} left`
        : `✅ ${product.stock} in stock`;

    embed.addFields({
      name: `${product.emoji}  ${product.name}`,
      value: `${product.description}\n\n💰 **Price:** \`${product.price}\`   ${stockDisplay}\n\u200b`,
      inline: false,
    });
  }

  return embed;
}

function buildButtons(
  page: number,
  totalPages: number,
  pageProducts: Product[],
  selectedProductId: string | null
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_prev_${page}`)
      .setLabel("◀ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`shop_page_indicator`)
      .setLabel(`Page ${page + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`shop_next_${page}`)
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
  rows.push(navRow);

  const orderRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_order_${selectedProductId ?? "none"}`)
      .setLabel("🛒 Order Selected Item")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!selectedProductId)
  );
  rows.push(orderRow);

  return rows;
}

function buildProductSelectRow(
  pageProducts: Product[],
  page: number
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`shop_select_${page}`)
    .setPlaceholder("Select a product to order…")
    .addOptions(
      pageProducts.map((p) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(p.name)
          .setValue(p.id)
          .setDescription(`${p.price} — ${p.stock === "unlimited" ? "Unlimited stock" : `${p.stock} in stock`}`)
          .setEmoji(p.emoji.trim())
      )
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

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
    const allCats = [...new Set(allProducts.map((p) => p.category))];
    selectedCategory = allCats[0] ?? "General";
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

  let page = 0;
  let selectedProductId: string | null = null;
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  const getPageProducts = (p: number) =>
    filteredProducts.slice(p * PRODUCTS_PER_PAGE, (p + 1) * PRODUCTS_PER_PAGE);

  const buildComponents = (currentPage: number, selId: string | null) => {
    const pageProds = getPageProducts(currentPage);
    const components: any[] = [];
    if (pageProds.length > 0) components.push(buildProductSelectRow(pageProds, currentPage));
    components.push(...buildButtons(currentPage, totalPages, pageProds, selId));
    return components;
  };

  const reply = await interaction.reply({
    embeds: [buildShopEmbed(filteredProducts, page, totalPages, categoryName, categoryEmoji, guildName)],
    components: buildComponents(page, selectedProductId),
    fetchReply: true,
  });

  const collector = reply.createMessageComponentCollector({
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: "❌ This shop session belongs to someone else. Use `/shop` to open your own.", ephemeral: true });
      return;
    }

    if (i.componentType === ComponentType.StringSelect) {
      selectedProductId = i.values[0];
      await i.update({
        embeds: [buildShopEmbed(filteredProducts, page, totalPages, categoryName, categoryEmoji, guildName)],
        components: buildComponents(page, selectedProductId),
      });
      return;
    }

    if (i.componentType === ComponentType.Button) {
      const id = i.customId;

      if (id.startsWith("shop_prev_")) {
        page = Math.max(0, page - 1);
        selectedProductId = null;
        await i.update({
          embeds: [buildShopEmbed(filteredProducts, page, totalPages, categoryName, categoryEmoji, guildName)],
          components: buildComponents(page, selectedProductId),
        });
        return;
      }

      if (id.startsWith("shop_next_")) {
        page = Math.min(totalPages - 1, page + 1);
        selectedProductId = null;
        await i.update({
          embeds: [buildShopEmbed(filteredProducts, page, totalPages, categoryName, categoryEmoji, guildName)],
          components: buildComponents(page, selectedProductId),
        });
        return;
      }

      if (id.startsWith("shop_order_")) {
        const productId = id.replace("shop_order_", "");
        const product = filteredProducts.find((p) => p.id === productId);
        if (!product) {
          await i.reply({ content: "❌ Product not found.", ephemeral: true });
          return;
        }

        const config = getConfig(guildId);

        if (!config.ticketChannelId) {
          await i.reply({
            content:
              "❌ No ticket channel has been configured yet. Ask a server admin to run `/setticket`.",
            ephemeral: true,
          });
          return;
        }

        const ticketChannel = i.guild?.channels.cache.get(config.ticketChannelId);
        if (!ticketChannel || !ticketChannel.isTextBased()) {
          await i.reply({
            content: "❌ The configured ticket channel is invalid. Ask an admin to re-run `/setticket`.",
            ephemeral: true,
          });
          return;
        }

        const ticketEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🎫 New Order Request")
          .setDescription(
            `**${i.user}** wants to purchase an item from the shop.\n\nPlease open a ticket to process this order.`
          )
          .addFields(
            { name: "Product", value: `${product.emoji} **${product.name}**`, inline: true },
            { name: "Category", value: `\`${product.category}\``, inline: true },
            { name: "Price", value: `\`${product.price}\``, inline: true },
            {
              name: "Stock",
              value:
                product.stock === "unlimited"
                  ? "♾️ Unlimited"
                  : `\`${product.stock}\` remaining`,
              inline: true,
            },
            { name: "Customer", value: `${i.user} (\`${i.user.tag}\`)`, inline: true }
          )
          .setFooter({ text: "React or use TicketTool to open a purchase ticket" })
          .setTimestamp();

        const ticketBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Open Ticket via TicketTool")
            .setStyle(ButtonStyle.Link)
            .setURL(`https://tickettool.xyz`)
            .setEmoji("🎫")
        );

        await (ticketChannel as any).send({
          content: `${i.user} — ${config.ticketMessage ?? "Order Request"}: **${product.name}**`,
          embeds: [ticketEmbed],
          components: [ticketBtn],
        });

        const confirmEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅ Order Submitted!")
          .setDescription(
            `Your order for **${product.emoji} ${product.name}** has been submitted!\n\nA staff member will open a ticket with you shortly to complete your purchase.`
          )
          .addFields(
            { name: "Product", value: `${product.emoji} **${product.name}**`, inline: true },
            { name: "Price", value: `\`${product.price}\``, inline: true }
          )
          .setFooter({ text: "Please be patient while our team processes your order." })
          .setTimestamp();

        await i.reply({ embeds: [confirmEmbed], ephemeral: true });
        return;
      }
    }
  });

  collector.on("end", async () => {
    try {
      const disabledComponents = buildComponents(page, null).map((row: any) => {
        const r = row as ActionRowBuilder<ButtonBuilder>;
        r.components.forEach((c: any) => c.setDisabled(true));
        return r;
      });
      await interaction.editReply({ components: disabledComponents });
    } catch {
    }
  });
}
