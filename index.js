require('dotenv').config();

const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const blockedURLs = new Set();
const allowedChannels = new Set();
const urlsFile = path.join(__dirname, 'blocked-urls.json');
const channelsFile = path.join(__dirname, 'blocked-channels.json');

if (fs.existsSync(urlsFile)) {
    const savedURLs = JSON.parse(fs.readFileSync(urlsFile, 'utf8'));
    savedURLs.forEach(url => blockedURLs.add(url));
}
if (fs.existsSync(channelsFile)) {
    const savedChannels = JSON.parse(fs.readFileSync(channelsFile, 'utf8'));
    savedChannels.forEach(id => allowedChannels.add(id));
}

const commands = [
    new SlashCommandBuilder()
        .setName('blockurl')
        .setDescription('Bloqueia uma URL (admin apenas)')
        .addStringOption(option =>
            option.setName('url').setDescription('URL para bloquear').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('seturlchannel')
        .setDescription('Define canal para bloquear URLs (admin apenas)')
        .addChannelOption(option =>
            option.setName('channel').setDescription('Canal alvo').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
        .setName('removeurlchannel')
        .setDescription('Remove um canal da lista de bloqueio de URLs (admin apenas)')
        .addChannelOption(option =>
            option.setName('channel').setDescription('Canal a ser removido').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verifica se o bot está online')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Comandos registrados com sucesso.');
    } catch (err) {
        console.error('Erro ao registrar comandos:', err);
    }
})();

client.once(Events.ClientReady, () => {
    console.log(`🤖 Bot logado como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'blockurl') {
        const url = interaction.options.getString('url');
        blockedURLs.add(url);
        fs.writeFileSync(urlsFile, JSON.stringify([...blockedURLs]));
        await interaction.reply(`✅ URL bloqueada: \`${url}\``);
    } else if (commandName === 'seturlchannel') {
        const channel = interaction.options.getChannel('channel');
        allowedChannels.add(channel.id);
        fs.writeFileSync(channelsFile, JSON.stringify([...allowedChannels]));
        await interaction.reply(`✅ URLs agora serão bloqueadas em: ${channel}`);
    } else if (commandName === 'ping') {
        const sent = await interaction.reply({ content: 'Pong!', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 Pong! Latência: ${latency}ms`);
    }
    else if (commandName === 'removeurlchannel') {
        const channel = interaction.options.getChannel('channel');
        if (allowedChannels.has(channel.id)) {
            allowedChannels.delete(channel.id);
            fs.writeFileSync(channelsFile, JSON.stringify([...allowedChannels]));
            await interaction.reply(`✅ Canal removido da lista de bloqueio: ${channel}`);
        } else {
            await interaction.reply(`⚠️ Esse canal não está na lista de bloqueio.`);
        }
    }

});

client.on(Events.MessageCreate, message => {
    if (message.author.bot) return;
    if (!allowedChannels.has(message.channel.id)) return;

    for (const url of blockedURLs) {
        if (message.content.includes(url)) {
            message.delete().catch(() => {});
            message.channel.send(`🚫 É proíbido usar este link aqui, por favor envie em #riftes!, ${message.author}.`).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
            break;
        }
    }
});

client.login(TOKEN);

// ⚡ Servidor web para manter Render feliz
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_, res) => res.send('Bot está rodando.'));
app.listen(PORT, () => console.log(`🟢 Servidor web ouvindo na porta ${PORT}`));