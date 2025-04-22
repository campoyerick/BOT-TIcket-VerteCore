const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Exibe informações detalhadas do usuário"),
  async execute(interaction) {
    const member = interaction.guild.members.cache.get(interaction.user.id);

    // Nome e sobrenome simulados
    const usernameParts = interaction.user.username.split(" ");
    const firstName = usernameParts[0];
    const lastName = usernameParts.slice(1).join(" ") || "Sobrenome não disponível";

    // Data de entrada no servidor
    const joinedAt = member.joinedAt.toLocaleDateString("pt-BR");

    // Lista de cargos
    const roles = member.roles.cache
      .filter((role) => role.name !== "@everyone") // Remove o cargo padrão
      .map((role) => role.name)
      .join(", ") || "Nenhum cargo";

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Informações do Usuário")
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: "Nome", value: firstName, inline: true },
        { name: "Sobrenome", value: lastName, inline: true },
        { name: "Data de Entrada", value: joinedAt, inline: false },
      )
      .setFooter({
        text: `ID do usuário: ${interaction.user.id}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
