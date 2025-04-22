const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const axios = require("axios");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("render")
    .setDescription("Converts a math expression to a PNG image")
    .addStringOption((option) =>
      option
        .setName("expression")
        .setDescription("LaTeX or math expression to convert")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("inline")
        .setDescription("Format as inline equation (default: false)")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("scale")
        .setDescription("Scale factor for the image (default: 2)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addIntegerOption((option) =>
      option
        .setName("padding")
        .setDescription("Padding around the equation in pixels (default: 20)")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(100)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const expression = interaction.options.getString("expression");
      const isInline = interaction.options.getBoolean("inline") || false;
      const scale = interaction.options.getInteger("scale") || 2; // Default scale factor of 2
      const padding = interaction.options.getInteger("padding") || 20; // Default padding of 20px

      // URL-encode the expression
      const encodedExpression = encodeURIComponent(expression);

      // Create the API URL
      const queryParam = isInline ? "inline" : "from";
      const imageUrl = `https://math.now.sh?${queryParam}=${encodedExpression}`;

      // Fetch the SVG content
      const response = await axios.get(imageUrl, { responseType: "text" });
      const svgContent = response.data;

      // Set density for higher resolution when rasterizing SVG
      const density = 300 * scale;

      // Convert SVG to PNG using sharp
      const pngBuffer = await sharp(Buffer.from(svgContent), {
        density: density,
      })
        .flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } }) // White background
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // White padding
        })
        .png()
        .toBuffer();

      // Create an attachment from the buffer
      const attachment = new AttachmentBuilder(pngBuffer, {
        name: "equation.png",
      });

      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      // Create the embed with the attachment
      const sendEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle("LaTeX Render")
        .setDescription(`\`${expression}\``)
        .addFields({
          name: "Support Mathcord",
          value: "discord.gg/UPJPVXspee",
        })
        .setImage("attachment://equation.png")
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      // Send the embed with the attachment
      await interaction.editReply({
        embeds: [sendEmbed],
        files: [attachment, pfp],
      });
    } catch (error) {
      console.error("Error processing math command:", error);
      await interaction.editReply(
        "There was an error generating the math image. Please check your expression and try again."
      );
    }
  },
};
