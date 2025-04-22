const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const math = require("mathjs");

// Configure mathjs with security restrictions
const limitedMath = math.create();
limitedMath.config({
  // Set maximum computation time (in milliseconds)
  maxExecTime: 1000,
});

limitedMath.import(
  {
    simplify: math.simplify,
  },
  { override: true }
);

// Create a more limited evaluation context
const limitedEvaluate = limitedMath.evaluate;

// Define safe functions to use
limitedMath.import(
  {
    // Only allow specific functions
    import: function () {
      throw new Error("Function import is disabled");
    },
    createUnit: function () {
      throw new Error("Function createUnit is disabled");
    },
    evaluate: function () {
      throw new Error("Function evaluate is disabled");
    },
    parse: function () {
      throw new Error("Function parse is disabled");
    },
  },
  { override: true }
);

// Helper function to check if a number is a perfect power
function isPerfectPower(num, power) {
  const root = Math.pow(num, 1 / power);
  return Math.pow(Math.round(root), power) === num;
}

// Helper function to find the largest perfect power factor
function findLargestPerfectPowerFactor(num, power) {
  if (num <= 0) return 1;

  let maxFactor = 1;
  let factor = Math.floor(Math.pow(num, 1 / power));

  while (factor > 1) {
    const factorPow = Math.pow(factor, power);
    if (num % factorPow === 0) {
      return factorPow;
    }
    factor--;
  }

  return maxFactor;
}

// Helper function to simplify radicals with any index
function simplifyRadical(num, index = 2) {
  // Handle negative numbers
  if (num < 0) {
    // Even index with negative number
    if (index % 2 === 0) {
      return `i × ${simplifyRadical(-num, index)}`;
    }
    // Odd index with negative number
    return `-${simplifyRadical(-num, index)}`;
  }

  // Check if it's a perfect power
  if (isPerfectPower(num, index)) {
    return Math.pow(num, 1 / index).toString();
  }

  // Find largest perfect power factor
  const perfectPowerFactor = findLargestPerfectPowerFactor(num, index);
  if (perfectPowerFactor === 1) {
    return index === 2 ? `√${num}` : `∛${num}`;
  }

  const coefficient = Math.pow(perfectPowerFactor, 1 / index);
  const radicand = num / perfectPowerFactor;

  // Format based on index
  if (index === 2) {
    return `${coefficient}√${radicand}`;
  } else if (index === 3) {
    return `${coefficient}∛${radicand}`;
  } else {
    return `${coefficient}×${index}√${radicand}`;
  }
}

// Helper function to detect common mathematical constants
function identifyMathConstant(value) {
  const constants = [
    { value: Math.PI, name: "node" },
    { value: Math.E, name: "e" },
    { value: Math.sqrt(2), name: "√2" },
    { value: Math.sqrt(3), name: "√3" },
    { value: Math.sqrt(5), name: "√5" },
    { value: Math.LN2, name: "ln(2)" },
    { value: Math.LN10, name: "ln(10)" },
    { value: Math.LOG2E, name: "log₂(e)" },
    { value: Math.LOG10E, name: "log₁₀(e)" },
    { value: Math.PI / 2, name: "π/2" },
    { value: Math.PI / 3, name: "π/3" },
    { value: Math.PI / 4, name: "π/4" },
    { value: Math.PI / 6, name: "π/6" },
    { value: 2 * Math.PI, name: "2π" },
    { value: Math.PI * Math.PI, name: "π²" },
    { value: Math.SQRT1_2, name: "1/√2" },
    { value: Math.SQRT2, name: "√2" },
    { value: 1 / 3, name: "1/3" },
    { value: 2 / 3, name: "2/3" },
  ];

  const epsilon = 1e-10;

  for (const constant of constants) {
    if (Math.abs(value - constant.value) < epsilon) {
      return constant.name;
    }
  }

  return null;
}

// Helper function to implement trigonometric simplifications
function simplifyTrigonometric(expression) {
  let expr = expression;

  // Common trigonometric identities
  const trigIdentities = [
    // sin identities
    { pattern: /sin\(([^)]+)\s*\-\s*pi\)/g, replacement: "-sin($1)" },
    { pattern: /sin\(pi\s*\-\s*([^)]+)\)/g, replacement: "sin($1)" },
    { pattern: /sin\(([^)]+)\s*\+\s*pi\)/g, replacement: "-sin($1)" },
    { pattern: /sin\(([^)]+)\s*\+\s*2\s*\*\s*pi\)/g, replacement: "sin($1)" },
    { pattern: /sin\(([^)]+)\s*\-\s*2\s*\*\s*pi\)/g, replacement: "sin($1)" },

    // cos identities
    { pattern: /cos\(([^)]+)\s*\+\s*pi\)/g, replacement: "-cos($1)" },
    { pattern: /cos\(([^)]+)\s*\-\s*pi\)/g, replacement: "-cos($1)" },
    { pattern: /cos\(pi\s*\-\s*([^)]+)\)/g, replacement: "-cos($1)" },
    { pattern: /cos\(([^)]+)\s*\+\s*2\s*\*\s*pi\)/g, replacement: "cos($1)" },
    { pattern: /cos\(([^)]+)\s*\-\s*2\s*\*\s*pi\)/g, replacement: "cos($1)" },

    // tan identities
    { pattern: /tan\(([^)]+)\s*\+\s*pi\)/g, replacement: "tan($1)" },
    { pattern: /tan\(([^)]+)\s*\-\s*pi\)/g, replacement: "tan($1)" },
    { pattern: /tan\(([^)]+)\s*\+\s*2\s*\*\s*pi\)/g, replacement: "tan($1)" },
    { pattern: /tan\(([^)]+)\s*\-\s*2\s*\*\s*pi\)/g, replacement: "tan($1)" },
  ];

  // Apply each pattern
  for (const identity of trigIdentities) {
    expr = expr.replace(identity.pattern, identity.replacement);
  }

  return expr;
}

// Helper function to check if a number is likely a root or power
function identifySpecialNumber(num) {
  // Check for common roots (up to 5th root of numbers 2-100)
  for (let index = 2; index <= 5; index++) {
    for (let base = 2; base <= 100; base++) {
      const rootValue = Math.pow(base, 1 / index);
      if (Math.abs(num - rootValue) < 1e-10) {
        return index === 2
          ? `√${base}`
          : index === 3
          ? `∛${base}`
          : `${index}√${base}`;
      }
    }
  }

  // Check for logarithmic values
  const commonBases = [Math.E, 2, 10];
  for (let i = 2; i <= 10; i++) {
    for (const base of commonBases) {
      const logValue = Math.log(i) / Math.log(base);
      if (Math.abs(num - logValue) < 1e-10) {
        if (base === Math.E) {
          return `ln(${i})`;
        } else {
          return `log${base}(${i})`;
        }
      }
    }
  }

  // Check for rational multiples of π
  for (let denom = 1; denom <= 12; denom++) {
    for (let num = 1; num <= 2 * denom; num++) {
      const piMultiple = (num / denom) * Math.PI;
      if (Math.abs(Math.abs(num) - piMultiple) < 1e-10) {
        if (num === 1 && denom === 1) {
          return "π";
        } else if (num === denom) {
          return `${num}π`;
        } else {
          return `(${num}/${denom})π`;
        }
      }
    }
  }

  return null;
}

// Helper function for continued fraction representation
function toContinuedFraction(value, maxIterations = 10, tolerance = 1e-10) {
  const result = [];
  let x = value;

  for (let i = 0; i < maxIterations; i++) {
    const wholePart = Math.floor(x);
    result.push(wholePart);

    const fractionalPart = x - wholePart;
    if (fractionalPart < tolerance) break;

    x = 1 / fractionalPart;
    if (!isFinite(x)) break;
  }

  return result;
}

// Format continued fraction
function formatContinuedFraction(cfrac) {
  if (cfrac.length <= 1) return cfrac[0].toString();

  let result = `[${cfrac[0]}; `;
  for (let i = 1; i < cfrac.length; i++) {
    result += cfrac[i];
    if (i < cfrac.length - 1) result += ", ";
  }
  result += "]";
  return result;
}

// Helper function to simplify trig values
function simplifyTrigValue(value, fnName) {
  // Common exact values for sin, cos, tan
  const commonTrigValues = {
    sin: [
      { value: 0, expr: "sin(0)" },
      { value: 0.5, expr: "sin(π/6)" },
      { value: 1 / Math.sqrt(2), expr: "sin(π/4)" },
      { value: Math.sqrt(3) / 2, expr: "sin(π/3)" },
      { value: 1, expr: "sin(π/2)" },
    ],
    cos: [
      { value: 1, expr: "cos(0)" },
      { value: Math.sqrt(3) / 2, expr: "cos(π/6)" },
      { value: 1 / Math.sqrt(2), expr: "cos(π/4)" },
      { value: 0.5, expr: "cos(π/3)" },
      { value: 0, expr: "cos(π/2)" },
    ],
    tan: [
      { value: 0, expr: "tan(0)" },
      { value: 1 / Math.sqrt(3), expr: "tan(π/6)" },
      { value: 1, expr: "tan(π/4)" },
      { value: Math.sqrt(3), expr: "tan(π/3)" },
    ],
  };

  if (commonTrigValues[fnName]) {
    for (const entry of commonTrigValues[fnName]) {
      if (
        Math.abs(value - entry.value) < 1e-10 ||
        Math.abs(value + entry.value) < 1e-10
      ) {
        return entry.expr;
      }
    }
  }

  return null;
}

// Helper function to format complex numbers
function formatComplexNumber(real, imag) {
  if (Math.abs(imag) < 1e-10) return real.toString();
  if (Math.abs(real) < 1e-10) return `${imag}i`;

  const sign = imag < 0 ? "-" : "+";
  const absImag = Math.abs(imag);

  if (Math.abs(absImag - 1) < 1e-10) {
    return `${real} ${sign} i`;
  }

  return `${real} ${sign} ${absImag}i`;
}

// Helper function for comprehensive formatting of mathematical results
function formatMathResult(result) {
  // For complex numbers
  if (typeof result === "object" && result !== null && "im" in result) {
    const re = parseFloat(result.re.toFixed(10));
    const im = parseFloat(result.im.toFixed(10));
    return formatComplexNumber(re, im);
  }

  // For non-number results
  if (typeof result !== "number" || isNaN(result)) {
    return result.toString();
  }

  // Round to handle floating point imprecision
  const roundedResult = parseFloat(result.toFixed(10));

  // Start with the decimal representation
  let formattedResult = `${roundedResult} (Decimal)`;

  // Try to simplify as a radical if it looks like an irrational number
  if (!Number.isInteger(roundedResult) && Math.abs(roundedResult) > 0) {
    // Check for square roots first
    for (let base = 2; base <= 100; base++) {
      const sqrt = Math.sqrt(base);
      // For values that might be expressible as square roots with coefficients
      if (
        Math.abs((roundedResult / sqrt) % 1) < 1e-10 ||
        Math.abs((roundedResult * sqrt) % 1) < 1e-10
      ) {
        const simplifiedRadical = simplifyRadical(
          roundedResult * roundedResult,
          2
        );
        formattedResult += `\n${simplifiedRadical} (Simplified radical)`;
        break;
      }
    }

    // Also check for cube roots
    for (let base = 2; base <= 50; base++) {
      const cbrt = Math.cbrt(base);
      if (
        Math.abs((roundedResult / cbrt) % 1) < 1e-10 ||
        Math.abs((roundedResult * cbrt) % 1) < 1e-10
      ) {
        const simplifiedRadical = simplifyRadical(
          roundedResult * roundedResult * roundedResult,
          3
        );
        formattedResult += `\n${simplifiedRadical} (Simplified radical)`;
        break;
      }
    }
  }

  // Check for mathematical constants
  const constantForm = identifyMathConstant(roundedResult);
  if (constantForm) {
    formattedResult += `\n${constantForm} (Mathematical constant)`;
  }

  // Check for special values (roots, logs, etc.)
  const specialForm = identifySpecialNumber(Math.abs(roundedResult));
  if (specialForm) {
    const sign = roundedResult < 0 ? "-" : "";
    formattedResult += `\n${sign}${specialForm} (Special form)`;
  }

  // Provide radical simplification for common roots
  for (let index = 2; index <= 3; index++) {
    // Look for values that might be expressible as radicals
    for (let base = 2; base <= 50; base++) {
      if (
        Math.abs(Math.abs(roundedResult) - Math.pow(base, 1 / index)) < 1e-10
      ) {
        const sign = roundedResult < 0 ? "-" : "";
        const radicalNotation = index === 2 ? `√${base}` : `∛${base}`;
        formattedResult += `\n${sign}${radicalNotation} (Radical form)`;
        break;
      }
    }
  }

  // Try to express as a fraction if not an integer
  if (!Number.isInteger(roundedResult)) {
    try {
      // Convert to fraction using math.js
      const fraction = limitedMath.fraction(roundedResult);

      // Get improper fraction representation
      const improperFraction = `${fraction.n}/${fraction.d}`;
      formattedResult += `\n${improperFraction} (Fraction)`;

      // Calculate mixed number if numerator > denominator
      if (Math.abs(fraction.n) > fraction.d) {
        const wholePart =
          Math.floor(Math.abs(fraction.n) / fraction.d) * Math.sign(fraction.n);
        const remainder = Math.abs(fraction.n) % fraction.d;
        if (remainder !== 0) {
          const mixedNumber = `${wholePart} ${remainder}/${fraction.d}`;
          formattedResult += `\n${mixedNumber} (Mixed number)`;
        }
      }

      // Add continued fraction representation for irrational-looking numbers
      if (fraction.d > 100) {
        const cfrac = toContinuedFraction(roundedResult);
        if (cfrac.length > 1) {
          formattedResult += `\n${formatContinuedFraction(
            cfrac
          )} (Continued fraction)`;
        }
      }
    } catch (e) {
      // If fraction conversion fails, don't add fraction representation
    }
  }

  return formattedResult;
}

// Helper function to process and prepare expressions
function preprocessExpression(expression) {
  let processed = expression.trim();

  // Standardize root notations
  processed = processed.replace(/\\?sqrt\(([^)]+)\)/g, "sqrt($1)");
  processed = processed.replace(/\\?cbrt\(([^)]+)\)/g, "cbrt($1)");
  processed = processed.replace(
    /\\?nthroot\(([^,]+),\s*([^)]+)\)/g,
    "pow($1, 1/$2)"
  );

  // Handle nth root notation
  processed = processed.replace(/(\d+)√(\d+)/g, "pow($2, 1/$1)");

  // Handle alternative log notations
  processed = processed.replace(/log_(\d+)\(([^)]+)\)/g, "log($2, $1)");
  processed = processed.replace(/\\?log(\d+)\(([^)]+)\)/g, "log($2, $1)");

  // Handle alternative trig notations
  processed = processed.replace(/arcsin\(([^)]+)\)/g, "asin($1)");
  processed = processed.replace(/arccos\(([^)]+)\)/g, "acos($1)");
  processed = processed.replace(/arctan\(([^)]+)\)/g, "atan($1)");

  // Add multiplication sign between numbers and variables
  processed = processed.replace(/(\d)([a-zA-Z])/g, "$1*$2");

  // Handle pi and e symbols
  processed = processed.replace(/\\?pi/g, "pi");
  processed = processed.replace(/π/g, "pi");

  return processed;
}

// Helper function to handle derivatives
function handleDerivative(expression, variable = "x") {
  try {
    // Parse the expression to a node
    const node = limitedMath.parse(expression);

    // Calculate the derivative
    const derivative = limitedMath.derivative(node, variable);

    // Simplify the derivative expression if possible
    const simplified = limitedMath.simplify(derivative.toString());

    return simplified.toString();
  } catch (e) {
    throw new Error(`Derivative calculation failed: ${e.message}`);
  }
}

// Helper function to handle integrals for simple cases
function handleBasicIntegral(expression, variable = "x") {
  // Map of basic integration rules
  const integrationRules = [
    { pattern: /^(\d+)$/, result: (match) => `${match[1]}*${variable}` }, // Constant
    { pattern: /^${variable}$/, result: (match) => `(${variable}^2)/2` }, // x
    {
      pattern: /^${variable}\^(\d+)$/,
      result: (match) =>
        `(${variable}^${parseInt(match[1]) + 1})/${parseInt(match[1]) + 1}`,
    }, // x^n
    { pattern: /^sin\(${variable}\)$/, result: (match) => `-cos(${variable})` }, // sin(x)
    { pattern: /^cos\(${variable}\)$/, result: (match) => `sin(${variable})` }, // cos(x)
    {
      pattern: /^tan\(${variable}\)$/,
      result: (match) => `-ln(cos(${variable}))`,
    }, // tan(x)
    { pattern: /^e\^${variable}$/, result: (match) => `e^${variable}` }, // e^x
    {
      pattern: /^(\d+)\^${variable}$/,
      result: (match) => `${match[1]}^${variable}/ln(${match[1]})`,
    }, // a^x
    { pattern: /^1\/${variable}$/, result: (match) => `ln(abs(${variable}))` }, // 1/x
    {
      pattern: /^ln\(${variable}\)$/,
      result: (match) => `${variable}*ln(${variable})-${variable}`,
    }, // ln(x)
  ];

  const simplifiedExpr = limitedMath.simplify(expression).toString();

  // Check against our pattern rules
  for (const rule of integrationRules) {
    const match = simplifiedExpr.match(rule.pattern);
    if (match) {
      return rule.result(match);
    }
  }

  throw new Error("Integration for this expression isn't supported.");
}

// Helper function to handle limits for simple cases
function handleLimit(expression, variable = "x", approachValue) {
  try {
    // Test the limit by direct substitution for finite values
    if (isFinite(approachValue)) {
      // Calculate values around the approach value
      const delta = 1e-6;

      // Create scope for evaluation
      const scope = {};
      scope[variable] = approachValue - delta;
      const leftValue = limitedMath.evaluate(expression, scope);

      scope[variable] = approachValue + delta;
      const rightValue = limitedMath.evaluate(expression, scope);

      // Check for continuity
      if (Math.abs(leftValue - rightValue) < delta * 10) {
        // Approach value directly
        scope[variable] = approachValue;
        try {
          return limitedMath.evaluate(expression, scope);
        } catch (e) {
          // Handle discontinuity
          if (Math.abs(leftValue - rightValue) < delta * 10) {
            return leftValue; // Or rightValue, they're close
          }
        }
      } else {
        throw new Error(
          "Limit appears to approach different values from left and right."
        );
      }
    }
    // Handle infinity limits
    else if (approachValue === Infinity || approachValue === -Infinity) {
      // For infinity limits, evaluate at some large value
      const sign = approachValue === Infinity ? 1 : -1;
      const largeValue = sign * 1e6;

      const scope = {};
      scope[variable] = largeValue;
      return limitedMath.evaluate(expression, scope);
    }

    throw new Error("Couldn't evaluate the limit.");
  } catch (e) {
    throw new Error(`Limit calculation failed: ${e.message}`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("simplify")
    .setDescription(
      "Simplifies mathematical expressions with support for fractions, roots, and more"
    )
    .addStringOption((option) =>
      option
        .setName("expression")
        .setDescription(
          "Expression to simplify (e.g., 'sqrt(12)' or '3x=30+10y')"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("variable")
        .setDescription("Optional: Variable to solve for (e.g., 'y')")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("operation")
        .setDescription(
          "Optional: Special operation to perform (derivative, integral, limit)"
        )
        .setRequired(false)
        .addChoices(
          { name: "None (simplify only)", value: "none" },
          { name: "Derivative", value: "derivative" },
          { name: "Integral", value: "integral" },
          { name: "Limit", value: "limit" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("extra_param")
        .setDescription(
          "Optional: Extra parameter (e.g., approach value for limits)"
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const expression = interaction.options.getString("expression");
      const variable = interaction.options.getString("variable")?.trim() || "x";
      const operation = interaction.options.getString("operation") || "none";
      const extraParam = interaction.options.getString("extra_param");

      // Input validation
      if (expression.length > 500) {
        throw new Error(
          "Expression too long. Please keep it under 500 characters."
        );
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /while\s*\(/i,
        /for\s*\(/i,
        /setTimeout/i,
        /setInterval/i,
        /function/i,
        /import/i,
        /require/i,
        /process/i,
        /constructor/i,
        /__proto__/i,
        /prototype/i,
        /\.\./,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(expression)) {
          throw new Error("Potentially unsafe input detected.");
        }
      }

      if (variable && !/^[a-zA-Z]$/.test(variable)) {
        throw new Error("Variable must be a single letter.");
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error("Calculation timed out. Try a simpler expression.")
            ),
          2000
        );
      });

      let result, originalExpression, resultExpression;

      // Process the expression to handle special notations
      const processedExpression = preprocessExpression(expression);
      originalExpression = expression; // Save the original input

      // Set up the computational promise based on operation type
      const calculationPromise = new Promise(async (resolve) => {
        // Handle different types of operations
        switch (operation) {
          case "derivative":
            const derivativeResult = handleDerivative(
              processedExpression,
              variable
            );
            resolve(
              `The derivative of ${processedExpression} with respect to ${variable} is:\n${derivativeResult}`
            );
            break;

          case "integral":
            try {
              const integralResult = handleBasicIntegral(
                processedExpression,
                variable
              );
              resolve(
                `The indefinite integral of ${processedExpression} with respect to ${variable} is:\n${integralResult} + C`
              );
            } catch (e) {
              throw new Error(
                `Integration not supported for this expression. Try simpler forms.`
              );
            }
            break;

          case "limit":
            if (!extraParam) {
              throw new Error(
                "Approach value is required for limits. Use the extra_param option."
              );
            }

            let approachValue;
            if (extraParam.toLowerCase() === "infinity" || extraParam === "∞") {
              approachValue = Infinity;
            } else if (
              extraParam.toLowerCase() === "-infinity" ||
              extraParam === "-∞"
            ) {
              approachValue = -Infinity;
            } else {
              approachValue = parseFloat(extraParam);
              if (isNaN(approachValue)) {
                throw new Error("Invalid approach value for limit.");
              }
            }

            const limitResult = handleLimit(
              processedExpression,
              variable,
              approachValue
            );
            resolve(
              `The limit of ${processedExpression} as ${variable} approaches ${extraParam} is:\n${formatMathResult(
                limitResult
              )}`
            );
            break;

          case "none":
          default:
            // Handle solving for a variable
            if (variable && variable !== "x") {
              // Solving for a variable
              if (processedExpression.includes("=")) {
                // Standard equation solving
                const [leftSide, rightSide] = processedExpression
                  .split("=")
                  .map((part) => part.trim());

                const solveResult = limitedMath.solve(
                  `${leftSide}-(${rightSide})`,
                  variable
                );

                // Format the solution
                if (Array.isArray(solveResult)) {
                  resolve(
                    solveResult
                      .map((sol) => `${variable} = ${formatMathResult(sol)}`)
                      .join("\n\n")
                  );
                } else {
                  resolve(`${variable} = ${formatMathResult(solveResult)}`);
                }
              } else {
                // Treating expression as "expression = 0"
                const solveResult = limitedMath.solve(
                  processedExpression,
                  variable
                );

                // Format the solution
                if (Array.isArray(solveResult)) {
                  resolve(
                    solveResult
                      .map((sol) => `${variable} = ${formatMathResult(sol)}`)
                      .join("\n\n")
                  );
                } else {
                  resolve(`${variable} = ${formatMathResult(solveResult)}`);
                }
              }
            } else {
              // Simple expression simplification
              if (processedExpression.includes("=")) {
                // For equations, simplify both sides independently
                const [leftSide, rightSide] = processedExpression
                  .split("=")
                  .map((part) => part.trim());
                const simplifiedLeft = limitedMath
                  .simplify(leftSide)
                  .toString();
                const simplifiedRight = limitedMath
                  .simplify(rightSide)
                  .toString();

                // Apply trigonometric simplifications
                const trigSimplifiedLeft =
                  simplifyTrigonometric(simplifiedLeft);
                const trigSimplifiedRight =
                  simplifyTrigonometric(simplifiedRight);

                // Try to evaluate both sides if they're numeric
                try {
                  const evalLeft = limitedMath.evaluate(trigSimplifiedLeft);
                  const evalRight = limitedMath.evaluate(trigSimplifiedRight);

                  if (
                    typeof evalLeft === "number" &&
                    typeof evalRight === "number"
                  ) {
                    resolve(
                      `${trigSimplifiedLeft} = ${trigSimplifiedRight}\n\nEvaluated: ${formatMathResult(
                        evalLeft
                      )} = ${formatMathResult(evalRight)}`
                    );
                  } else {
                    resolve(`${trigSimplifiedLeft} = ${trigSimplifiedRight}`);
                  }
                } catch (e) {
                  // If evaluation fails, just use simplified form
                  resolve(`${trigSimplifiedLeft} = ${trigSimplifiedRight}`);
                }
              } else {
                // For expressions, simplify and try to evaluate
                const simplified = limitedMath
                  .simplify(processedExpression)
                  .toString();
                const trigSimplified = simplifyTrigonometric(simplified);

                try {
                  // Try to evaluate the simplified expression
                  const evaluated = limitedMath.evaluate(trigSimplified);

                  if (
                    typeof evaluated === "number" ||
                    (typeof evaluated === "object" &&
                      evaluated !== null &&
                      "im" in evaluated)
                  ) {
                    resolve(
                      `${trigSimplified}\n\nEvaluated: ${formatMathResult(
                        evaluated
                      )}`
                    );
                  } else {
                    resolve(trigSimplified);
                  }
                } catch (e) {
                  // If evaluation fails, just use simplified form
                  resolve(trigSimplified);
                }
              }
            }
        }
      });

      resultExpression = await Promise.race([
        calculationPromise,
        timeoutPromise,
      ]);

      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      // Determine what operation was performed for better UI presentation
      let title, description;
      switch (operation) {
        case "derivative":
          title = "Derivative Calculated";
          description = `Here's the derivative of the expression with respect to ${variable}:`;
          break;
        case "integral":
          title = "Integral Calculated";
          description = `Here's the indefinite integral of the expression with respect to ${variable}:`;
          break;
        case "limit":
          title = "Limit Calculated";
          description = `Here's the limit of the expression as ${variable} approaches ${extraParam}:`;
          break;
        default:
          if (variable && variable !== "x") {
            title = "Equation Solved";
            description = `Here's the solution for variable ${variable}:`;
          } else {
            title = "Expression Simplified";
            description = "Here's the simplified expression:";
          }
      }

      const simplifyEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle(title)
        .setDescription(description)
        .addFields(
          { name: "Original", value: `\`${originalExpression}\`` },
          { name: "Result", value: `\`${resultExpression}\`` },
          {
            name: "Support Mathcord",
            value: "discord.gg/UPJPVXspee",
          }
        )
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      await interaction.editReply({ embeds: [simplifyEmbed], files: [pfp] });
    } catch (error) {
      // Provide more helpful error messages
      let errorMessage = error.message;

      // Check if this is a common error and provide better guidance
      if (
        errorMessage.includes("Undefined symbol") ||
        errorMessage.includes("not found in the scope")
      ) {
        errorMessage =
          "I couldn't resolve some terms in your expression. Make sure variables are clearly defined.";
      } else if (errorMessage.includes("Unexpected type")) {
        errorMessage =
          "There was an issue with the expression format. Check your syntax.";
      } else if (errorMessage.includes("Timeout")) {
        errorMessage =
          "This expression is too complex to simplify within the time limit.";
      }

      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Error")
        .setDescription(`I couldn't process that mathematical expression.`)
        .addFields({ name: "Details", value: `\`${errorMessage}\`` })
        .addFields({
          name: "Tips",
          value:
            "• For square roots, use sqrt(x)\n• For cube roots, use cbrt(x)\n• For nth roots, use nthroot(x,n) or n√x\n• For fractions, use division (e.g., 3/4)\n• For trig functions, use sin(x), cos(x), etc.\n• For powers use ^ (e.g., x^2)\n• For multiplication use * (e.g., 2*x)\n• For logarithms, use log(x,base) or ln(x)\n• Use 'pi' or 'π' for π and 'e' for Euler's number\n• For equations, use = (e.g., 2x+3=7)\n• For derivatives, select the 'Derivative' operation\n• For integrals, select the 'Integral' operation\n• For limits, select the 'Limit' operation and provide the approach value",
        })
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      await interaction.editReply({ embeds: [errorEmbed], files: [pfp] });
    }
  },
};
