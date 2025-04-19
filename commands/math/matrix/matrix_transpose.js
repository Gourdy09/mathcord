const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const math = require("mathjs");

// Maximum size for matrices
const MAX_MATRIX_SIZE = 5;

// Parse matrix input from a string
function parseMatrix(matrixStr) {
  try {
    // Clean up input and split by rows
    const cleanInput = matrixStr
      .trim()
      .replace(/\[\s*\[/g, "[[")
      .replace(/\]\s*\]/g, "]]")
      .replace(/\]\s*,\s*\[/g, "],[");

    // Remove the outer brackets if present
    let processedInput = cleanInput;
    if (processedInput.startsWith("[[") && processedInput.endsWith("]]")) {
      processedInput = processedInput.substring(1, processedInput.length - 1);
    } else if (processedInput.startsWith("[") && processedInput.endsWith("]")) {
      processedInput = processedInput;
    } else {
      // Add outer brackets if not present
      processedInput = "[" + processedInput + "]";
    }

    // Parse the matrix
    const matrix = math.evaluate(processedInput);

    // Ensure it's a matrix and not too large
    if (!math.isMatrix(matrix)) {
      throw new Error("Input is not a valid matrix");
    }

    const size = matrix.size();
    if (size[0] > MAX_MATRIX_SIZE || size[1] > MAX_MATRIX_SIZE) {
      throw new Error(
        `Matrix is too large. Maximum size is ${MAX_MATRIX_SIZE}x${MAX_MATRIX_SIZE}`
      );
    }

    return matrix;
  } catch (error) {
    throw new Error(`Failed to parse matrix: ${error.message}`);
  }
}

// Format matrix for display
function formatMatrix(matrix) {
  const size = matrix.size();
  let formatted = "";

  for (let i = 0; i < size[0]; i++) {
    let row = "| ";
    for (let j = 0; j < size[1]; j++) {
      const value = matrix.get([i, j]);
      // Format numbers to be more readable
      row += (Number.isInteger(value) ? value : value.toFixed(4)) + " ";
    }
    formatted += row + "|\n";
  }

  return "```\n" + formatted + "```";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("matrix_transpose")
    .setDescription("Calculate the transpose of a matrix")
    .addStringOption((option) =>
      option
        .setName("matrix")
        .setDescription(
          "The matrix in format [[a,b],[c,d]] or separate rows with semicolons: [a,b];[c,d]"
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const matrixStr = interaction.options
        .getString("matrix")
        .replace(/;/g, "],[") // Allow semicolons to separate rows
        .replace(/\s+/g, ""); // Remove all spaces

      const matrix = parseMatrix(matrixStr);
      const transpose = math.transpose(matrix);

      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      const transposeEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle("Matrix Transpose")
        .setDescription("Calculating the transpose of the given matrix")
        .addFields(
          {
            name: "Original Matrix",
            value: formatMatrix(matrix),
          },
          {
            name: "Transpose",
            value: formatMatrix(transpose),
          },
          {
            name: "Support Mathcord",
            value: "https://github.com/Gourdy09/mathcord",
          }
        )
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      await interaction.editReply({
        content: "",
        embeds: [transposeEmbed],
        files: [pfp],
      });
    } catch (error) {
      await interaction.editReply({
        content: `Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
