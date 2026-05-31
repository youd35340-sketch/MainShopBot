import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { setConfig, getConfig } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("setticket")
  .setDescription("Configure how order tickets are created")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName("categoryid")
      .setDescription("ID of the Discord category where ticket channels will be created")
      .setRequired(true)
  )
  .addRoleOption((o) =>
    o
      .setName("staffrole")
      .setDescription("Role that can see and manage all ticket channels")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("welcome")
      .setDescription("Message sent at the top of every new ticket (supports {user} and {product})")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const categoryId = interaction.options.getString("categoryid", true).trim().replace(/[<#>]/g, "");
  const staffRole = interaction.options.getRole("staffrole", true);
  const welcome =
    interaction.options.getString("welcome") ??
    "Hey {user}! 👋 Thanks for your order.\n\nA staff member will be with you shortly to complete your purchase of **{product}**.\n\nPlease be patient — we'll get back to you as soon as possible!";

  const category = interaction.guild?.channels.cache.get(categoryId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      content: `❌ Could not find a category with ID \`${categoryId}\`.\n\nTo get a category ID: right-click the category name in Discord → **Copy Channel ID** (enable Developer Mode in Settings → Advanced first).`,
      ephemeral: true,
    });
    return;
  }

  setConfig(guildId, {
    ticketCategoryId: categoryId,
    staffRoleId: staffRole.id,
    welcomeMessage: welcome,
  });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🎫 Ticket System Configured")
    .setDescription("Order tickets will now be created automatically when users press **🛒 Order** in the shop.")
    .addFields(
      { name: "📁 Ticket Category", value: `**${category.name}**\n\`${categoryId}\``, inline: true },
      { name: "🛡️ Staff Role", value: `${staffRole}`, inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      {
        name: "💬 Welcome Message",
        value: `\`\`\`${welcome}\`\`\``,
        inline: false,
      },
      {
        name: "ℹ️ Variables",
        value: "`{user}` — mentions the buyer\n`{product}` — shows the product name",
        inline: false,
      }
    )
    .setFooter({ text: "Make sure the bot has Manage Channels permission" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
