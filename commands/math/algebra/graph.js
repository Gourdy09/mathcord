const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { createCanvas } = require("canvas");
const { evaluate, parse, simplify } = require("mathjs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("graph")
    .setDescription("Graphs equations including conics, lines, and functions")
    .addStringOption((option) =>
      option
        .setName("equation")
        .setDescription(
          "Equation to graph (e.g. 'y = x^2', 'x^2+y^2=25', 'x=3')"
        )
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("xmin")
        .setDescription("Minimum x value (default: -10)")
        .setRequired(false)
    )
    .addNumberOption((option) =>
      option
        .setName("xmax")
        .setDescription("Maximum x value (default: 10)")
        .setRequired(false)
    )
    .addNumberOption((option) =>
      option
        .setName("ymin")
        .setDescription("Minimum y value (default: -10)")
        .setRequired(false)
    )
    .addNumberOption((option) =>
      option
        .setName("ymax")
        .setDescription("Maximum y value (default: 10)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Graph line color (default: red)")
        .setRequired(false)
        .addChoices(
          { name: "Red", value: "#C2185B" },
          { name: "Blue", value: "#2196F3" },
          { name: "Green", value: "#4CAF50" },
          { name: "Purple", value: "#9C27B0" },
          { name: "Orange", value: "#FF9800" }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("resolution")
        .setDescription("Resolution of the graph (default: 500)")
        .setRequired(false)
        .setMinValue(100)
        .setMaxValue(1000)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Get options
      let equation = interaction.options.getString("equation");
      const xmin = interaction.options.getNumber("xmin") ?? -10;
      const xmax = interaction.options.getNumber("xmax") ?? 10;
      const ymin = interaction.options.getNumber("ymin") ?? -10;
      const ymax = interaction.options.getNumber("ymax") ?? 10;
      const color = interaction.options.getString("color") ?? "#C2185B";
      const resolution = interaction.options.getInteger("resolution") ?? 500;

      // Clean up the equation for processing
      equation = cleanEquation(equation);

      // Determine equation type and prepare for evaluation
      const equationType = analyzeEquation(equation);
      const preparedEquation = prepareEquation(equation, equationType);

      // Generate the graph
      const width = 800;
      const height = 600;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Set background to light gray
      ctx.fillStyle = "#F7F7F7";
      ctx.fillRect(0, 0, width, height);

      // Set padding
      const padding = 40;
      const graphWidth = width - 2 * padding;
      const graphHeight = height - 2 * padding;

      // Helper functions to convert between coordinates
      const xToPixel = (x) =>
        padding + ((x - xmin) / (xmax - xmin)) * graphWidth;
      const yToPixel = (y) =>
        height - padding - ((y - ymin) / (ymax - ymin)) * graphHeight;
      const pixelToX = (px) =>
        xmin + ((px - padding) / graphWidth) * (xmax - xmin);
      const pixelToY = (py) =>
        ymax - ((py - (height - padding)) / -graphHeight) * (ymax - ymin);

      // Draw grid in style
      drawGrid(ctx, xmin, xmax, ymin, ymax, width, height, padding);

      // Draw the function based on equation type
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      if (equationType === "EXPLICIT_Y") {
        drawExplicitY(
          ctx,
          preparedEquation,
          xmin,
          xmax,
          ymin,
          ymax,
          xToPixel,
          yToPixel,
          resolution
        );
      } else if (equationType === "EXPLICIT_X") {
        drawExplicitX(
          ctx,
          preparedEquation,
          xmin,
          xmax,
          ymin,
          ymax,
          xToPixel,
          yToPixel,
          resolution
        );
      } else if (equationType === "CIRCLE") {
        // Extract circle parameters
        const circleParams = extractCircleParams(equation);
        drawCircle(
          ctx,
          circleParams,
          xmin,
          xmax,
          ymin,
          ymax,
          xToPixel,
          yToPixel
        );
      } else if (equationType === "ELLIPSE") {
        // Extract ellipse parameters
        const ellipseParams = extractEllipseParams(equation);
        drawEllipse(
          ctx,
          ellipseParams,
          xmin,
          xmax,
          ymin,
          ymax,
          xToPixel,
          yToPixel
        );
      } else if (equationType === "HYPERBOLA") {
        // Extract hyperbola parameters
        const hyperbolaParams = extractHyperbolaParams(equation);
        drawHyperbola(
          ctx,
          hyperbolaParams,
          xmin,
          xmax,
          ymin,
          ymax,
          xToPixel,
          yToPixel
        );
      } else {
        // For general implicit equations
        drawImplicitMarching(
          ctx,
          preparedEquation,
          xmin,
          xmax,
          ymin,
          ymax,
          xToPixel,
          yToPixel,
          pixelToX,
          pixelToY,
          width,
          height,
          padding,
          resolution
        );
      }

      // Convert canvas to PNG buffer
      const pngBuffer = canvas.toBuffer("image/png");

      // Create attachment
      const attachment = new AttachmentBuilder(pngBuffer, {
        name: "graph.png",
      });

      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      // Create nice formatted version of the equation for display
      const formattedEquation = formatEquation(equation);

      // Create the embed look
      const graphEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle(`\`${formattedEquation}\``)
        .setDescription(
          `Domain: \`[${xmin}, ${xmax}]\`, Range: \`[${formatNumber(
            ymin
          )}, ${formatNumber(ymax)}]\``
        )
        .addFields({
          name: "Support Mathcord",
          value: "https://github.com/Gourdy09/mathcord",
        })
        .setImage("attachment://graph.png")
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

      // Send the embed with attachment
      await interaction.editReply({
        embeds: [graphEmbed],
        files: [attachment, pfp],
      });
    } catch (error) {
      console.error("Error generating graph:", error);
      await interaction.editReply(
        "There was an error generating the graph. Please check your equation and try again."
      );
    }
  },
};

// Clean up the equation for consistent processing
function cleanEquation(equation) {
  return equation
    .replace(/\s+/g, "") // Remove all whitespace
    .replace(/\^/g, "**") // Replace ^ with ** for mathjs
    .replace(/(\d)([a-zA-Z])/g, "$1*$2"); // Add * between numbers and variables
}

// Analyze the equation to determine its type
function analyzeEquation(equation) {
  // Standardize the equation for analysis
  const cleanedEq = equation
    .replace(/\s+/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");

  // Check for explicit equations in terms of y (y = ...)
  if (cleanedEq.match(/^y=/)) {
    return "EXPLICIT_Y";
  }

  // Check for explicit equations in terms of x (x = ...)
  if (cleanedEq.match(/^x=/)) {
    return "EXPLICIT_X";
  }

  // Check for circle equation: (x-h)^2 + (y-k)^2 = r^2 or x^2 + y^2 = r^2
  const circleRegex =
    /^((\(x[-+]\d*\.?\d*\)|x)\*\*2[\+](\(y[-+]\d*\.?\d*\)|y)\*\*2|(\(y[-+]\d*\.?\d*\)|y)\*\*2[\+](\(x[-+]\d*\.?\d*\)|x)\*\*2)=\d*\.?\d*$/;
  if (circleRegex.test(cleanedEq)) {
    return "CIRCLE";
  }

  // Handle various ellipse patterns with and without explicit denominators
  if (
    // Standard forms with explicit denominators
    /x\*\*2\/\d*\.?\d*\+y\*\*2\/\d*\.?\d*=1/.test(cleanedEq) ||
    /y\*\*2\/\d*\.?\d*\+x\*\*2\/\d*\.?\d*=1/.test(cleanedEq) ||
    // Forms with implicit division by 1
    /x\*\*2\+y\*\*2\/\d*\.?\d*=1/.test(cleanedEq) ||
    /y\*\*2\+x\*\*2\/\d*\.?\d*=1/.test(cleanedEq) ||
    /x\*\*2\/\d*\.?\d*\+y\*\*2=1/.test(cleanedEq) ||
    /y\*\*2\/\d*\.?\d*\+x\*\*2=1/.test(cleanedEq) ||
    // Most basic form: x**2+y**2=1 (circle)
    /^x\*\*2\+y\*\*2=1$/.test(cleanedEq) ||
    /^y\*\*2\+x\*\*2=1$/.test(cleanedEq)
  ) {
    return "ELLIPSE";
  }

  // Check for hyperbola patterns with and without explicit denominators
  if (
    // Standard forms with explicit denominators
    /x\*\*2\/\d*\.?\d*-y\*\*2\/\d*\.?\d*=1/.test(cleanedEq) ||
    /y\*\*2\/\d*\.?\d*-x\*\*2\/\d*\.?\d*=1/.test(cleanedEq) ||
    // Forms with implicit division by 1
    /x\*\*2-y\*\*2\/\d*\.?\d*=1/.test(cleanedEq) ||
    /y\*\*2-x\*\*2\/\d*\.?\d*=1/.test(cleanedEq) ||
    /x\*\*2\/\d*\.?\d*-y\*\*2=1/.test(cleanedEq) ||
    /y\*\*2\/\d*\.?\d*-x\*\*2=1/.test(cleanedEq) ||
    // Most basic form: x**2-y**2=1 or y**2-x**2=1
    /^x\*\*2-y\*\*2=1$/.test(cleanedEq) ||
    /^y\*\*2-x\*\*2=1$/.test(cleanedEq)
  ) {
    return "HYPERBOLA";
  }

  // Default to implicit
  return "IMPLICIT";
}

// Prepare the equation for evaluation based on its type
function prepareEquation(equation, type) {
  if (type === "EXPLICIT_Y") {
    // For y = f(x), extract f(x)
    return equation.replace(/^y=/, "");
  } else if (type === "EXPLICIT_X") {
    // For x = f(y), extract f(y)
    return equation.replace(/^x=/, "");
  } else {
    // For implicit equations, rearrange to f(x,y) = 0 form
    if (equation.includes("=")) {
      const parts = equation.split("=");
      return `(${parts[0]})-(${parts[1]})`;
    }
    return equation;
  }
}

// Extract circle parameters (center and radius)
function extractCircleParams(equation) {
  let h = 0,
    k = 0,
    r = 0;

  // Try to match (x-h)^2 + (y-k)^2 = r^2 first
  const centerFormRegex =
    /\(x([+-]\d*\.?\d*)\)\*\*2\+\(y([+-]\d*\.?\d*)\)\*\*2=(\d*\.?\d*)/;
  const centerMatch = equation.match(centerFormRegex);

  if (centerMatch) {
    h = parseFloat(centerMatch[1]) * -1; // Flip sign because (x-h) means center at h
    k = parseFloat(centerMatch[2]) * -1; // Flip sign because (y-k) means center at k
    r = Math.sqrt(parseFloat(centerMatch[3]));
    return { h, k, r };
  }

  // Try to match x^2 + y^2 = r^2
  const standardFormRegex = /x\*\*2\+y\*\*2=(\d*\.?\d*)/;
  const standardMatch = equation.match(standardFormRegex);

  if (standardMatch) {
    r = Math.sqrt(parseFloat(standardMatch[1]));
    return { h: 0, k: 0, r };
  }

  // Parse more complex cases by expanding and comparing coefficients
  // This is a simplified implementation that handles basic cases
  return { h: 0, k: 0, r: 5 }; // Default fallback
}

// Extract ellipse parameters (center, semi-major and semi-minor axes)
function extractEllipseParams(equation) {
  const cleanedEq = equation
    .replace(/\s+/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");

  // Pattern for x^2/a^2 + y^2/b^2 = 1 (horizontal ellipse with explicit denominators)
  const horizontalExplicitRegex = /x\*\*2\/(\d*\.?\d*)\+y\*\*2\/(\d*\.?\d*)=1/;
  const horizontalExplicitMatch = cleanedEq.match(horizontalExplicitRegex);

  if (horizontalExplicitMatch) {
    const a = Math.sqrt(parseFloat(horizontalExplicitMatch[1]));
    const b = Math.sqrt(parseFloat(horizontalExplicitMatch[2]));
    return { h: 0, k: 0, a, b, horizontal: true };
  }

  // Pattern for y^2/a^2 + x^2/b^2 = 1 (vertical ellipse with explicit denominators)
  const verticalExplicitRegex = /y\*\*2\/(\d*\.?\d*)\+x\*\*2\/(\d*\.?\d*)=1/;
  const verticalExplicitMatch = cleanedEq.match(verticalExplicitRegex);

  if (verticalExplicitMatch) {
    const a = Math.sqrt(parseFloat(verticalExplicitMatch[1]));
    const b = Math.sqrt(parseFloat(verticalExplicitMatch[2]));
    return { h: 0, k: 0, a, b, horizontal: false };
  }

  // Pattern for x^2 + y^2/b^2 = 1 (horizontal with implicit a^2=1)
  const horizontalImplicitARegex = /x\*\*2\+y\*\*2\/(\d*\.?\d*)=1/;
  const horizontalImplicitAMatch = cleanedEq.match(horizontalImplicitARegex);

  if (horizontalImplicitAMatch) {
    const a = 1; // Implicit a^2=1
    const b = Math.sqrt(parseFloat(horizontalImplicitAMatch[1]));
    return { h: 0, k: 0, a, b, horizontal: true };
  }

  // Pattern for x^2/a^2 + y^2 = 1 (horizontal with implicit b^2=1)
  const horizontalImplicitBRegex = /x\*\*2\/(\d*\.?\d*)\+y\*\*2=1/;
  const horizontalImplicitBMatch = cleanedEq.match(horizontalImplicitBRegex);

  if (horizontalImplicitBMatch) {
    const a = Math.sqrt(parseFloat(horizontalImplicitBMatch[1]));
    const b = 1; // Implicit b^2=1
    return { h: 0, k: 0, a, b, horizontal: true };
  }

  // Pattern for y^2 + x^2/b^2 = 1 (vertical with implicit a^2=1)
  const verticalImplicitARegex = /y\*\*2\+x\*\*2\/(\d*\.?\d*)=1/;
  const verticalImplicitAMatch = cleanedEq.match(verticalImplicitARegex);

  if (verticalImplicitAMatch) {
    const a = 1; // Implicit a^2=1
    const b = Math.sqrt(parseFloat(verticalImplicitAMatch[1]));
    return { h: 0, k: 0, a, b, horizontal: false };
  }

  // Pattern for y^2/a^2 + x^2 = 1 (vertical with implicit b^2=1)
  const verticalImplicitBRegex = /y\*\*2\/(\d*\.?\d*)\+x\*\*2=1/;
  const verticalImplicitBMatch = cleanedEq.match(verticalImplicitBRegex);

  if (verticalImplicitBMatch) {
    const a = Math.sqrt(parseFloat(verticalImplicitBMatch[1]));
    const b = 1; // Implicit b^2=1
    return { h: 0, k: 0, a, b, horizontal: false };
  }

  // Pattern for x^2 + y^2 = 1 (circle with radius 1)
  if (
    /^x\*\*2\+y\*\*2=1$/.test(cleanedEq) ||
    /^y\*\*2\+x\*\*2=1$/.test(cleanedEq)
  ) {
    return { h: 0, k: 0, a: 1, b: 1, horizontal: true };
  }

  // Default fallback values
  return { h: 0, k: 0, a: 4, b: 3, horizontal: true };
}

// Extract hyperbola parameters
function extractHyperbolaParams(equation) {
  const cleanedEq = equation
    .replace(/\s+/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");

  // Pattern for x^2/a^2 - y^2/b^2 = 1 (horizontal hyperbola with explicit denominators)
  const horizontalExplicitRegex = /x\*\*2\/(\d*\.?\d*)-y\*\*2\/(\d*\.?\d*)=1/;
  const horizontalExplicitMatch = cleanedEq.match(horizontalExplicitRegex);

  if (horizontalExplicitMatch) {
    const a = Math.sqrt(parseFloat(horizontalExplicitMatch[1]));
    const b = Math.sqrt(parseFloat(horizontalExplicitMatch[2]));
    return { h: 0, k: 0, a, b, horizontal: true };
  }

  // Pattern for y^2/a^2 - x^2/b^2 = 1 (vertical hyperbola with explicit denominators)
  const verticalExplicitRegex = /y\*\*2\/(\d*\.?\d*)-x\*\*2\/(\d*\.?\d*)=1/;
  const verticalExplicitMatch = cleanedEq.match(verticalExplicitRegex);

  if (verticalExplicitMatch) {
    const a = Math.sqrt(parseFloat(verticalExplicitMatch[1]));
    const b = Math.sqrt(parseFloat(verticalExplicitMatch[2]));
    return { h: 0, k: 0, a, b, horizontal: false };
  }

  // Pattern for x^2 - y^2/b^2 = 1 (horizontal with implicit a^2=1)
  const horizontalImplicitARegex = /x\*\*2-y\*\*2\/(\d*\.?\d*)=1/;
  const horizontalImplicitAMatch = cleanedEq.match(horizontalImplicitARegex);

  if (horizontalImplicitAMatch) {
    const a = 1; // Implicit a^2=1
    const b = Math.sqrt(parseFloat(horizontalImplicitAMatch[1]));
    return { h: 0, k: 0, a, b, horizontal: true };
  }

  // Pattern for x^2/a^2 - y^2 = 1 (horizontal with implicit b^2=1)
  const horizontalImplicitBRegex = /x\*\*2\/(\d*\.?\d*)-y\*\*2=1/;
  const horizontalImplicitBMatch = cleanedEq.match(horizontalImplicitBRegex);

  if (horizontalImplicitBMatch) {
    const a = Math.sqrt(parseFloat(horizontalImplicitBMatch[1]));
    const b = 1; // Implicit b^2=1
    return { h: 0, k: 0, a, b, horizontal: true };
  }

  // Pattern for y^2 - x^2/b^2 = 1 (vertical with implicit a^2=1)
  const verticalImplicitARegex = /y\*\*2-x\*\*2\/(\d*\.?\d*)=1/;
  const verticalImplicitAMatch = cleanedEq.match(verticalImplicitARegex);

  if (verticalImplicitAMatch) {
    const a = 1; // Implicit a^2=1
    const b = Math.sqrt(parseFloat(verticalImplicitAMatch[1]));
    return { h: 0, k: 0, a, b, horizontal: false };
  }

  // Pattern for y^2/a^2 - x^2 = 1 (vertical with implicit b^2=1)
  const verticalImplicitBRegex = /y\*\*2\/(\d*\.?\d*)-x\*\*2=1/;
  const verticalImplicitBMatch = cleanedEq.match(verticalImplicitBRegex);

  if (verticalImplicitBMatch) {
    const a = Math.sqrt(parseFloat(verticalImplicitBMatch[1]));
    const b = 1; // Implicit b^2=1
    return { h: 0, k: 0, a, b, horizontal: false };
  }

  // Pattern for x^2 - y^2 = 1 (standard horizontal hyperbola with a=b=1)
  if (/^x\*\*2-y\*\*2=1$/.test(cleanedEq)) {
    return { h: 0, k: 0, a: 1, b: 1, horizontal: true };
  }

  // Pattern for y^2 - x^2 = 1 (standard vertical hyperbola with a=b=1)
  if (/^y\*\*2-x\*\*2=1$/.test(cleanedEq)) {
    return { h: 0, k: 0, a: 1, b: 1, horizontal: false };
  }

  // Default fallback values
  return { h: 0, k: 0, a: 1, b: 1, horizontal: true };
}

// Draw a function of the form y = f(x)
function drawExplicitY(
  ctx,
  expression,
  xmin,
  xmax,
  ymin,
  ymax,
  xToPixel,
  yToPixel,
  resolution
) {
  const step = (xmax - xmin) / resolution;
  let firstPoint = true;
  let lastY = null;

  for (let x = xmin; x <= xmax; x += step) {
    try {
      const scope = { x };
      const y = evaluate(expression, scope);

      if (!isNaN(y) && isFinite(y) && y >= ymin && y <= ymax) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        // Check for discontinuities
        if (lastY !== null && Math.abs(y - lastY) > (ymax - ymin) / 10) {
          firstPoint = true;
        }

        if (firstPoint) {
          ctx.moveTo(pixelX, pixelY);
          firstPoint = false;
        } else {
          ctx.lineTo(pixelX, pixelY);
        }

        lastY = y;
      } else {
        firstPoint = true;
      }
    } catch (error) {
      firstPoint = true;
    }
  }

  ctx.stroke();
}

// Draw a function of the form x = f(y)
function drawExplicitX(
  ctx,
  expression,
  xmin,
  xmax,
  ymin,
  ymax,
  xToPixel,
  yToPixel,
  resolution
) {
  const step = (ymax - ymin) / resolution;
  let firstPoint = true;
  let lastX = null;

  for (let y = ymin; y <= ymax; y += step) {
    try {
      const scope = { y };
      const x = evaluate(expression, scope);

      if (!isNaN(x) && isFinite(x) && x >= xmin && x <= xmax) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        // Check for discontinuities
        if (lastX !== null && Math.abs(x - lastX) > (xmax - xmin) / 10) {
          firstPoint = true;
        }

        if (firstPoint) {
          ctx.moveTo(pixelX, pixelY);
          firstPoint = false;
        } else {
          ctx.lineTo(pixelX, pixelY);
        }

        lastX = x;
      } else {
        firstPoint = true;
      }
    } catch (error) {
      firstPoint = true;
    }
  }

  ctx.stroke();
}

// Draw a circle with given parameters
function drawCircle(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel) {
  const { h, k, r } = params;

  ctx.beginPath();
  for (let theta = 0; theta <= 2 * Math.PI; theta += 0.01) {
    const x = h + r * Math.cos(theta);
    const y = k + r * Math.sin(theta);

    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
      const pixelX = xToPixel(x);
      const pixelY = yToPixel(y);

      if (theta === 0) {
        ctx.moveTo(pixelX, pixelY);
      } else {
        ctx.lineTo(pixelX, pixelY);
      }
    }
  }
  ctx.closePath();
  ctx.stroke();
}

// Draw an ellipse with given parameters
function drawEllipse(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel) {
  const { h, k, a, b, horizontal } = params;

  ctx.beginPath();
  for (let theta = 0; theta <= 2 * Math.PI; theta += 0.01) {
    // For horizontal ellipse: x = h + a*cos(t), y = k + b*sin(t)
    // For vertical ellipse: x = h + b*cos(t), y = k + a*sin(t)
    const x = horizontal ? h + a * Math.cos(theta) : h + b * Math.cos(theta);
    const y = horizontal ? k + b * Math.sin(theta) : k + a * Math.sin(theta);

    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
      const pixelX = xToPixel(x);
      const pixelY = yToPixel(y);

      if (theta === 0) {
        ctx.moveTo(pixelX, pixelY);
      } else {
        ctx.lineTo(pixelX, pixelY);
      }
    }
  }
  ctx.closePath();
  ctx.stroke();
}

// Draw a hyperbola with given parameters
function drawHyperbola(
  ctx,
  params,
  xmin,
  xmax,
  ymin,
  ymax,
  xToPixel,
  yToPixel
) {
  const { h, k, a, b, horizontal } = params;

  if (horizontal) {
    // Draw right branch of horizontal hyperbola
    ctx.beginPath();
    for (let t = -Math.PI / 2 + 0.01; t <= Math.PI / 2 - 0.01; t += 0.01) {
      const factor = 1 / Math.cos(t);
      const x = h + a * factor;
      const y = k + b * Math.tan(t);

      if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        if (t === -Math.PI / 2 + 0.01) {
          ctx.moveTo(pixelX, pixelY);
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      }
    }
    ctx.stroke();

    // Draw left branch of horizontal hyperbola
    ctx.beginPath();
    for (let t = -Math.PI / 2 + 0.01; t <= Math.PI / 2 - 0.01; t += 0.01) {
      const factor = 1 / Math.cos(t);
      const x = h - a * factor;
      const y = k + b * Math.tan(t);

      if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        if (t === -Math.PI / 2 + 0.01) {
          ctx.moveTo(pixelX, pixelY);
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      }
    }
    ctx.stroke();
  } else {
    // Draw upper branch of vertical hyperbola
    ctx.beginPath();
    for (let t = -Math.PI / 2 + 0.01; t <= Math.PI / 2 - 0.01; t += 0.01) {
      const factor = 1 / Math.cos(t);
      const y = k + a * factor;
      const x = h + b * Math.tan(t);

      if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        if (t === -Math.PI / 2 + 0.01) {
          ctx.moveTo(pixelX, pixelY);
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      }
    }
    ctx.stroke();

    // Draw lower branch of vertical hyperbola
    ctx.beginPath();
    for (let t = -Math.PI / 2 + 0.01; t <= Math.PI / 2 - 0.01; t += 0.01) {
      const factor = 1 / Math.cos(t);
      const y = k - a * factor;
      const x = h + b * Math.tan(t);

      if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        if (t === -Math.PI / 2 + 0.01) {
          ctx.moveTo(pixelX, pixelY);
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      }
    }
    ctx.stroke();
  }
}

// Draw an implicit function using marching squares algorithm (simplified version)
function drawImplicitMarching(
  ctx,
  expression,
  xmin,
  xmax,
  ymin,
  ymax,
  xToPixel,
  yToPixel,
  pixelToX,
  pixelToY,
  width,
  height,
  padding,
  resolution
) {
  // Create a grid of evaluated points
  const cols = resolution;
  const rows = Math.floor(
    (resolution * (height - 2 * padding)) / (width - 2 * padding)
  );
  const cellWidth = (width - 2 * padding) / cols;
  const cellHeight = (height - 2 * padding) / rows;

  // Evaluate the function at each grid point
  const grid = [];
  for (let i = 0; i <= rows; i++) {
    const row = [];
    for (let j = 0; j <= cols; j++) {
      const screenX = padding + j * cellWidth;
      const screenY = padding + i * cellHeight;
      const x = pixelToX(screenX);
      const y = pixelToY(screenY);

      try {
        const value = evaluate(expression, { x, y });
        row.push(value);
      } catch (error) {
        row.push(Infinity); // Handle evaluation errors
      }
    }
    grid.push(row);
  }

  // Draw contour where function = 0
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = [
        grid[i][j], // Top-left
        grid[i][j + 1], // Top-right
        grid[i + 1][j + 1], // Bottom-right
        grid[i + 1][j], // Bottom-left
      ];

      // Check for sign changes in any cell edge
      const topEdge =
        cell[0] * cell[1] <= 0 && isFinite(cell[0]) && isFinite(cell[1]);
      const rightEdge =
        cell[1] * cell[2] <= 0 && isFinite(cell[1]) && isFinite(cell[2]);
      const bottomEdge =
        cell[2] * cell[3] <= 0 && isFinite(cell[2]) && isFinite(cell[3]);
      const leftEdge =
        cell[3] * cell[0] <= 0 && isFinite(cell[3]) && isFinite(cell[0]);

      if (topEdge || rightEdge || bottomEdge || leftEdge) {
        // Draw points at the zero-crossings
        const screenX1 = padding + j * cellWidth;
        const screenY1 = padding + i * cellHeight;
        const screenX2 = screenX1 + cellWidth;
        const screenY2 = screenY1 + cellHeight;

        ctx.fillStyle = ctx.strokeStyle;

        // Linear interpolation to find zero crossing on each edge
        if (topEdge) {
          const t = Math.abs(cell[0]) / (Math.abs(cell[0]) + Math.abs(cell[1]));
          const zeroX = screenX1 + t * cellWidth;
          ctx.beginPath();
          ctx.arc(zeroX, screenY1, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }

        if (rightEdge) {
          const t = Math.abs(cell[1]) / (Math.abs(cell[1]) + Math.abs(cell[2]));
          const zeroY = screenY1 + t * cellHeight;
          ctx.beginPath();
          ctx.arc(screenX2, zeroY, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }

        if (bottomEdge) {
          const t = Math.abs(cell[2]) / (Math.abs(cell[2]) + Math.abs(cell[3]));
          const zeroX = screenX2 - t * cellWidth;
          ctx.beginPath();
          ctx.arc(zeroX, screenY2, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }

        if (leftEdge) {
          const t = Math.abs(cell[0]) / (Math.abs(cell[0]) + Math.abs(cell[3]));
          const zeroY = screenY1 + t * cellHeight;
          ctx.beginPath();
          ctx.arc(screenX1, zeroY, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  }
}

// Draw grid with axes
function drawGrid(ctx, xmin, xmax, ymin, ymax, width, height, padding) {
  // Determine grid spacing
  const xRange = xmax - xmin;
  const yRange = ymax - ymin;

  const xMajorStep = getAppropriateStep(xRange);
  const yMajorStep = getAppropriateStep(yRange);
  const xMinorStep = xMajorStep / 5;
  const yMinorStep = yMajorStep / 5;

  // Helper functions to convert between coordinates
  const xToPixel = (x) =>
    padding + ((x - xmin) / (xmax - xmin)) * (width - 2 * padding);
  const yToPixel = (y) =>
    height - padding - ((y - ymin) / (ymax - ymin)) * (height - 2 * padding);

  // Draw minor grid lines (very light)
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "#E5E5E5";

  // Draw minor horizontal grid lines
  for (
    let y = Math.floor(ymin / yMinorStep) * yMinorStep;
    y <= ymax;
    y += yMinorStep
  ) {
    const pixelY = yToPixel(y);
    ctx.beginPath();
    ctx.moveTo(padding, pixelY);
    ctx.lineTo(width - padding, pixelY);
    ctx.stroke();
  }

  // Draw minor vertical grid lines
  for (
    let x = Math.floor(xmin / xMinorStep) * xMinorStep;
    x <= xmax;
    x += xMinorStep
  ) {
    const pixelX = xToPixel(x);
    ctx.beginPath();
    ctx.moveTo(pixelX, padding);
    ctx.lineTo(pixelX, height - padding);
    ctx.stroke();
  }

  // Draw major grid lines (slightly darker)
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#D8D8D8";

  // Draw major horizontal grid lines
  for (
    let y = Math.floor(ymin / yMajorStep) * yMajorStep;
    y <= ymax;
    y += yMajorStep
  ) {
    const pixelY = yToPixel(y);
    ctx.beginPath();
    ctx.moveTo(padding, pixelY);
    ctx.lineTo(width - padding, pixelY);
    ctx.stroke();

    // Y-axis labels (only on major grid lines)
    if (Math.abs(y) > 1e-10) {
      // Skip zero as it gets special treatment
      ctx.fillStyle = "#5A5A5A";
      ctx.textAlign = "right";
      ctx.font = "12px Arial";
      ctx.fillText(formatNumber(y), padding - 5, pixelY + 4);
    }
  }

  // Draw major vertical grid lines
  for (
    let x = Math.floor(xmin / xMajorStep) * xMajorStep;
    x <= xmax;
    x += xMajorStep
  ) {
    const pixelX = xToPixel(x);
    ctx.beginPath();
    ctx.moveTo(pixelX, padding);
    ctx.lineTo(pixelX, height - padding);
    ctx.stroke();

    // X-axis labels (only on major grid lines)
    if (Math.abs(x) > 1e-10) {
      // Skip zero as it gets special treatment
      ctx.fillStyle = "#5A5A5A";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText(formatNumber(x), pixelX, height - padding + 15);
    }
  }

  // Draw axes
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#909090";

  // X-axis
  if (ymin <= 0 && ymax >= 0) {
    const axisY = yToPixel(0);
    ctx.beginPath();
    ctx.moveTo(padding, axisY);
    ctx.lineTo(width - padding, axisY);
    ctx.stroke();

    // Draw origin label
    ctx.fillStyle = "#5A5A5A";
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    ctx.fillText("0", padding - 5, axisY + 15);
  }

  // Y-axis
  if (xmin <= 0 && xmax >= 0) {
    const axisX = xToPixel(0);
    ctx.beginPath();
    ctx.moveTo(axisX, padding);
    ctx.lineTo(axisX, height - padding);
    ctx.stroke();

    // Draw origin label if it wasn't drawn with the x-axis
    if (!(ymin <= 0 && ymax >= 0)) {
      ctx.fillStyle = "#5A5A5A";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText("0", axisX, height - padding + 15);
    }
  }
}

// Format equation for display in the Discord embed
function formatEquation(equation) {
  // Replace ** with ^ for display
  let formatted = equation.replace(/\*\*/g, "^");

  // Add spaces around =, +, - (when not in parentheses) for better readability
  formatted = formatted.replace(/([^(])([\+\-])/g, "$1 $2 ");
  formatted = formatted.replace(/=/g, " = ");

  // Remove extra spaces that might have been added
  formatted = formatted.replace(/\s+/g, " ").trim();

  return formatted;
}

// Format numbers for display (removes trailing zeros)
function formatNumber(number) {
  // Convert to string with fixed precision
  const str = number.toFixed(2);

  // Remove trailing zeros and decimal point if needed
  return str.replace(/\.?0+$/, "");
}

// Determine appropriate step size for grid lines
function getAppropriateStep(range) {
  // Target is to have 5-10 major grid lines
  const targetDivisions = 8;
  const roughStep = range / targetDivisions;

  // Find the closest power of 10
  const power = Math.floor(Math.log10(roughStep));
  const powerOfTen = 10 ** power;

  // Determine which multiple of power of 10 to use (1, 2, or 5)
  const normalizedStep = roughStep / powerOfTen;

  if (normalizedStep < 1.5) {
    return powerOfTen;
  } else if (normalizedStep < 3.5) {
    return 2 * powerOfTen;
  } else {
    return 5 * powerOfTen;
  }
}

// Calculate distance between two points
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Enhanced drawing for parabolas and other conic sections
function drawParabola(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel) {
  const { a, h, k, vertical } = params;

  if (vertical) {
    // Vertical parabola: (x - h)² = 4a(y - k)
    // y = k + (x - h)²/(4a)
    const step = (xmax - xmin) / 500;
    ctx.beginPath();
    let firstPoint = true;

    for (let x = xmin; x <= xmax; x += step) {
      const y = k + (x - h) ** 2 / (4 * a);

      if (y >= ymin && y <= ymax) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        if (firstPoint) {
          ctx.moveTo(pixelX, pixelY);
          firstPoint = false;
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      }
    }
    ctx.stroke();
  } else {
    // Horizontal parabola: (y - k)² = 4a(x - h)
    // x = h + (y - k)²/(4a)
    const step = (ymax - ymin) / 500;
    ctx.beginPath();
    let firstPoint = true;

    for (let y = ymin; y <= ymax; y += step) {
      const x = h + (y - k) ** 2 / (4 * a);

      if (x >= xmin && x <= xmax) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        if (firstPoint) {
          ctx.moveTo(pixelX, pixelY);
          firstPoint = false;
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      }
    }
    ctx.stroke();
  }
}

// Parametric curves drawing
function drawParametricCurve(
  ctx,
  x_expr,
  y_expr,
  tmin,
  tmax,
  xmin,
  xmax,
  ymin,
  ymax,
  xToPixel,
  yToPixel,
  resolution
) {
  const step = (tmax - tmin) / resolution;
  let firstPoint = true;

  ctx.beginPath();
  for (let t = tmin; t <= tmax; t += step) {
    try {
      const scope = { t };
      const x = evaluate(x_expr, scope);
      const y = evaluate(y_expr, scope);

      if (
        !isNaN(x) &&
        !isNaN(y) &&
        isFinite(x) &&
        isFinite(y) &&
        x >= xmin &&
        x <= xmax &&
        y >= ymin &&
        y <= ymax
      ) {
        const pixelX = xToPixel(x);
        const pixelY = yToPixel(y);

        if (firstPoint) {
          ctx.moveTo(pixelX, pixelY);
          firstPoint = false;
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      } else {
        firstPoint = true;
      }
    } catch (error) {
      firstPoint = true;
    }
  }
  ctx.stroke();
}

// Enhanced marching squares algorithm for implicit equations
function enhancedMarchingSquares(
  ctx,
  expression,
  xmin,
  xmax,
  ymin,
  ymax,
  xToPixel,
  yToPixel,
  pixelToX,
  pixelToY,
  width,
  height,
  padding,
  resolution
) {
  // Create a higher resolution grid for better accuracy
  const cols = Math.floor(resolution * 1.5);
  const rows = Math.floor(
    (resolution * 1.5 * (height - 2 * padding)) / (width - 2 * padding)
  );
  const cellWidth = (width - 2 * padding) / cols;
  const cellHeight = (height - 2 * padding) / rows;

  // Evaluate the function at each grid point
  const grid = [];
  for (let i = 0; i <= rows; i++) {
    const row = [];
    for (let j = 0; j <= cols; j++) {
      const screenX = padding + j * cellWidth;
      const screenY = padding + i * cellHeight;
      const x = pixelToX(screenX);
      const y = pixelToY(screenY);

      try {
        const value = evaluate(expression, { x, y });
        row.push(value);
      } catch (error) {
        row.push(Infinity); // Handle evaluation errors
      }
    }
    grid.push(row);
  }

  // Track lines to connect contour segments
  const lines = [];

  // Find contour segments
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = [
        grid[i][j], // Top-left
        grid[i][j + 1], // Top-right
        grid[i + 1][j + 1], // Bottom-right
        grid[i + 1][j], // Bottom-left
      ];

      const screenX1 = padding + j * cellWidth;
      const screenY1 = padding + i * cellHeight;
      const screenX2 = screenX1 + cellWidth;
      const screenY2 = screenY1 + cellHeight;

      // Calculate intersection points where function changes sign
      const intersections = [];

      // Check top edge
      if (cell[0] * cell[1] <= 0 && isFinite(cell[0]) && isFinite(cell[1])) {
        const t = Math.abs(cell[0]) / (Math.abs(cell[0]) + Math.abs(cell[1]));
        intersections.push({
          x: screenX1 + t * cellWidth,
          y: screenY1,
          edge: "top",
        });
      }

      // Check right edge
      if (cell[1] * cell[2] <= 0 && isFinite(cell[1]) && isFinite(cell[2])) {
        const t = Math.abs(cell[1]) / (Math.abs(cell[1]) + Math.abs(cell[2]));
        intersections.push({
          x: screenX2,
          y: screenY1 + t * cellHeight,
          edge: "right",
        });
      }

      // Check bottom edge
      if (cell[2] * cell[3] <= 0 && isFinite(cell[2]) && isFinite(cell[3])) {
        const t = Math.abs(cell[2]) / (Math.abs(cell[2]) + Math.abs(cell[3]));
        intersections.push({
          x: screenX2 - t * cellWidth,
          y: screenY2,
          edge: "bottom",
        });
      }

      // Check left edge
      if (cell[3] * cell[0] <= 0 && isFinite(cell[3]) && isFinite(cell[0])) {
        const t = Math.abs(cell[3]) / (Math.abs(cell[3]) + Math.abs(cell[0]));
        intersections.push({
          x: screenX1,
          y: screenY1 + t * cellHeight,
          edge: "left",
        });
      }

      // If we have exactly 2 intersection points, we can draw a line segment
      if (intersections.length === 2) {
        lines.push({
          x1: intersections[0].x,
          y1: intersections[0].y,
          x2: intersections[1].x,
          y2: intersections[1].y,
        });
      }

      // Handle ambiguous cases (saddle points) by checking the center value
      if (intersections.length === 4) {
        // Compute center value
        const centerX = pixelToX(screenX1 + cellWidth / 2);
        const centerY = pixelToY(screenY1 + cellHeight / 2);
        let centerValue;

        try {
          centerValue = evaluate(expression, { x: centerX, y: centerY });
        } catch (error) {
          centerValue = Infinity;
        }

        // Connect points based on center value sign
        if (isFinite(centerValue)) {
          if (centerValue > 0) {
            // Connect 0-1 and 2-3
            lines.push({
              x1: intersections[0].x,
              y1: intersections[0].y,
              x2: intersections[1].x,
              y2: intersections[1].y,
            });
            lines.push({
              x1: intersections[2].x,
              y1: intersections[2].y,
              x2: intersections[3].x,
              y2: intersections[3].y,
            });
          } else {
            // Connect 0-3 and 1-2
            lines.push({
              x1: intersections[0].x,
              y1: intersections[0].y,
              x2: intersections[3].x,
              y2: intersections[3].y,
            });
            lines.push({
              x1: intersections[1].x,
              y1: intersections[1].y,
              x2: intersections[2].x,
              y2: intersections[2].y,
            });
          }
        }
      }
    }
  }

  // Draw all line segments
  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }
}

// Parse and analyze parabola equation
function analyzeParabola(equation) {
  // Pattern for y = a(x-h)^2 + k
  const verticalPattern =
    /^y=(\-?\d*\.?\d*)\*?\(x(\+|\-)\d*\.?\d*\)\*\*2(\+|\-)\d*\.?\d*$/;
  // Pattern for x = a(y-k)^2 + h
  const horizontalPattern =
    /^x=(\-?\d*\.?\d*)\*?\(y(\+|\-)\d*\.?\d*\)\*\*2(\+|\-)\d*\.?\d*$/;

  if (verticalPattern.test(equation)) {
    // Extract parameters for vertical parabola
    const matches = equation.match(verticalPattern);
    const a = parseFloat(matches[1] || "1");

    // Extract h and k from equation
    const hPart = equation.match(/\(x(\+|\-)\d*\.?\d*\)/)[1];
    const h =
      hPart === "+"
        ? -parseFloat(hPart.substring(1))
        : parseFloat(hPart.substring(1));

    const kPart = equation.match(/\*\*2(\+|\-)\d*\.?\d*$/)[1];
    const k =
      kPart === "+"
        ? parseFloat(kPart.substring(1))
        : -parseFloat(kPart.substring(1));

    return { a, h, k, vertical: true };
  } else if (horizontalPattern.test(equation)) {
    // Extract parameters for horizontal parabola
    const matches = equation.match(horizontalPattern);
    const a = parseFloat(matches[1] || "1");

    // Extract h and k from equation
    const kPart = equation.match(/\(y(\+|\-)\d*\.?\d*\)/)[1];
    const k =
      kPart === "+"
        ? -parseFloat(kPart.substring(1))
        : parseFloat(kPart.substring(1));

    const hPart = equation.match(/\*\*2(\+|\-)\d*\.?\d*$/)[1];
    const h =
      hPart === "+"
        ? parseFloat(hPart.substring(1))
        : -parseFloat(hPart.substring(1));

    return { a, h, k, vertical: false };
  }

  // Default parameters if pattern doesn't match
  return { a: 1, h: 0, k: 0, vertical: true };
}

// Improved version of drawImplicitMarching that makes smoother curves
function drawImplicitSmooth(
  ctx,
  expression,
  xmin,
  xmax,
  ymin,
  ymax,
  xToPixel,
  yToPixel,
  pixelToX,
  pixelToY,
  width,
  height,
  padding,
  resolution
) {
  // First, try using the enhanced marching squares algorithm
  enhancedMarchingSquares(
    ctx,
    expression,
    xmin,
    xmax,
    ymin,
    ymax,
    xToPixel,
    yToPixel,
    pixelToX,
    pixelToY,
    width,
    height,
    padding,
    resolution
  );

  // For implicit equations with specific forms, we can provide specialized drawing
  try {
    // Try to simplify the expression to see if it's a common form
    const simplifiedExpr = simplify(expression).toString();

    // Check if it's a standard form equation after simplification
    if (simplifiedExpr.match(/^x\*\*2\+y\*\*2\-\d+$/)) {
      // Circle centered at origin
      const r = Math.sqrt(parseFloat(simplifiedExpr.match(/\d+$/)[0]));
      drawCircle(
        ctx,
        { h: 0, k: 0, r },
        xmin,
        xmax,
        ymin,
        ymax,
        xToPixel,
        yToPixel
      );
      return;
    }
  } catch (error) {
    // If simplification fails, continue with the marching squares implementation
    console.log("Simplification failed:", error);
  }
}
