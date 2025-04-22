const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with the bot's response time in ms"),
  async execute(interaction) {
    await interaction.reply("Pinging...");

    const sent = await interaction.fetchReply();
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    const pfp = new AttachmentBuilder("./images/pfp.png", {
      name: "pfp.png",
    });

    const pingEmbed = new EmbedBuilder()
      .setColor("#DC143C")
      .setTitle("Pong!")
      .setDescription(`Response time is \`${latency}ms\``)
      .addFields({
        name: "Support Mathcord",
        value: "discord.gg/UPJPVXspee",
      })
      .setTimestamp()
      .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

    await interaction.editReply({
      content: "",
      embeds: [pingEmbed],
      files: [pfp],
    });
  },
};
