const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const math = require("mathjs");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

// Helper function for normal distribution PDF
function normalPDF(x, mean, stdDev) {
  return (
    (1 / (stdDev * Math.sqrt(2 * Math.PI))) *
    Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2))
  );
}

// Helper function for binomial PMF
function binomialPMF(k, n, p) {
  return math.combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

// Helper function for Poisson PMF
function poissonPMF(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / math.factorial(k);
}

// Calculate distribution properties
function calculateDistributionProperties(distributionType, params) {
  if (distributionType === "normal") {
    const { mean, stdDev } = params;
    return {
      mean: mean,
      median: mean,
      mode: mean,
      variance: Math.pow(stdDev, 2),
      stdDev: stdDev,
      skewness: 0,
      kurtosis: 3,
    };
  } else if (distributionType === "binomial") {
    const { n, p } = params;
    return {
      mean: n * p,
      variance: n * p * (1 - p),
      stdDev: Math.sqrt(n * p * (1 - p)),
      skewness: (1 - 2 * p) / Math.sqrt(n * p * (1 - p)),
      kurtosis: 3 + (1 - 6 * p * (1 - p)) / (n * p * (1 - p)),
    };
  } else if (distributionType === "poisson") {
    const { lambda } = params;
    return {
      mean: lambda,
      variance: lambda,
      stdDev: Math.sqrt(lambda),
      skewness: 1 / Math.sqrt(lambda),
      kurtosis: 3 + 1 / lambda,
    };
  } else if (distributionType === "chi-square") {
    const { df } = params;
    return {
      mean: df,
      median: df * (1 - 2 / (9 * df)),
      mode: Math.max(0, df - 2),
      variance: 2 * df,
      stdDev: Math.sqrt(2 * df),
      skewness: Math.sqrt(8 / df),
      kurtosis: 3 + 12 / df,
    };
  }

  return {};
}

// Create a function to format properties into fields for embed
function formatPropertiesAsFields(properties) {
  const fields = [];

  for (const [key, value] of Object.entries(properties)) {
    fields.push({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value.toFixed(4),
      inline: true,
    });
  }

  return fields;
}

// Helper function to generate distribution graph - returns buffer directly instead of saving to file
async function generateDistributionGraph(distributionType, params) {
  const width = 800;
  const height = 400;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });

  let data = [];
  let labels = [];
  let chartConfig = {};

  if (distributionType === "normal") {
    const { mean, stdDev } = params;
    // Generate x values for normal distribution (mean ± 4 standard deviations)
    const start = mean - 4 * stdDev;
    const end = mean + 4 * stdDev;
    const step = (end - start) / 100;

    for (let x = start; x <= end; x += step) {
      labels.push(x.toFixed(2));
      data.push(normalPDF(x, mean, stdDev));
    }

    chartConfig = {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: `Normal Distribution (μ=${mean}, σ=${stdDev})`,
            data: data,
            borderColor: "rgba(220, 20, 60, 1)",
            backgroundColor: "rgba(220, 20, 60, 0.2)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Normal Distribution Probability Density Function",
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "x",
            },
          },
          y: {
            title: {
              display: true,
              text: "f(x)",
            },
            beginAtZero: true,
          },
        },
      },
    };
  } else if (distributionType === "binomial") {
    const { n, p } = params;

    for (let k = 0; k <= n; k++) {
      labels.push(k);
      data.push(binomialPMF(k, n, p));
    }

    chartConfig = {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: `Binomial Distribution (n=${n}, p=${p})`,
            data: data,
            backgroundColor: "rgba(220, 20, 60, 0.7)",
            borderColor: "rgba(220, 20, 60, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Binomial Distribution Probability Mass Function",
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Number of Successes (k)",
            },
          },
          y: {
            title: {
              display: true,
              text: "P(X = k)",
            },
            beginAtZero: true,
          },
        },
      },
    };
  } else if (distributionType === "poisson") {
    const { lambda } = params;
    // For Poisson, show probabilities for 0 to λ + 3*sqrt(λ) (covers most of the distribution)
    const maxK = Math.min(Math.ceil(lambda + 3 * Math.sqrt(lambda)), 30);

    for (let k = 0; k <= maxK; k++) {
      labels.push(k);
      data.push(poissonPMF(k, lambda));
    }

    chartConfig = {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: `Poisson Distribution (λ=${lambda})`,
            data: data,
            backgroundColor: "rgba(220, 20, 60, 0.7)",
            borderColor: "rgba(220, 20, 60, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Poisson Distribution Probability Mass Function",
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Number of Events (k)",
            },
          },
          y: {
            title: {
              display: true,
              text: "P(X = k)",
            },
            beginAtZero: true,
          },
        },
      },
    };
  } else if (distributionType === "chi-square") {
    const { df } = params;
    // For chi-square, show values from 0 to 3*df (covers most of the distribution)
    const end = Math.max(3 * df, 20);
    const step = end / 100;

    // Using gamma function to calculate chi-square PDF
    // PDF(x) = (x^(df/2-1) * e^(-x/2)) / (2^(df/2) * Γ(df/2))
    const calculateChiSquarePDF = (x, df) => {
      if (x <= 0) return 0;
      const gammaValue = math.gamma(df / 2);
      const numerator = Math.pow(x, df / 2 - 1) * Math.exp(-x / 2);
      const denominator = Math.pow(2, df / 2) * gammaValue;
      return numerator / denominator;
    };

    for (let x = 0.1; x <= end; x += step) {
      labels.push(x.toFixed(2));
      data.push(calculateChiSquarePDF(x, df));
    }

    chartConfig = {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: `Chi-Square Distribution (df=${df})`,
            data: data,
            borderColor: "rgba(220, 20, 60, 1)",
            backgroundColor: "rgba(220, 20, 60, 0.2)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Chi-Square Distribution Probability Density Function",
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "x",
            },
          },
          y: {
            title: {
              display: true,
              text: "f(x)",
            },
            beginAtZero: true,
          },
        },
      },
    };
  }

  // Render the chart directly to buffer
  return await chartJSNodeCanvas.renderToBuffer(chartConfig);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("distribution")
    .setDescription("Show properties of common probability distributions")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("normal")
        .setDescription("Normal (Gaussian) distribution properties")
        .addNumberOption((option) =>
          option
            .setName("mean")
            .setDescription("Mean (μ) of the distribution")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("stddev")
            .setDescription("Standard deviation (σ) of the distribution")
            .setRequired(true)
            .setMinValue(0.0001)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("binomial")
        .setDescription("Binomial distribution properties")
        .addIntegerOption((option) =>
          option
            .setName("n")
            .setDescription("Number of trials")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000)
        )
        .addNumberOption((option) =>
          option
            .setName("p")
            .setDescription("Probability of success on a single trial")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("poisson")
        .setDescription("Poisson distribution properties")
        .addNumberOption((option) =>
          option
            .setName("lambda")
            .setDescription("Average rate of occurrence (λ)")
            .setRequired(true)
            .setMinValue(0.0001)
            .setMaxValue(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("chi-square")
        .setDescription("Chi-square distribution properties")
        .addIntegerOption((option) =>
          option
            .setName("df")
            .setDescription("Degrees of freedom")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const subcommand = interaction.options.getSubcommand();

      // Create profile picture attachment
      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      // Create base embed
      const embed = new EmbedBuilder()
        .setColor("#DC143C")
        .setTimestamp()
        .setFooter({ text: "Mathcord", iconURL: "attachment://pfp.png" })
        .addFields({
          name: "Support Mathcord",
          value: "https://github.com/Gourdy09/mathcord",
        });

      let params = {};
      let properties = {};

      // Handle different distributions
      if (subcommand === "normal") {
        const mean = interaction.options.getNumber("mean");
        const stdDev = interaction.options.getNumber("stddev");

        params = { mean, stdDev };
        properties = calculateDistributionProperties("normal", params);

        embed
          .setTitle("Normal Distribution")
          .setDescription(
            `Properties of Normal Distribution with μ = ${mean} and σ = ${stdDev}`
          );
      } else if (subcommand === "binomial") {
        const n = interaction.options.getInteger("n");
        const p = interaction.options.getNumber("p");

        params = { n, p };
        properties = calculateDistributionProperties("binomial", params);

        embed
          .setTitle("Binomial Distribution")
          .setDescription(
            `Properties of Binomial Distribution with n = ${n} and p = ${p}`
          );
      } else if (subcommand === "poisson") {
        const lambda = interaction.options.getNumber("lambda");

        params = { lambda };
        properties = calculateDistributionProperties("poisson", params);

        embed
          .setTitle("Poisson Distribution")
          .setDescription(
            `Properties of Poisson Distribution with λ = ${lambda}`
          );
      } else if (subcommand === "chi-square") {
        const df = interaction.options.getInteger("df");

        params = { df };
        properties = calculateDistributionProperties("chi-square", params);

        embed
          .setTitle("Chi-Square Distribution")
          .setDescription(
            `Properties of Chi-Square Distribution with ${df} degrees of freedom`
          );
      }

      // Add properties to embed
      const propertyFields = formatPropertiesAsFields(properties);
      embed.addFields(propertyFields);

      // Generate chart directly to buffer
      const graphBuffer = await generateDistributionGraph(subcommand, params);

      // Create an attachment for the graph using buffer
      const graphAttachment = new AttachmentBuilder(graphBuffer, {
        name: `${subcommand}_distribution.png`,
      });

      // Add the graph to the embed
      embed.setImage(`attachment://${subcommand}_distribution.png`);

      // Send the response
      await interaction.editReply({
        content: "",
        embeds: [embed],
        files: [pfp, graphAttachment],
      });
    } catch (error) {
      // Create profile picture attachment
      const pfp = new AttachmentBuilder("./images/pfp.png", {
        name: "pfp.png",
      });

      // Create error embed
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
