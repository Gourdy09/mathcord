const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const math = require('mathjs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('probability')
    .setDescription('Calculate probability-related values')
    .addSubcommand(subcommand =>
      subcommand
        .setName('combination')
        .setDescription('Calculate combinations (n choose k)')
        .addIntegerOption(option => 
          option.setName('n')
            .setDescription('Total number of items')
            .setRequired(true)
            .setMinValue(1))
        .addIntegerOption(option => 
          option.setName('k')
            .setDescription('Number of items to choose')
            .setRequired(true)
            .setMinValue(0)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('permutation')
        .setDescription('Calculate permutations (nPk)')
        .addIntegerOption(option => 
          option.setName('n')
            .setDescription('Total number of items')
            .setRequired(true)
            .setMinValue(1))
        .addIntegerOption(option => 
          option.setName('k')
            .setDescription('Number of items to arrange')
            .setRequired(true)
            .setMinValue(0)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('binomial')
        .setDescription('Calculate binomial probability P(X = k)')
        .addIntegerOption(option => 
          option.setName('n')
            .setDescription('Number of trials')
            .setRequired(true)
            .setMinValue(1))
        .addNumberOption(option => 
          option.setName('p')
            .setDescription('Probability of success on a single trial')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1))
        .addIntegerOption(option => 
          option.setName('k')
            .setDescription('Number of successes')
            .setRequired(true)
            .setMinValue(0))),

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
        .addFields(
          { name: "Support Mathcord", value: "https://github.com/Gourdy09/mathcord" }
        );

      // Handle different probability calculations
      if (subcommand === 'combination') {
        const n = interaction.options.getInteger('n');
        const k = interaction.options.getInteger('k');
        
        // Check if k is greater than n
        if (k > n) {
          throw new Error('k cannot be greater than n for combinations');
        }
        
        const result = math.combinations(n, k);
        
        embed.setTitle('Combination Calculation')
          .setDescription(`Calculating combinations: C(n,k) = n! / [k! × (n-k)!]`)
          .addFields(
            { name: 'n (total items)', value: `${n}`, inline: true },
            { name: 'k (items to choose)', value: `${k}`, inline: true },
            { name: 'C(n,k)', value: `${result.toLocaleString()}`, inline: false },
            { name: 'Formula Used', value: `C(${n},${k}) = ${n}! / [${k}! × (${n}-${k})!]`, inline: false }
          );
      } 
      else if (subcommand === 'permutation') {
        const n = interaction.options.getInteger('n');
        const k = interaction.options.getInteger('k');
        
        // Check if k is greater than n
        if (k > n) {
          throw new Error('k cannot be greater than n for permutations');
        }
        
        const result = math.permutations(n, k);
        
        embed.setTitle('Permutation Calculation')
          .setDescription(`Calculating permutations: P(n,k) = n! / (n-k)!`)
          .addFields(
            { name: 'n (total items)', value: `${n}`, inline: true },
            { name: 'k (items to arrange)', value: `${k}`, inline: true },
            { name: 'P(n,k)', value: `${result.toLocaleString()}`, inline: false },
            { name: 'Formula Used', value: `P(${n},${k}) = ${n}! / (${n}-${k})!`, inline: false }
          );
      }
      else if (subcommand === 'binomial') {
        const n = interaction.options.getInteger('n');
        const p = interaction.options.getNumber('p');
        const k = interaction.options.getInteger('k');
        
        // Check if k is greater than n
        if (k > n) {
          throw new Error('k (successes) cannot be greater than n (trials)');
        }
        
        // Calculate binomial probability
        const binomialCoeff = math.combinations(n, k);
        const probability = binomialCoeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
        
        embed.setTitle('Binomial Probability Calculation')
          .setDescription(`Calculating P(X = ${k}) for Binomial(n=${n}, p=${p})`)
          .addFields(
            { name: 'n (trials)', value: `${n}`, inline: true },
            { name: 'p (success probability)', value: `${p}`, inline: true },
            { name: 'k (successes)', value: `${k}`, inline: true },
            { name: 'P(X = k)', value: `${probability.toFixed(6)}`, inline: false },
            { name: 'Formula Used', value: `P(X = ${k}) = ${n}C${k} × ${p}^${k} × (1 - ${p})^${n - k}`, inline: false }
          );
      }
      
      // Send the response
      await interaction.editReply({
        content: "",
        embeds: [embed],
        files: [pfp],
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
        .addFields(
          { name: "Support Mathcord", value: "https://github.com/Gourdy09/mathcord" }
        )
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