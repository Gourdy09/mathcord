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
      row +=
        (Math.abs(value) < 0.0001 && value !== 0
          ? "0.0000"
          : Number.isInteger(value)
          ? value
          : value.toFixed(4)) + " ";
    }
    formatted += row + "|\n";
  }

  return "```\n" + formatted + "```";
}

// Perform Gaussian elimination to get row echelon form
function gaussianElimination(matrix) {
  // Create a deep copy of the matrix to avoid modifying the original
  const result = math.clone(matrix);
  const rows = result.size()[0];
  const cols = result.size()[1];

  let lead = 0;

  for (let r = 0; r < rows; r++) {
    if (lead >= cols) {
      break;
    }

    let i = r;

    // Find non-zero entry in the current column
    while (i < rows && Math.abs(result.get([i, lead])) < 1e-10) {
      i++;
    }

    if (i === rows) {
      // No non-zero entry found, move to next column
      lead++;
      r--;
      continue;
    }

    // Swap rows if needed
    if (i !== r) {
      for (let j = 0; j < cols; j++) {
        const temp = result.get([r, j]);
        result.set([r, j], result.get([i, j]));
        result.set([i, j], temp);
      }
    }

    // Scale the pivot row
    const pivot = result.get([r, lead]);

    if (Math.abs(pivot) > 1e-10) {
      for (let j = 0; j < cols; j++) {
        result.set([r, j], result.get([r, j]) / pivot);
      }
    }

    // Eliminate other rows
    for (let i = 0; i < rows; i++) {
      if (i !== r) {
        const factor = result.get([i, lead]);
        for (let j = 0; j < cols; j++) {
          result.set([i, j], result.get([i, j]) - factor * result.get([r, j]));
        }
      }
    }

    lead++;
  }

  return result;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("matrix_gaussian_elimination")
    .setDescription(
      "Perform Gaussian elimination on a matrix (row echelon form)"
    )
    .addStringOption((option) =>
      option
        .setName("matrix")
        .setDescription(
          "The matrix in format [[a,b,c],[d,e,f]] or separate rows with semicolons"
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
      const rowEchelonForm = gaussianElimination(matrix);

      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      const gaussianEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle("Gaussian Elimination")
        .setDescription("Converting matrix to row echelon form")
        .addFields(
          {
            name: "Original Matrix",
            value: formatMatrix(matrix),
          },
          {
            name: "Row Echelon Form",
            value: formatMatrix(rowEchelonForm),
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
        embeds: [gaussianEmbed],
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
