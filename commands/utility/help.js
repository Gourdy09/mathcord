const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Displays information about the bot's commands"),

  async execute(interaction) {
    // Get all commands from the client
    const commands = interaction.client.commands;

    // Create the profile picture attachment
    const pfp = new AttachmentBuilder("./images/pfp.png", {
      name: "pfp.png",
    });

    // Create the main help embed
    const helpEmbed = new EmbedBuilder()
      .setColor("#DC143C")
      .setTitle("Mathcord Help")
      .setDescription(
        "Select a command from the dropdown menu below to see detailed information."
      )
      .setThumbnail("attachment://pfp.png")
      .addFields(
        {
          name: "Available Commands",
          value: commands
            .map((cmd) => `\`${cmd.data.name}\`: ${cmd.data.description}`)
            .join("\n"),
        },
        {
          name: "Support Mathcord",
          value: "https://github.com/Gourdy09/mathcord",
        }
      )
      .setTimestamp()
      .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

    // Create select menu for commands
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help-menu")
      .setPlaceholder("Select a command to view details")
      .addOptions(
        commands.map((cmd) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cmd.data.name)
            .setDescription(cmd.data.description.substring(0, 100))
            .setValue(cmd.data.name)
        )
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Send the initial help message
    const response = await interaction.reply({
      embeds: [helpEmbed],
      components: [row],
      files: [pfp],
      ephemeral: true,
    });

    // Create collector for select menu interactions
    const collector = response.createMessageComponentCollector({
      time: 300000, // Auto-expire after 5 mins
    });

    collector.on("collect", async (i) => {
      if (i.customId === "help-menu") {
        const selectedCommand = commands.get(i.values[0]);

        if (!selectedCommand) {
          await i.update({ content: "Command not found.", components: [row] });
          return;
        }

        // Create detailed embed for the selected command
        const commandEmbed = new EmbedBuilder()
          .setColor("#DC143C")
          .setTitle(`Command: /${selectedCommand.data.name}`)
          .setDescription(selectedCommand.data.description)
          .setThumbnail("attachment://pfp.png")
          .setTimestamp()
          .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

        // Add options/subcommands if available
        if (
          selectedCommand.data.options &&
          selectedCommand.data.options.length > 0
        ) {
          commandEmbed.addFields({
            name: "Options",
            value: selectedCommand.data.options
              .map((opt) => `\`${opt.name}\`: ${opt.description}`)
              .join("\n"),
          });
        }

        // Add example usage if available
        if (selectedCommand.example) {
          commandEmbed.addFields({
            name: "Example Usage",
            value: selectedCommand.example,
          });
        }

        // Add cooldown if available
        if (selectedCommand.cooldown) {
          commandEmbed.addFields({
            name: "Cooldown",
            value: `${selectedCommand.cooldown} second(s)`,
          });
        }

        // Add permissions if available
        if (selectedCommand.permissions) {
          commandEmbed.addFields({
            name: "Required Permissions",
            value: selectedCommand.permissions.join(", "),
          });
        }

        // Update response with command details
        await i.update({
          embeds: [commandEmbed],
          components: [row],
          files: [pfp],
        });
      }
    });

    collector.on("end", async () => {
      // When collector expires, remove the menu
      await interaction
        .editReply({
          content:
            "This help menu has expired. Use the `/help` command again if needed.",
          components: [],
        })
        .catch(() => {});
    });
  },
};
