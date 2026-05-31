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
  InteractionResponse,
  Message,
  ChannelType,
  PermissionFlagsBits,
  OverwriteType,
} from "discord.js";
import { getConfig, Product } from "./database.js";

const PRODUCTS_PER_PAGE = 4;

export function buildShopEmbed(
  products: Product[],
  page: number,
  totalPages: number,
  displayName: string,
  displayEmoji: string
): EmbedBuilder {
  const start = page * PRODUCTS_PER_PAGE;
  const pageProducts = products.slice(start, start + PRODUCTS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${displayEmoji}  ${displayName}`)
    .setDescription(`Select an item then press **🛒 Order** to purchase.`)
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
      name: `${product.emoji} ${product.name}`,
      value: `${product.description}\n💰 \`${product.price}\` · ${stockDisplay}`,
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

/**
 * Run a full interactive shop session for a single user.
 * Products are passed in directly — filter/sort before calling.
 */
export async function runShopSession(
  guildId: string,
  products: Product[],
  displayName: string,
  displayEmoji: string,
  reply: Message | InteractionResponse,
  updateFn: (data: { embeds: EmbedBuilder[]; components: any[] }) => Promise<void>,
  userId: string
) {
  let page = 0;
  let selectedProductId: string | null = null;
  const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
  const getPageProducts = (p: number) =>
    products.slice(p * PRODUCTS_PER_PAGE, (p + 1) * PRODUCTS_PER_PAGE);

  const collector = reply.createMessageComponentCollector({ time: 5 * 60 * 1000 });

  collector.on("collect", async (i: ButtonInteraction | StringSelectMenuInteraction) => {
    if (i.user.id !== userId) {
      await i.reply({
        content: "❌ This session belongs to someone else. Use `/shop` to open your own.",
        ephemeral: true,
      });
      return;
    }

    if (i.componentType === ComponentType.StringSelect) {
      selectedProductId = i.values[0];
      const pageProds = getPageProducts(page);
      await i.update({
        embeds: [buildShopEmbed(products, page, totalPages, displayName, displayEmoji)],
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
          embeds: [buildShopEmbed(products, page, totalPages, displayName, displayEmoji)],
          components: buildComponents(pageProds, page, totalPages, selectedProductId),
        });
        return;
      }

      if (id.startsWith("shop_next_")) {
        page = Math.min(totalPages - 1, page + 1);
        selectedProductId = null;
        const pageProds = getPageProducts(page);
        await i.update({
          embeds: [buildShopEmbed(products, page, totalPages, displayName, displayEmoji)],
          components: buildComponents(pageProds, page, totalPages, selectedProductId),
        });
        return;
      }

      if (id.startsWith("shop_order_")) {
        const productId = id.replace("shop_order_", "");
        const product = products.find((p) => p.id === productId);
        if (!product) {
          await i.reply({ content: "❌ Product not found.", ephemeral: true });
          return;
        }

        const config = getConfig(guildId);
        if (!config.ticketCategoryId || !config.staffRoleId) {
          await i.reply({
            content: "❌ The ticket system isn't set up yet. Ask an admin to run `/setticket`.",
            ephemeral: true,
          });
          return;
        }

        const guild = i.guild!;
        const category = guild.channels.cache.get(config.ticketCategoryId);
        if (!category || category.type !== ChannelType.GuildCategory) {
          await i.reply({
            content: "❌ The configured ticket category is invalid. Ask an admin to re-run `/setticket`.",
            ephemeral: true,
          });
          return;
        }

        await i.deferReply({ ephemeral: true });

        const safeName = i.user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 16) || "user";

        const ticketChannel = await guild.channels.create({
          name: `order-${safeName}`,
          type: ChannelType.GuildText,
          parent: config.ticketCategoryId,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
              type: OverwriteType.Role,
            },
            {
              id: i.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
              ],
              type: OverwriteType.Member,
            },
            {
              id: config.staffRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AttachFiles,
              ],
              type: OverwriteType.Role,
            },
          ],
        });

        const welcomeText = (
          config.welcomeMessage ??
          "Hey {user}! 👋 A staff member will be with you shortly for **{product}**."
        )
          .replace("{user}", `<@${i.user.id}>`)
          .replace("{product}", product.name);

        const orderEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🎫 New Order Ticket")
          .setDescription(welcomeText)
          .addFields(
            { name: "🛒 Product", value: `${product.emoji} **${product.name}**`, inline: true },
            { name: "🏷️ Category", value: `\`${product.category}\``, inline: true },
            { name: "💰 Price", value: `\`${product.price}\``, inline: true },
            {
              name: "📦 Stock",
              value:
                product.stock === "unlimited"
                  ? "♾️ Unlimited"
                  : `\`${product.stock}\` remaining`,
              inline: true,
            },
            { name: "👤 Customer", value: `<@${i.user.id}> (\`${i.user.tag}\`)`, inline: true }
          )
          .setFooter({ text: "Staff — use the button below to close this ticket when done" })
          .setTimestamp();

        const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_close_${ticketChannel.id}_${i.user.id}`)
            .setLabel("🔒 Close Ticket")
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
          content: `<@${i.user.id}> <@&${config.staffRoleId}>`,
          embeds: [orderEmbed],
          components: [closeRow],
        });

        const confirmEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅ Ticket Created!")
          .setDescription(
            `Your order ticket has been opened! Head over to ${ticketChannel} to continue.\n\nA staff member will be with you shortly.`
          )
          .addFields(
            { name: "Product", value: `${product.emoji} **${product.name}**`, inline: true },
            { name: "Price", value: `\`${product.price}\``, inline: true }
          )
          .setFooter({ text: "Please be patient while staff processes your order." })
          .setTimestamp();

        await i.editReply({ embeds: [confirmEmbed] });
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
        embeds: [buildShopEmbed(products, page, totalPages, displayName, displayEmoji)],
        components: disabled,
      });
    } catch {}
  });
}
