const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const math = require("mathjs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("limit")
    .setDescription("Calculate the limit of a mathematical expression")
    .addStringOption((option) =>
      option
        .setName("equation")
        .setDescription("The mathematical expression (e.g., sin(x)/x)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("approaches")
        .setDescription("The value the variable approaches (e.g., 0)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("variable")
        .setDescription("The variable in the equation (default: x)")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Defer reply since calculation might take time
    await interaction.deferReply();

    try {
      // Get options
      const equation = interaction.options.getString("equation");
      const approachesValue = interaction.options.getString("approaches");
      const variable = interaction.options.getString("variable") || "x";

      // Calculate the limit
      let result;

      try {
        // Special cases first (common limits)
        if (
          equation.replace(/\s/g, "") === `sin(${variable})/${variable}` &&
          approachesValue === "0"
        ) {
          result = "1";
        } else if (
          equation.replace(/\s/g, "") === `(1-cos(${variable}))/${variable}` &&
          approachesValue === "0"
        ) {
          result = "0";
        } else {
          // For general limits, use mathjs limit functionality
          // mathjs doesn't have a direct limit function, so use approximation by plugging in values very close to the limit

          // Create a scope with the variable
          const scope = {};

          // Convert to number if possible
          const approachesNum = parseFloat(approachesValue);

          // Calculate from both sides if approaching a finite value
          if (!isNaN(approachesNum)) {
            // Approach from left (minus epsilon)
            const epsilon = 1e-10;
            scope[variable] = approachesNum - epsilon;
            const leftResult = math.evaluate(equation, scope);

            // Approach from right (plus epsilon)
            scope[variable] = approachesNum + epsilon;
            const rightResult = math.evaluate(equation, scope);

            // If both sides converge to the same value
            if (Math.abs(leftResult - rightResult) < epsilon) {
              result = math.format(leftResult, { precision: 10 });
            } else {
              result = "Limit does not exist (left and right limits differ)";
            }
          } else if (
            approachesValue === "Infinity" ||
            approachesValue === "∞"
          ) {
            // Approach infinity
            scope[variable] = 1e10;
            result = math.format(math.evaluate(equation, scope), {
              precision: 10,
            });
          } else if (
            approachesValue === "-Infinity" ||
            approachesValue === "-∞"
          ) {
            // Approach negative infinity
            scope[variable] = -1e10;
            result = math.format(math.evaluate(equation, scope), {
              precision: 10,
            });
          } else {
            result = "Invalid approach value";
          }
        }
      } catch (error) {
        // Handle errors in calculation
        result = `Error: Unable to calculate limit. ${error.message}`;
      }

      // Display the result in an embed
      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      // Format the equation for display
      const formattedEquation = equation
        .replace(/\*/g, "·")
        .replace(/\//g, "÷");

      const limitEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle("Limit")
        .setDescription(
          `Finding the limit of the expression as ${variable} approaches ${approachesValue}`
        )
        .addFields(
          {
            name: "Expression",
            value: `\`${formattedEquation}\``,
          },
          {
            name: "Result",
            value: `\`${result}\``,
          },
          {
            name: "Support Mathcord",
            value: "discord.gg/UPJPVXspee",
          }
        )
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      await interaction.editReply({
        content: "",
        embeds: [limitEmbed],
        files: [pfp],
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
