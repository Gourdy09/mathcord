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
          ? value.toExponential(2)
          : Number.isInteger(value)
          ? value
          : value.toFixed(4)) + " ";
    }
    formatted += row + "|\n";
  }

  return "```\n" + formatted + "```";
}

// Function to validate square matrix
function validateSquareMatrix(matrix, operation) {
  const size = matrix.size();
  if (size[0] !== size[1]) {
    throw new Error(`Matrix must be square to calculate ${operation}`);
  }
  return matrix;
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

// Create reusable embed function
function createMatrixEmbed(title, description, fields) {
  const pfp = new AttachmentBuilder("./images/pfp.png", {
    name: "pfp.png",
  });

  const embed = new EmbedBuilder()
    .setColor("#DC143C")
    .setTitle(title)
    .setDescription(description)
    .addFields(fields)
    .addFields({
      name: "Support Mathcord",
      value: "https://github.com/Gourdy09/mathcord",
    })
    .setTimestamp()
    .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

  return { embed, pfp };
}

// Create error embed
function createErrorEmbed(errorMessage) {
  const pfp = new AttachmentBuilder("./images/pfp.png", {
    name: "pfp.png",
  });

  const embed = new EmbedBuilder()
    .setColor("#DC143C")
    .setTitle("Error")
    .setDescription(errorMessage)
    .addFields({
      name: "Support Mathcord",
      value: "https://github.com/Gourdy09/mathcord",
    })
    .setTimestamp()
    .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

  return { embed, pfp };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("matrix")
    .setDescription("Perform various matrix operations")

    // Determinant subcommand
    .addSubcommand((subcommand) =>
      subcommand
        .setName("determinant")
        .setDescription("Calculate the determinant of a square matrix")
        .addStringOption((option) =>
          option
            .setName("matrix")
            .setDescription(
              "The matrix in format [[a,b],[c,d]] or separate rows with semicolons: [a,b];[c,d]"
            )
            .setRequired(true)
        )
    )

    // Eigenvalues subcommand
    .addSubcommand((subcommand) =>
      subcommand
        .setName("eigenvalues")
        .setDescription("Calculate eigenvalues of a square matrix")
        .addStringOption((option) =>
          option
            .setName("matrix")
            .setDescription("The matrix in format [[a,b],[c,d]] or similar")
            .setRequired(true)
        )
    )

    // Gaussian elimination subcommand
    .addSubcommand((subcommand) =>
      subcommand
        .setName("gaussian")
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
        )
    )

    // Inverse subcommand
    .addSubcommand((subcommand) =>
      subcommand
        .setName("inverse")
        .setDescription("Calculate the inverse of a square matrix")
        .addStringOption((option) =>
          option
            .setName("matrix")
            .setDescription(
              "The matrix in format [[a,b],[c,d]] or separate rows with semicolons: [a,b];[c,d]"
            )
            .setRequired(true)
        )
    )

    // Multiplication subcommand
    .addSubcommand((subcommand) =>
      subcommand
        .setName("multiply")
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
        )
    )

    // Transpose subcommand
    .addSubcommand((subcommand) =>
      subcommand
        .setName("transpose")
        .setDescription("Calculate the transpose of a matrix")
        .addStringOption((option) =>
          option
            .setName("matrix")
            .setDescription(
              "The matrix in format [[a,b],[c,d]] or separate rows with semicolons: [a,b];[c,d]"
            )
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const subcommand = interaction.options.getSubcommand();

      // Helper function to preprocess matrix input
      const preprocessMatrix = (optionName) => {
        return interaction.options
          .getString(optionName)
          .replace(/;/g, "],[") // Allow semicolons to separate rows
          .replace(/\s+/g, ""); // Remove all spaces
      };

      // Handle each subcommand
      switch (subcommand) {
        case "determinant": {
          const matrixStr = preprocessMatrix("matrix");
          const matrix = parseMatrix(matrixStr);
          validateSquareMatrix(matrix, "determinant");

          const determinant = math.det(matrix);

          const { embed, pfp } = createMatrixEmbed(
            "Matrix Determinant",
            "Calculating the determinant of the given matrix",
            [
              {
                name: "Input Matrix",
                value: formatMatrix(matrix),
              },
              {
                name: "Determinant",
                value: `\`${
                  Number.isInteger(determinant)
                    ? determinant
                    : determinant.toFixed(6)
                }\``,
              },
            ]
          );

          await interaction.editReply({
            content: "",
            embeds: [embed],
            files: [pfp],
          });
          break;
        }

        case "eigenvalues": {
          const matrixStr = preprocessMatrix("matrix");
          const matrix = parseMatrix(matrixStr);
          validateSquareMatrix(matrix, "eigenvalues");

          const eigenvalues = calculateEigenvalues(matrix);

          // Format eigenvalues for display
          const eigenvaluesText = eigenvalues
            .map(
              (lambda, index) => `λ${index + 1} = ${formatEigenvalue(lambda)}`
            )
            .join("\n");

          const { embed, pfp } = createMatrixEmbed(
            "Matrix Eigenvalues",
            `Input Matrix:\n${formatMatrix(matrix)}`,
            [
              {
                name: "Eigenvalues",
                value: `\`\`\`\n${eigenvaluesText}\n\`\`\``,
              },
            ]
          );

          await interaction.editReply({
            content: "",
            embeds: [embed],
            files: [pfp],
          });
          break;
        }

        case "gaussian": {
          const matrixStr = preprocessMatrix("matrix");
          const matrix = parseMatrix(matrixStr);
          const rowEchelonForm = gaussianElimination(matrix);

          const { embed, pfp } = createMatrixEmbed(
            "Gaussian Elimination",
            "Converting matrix to row echelon form",
            [
              {
                name: "Original Matrix",
                value: formatMatrix(matrix),
              },
              {
                name: "Row Echelon Form",
                value: formatMatrix(rowEchelonForm),
              },
            ]
          );

          await interaction.editReply({
            content: "",
            embeds: [embed],
            files: [pfp],
          });
          break;
        }

        case "inverse": {
          const matrixStr = preprocessMatrix("matrix");
          const matrix = parseMatrix(matrixStr);
          validateSquareMatrix(matrix, "inverse");

          // Check if the matrix is invertible by calculating its determinant
          const det = math.det(matrix);
          if (Math.abs(det) < 1e-10) {
            throw new Error("Matrix is not invertible (determinant is zero)");
          }

          const inverse = math.inv(matrix);

          const { embed, pfp } = createMatrixEmbed(
            "Matrix Inverse",
            "Calculating the inverse of the given matrix",
            [
              {
                name: "Original Matrix",
                value: formatMatrix(matrix),
              },
              {
                name: "Inverse Matrix",
                value: formatMatrix(inverse),
              },
            ]
          );

          await interaction.editReply({
            content: "",
            embeds: [embed],
            files: [pfp],
          });
          break;
        }

        case "multiply": {
          const matrixAStr = preprocessMatrix("matrix_a");
          const matrixBStr = preprocessMatrix("matrix_b");

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

          const { embed, pfp } = createMatrixEmbed(
            "Matrix Multiplication",
            "Multiplying two matrices",
            [
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
            ]
          );

          await interaction.editReply({
            content: "",
            embeds: [embed],
            files: [pfp],
          });
          break;
        }

        case "transpose": {
          const matrixStr = preprocessMatrix("matrix");
          const matrix = parseMatrix(matrixStr);
          const transpose = math.transpose(matrix);

          const { embed, pfp } = createMatrixEmbed(
            "Matrix Transpose",
            "Calculating the transpose of the given matrix",
            [
              {
                name: "Original Matrix",
                value: formatMatrix(matrix),
              },
              {
                name: "Transpose",
                value: formatMatrix(transpose),
              },
            ]
          );

          await interaction.editReply({
            content: "",
            embeds: [embed],
            files: [pfp],
          });
          break;
        }
      }
    } catch (error) {
      const { embed, pfp } = createErrorEmbed(error.message);

      await interaction.editReply({
        content: "",
        embeds: [embed],
        files: [pfp],
      });
    }
  },
};
