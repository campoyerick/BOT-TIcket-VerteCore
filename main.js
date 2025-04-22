const {
    Client,
    GatewayIntentBits,
    ActivityType,
    Collection,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,

} = require("discord.js");
const yaml = require("yaml");
const fs = require("fs");
const mysql = require("mysql2/promise");

const config = yaml.parse(fs.readFileSync("./config.yml", "utf8"));

if (!config.token) {
    console.error("Erro: Token do bot não encontrado no arquivo config.yml!");
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const db = mysql.createPool({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
});

client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

console.log(config.ascii);

client.once("ready", () => {
    console.log(`Bot conectado como ${client.user.tag}`);

    client.user.setPresence({
        status: config.status,
        activities: [
            {
                name: "Texto do status",
                type: ActivityType.Watching,
            },
        ],
    });
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
        const buttonConfig = config.ticket_system.buttons.find(
            (button) => button.name.toLowerCase().replace(/ /g, "_") === interaction.customId
        );

        if (!buttonConfig) return;

        // Criar modal para coletar o motivo do ticket
        const modal = new ModalBuilder()
            .setCustomId("ticket_modal")
            .setTitle("Abrir Ticket");

        const motivoInput = new TextInputBuilder()
            .setCustomId("motivo")
            .setLabel("Por favor, descreva o motivo do seu ticket.")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(motivoInput);

        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        const filter = (i) => i.customId === "ticket_modal" && i.user.id === interaction.user.id;
        const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(() => {
            interaction.followUp({ content: "Você não forneceu um motivo a tempo.", ephemeral: true });
            return;
        });

        if (modalInteraction) {
            const motivo = modalInteraction.fields.getTextInputValue("motivo");

            // Criar canal para o ticket
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: 0, // Guild text channel
                parent: buttonConfig.category,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ["ViewChannel"],
                    },
                    {
                        id: interaction.user.id,
                        allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
                    },
                ],
            });

            // Inserir no banco de dados
            await db.query("INSERT INTO tickets (user_id, channel_id) VALUES (?, ?)", [
                interaction.user.id,
                channel.id,
            ]);

            // Criar embed para a mensagem inicial no ticket
            const ticketEmbed = new EmbedBuilder()
                .setColor(config.ticket_system.ticket_message.color)
                .setTitle(`${config.ticket_system.ticket_message.title} #${Math.floor(Math.random() * 10000)}`) // Gera número de ticket
                .addFields({
                    name: config.ticket_system.ticket_message.reason_label,
                    value: `\`\`\`${motivo}\`\`\``,
                    inline: false,
                })
                .setDescription(config.ticket_system.ticket_message.description)
                .setFooter({ text: config.ticket_system.ticket_message.footer })
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

            // Enviar embed no canal criado
            const ticketMessage = await channel.send({
                content: `${interaction.user} | <@&${buttonConfig.role}>`, // Mencionar o usuário e o cargo correto
                embeds: [ticketEmbed],
            });

            // Criar embed de confirmação
            const confirmationEmbed = new EmbedBuilder()
                .setColor("#03a8f8")
                .setTitle("Ticket Aberto")
                .setDescription(`Seu ticket foi aberto com sucesso!\n\n**Informações:**\nAuthor: <@${interaction.user.id}>\nTicket: Ticket-${Math.floor(Math.random() * 10000)}\nCanal: <#${channel.id}>`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

            // Resposta ao usuário com a embed de confirmação
            await modalInteraction.reply({
                embeds: [confirmationEmbed],
                ephemeral: true,
            });
        }
    }

    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) command.execute(interaction);
    }
});

client.on("guildCreate", (guild) => {
    console.log(`Bot adicionado ao servidor: ${guild.name}`);
});

client.login(config.token).catch((error) => {
    console.error("Erro ao conectar o bot:", error);
});