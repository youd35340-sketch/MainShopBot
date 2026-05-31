import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("announce")
  .setDescription("Send a styled announcement embed to any channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName("channelid").setDescription("Channel ID to send the announcement to").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("title").setDescription("Title of the announcement").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("message").setDescription("Main message body").setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("type")
      .setDescription("Announcement style (default: info)")
      .setRequired(false)
      .addChoices(
        { name: "📢 Info (blue)", value: "info" },
        { name: "🎉 New Product (purple)", value: "product" },
        { name: "🔥 Sale (orange)", value: "sale" },
        { name: "✅ Restock (green)", value: "restock" },
        { name: "⚠️ Warning (yellow)", value: "warning" },
        { name: "🔴 Urgent (red)", value: "urgent" }
      )
  )
  .addStringOption((o) =>
    o.setName("image").setDescription("Image URL to attach (banner image)").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("footer").setDescription("Footer text").setRequired(false)
  )
  .addRoleOption((o) =>
    o.setName("ping").setDescription("Role to ping with this announcement").setRequired(false)
  );

const TYPE_CONFIG: Record<string, { color: number; emoji: string }> = {
  info:    { color: 0x5865f2, emoji: "📢" },
  product: { color: 0x9b59b6, emoji: "🎉" },
  sale:    { color: 0xe67e22, emoji: "🔥" },
  restock: { color: 0x57f287, emoji: "✅" },
  warning: { color: 0xfee75c, emoji: "⚠️" },
  urgent:  { color: 0xed4245, emoji: "🔴" },
};

export async function execute(interaction: ChatInputCommandInteraction) {
  const channelId = interaction.options
    .getString("channelid", true)
    .trim()
    .replace(/[<#>]/g, "");
  const title   = interaction.options.getString("title", true);
  const message = interaction.options.getString("message", true);
  const type    = interaction.options.getString("type") ?? "info";
  const image   = interaction.options.getString("image");
  const footer  = interaction.options.getString("footer");
  const pingRole = interaction.options.getRole("ping");

  const channel = interaction.guild?.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: `❌ Could not find a text channel with ID \`${channelId}\`.`,
      ephemeral: true,
    });
    return;
  }

  const { color, emoji } = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji}  ${title}`)
    .setDescription(message.replace(/\\n/g, "\n"))
    .setTimestamp();

  if (image) embed.setImage(image);
  if (footer) embed.setFooter({ text: footer });

  const content = pingRole ? `<@&${pingRole.id}>` : undefined;

  await (channel as any).send({ content, embeds: [embed] });

  await interaction.reply({
    content: `✅ Announcement sent to <#${channelId}>!`,
    ephemeral: true,
  });
}
