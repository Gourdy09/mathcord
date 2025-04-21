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
    .setDescription("Graph mathematical functions")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("polynomial")
        .setDescription("Graph a polynomial function")
        .addStringOption((option) =>
          option
            .setName("equation")
            .setDescription("Polynomial equation (e.g., y = x^3 - 2x + 1)")
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
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("conic")
        .setDescription("Graph a conic section")
        .addStringOption((option) =>
          option
            .setName("equation")
            .setDescription("Conic equation (e.g., x^2/9 + y^2/4 = 1)")
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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("trig")
        .setDescription("Graph a trigonometric function")
        .addStringOption((option) =>
          option
            .setName("equation")
            .setDescription("Trig equation (e.g., y = 2sin(3x) + 1)")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("xmin")
            .setDescription("Minimum x value (default: -2π)")
            .setRequired(false)
        )
        .addNumberOption((option) =>
          option
            .setName("xmax")
            .setDescription("Maximum x value (default: 2π)")
            .setRequired(false)
        )
        .addNumberOption((option) =>
          option
            .setName("ymin")
            .setDescription("Minimum y value (default: -5)")
            .setRequired(false)
        )
        .addNumberOption((option) =>
          option
            .setName("ymax")
            .setDescription("Maximum y value (default: 5)")
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
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    try {
      const commonOptions = {
        equation: interaction.options.getString("equation"),
        xmin:
          interaction.options.getNumber("xmin") ??
          (subcommand === "trig" ? -2 * Math.PI : -10),
        xmax:
          interaction.options.getNumber("xmax") ??
          (subcommand === "trig" ? 2 * Math.PI : 10),
        ymin:
          interaction.options.getNumber("ymin") ??
          (subcommand === "trig" ? -5 : -10),
        ymax:
          interaction.options.getNumber("ymax") ??
          (subcommand === "trig" ? 5 : 10),
        color: interaction.options.getString("color") ?? "#C2185B",
        resolution: interaction.options.getInteger("resolution") ?? 500,
      };

      let graphFunction;
      switch (subcommand) {
        case "polynomial":
          graphFunction = handlePolynomial;
          break;
        case "conic":
          graphFunction = handleConic;
          break;
        case "trig":
          graphFunction = handleTrig;
          break;
        default:
          throw new Error("Invalid subcommand");
      }

      const { canvas, equation } = graphFunction(commonOptions);
      const pngBuffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(pngBuffer, {
        name: "graph.png",
      });
      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      const formattedEquation = formatEquation(equation);
      const graphEmbed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTitle(`\`${formattedEquation}\``)
        .setDescription(
          `Domain: \`[${formatNumber(commonOptions.xmin)}, ${formatNumber(
            commonOptions.xmax
          )}]\`, Range: \`[${formatNumber(commonOptions.ymin)}, ${formatNumber(
            commonOptions.ymax
          )}]\``
        )
        .addFields({
          name: "Support Mathcord",
          value: "https://github.com/Gourdy09/mathcord",
        })
        .setImage("attachment://graph.png")
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" });

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

function handlePolynomial({
  equation,
  xmin,
  xmax,
  ymin,
  ymax,
  color,
  resolution,
}) {
  // Strip leading 'y='
  let expr = equation.replace(/^\s*y\s*=\s*/i, "");
  // Explicit multiplication
  expr = expr
    .replace(/(\d)([a-zA-Z\(])/g, "$1*$2")
    .replace(/([a-zA-Z\)])(\d|\()/g, "$1*$2");

  // Compile with Math.js
  let comp;
  try {
    comp = parse(expr).compile();
    comp.evaluate({ x: (xmin + xmax) / 2 }); // Test with a sample value
  } catch (err) {
    console.error("Polynomial compile error:", err);
    return { canvas: createCanvas(800, 600), equation };
  }

  const f = (x) => {
    try {
      return comp.evaluate({ x });
    } catch {
      return NaN;
    }
  };

  // Canvas setup
  const width = 800,
    height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  setupCanvas(ctx, width, height);
  const { xToPixel, yToPixel } = drawGrid(
    ctx,
    xmin,
    xmax,
    ymin,
    ymax,
    width,
    height
  );

  // Draw function with consistent styling
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  const step = (xmax - xmin) / (resolution || 500);
  let firstPoint = true;
  let lastValid = false;

  ctx.beginPath();
  for (let x = xmin; x <= xmax; x += step) {
    const y = f(x);
    if (!isNaN(y) && isFinite(y) && y >= ymin && y <= ymax) {
      const px = xToPixel(x);
      const py = yToPixel(y);

      if (firstPoint || !lastValid) {
        ctx.moveTo(px, py);
        firstPoint = false;
      } else {
        ctx.lineTo(px, py);
      }
      lastValid = true;
    } else {
      lastValid = false;
    }
  }
  ctx.stroke();

  return { canvas, equation };
}

function handleConic(options) {
  const { equation, xmin, xmax, ymin, ymax, color } = options;
  const cleanedEq = cleanEquation(equation);
  const width = 800,
    height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  setupCanvas(ctx, width, height);
  const { xToPixel, yToPixel } = drawGrid(
    ctx,
    xmin,
    xmax,
    ymin,
    ymax,
    width,
    height
  );

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  const equationType = analyzeConic(cleanedEq);
  const params = extractConicParams(cleanedEq, equationType);

  ctx.beginPath();
  switch (equationType) {
    case "CIRCLE":
      drawCircle(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel);
      break;
    case "ELLIPSE":
      drawEllipse(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel);
      break;
    case "HYPERBOLA":
      drawHyperbola(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel);
      break;
    default:
      throw new Error("Unsupported conic type");
  }
  ctx.stroke();

  return { canvas, equation };
}

function handleTrig(options) {
  const { equation, xmin, xmax, ymin, ymax, color, resolution } = options;
  const cleanedEq = cleanEquation(equation.replace(/y\s*=\s*/, ""));
  const width = 800,
    height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  setupCanvas(ctx, width, height);
  const { xToPixel, yToPixel } = drawGrid(
    ctx,
    xmin,
    xmax,
    ymin,
    ymax,
    width,
    height
  );

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  const step = (xmax - xmin) / resolution;
  let firstPoint = true;
  let lastValid = false;

  ctx.beginPath();
  for (let x = xmin; x <= xmax; x += step) {
    try {
      const y = evaluate(cleanedEq, { x });
      if (isValidPoint(y, ymin, ymax)) {
        const px = xToPixel(x);
        const py = yToPixel(y);

        if (firstPoint || !lastValid) {
          ctx.moveTo(px, py);
          firstPoint = false;
        } else {
          ctx.lineTo(px, py);
        }
        lastValid = true;
      } else {
        lastValid = false;
      }
    } catch {
      lastValid = false;
    }
  }
  ctx.stroke();

  return { canvas, equation };
}

function setupCanvas(ctx, width, height) {
  ctx.fillStyle = "#F7F7F7";
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx, xmin, xmax, ymin, ymax, width, height) {
  const padding = 40;

  // Maintain 1:1 aspect ratio for the graph area
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;
  const xRange = xmax - xmin;
  const yRange = ymax - ymin;

  // Calculate aspect-correct dimensions
  const xPixelRatio = graphWidth / xRange;
  const yPixelRatio = graphHeight / yRange;
  const pixelRatio = Math.min(xPixelRatio, yPixelRatio);

  const adjGraphWidth = xRange * pixelRatio;
  const adjGraphHeight = yRange * pixelRatio;

  const xOffset = (graphWidth - adjGraphWidth) / 2;
  const yOffset = (graphHeight - adjGraphHeight) / 2;

  const xToPixel = (x) => padding + xOffset + (x - xmin) * pixelRatio;
  const yToPixel = (y) => height - padding - yOffset - (y - ymin) * pixelRatio;

  // Draw light gray background
  ctx.fillStyle = "#F7F7F7";
  ctx.fillRect(padding, padding, adjGraphWidth, adjGraphHeight);

  // Calculate appropriate tick spacing based on range
  const determineTickSpacing = (range) => {
    // For very small ranges
    if (range <= 2) return { major: 0.2, minor: 0.1 };
    // For small ranges
    if (range <= 5) return { major: 1, minor: 0.2 };
    // For medium ranges
    if (range <= 20) return { major: 2, minor: 0.5 };
    // For large ranges
    if (range <= 50) return { major: 10, minor: 2 };
    // For very large ranges
    if (range <= 100) return { major: 20, minor: 5 };
    // For extremely large ranges
    return { major: Math.ceil(range / 10), minor: Math.ceil(range / 50) };
  };

  const xTickSpacing = determineTickSpacing(xRange);
  const yTickSpacing = determineTickSpacing(yRange);

  // Draw minor grid lines
  ctx.strokeStyle = "#bfbfbf";
  ctx.lineWidth = 0.5;

  // Minor vertical lines
  for (
    let x = Math.floor(xmin / xTickSpacing.minor) * xTickSpacing.minor;
    x <= xmax;
    x += xTickSpacing.minor
  ) {
    const px = xToPixel(x);
    ctx.beginPath();
    ctx.moveTo(px, padding);
    ctx.lineTo(px, height - padding);
    ctx.stroke();
  }

  // Minor horizontal lines
  for (
    let y = Math.floor(ymin / yTickSpacing.minor) * yTickSpacing.minor;
    y <= ymax;
    y += yTickSpacing.minor
  ) {
    const py = yToPixel(y);
    ctx.beginPath();
    ctx.moveTo(padding, py);
    ctx.lineTo(width - padding, py);
    ctx.stroke();
  }

  // Draw major grid lines
  ctx.strokeStyle = "#a6a6a6";
  ctx.lineWidth = 1;

  // Major vertical lines
  for (
    let x = Math.floor(xmin / xTickSpacing.major) * xTickSpacing.major;
    x <= xmax;
    x += xTickSpacing.major
  ) {
    const px = xToPixel(x);
    ctx.beginPath();
    ctx.moveTo(px, padding);
    ctx.lineTo(px, height - padding);
    ctx.stroke();
  }

  // Major horizontal lines
  for (
    let y = Math.floor(ymin / yTickSpacing.major) * yTickSpacing.major;
    y <= ymax;
    y += yTickSpacing.major
  ) {
    const py = yToPixel(y);
    ctx.beginPath();
    ctx.moveTo(padding, py);
    ctx.lineTo(width - padding, py);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;

  // X-axis
  if (ymin <= 0 && ymax >= 0) {
    const y0 = yToPixel(0);
    ctx.beginPath();
    ctx.moveTo(padding, y0);
    ctx.lineTo(width - padding, y0);
    ctx.stroke();
  }

  // Y-axis
  if (xmin <= 0 && xmax >= 0) {
    const x0 = xToPixel(0);
    ctx.beginPath();
    ctx.moveTo(x0, padding);
    ctx.lineTo(x0, height - padding);
    ctx.stroke();
  }

  // Draw labels for major ticks
  ctx.fillStyle = "#404040";
  ctx.font = "12px Arial";

  // X-axis labels for major ticks
  for (
    let x = Math.floor(xmin / xTickSpacing.major) * xTickSpacing.major;
    x <= xmax;
    x += xTickSpacing.major
  ) {
    if (Math.abs(x) < 1e-10) x = 0; // Fix for -0 labels
    const px = xToPixel(x);
    ctx.textAlign = "center";

    // Format the label based on the value
    let label = x.toString();
    if (Math.abs(x) > 1000 || (Math.abs(x) < 0.01 && x !== 0)) {
      label = x.toExponential(1);
    } else if (Math.abs(x) < 1) {
      label = x.toFixed(1);
    }

    ctx.fillText(label, px, height - padding + 20);

    // Draw tick mark
    ctx.beginPath();
    ctx.moveTo(px, height - padding);
    ctx.lineTo(px, height - padding + 5);
    ctx.stroke();
  }

  // Y-axis labels for major ticks
  for (
    let y = Math.floor(ymin / yTickSpacing.major) * yTickSpacing.major;
    y <= ymax;
    y += yTickSpacing.major
  ) {
    if (Math.abs(y) < 1e-10) y = 0; // Fix for -0 labels
    const py = yToPixel(y);
    ctx.textAlign = "right";

    // Format the label based on the value
    let label = y.toString();
    if (Math.abs(y) > 1000 || (Math.abs(y) < 0.01 && y !== 0)) {
      label = y.toExponential(1);
    } else if (Math.abs(y) < 1) {
      label = y.toFixed(1);
    }

    ctx.fillText(label, padding - 10, py + 4);

    // Draw tick mark
    ctx.beginPath();
    ctx.moveTo(padding - 5, py);
    ctx.lineTo(padding, py);
    ctx.stroke();
  }

  return { xToPixel, yToPixel };
}

function analyzeConic(equation) {
  const stdEq = equation
    .replace(/\s+/g, "")
    .replace(/\//g, "÷")
    .replace(/\^/g, "**");

  // Circle pattern: x² + y² = r² or (x-h)² + (y-k)² = r²
  if (stdEq.match(/^(\(x[+-].+?\)|x)\*\*2\+(\(y[+-].+?\)|y)\*\*2=.+?$/)) {
    return "CIRCLE";
  }

  // Ellipse pattern: x²/a² + y²/b² = 1
  if (stdEq.match(/x\*\*2÷?\d*\.?\d*\+y\*\*2÷?\d*\.?\d*=1/)) {
    return "ELLIPSE";
  }

  // Hyperbola pattern: x²/a² - y²/b² = 1 or y²/a² - x²/b² = 1
  if (
    stdEq.match(
      /(x\*\*2÷?\d*\.?\d*-y\*\*2÷?\d*\.?\d*|y\*\*2÷?\d*\.?\d*-x\*\*2÷?\d*\.?\d*)=1/
    )
  ) {
    return "HYPERBOLA";
  }

  throw new Error("Unsupported conic equation");
}

function extractConicParams(equation, type) {
  const cleanEq = equation.replace(/\s+/g, "").replace(/\^/g, "**");
  const parts = cleanEq.split("=");

  if (type === "CIRCLE") {
    const radiusMatch = cleanEq.match(/=(\d+\.?\d*)/);
    return { h: 0, k: 0, r: Math.sqrt(parseFloat(radiusMatch[1])) };
  }

  if (type === "ELLIPSE") {
    const [xPart, yPart] = parts[0].split("+");
    const a = Math.sqrt(parseFloat(xPart.split("/")[1] || 1));
    const b = Math.sqrt(parseFloat(yPart.split("/")[1] || 1));
    return { a, b };
  }

  if (type === "HYPERBOLA") {
    const [positivePart, negativePart] = parts[0].split(/-(.+)/);
    const a = Math.sqrt(parseFloat(positivePart.split("/")[1] || 1));
    const b = Math.sqrt(parseFloat(negativePart.split("/")[1] || 1));
    return { a, b, horizontal: positivePart.includes("x") };
  }

  throw new Error("Unsupported conic type");
}

function drawCircle(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel) {
  ctx.beginPath();
  for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
    const x = params.h + params.r * Math.cos(angle);
    const y = params.k + params.r * Math.sin(angle);
    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
      ctx.lineTo(xToPixel(x), yToPixel(y));
    }
  }
  ctx.closePath();
}

function drawEllipse(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel) {
  ctx.beginPath();
  for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
    const x = params.a * Math.cos(angle);
    const y = params.b * Math.sin(angle);
    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
      ctx.lineTo(xToPixel(x), yToPixel(y));
    }
  }
  ctx.closePath();
}

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
  // Draw right branch
  ctx.beginPath();
  for (let t = -3; t <= 3; t += 0.05) {
    const x = params.a * Math.cosh(t);
    const y = params.b * Math.sinh(t);
    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
      ctx.lineTo(xToPixel(x), yToPixel(y));
    }
  }
  ctx.stroke();

  // Draw left branch as separate path
  ctx.beginPath();
  for (let t = -3; t <= 3; t += 0.05) {
    const x = -params.a * Math.cosh(t);
    const y = params.b * Math.sinh(t);
    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
      ctx.lineTo(xToPixel(x), yToPixel(y));
    }
  }
  ctx.stroke();
}

function drawCircle(ctx, params, xmin, xmax, ymin, ymax, xToPixel, yToPixel) {
  ctx.beginPath();
  for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
    const x = params.h + params.r * Math.cos(angle);
    const y = params.k + params.r * Math.sin(angle);
    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
      ctx.lineTo(xToPixel(x), yToPixel(y));
    }
  }
  ctx.closePath();
  ctx.stroke();
}

function cleanEquation(equation) {
  let result = equation;

  // Remove all whitespace
  result = result.replace(/\s+/g, "");

  // Replace ^ with ** for exponentiation
  result = result.replace(/\^/g, "**");

  // Handle implicit multiplication
  result = result.replace(/(\d)([a-zA-Z])/g, "$1*$2");

  result = result.replace(/([a-zA-Z])(\d)/g, "$1*$2");

  result = result.replace(/(\w|\))(\()/g, "$1*$2");

  result = result.replace(/(\))(\w)/g, "$1*$2");

  // Try to handle cases like 2(x-3) -> 2*(x-3)
  result = result.replace(/(\d)(\()/g, "$1*$2");

  return result;
}

function formatEquation(equation) {
  return equation
    .replace(/\*\*/g, "^")
    .replace(/\*/g, "")
    .replace(/([+\-*/=])/g, " $1 ")
    .trim();
}

function formatNumber(num) {
  return num.toFixed(2).replace(/\.?0+$/, "");
}

function getGridStep(range, divisions = 5) {
  const step = range / divisions;
  const log = Math.floor(Math.log10(step));
  const power = 10 ** log;
  return Math.ceil(step / power) * power;
}

function isValidPoint(y, ymin, ymax) {
  const valid = !isNaN(y) && isFinite(y) && y >= ymin && y <= ymax;
  if (!valid) {
    console.log(
      `Point validation failed: isNaN=${isNaN(y)}, isFinite=${isFinite(
        y
      )}, y=${y}, ymin=${ymin}, ymax=${ymax}`
    );
  }
  return valid;
}
