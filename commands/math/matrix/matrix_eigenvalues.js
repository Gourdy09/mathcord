const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const math = require("mathjs");

// Maximum size for matrices
const MAX_MATRIX_SIZE = 4;

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

    // Check if the matrix is square (required for eigenvalues)
    if (size[0] !== size[1]) {
      throw new Error("Matrix must be square to calculate eigenvalues");
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

// Format eigenvalue for display
function formatEigenvalue(lambda) {
  if (math.typeOf(lambda) === "Complex") {
    const real = lambda.re;
    const imag = lambda.im;
    const realPart = Number.isInteger(real) ? real : real.toFixed(4);
    const imagPart = Number.isInteger(Math.abs(imag))
      ? Math.abs(imag)
      : Math.abs(imag).toFixed(4);

    return `${realPart} ${imag < 0 ? "-" : "+"} ${imagPart}i`;
  } else {
    return Number.isInteger(lambda) ? lambda : lambda.toFixed(4);
  }
}

// Calculate eigenvalues for matrices
function calculateEigenvalues(matrix) {
  const size = matrix.size();

  // Handle 2x2 matrix
  if (size[0] === 2 && size[1] === 2) {
    const a = matrix.get([0, 0]);
    const b = matrix.get([0, 1]);
    const c = matrix.get([1, 0]);
    const d = matrix.get([1, 1]);

    const trace = a + d;
    const determinant = a * d - b * c;

    const discriminant = trace * trace - 4 * determinant;

    if (discriminant >= 0) {
      const lambda1 = (trace + Math.sqrt(discriminant)) / 2;
      const lambda2 = (trace - Math.sqrt(discriminant)) / 2;
      return [lambda1, lambda2];
    } else {
      const realPart = trace / 2;
      const imaginaryPart = Math.sqrt(-discriminant) / 2;
      return [
        math.complex(realPart, imaginaryPart),
        math.complex(realPart, -imaginaryPart),
      ];
    }
  } else {
    // For larger matrices, use mathjs eigs function
    try {
      const { values } = math.eigs(matrix);
      return values;
    } catch (error) {
      throw new Error(`Failed to calculate eigenvalues: ${error.message}`);
    }
  }
}

// The slash command definition
module.exports = {
  data: new SlashCommandBuilder()
    .setName("matrix_eigenvalues")
    .setDescription("Calculate eigenvalues of a square matrix")
    .addStringOption((option) =>
      option
        .setName("matrix")
        .setDescription("The matrix in format [[a,b],[c,d]] or similar")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const matrixStr = interaction.options.getString("matrix");
      const matrix = parseMatrix(matrixStr);
      const eigenvalues = calculateEigenvalues(matrix);

      // Format eigenvalues for display
      const eigenvaluesText = eigenvalues
        .map((lambda, index) => `λ${index + 1} = ${formatEigenvalue(lambda)}`)
        .join("\n");

      // Create profile picture attachment
      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      // Create embed for response
      const eigenvaluesEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle("Matrix Eigenvalues")
        .setDescription(`Input Matrix:\n${formatMatrix(matrix)}`)
        .addFields(
          { name: "Eigenvalues", value: `\`\`\`\n${eigenvaluesText}\n\`\`\`` },
          {
            name: "Support Mathcord",
            value: "https://github.com/Gourdy09/mathcord",
          }
        )
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      await interaction.editReply({
        content: "",
        embeds: [eigenvaluesEmbed],
        files: [pfp],
      });
    } catch (error) {
      // Create profile picture attachment
      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      const errorEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle("Error")
        .setDescription(`${error.message}`)
        .addFields({
          name: "Support Mathcord",
          value: "https://github.com/Gourdy09/mathcord",
        })
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      await interaction.editReply({
        content: "",
        embeds: [errorEmbed],
        files: [pfp],
      });
    }
  },
};
