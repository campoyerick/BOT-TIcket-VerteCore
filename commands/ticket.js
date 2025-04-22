const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ComponentType,
  } = require("discord.js");
  const mysql = require("mysql2/promise");
  const yaml = require("yaml");
  const fs = require("fs");
  
  // Configuração
  const config = yaml.parse(fs.readFileSync("./config.yml", "utf8"));
  
  // Conexão com o banco de dados
  const db = mysql.createPool({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
  });
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("ticket")
      .setDescription("Exibe o sistema de tickets no canal atual."),
    async execute(interaction) {
      // Obter total de tickets do banco de dados
      const [rows] = await db.query("SELECT COUNT(*) AS total FROM tickets");
      const totalTickets = rows[0].total || 0;
  
      // Criar embed
      const embed = new EmbedBuilder()
        .setColor(config.ticket_system.embed.color)
        .setTitle(config.ticket_system.embed.title)
        .setDescription(config.ticket_system.embed.description)
        .setFooter({ text: config.ticket_system.embed.footer })
        .addFields(
          config.ticket_system.embed.fields.map((field) =>
            field.name === "Total de Tickets"
              ? { name: field.name, value: `${totalTickets}`, inline: field.inline }
              : field
          )
        );
  
      // Criar botões
      const row = new ActionRowBuilder();
      for (const buttonConfig of config.ticket_system.buttons) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(buttonConfig.name.toLowerCase().replace(/ /g, "_"))
            .setLabel(buttonConfig.name)
            .setStyle(buttonConfig.style)
        );
      }
  
      // Enviar mensagem
      await interaction.reply({ embeds: [embed], components: [row] });
    },
  };