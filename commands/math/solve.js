const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const math = require("mathjs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("solve")
    .setDescription("Solves mathematical equations")
    .addStringOption((option) =>
      option
        .setName("equation")
        .setDescription("The math equation you want to solve")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("variable")
        .setDescription(
          "The variable to solve for (default: first variable found)"
        )
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const inputEquation = interaction.options.getString("equation");
      const specifiedVariable = interaction.options.getString("variable");
      let result;

      // Function to clean up expressions and fix double negatives
      const cleanExpression = (expr) => {
        // Replace double negatives not at the start of the expression
        let cleaned = expr;

        // Replace patterns like "- -" or "+ -" with appropriate signs
        cleaned = cleaned.replace(/\-\s*\-/g, "+"); // - - becomes +
        cleaned = cleaned.replace(/\+\s*\-/g, "-"); // + - becomes -

        // Handle leading double negative at start of expression or after equals sign
        cleaned = cleaned.replace(/^(\s*)\-\s*\-/, "$1"); // --x becomes x at the start
        cleaned = cleaned.replace(/=\s*\-\s*\-/, "= "); // = --x becomes = x

        // Clean up extra spaces around operators
        cleaned = cleaned.replace(/\s*\+\s*/g, " + ");
        cleaned = cleaned.replace(/\s*\-\s*/g, " - ");
        cleaned = cleaned.replace(/\s*\*\s*/g, " * ");
        cleaned = cleaned.replace(/\s*\/\s*/g, " / ");

        // Fix spacing after equals sign
        cleaned = cleaned.replace(/=\s+/g, "= ");

        // Clean up multiple spaces
        cleaned = cleaned.replace(/\s+/g, " ").trim();

        return cleaned;
      };

      // Check if input contains an equals sign (equation to solve)
      if (inputEquation.includes("=")) {
        // Split the equation and solve for the variable
        const [leftSide, rightSide] = inputEquation
          .split("=")
          .map((side) => side.trim());

        // Find all variables in the equation
        const variableMatches = inputEquation.match(/[a-z]/gi) || [];
        const uniqueVariables = [...new Set(variableMatches)];

        // Choose the variable to solve for
        let variable;
        if (specifiedVariable) {
          // Use the specified variable if provided
          variable = specifiedVariable;
          if (!uniqueVariables.includes(variable)) {
            throw new Error(
              `Variable '${variable}' not found in the equation.`
            );
          }
        } else if (uniqueVariables.length > 0) {
          // Default to the first variable found
          variable = uniqueVariables[0];
        } else {
          throw new Error("No variables found in the equation.");
        }

        // Check for special patterns
        const sinPattern = new RegExp(
          `^\\s*sin\\s*\\(\\s*(${variable})\\s*\\)\\s*$`,
          "i"
        );
        const cosPattern = new RegExp(
          `^\\s*cos\\s*\\(\\s*(${variable})\\s*\\)\\s*$`,
          "i"
        );
        const tanPattern = new RegExp(
          `^\\s*tan\\s*\\(\\s*(${variable})\\s*\\)\\s*$`,
          "i"
        );
        const logPattern = new RegExp(
          `^\\s*log\\s*\\(\\s*(${variable})\\s*\\)\\s*$`,
          "i"
        );
        const lnPattern = new RegExp(
          `^\\s*ln\\s*\\(\\s*(${variable})\\s*\\)\\s*$`,
          "i"
        );

        // Reverse patterns (for equations like x = log(5))
        const logReversePattern = /^\s*log\s*\(\s*([^)]+)\s*\)\s*$/i;
        const lnReversePattern = /^\s*ln\s*\(\s*([^)]+)\s*\)\s*$/i;

        // Handle special cases with symbolic solutions
        if (sinPattern.test(leftSide)) {
          // Case: sin(x) = k
          const k = parseFloat(rightSide);

          if (k === 1) {
            result = `${variable} = π/2 + 2nπ, where n is an integer`;
          } else if (k === -1) {
            result = `${variable} = -π/2 + 2nπ, where n is an integer`;
          } else if (Math.abs(k) < 1) {
            result = `${variable} = arcsin(${rightSide}) + 2nπ or ${variable} = π - arcsin(${rightSide}) + 2nπ, where n is an integer`;
          } else {
            result = "No solution (sine values must be between -1 and 1)";
          }
        } else if (cosPattern.test(leftSide)) {
          // Case: cos(x) = k
          const k = parseFloat(rightSide);

          if (k === 1) {
            result = `${variable} = 2nπ, where n is an integer`;
          } else if (k === -1) {
            result = `${variable} = π + 2nπ, where n is an integer`;
          } else if (Math.abs(k) < 1) {
            result = `${variable} = arccos(${rightSide}) + 2nπ or ${variable} = -arccos(${rightSide}) + 2nπ, where n is an integer`;
          } else {
            result = "No solution (cosine values must be between -1 and 1)";
          }
        } else if (tanPattern.test(leftSide)) {
          // Case: tan(x) = k
          result = `${variable} = arctan(${rightSide}) + nπ, where n is an integer`;
        } else if (logPattern.test(leftSide)) {
          // Case: log(x) = k
          const k = parseFloat(rightSide);
          if (isNaN(k)) {
            result = `${variable} = 10^(${rightSide})`;
          } else {
            result = `${variable} = 10^${rightSide} = ${math.format(
              Math.pow(10, k),
              { precision: 14 }
            )}`;
          }
        } else if (lnPattern.test(leftSide)) {
          // Case: ln(x) = k
          const k = parseFloat(rightSide);
          if (isNaN(k)) {
            result = `${variable} = e^(${rightSide})`;
          } else {
            result = `${variable} = e^${rightSide} = ${math.format(
              Math.exp(k),
              { precision: 14 }
            )}`;
          }
        } else if (variable === rightSide) {
          // Case: log(1) = x
          if (logReversePattern.test(leftSide)) {
            const arg = leftSide.match(logReversePattern)[1];
            if (arg === "1") {
              result = `${variable} = 0`;
            } else {
              try {
                const logValue = math.log10(math.evaluate(arg));
                result = `${variable} = ${math.format(logValue, {
                  precision: 14,
                })}`;
              } catch (e) {
                result = `${variable} = log(${arg})`;
              }
            }
          } else if (lnReversePattern.test(leftSide)) {
            const arg = leftSide.match(lnReversePattern)[1];
            if (arg === "1") {
              result = `${variable} = 0`;
            } else {
              try {
                const lnValue = math.log(math.evaluate(arg));
                result = `${variable} = ${math.format(lnValue, {
                  precision: 14,
                })}`;
              } catch (e) {
                result = `${variable} = ln(${arg})`;
              }
            }
          } else {
            // Solve normally with variables flipped
            try {
              const solutions = math.solve(
                `${variable}-(${leftSide})`,
                variable
              );
              if (solutions.length === 0) {
                result = "No solutions found";
              } else {
                result = solutions
                  .map(
                    (sol) =>
                      `${variable} = ${math.format(sol, { precision: 14 })}`
                  )
                  .join("\n");
              }
            } catch (error) {
              // Try to evaluate the right side
              result = `${variable} = ${leftSide}`;
            }
          }
        } else {
          // For multi-variable equations, represent the symbolic solution
          if (uniqueVariables.length > 1) {
            try {
              // Use mathjs's symbolic solver capabilities
              const node = math.parse(`${leftSide} = ${rightSide}`);
              const rearranged = math.simplify(`${leftSide} - (${rightSide})`);

              // Try to solve for the variable symbolically
              const variableNode = math.parse(variable);

              // A simple way to determine which terms contain our variable
              let coeffVarTerms = [];
              let constTerms = [];

              // For simple linear equations like "x + y = 5" or "2x + 3y = 10"
              // Extract terms with the variable and without
              try {
                const terms = rearranged.args || [rearranged];

                for (const term of terms) {
                  const termStr = term.toString();
                  if (termStr.includes(variable)) {
                    coeffVarTerms.push(term);
                  } else {
                    constTerms.push(term);
                  }
                }

                // Handle the common case of linear equations
                if (coeffVarTerms.length > 0) {
                  // Get all terms not containing the variable
                  const constExpr =
                    constTerms.length > 0
                      ? constTerms.map((t) => t.toString()).join(" + ")
                      : "0";

                  // Move all terms not containing the variable to the right side
                  const rhsExpr =
                    constTerms.length > 0 ? `-(${constExpr})` : "0";

                  // Get coefficient of the variable
                  const coeff =
                    coeffVarTerms.length === 1 &&
                    coeffVarTerms[0].toString() === variable
                      ? "1"
                      : coeffVarTerms.map((t) => t.toString()).join(" + ");

                  // Final expression
                  if (coeff === variable) {
                    result = `${variable} = ${math
                      .simplify(rhsExpr)
                      .toString()}`;
                  } else {
                    result = `${variable} = (${math
                      .simplify(rhsExpr)
                      .toString()}) / (${math
                      .simplify(coeff.replace(variable, "1"))
                      .toString()})`;
                  }

                  // Try to simplify the result further
                  try {
                    const simplified = math
                      .simplify(result.split("=")[1])
                      .toString();
                    result = `${variable} = ${simplified}`;
                  } catch (simplifyError) {
                    // Keep as is if simplification fails
                  }
                } else {
                  throw new Error("Could not identify terms with the variable");
                }
              } catch (termsError) {
                // If the approach above fails, try a more general approach
                try {
                  // Create an equation in the form: ax + by + ... = c
                  // Then substitute different values for non-target variables to find a pattern

                  // Create a base context with all variables set to 0
                  const baseContext = {};
                  uniqueVariables.forEach((v) => {
                    if (v !== variable) baseContext[v] = 0;
                  });

                  // Evaluate with base context (all other vars = 0)
                  const expr = math.parse(`${leftSide}-(${rightSide})`);
                  const compiled = expr.compile();

                  baseContext[variable] = 0;
                  const constValue = compiled.evaluate(baseContext);

                  // For each non-target variable, find its coefficient
                  const coefficients = {};
                  uniqueVariables.forEach((v) => {
                    if (v !== variable) {
                      const testContext = { ...baseContext };
                      testContext[v] = 1; // Set test variable to 1
                      const testValue = compiled.evaluate(testContext);
                      coefficients[v] = testValue - constValue;
                    }
                  });

                  // Find target variable coefficient
                  baseContext[variable] = 1;
                  const targetValue = compiled.evaluate(baseContext);
                  const targetCoeff = targetValue - constValue;

                  // Construct the formula: x = (c - by - ...) / a
                  let rightSideFormula = `-${constValue}`;

                  Object.entries(coefficients).forEach(([v, coeff]) => {
                    if (coeff !== 0) {
                      const sign = coeff > 0 ? "-" : "+";
                      const absCoeff = Math.abs(coeff);
                      rightSideFormula += ` ${sign} ${
                        absCoeff === 1 ? "" : absCoeff
                      }${v}`;
                    }
                  });

                  // Simplify if possible
                  if (rightSideFormula === "-0") {
                    rightSideFormula = "0";
                  }

                  // Final result
                  if (targetCoeff === 1) {
                    result = `${variable} = ${rightSideFormula}`;
                  } else if (targetCoeff === -1) {
                    result = `${variable} = -(${rightSideFormula})`;
                  } else {
                    result = `${variable} = (${rightSideFormula}) / ${targetCoeff}`;
                  }

                  // Try to simplify the result
                  try {
                    const simplified = math
                      .simplify(result.split("=")[1])
                      .toString();
                    result = `${variable} = ${simplified}`;
                  } catch (simplifyError) {
                    // Keep as is if simplification fails
                  }
                } catch (coeffError) {
                  throw new Error("Could not determine variable coefficients");
                }
              }
            } catch (symbolicError) {
              // If symbolic solving fails, try to use a more direct approach for simple cases
              try {
                // For very simple linear equations like x + y = 5
                // use a simple substitution approach
                if (
                  inputEquation.match(
                    /^[a-z\s+\-*/()0-9.]+=[a-z\s+\-*/()0-9.]+$/i
                  )
                ) {
                  // Try to isolate terms with the target variable on the left side
                  // and everything else on the right side
                  const allTerms = `${leftSide}-(${rightSide})`;
                  const node = math.parse(allTerms);

                  // Try to collect terms with the variable
                  let coeff = 0;
                  let constTerm = 0;

                  // Simple linear form: ax + b = 0
                  // Find a and b by evaluating with x=0 and x=1
                  const eq = (x) => {
                    const context = {};
                    uniqueVariables.forEach((v) => {
                      context[v] = v === variable ? x : 0;
                    });
                    return math.evaluate(allTerms, context);
                  };

                  constTerm = eq(0);
                  const withVar = eq(1);
                  coeff = withVar - constTerm;

                  if (coeff !== 0) {
                    // Express non-target variables symbolically
                    let formula = `-${constTerm}`;

                    uniqueVariables.forEach((v) => {
                      if (v !== variable) {
                        // Find coefficient for this variable
                        const context = {};
                        uniqueVariables.forEach((v2) => {
                          context[v2] = v2 === v ? 1 : 0;
                        });
                        const varCoeff =
                          math.evaluate(allTerms, context) - constTerm;

                        if (varCoeff !== 0) {
                          const sign = varCoeff > 0 ? "-" : "+";
                          const absCoeff = Math.abs(varCoeff);
                          formula += ` ${sign} ${
                            absCoeff === 1 ? "" : absCoeff
                          }${v}`;
                        }
                      }
                    });

                    // Simplify if possible
                    if (formula === "-0") {
                      formula = "0";
                    }

                    // Final result
                    if (coeff === 1) {
                      result = `${variable} = ${formula}`;
                    } else if (coeff === -1) {
                      result = `${variable} = -(${formula})`;
                    } else {
                      result = `${variable} = (${formula}) / ${coeff}`;
                    }
                  } else {
                    result =
                      "Variable doesn't appear in equation or coefficient is zero";
                  }
                } else {
                  throw new Error("Equation is not in a simple linear form");
                }
              } catch (linearError) {
                // Fall back to numeric solutions if everything else fails
                try {
                  // Create a context with all variables set to 1 except the solving variable
                  const context = {};
                  uniqueVariables.forEach((v) => {
                    if (v !== variable) context[v] = 1;
                  });

                  // Create an expression that will be zero when the equation is satisfied
                  const expr = math.parse(`${leftSide}-(${rightSide})`);
                  const compiled = expr.compile();

                  // Function to find where expression equals zero
                  const f = (x) => {
                    context[variable] = x;
                    return compiled.evaluate(context);
                  };

                  // Try to find roots in different ranges
                  let solutions = [];

                  // Check multiple ranges
                  const ranges = [
                    [-10, 10],
                    [-100, 100],
                    [-1000, 1000],
                  ];
                  for (const [min, max] of ranges) {
                    try {
                      const solution = math.zeros(f, [min, max]);
                      if (
                        !isNaN(solution) &&
                        solutions.findIndex(
                          (s) => Math.abs(s - solution) < 1e-10
                        ) === -1
                      ) {
                        solutions.push(solution);
                      }
                    } catch (e) {
                      // Skip if no zero found in this range
                    }
                  }

                  if (solutions.length === 0) {
                    result =
                      "Could not find solutions when other variables are set to 1";
                  } else {
                    // Format solutions
                    result = solutions
                      .map(
                        (sol) =>
                          `${variable} = ${math.format(sol, {
                            precision: 6,
                          })} when other variables = 1`
                      )
                      .join("\n");
                  }
                } catch (numericError) {
                  throw new Error(
                    `Cannot solve this equation type for ${variable}`
                  );
                }
              }
            }
          } else {
            // Single variable equation - use algebraic solver
            try {
              // Create an equation to solve: leftSide - rightSide = 0
              const equationToSolve = `${leftSide}-(${rightSide})`;
              const solutions = math.solve(equationToSolve, variable);

              if (solutions.length === 0) {
                result = "No solutions found";
              } else {
                // Format solutions
                result = solutions
                  .map(
                    (sol) =>
                      `${variable} = ${math.format(sol, { precision: 14 })}`
                  )
                  .join("\n");
              }
            } catch (solveError) {
              // If math.solve fails, try numeric solver
              try {
                // Create an expression that will be zero when the equation is satisfied
                const expr = math.parse(`${leftSide}-(${rightSide})`);
                const compiled = expr.compile();

                // Function to find where expression equals zero
                const f = (x) => compiled.evaluate({ [variable]: x });

                // Try to find roots in different ranges
                let solutions = [];

                // Check multiple ranges
                const ranges = [
                  [-10, 10],
                  [-100, 100],
                  [-1000, 1000],
                ];
                for (const [min, max] of ranges) {
                  try {
                    const solution = math.zeros(f, [min, max]);
                    if (
                      !isNaN(solution) &&
                      solutions.findIndex(
                        (s) => Math.abs(s - solution) < 1e-10
                      ) === -1
                    ) {
                      solutions.push(solution);
                    }
                  } catch (e) {
                    // Skip if no zero found in this range
                  }
                }

                if (solutions.length === 0) {
                  result = "Could not find numeric solutions";
                } else {
                  // Format solutions
                  result = solutions
                    .map(
                      (sol) =>
                        `${variable} = ${math.format(sol, { precision: 6 })}`
                    )
                    .join("\n");
                }
              } catch (numericError) {
                throw new Error(
                  `Cannot solve this equation type for ${variable}`
                );
              }
            }
          }
        }

        // Clean up the result to fix double negatives and formatting
        if (result.includes("=")) {
          const [varPart, valuePart] = result.split("=");
          result = `${varPart}= ${cleanExpression(valuePart)}`;
        }
      } else {
        // It's just an expression to evaluate
        result = math.evaluate(inputEquation);
      }

      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      const mathEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle("Math Solution")
        .setDescription(`Here's the solution to your equation:`)
        .addFields(
          { name: "Input", value: `\`${inputEquation}\`` },
          { name: "Result", value: `\`${result}\`` }
        )
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      await interaction.editReply({ embeds: [mathEmbed], files: [pfp] });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Error")
        .setDescription(`I couldn't solve that equation.`)
        .addFields({ name: "Details", value: `\`${error.message}\`` })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
