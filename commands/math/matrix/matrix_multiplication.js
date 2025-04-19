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
    .setName("matrix_multiplication")
    .setDescription("Multiply two matrices together")
    .addStringOption((option) =>
      option
        .setName("matrix_a")
        .setDescription(
          "First matrix in format [[a,b],[c,d]] or separate rows with semicolons: [a,b];[c,d]"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("matrix_b")
        .setDescription(
          "Second matrix in format [[e,f],[g,h]] or separate rows with semicolons: [e,f];[g,h]"
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const matrixAStr = interaction.options
        .getString("matrix_a")
        .replace(/;/g, "],[") // Allow semicolons to separate rows
        .replace(/\s+/g, ""); // Remove all spaces

      const matrixBStr = interaction.options
        .getString("matrix_b")
        .replace(/;/g, "],[") // Allow semicolons to separate rows
        .replace(/\s+/g, ""); // Remove all spaces

      const matrixA = parseMatrix(matrixAStr);
      const matrixB = parseMatrix(matrixBStr);

      // Check if matrices can be multiplied (columns of A = rows of B)
      const sizeA = matrixA.size();
      const sizeB = matrixB.size();

      if (sizeA[1] !== sizeB[0]) {
        throw new Error(
          `Cannot multiply matrices: Matrix A has ${sizeA[1]} columns but Matrix B has ${sizeB[0]} rows`
        );
      }

      // Perform matrix multiplication
      const result = math.multiply(matrixA, matrixB);

      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      const multiplyEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle("Matrix Multiplication")
        .setDescription("Multiplying two matrices")
        .addFields(
          {
            name: "Matrix A",
            value: formatMatrix(matrixA),
          },
          {
            name: "Matrix B",
            value: formatMatrix(matrixB),
          },
          {
            name: "Result (A × B)",
            value: formatMatrix(result),
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
        embeds: [multiplyEmbed],
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
