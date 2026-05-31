import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  ButtonInteraction,
  StringSelectMenuInteraction,
  MessageFlags,
  InteractionResponse,
  Message,
} from "discord.js";
import { getProducts, getCategories, getConfig, Product } from "./database.js";

const PRODUCTS_PER_PAGE = 4;

export function buildShopEmbed(
  products: Product[],
  page: number,
  totalPages: number,
  categoryName: string,
  categoryEmoji: string
): EmbedBuilder {
  const start = page * PRODUCTS_PER_PAGE;
  const pageProducts = products.slice(start, start + PRODUCTS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${categoryEmoji} ${categoryName} — Shop`)
    .setDescription(
      `> Browse our **${categoryName}** products below.\n> Select an item and press **🛒 Order** to purchase.\n\u200b`
    )
    .setFooter({
      text: `Page ${page + 1} of ${totalPages} • ${products.length} product${products.length !== 1 ? "s" : ""}`,
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

export function buildSelectRow(
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
          .setDescription(
            `${p.price} — ${p.stock === "unlimited" ? "Unlimited stock" : `${p.stock} in stock`}`
          )
          .setEmoji(p.emoji.trim())
      )
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildNavButtons(
  page: number,
  totalPages: number,
  selectedProductId: string | null
): ActionRowBuilder<ButtonBuilder>[] {
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

  const orderRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_order_${selectedProductId ?? "none"}`)
      .setLabel("🛒 Order Selected Item")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!selectedProductId)
  );

  return [navRow, orderRow];
}

export function buildComponents(
  pageProducts: Product[],
  page: number,
  totalPages: number,
  selectedProductId: string | null
) {
  const components: any[] = [];
  if (pageProducts.length > 0) components.push(buildSelectRow(pageProducts, page));
  components.push(...buildNavButtons(page, totalPages, selectedProductId));
  return components;
}

export async function runShopSession(
  guildId: string,
  guildName: string,
  categoryName: string,
  reply: Message | InteractionResponse,
  updateFn: (data: { embeds: EmbedBuilder[]; components: any[] }) => Promise<void>,
  replyEphemeralFn: (data: { embeds?: EmbedBuilder[]; content?: string; ephemeral: true }) => Promise<void>,
  userId: string,
  isPublic: boolean
) {
  const categories = getCategories(guildId);
  const allProducts = getProducts(guildId);

  const catInfo = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  const categoryEmoji = catInfo?.emoji ?? "🛒";
  const resolvedName = catInfo?.name ?? categoryName;

  const filteredProducts = allProducts.filter(
    (p) => p.category.toLowerCase() === categoryName.toLowerCase()
  );

  let page = 0;
  let selectedProductId: string | null = null;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const getPageProducts = (p: number) =>
    filteredProducts.slice(p * PRODUCTS_PER_PAGE, (p + 1) * PRODUCTS_PER_PAGE);

  const collector = reply.createMessageComponentCollector({ time: 5 * 60 * 1000 });

  collector.on("collect", async (i: ButtonInteraction | StringSelectMenuInteraction) => {
    if (!isPublic && i.user.id !== userId) {
      await i.reply({
        content: "❌ This shop session belongs to someone else. Use `/shop` to open your own.",
        ephemeral: true,
      });
      return;
    }

    if (isPublic && i.user.id !== userId) {
      await i.reply({
        content: "❌ This shop session was opened by someone else. Click a category button to start your own session.",
        ephemeral: true,
      });
      return;
    }

    if (i.componentType === ComponentType.StringSelect) {
      selectedProductId = i.values[0];
      const pageProds = getPageProducts(page);
      await i.update({
        embeds: [buildShopEmbed(filteredProducts, page, totalPages, resolvedName, categoryEmoji)],
        components: buildComponents(pageProds, page, totalPages, selectedProductId),
      });
      return;
    }

    if (i.componentType === ComponentType.Button) {
      const id = i.customId;

      if (id.startsWith("shop_prev_")) {
        page = Math.max(0, page - 1);
        selectedProductId = null;
        const pageProds = getPageProducts(page);
        await i.update({
          embeds: [buildShopEmbed(filteredProducts, page, totalPages, resolvedName, categoryEmoji)],
          components: buildComponents(pageProds, page, totalPages, selectedProductId),
        });
        return;
      }

      if (id.startsWith("shop_next_")) {
        page = Math.min(totalPages - 1, page + 1);
        selectedProductId = null;
        const pageProds = getPageProducts(page);
        await i.update({
          embeds: [buildShopEmbed(filteredProducts, page, totalPages, resolvedName, categoryEmoji)],
          components: buildComponents(pageProds, page, totalPages, selectedProductId),
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
            content: "❌ No ticket channel configured. Ask an admin to run `/setticket`.",
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
          .setFooter({ text: "Use TicketTool to open a purchase ticket for this customer" })
          .setTimestamp();

        await (ticketChannel as any).send({
          content: `${i.user} — ${config.ticketMessage ?? "Order Request"}: **${product.name}**`,
          embeds: [ticketEmbed],
        });

        const confirmEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅ Order Submitted!")
          .setDescription(
            `Your order for **${product.emoji} ${product.name}** has been submitted!\n\nA staff member will open a ticket with you shortly.`
          )
          .addFields(
            { name: "Product", value: `${product.emoji} **${product.name}**`, inline: true },
            { name: "Price", value: `\`${product.price}\``, inline: true }
          )
          .setFooter({ text: "Please be patient while staff processes your order." })
          .setTimestamp();

        await i.reply({ embeds: [confirmEmbed], ephemeral: true });
        return;
      }
    }
  });

  collector.on("end", async () => {
    try {
      const pageProds = getPageProducts(page);
      const disabled = buildComponents(pageProds, page, totalPages, null).map((row: any) => {
        row.components.forEach((c: any) => c.setDisabled(true));
        return row;
      });
      await updateFn({
        embeds: [buildShopEmbed(filteredProducts, page, totalPages, resolvedName, categoryEmoji)],
        components: disabled,
      });
    } catch {}
  });
}
