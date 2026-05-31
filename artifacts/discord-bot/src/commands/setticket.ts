import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { setConfig } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("setticket")
  .setDescription("Configure the TicketTool channel for order requests")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((o) =>
    o
      .setName("channel")
      .setDescription("The channel where TicketTool will create tickets")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("message")
      .setDescription("Custom message prefix when creating a ticket (default: 'Order Request')")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel("channel", true);
  const message = interaction.options.getString("message") ?? "Order Request";

  setConfig(guildId, { ticketChannelId: channel.id, ticketMessage: message });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎫 Ticket Channel Configured")
    .addFields(
      { name: "Channel", value: `<#${channel.id}>`, inline: true },
      { name: "Ticket Message", value: `\`${message}\``, inline: true }
    )
    .setDescription(
      "When users press **Order** in the shop, a ticket request will be sent to this channel for TicketTool to process."
    )
    .setFooter({ text: "Make sure TicketTool is configured in this channel" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
