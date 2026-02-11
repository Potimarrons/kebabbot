require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const { REST } = require('@discordjs/rest');

// --- Config ---
const DISCORD_TOKEN = process.env.DISCORD_API_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const API_SECRET = process.env.API_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const rest = new REST({ version: '10', requestTimeout: 30000 }) // 30 secondes
    .setToken(DISCORD_TOKEN);

// --- Discord Bot ---
const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

bot.once('clientReady', () => {
    const channel = bot.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('Salut les kebabs ! 🍔')
        .setDescription('Je viens juste vous informer que je suis en ligne !')
        .setColor(0x00FF00) // vert
        .setTimestamp() // ajoute l'heure
        .setFooter({ text: 'Le bon T4' });

    sendSafe(channel, { embeds: [embed] });

    bot.user.setPresence({
        activities: [
            { name: 'les kebabs mijoter 🍲', type: 0 },
        ],
        status: 'idle' // online, idle, dnd, invisible
    });


});

// --- Supabase Realtime ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const kebabChannel = supabase.channel('public:KebabsData');

async function sendSafe(channel, content, retries = 5) {
    try {
        await channel.send(content);
    } catch (err) {
        console.warn('⚠️ Envoi échoué :', err.message);
        if (retries > 0) {
            console.log(`⏳ Nouvelle tentative dans 5s (${retries} essais restants)`);
            setTimeout(() => sendSafe(channel, content, retries - 1), 5000);
        } else {
            console.error('❌ Impossible d’envoyer après plusieurs essais.');
        }
    }
}

// INSERT (nouveau kebab)
kebabChannel.on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'KebabsData',
}, payload => {
    const channel = bot.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    const data = payload.new;
    sendSafe(channel, `Un nouveau kebab est apparu ||<@&1465405142160642313>||`);
    const embed = new EmbedBuilder()
        .setTitle(data.title || "🍔 Nouveau Kebab !")
        .setDescription(data.short_description || "Pas de description 🐢")
        .addFields(
            { name: 'Participants', value: String(data.users_inside || 0), inline: true },
            { name: 'Tags', value: (data.tags && data.tags.length > 0) ? data.tags.join(', ') : 'Aucun', inline: false }
        )
        .setColor(0x00FF00) // vert pour nouveau
        .setTimestamp(data.created_at ? new Date(data.created_at) : new Date())

    sendSafe(channel, { embeds: [embed] });
});

// UPDATE (kebab modifié)
kebabChannel.on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'KebabsData',
}, payload => {
    const channel = bot.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    const data = payload.new;
    sendSafe(channel, `Un kebab a été modifié ||<@&1465405142160642313>||`);
    const embed = new EmbedBuilder()
        .setTitle(data.title || "🍔 Kebab modifié !")
        .setDescription(data.short_description || "Pas de description 🐢")
        .addFields(
            { name: 'Participants', value: String(data.users_inside || 0), inline: true },
            { name: 'Tags', value: (data.tags && data.tags.length > 0) ? data.tags.join(', ') : 'Aucun', inline: false }
        )
        .setColor(0xFFA500) // orange pour modification
        .setTimestamp(data.last_edit_at ? new Date(data.last_edit_at) : new Date())

    sendSafe(channel, { embeds: [embed] });
});

// DELETE (kebab supprimé)
kebabChannel.on('postgres_changes', {
    event: 'DELETE',
    schema: 'public',
    table: 'KebabsData',
}, payload => {
    const channel = bot.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    const data = payload.old; // pour DELETE, les anciennes valeurs sont dans payload.old
    sendSafe(channel, `Un kebab a été supprimé ||<@&1465405142160642313>||`);
    const embed = new EmbedBuilder()
        .setTitle(data.title || "❌ Kebab supprimé !")
        .setColor(0xFF0000) // rouge pour suppression
        .setTimestamp(new Date())

    sendSafe(channel, { embeds: [embed] });
});

// S'abonner
kebabChannel.subscribe();

// --- Express endpoint pour ton site ---
/*const app = express();
app.use(express.json());

app.post('/send', (req, res) => {
    const auth = req.headers.authorization;
    if (auth !== API_SECRET) return res.status(403).json({ error: 'unauthorized' });

    const { message, title, color } = req.body; // optionnel : personnaliser

    const channel = bot.channels.cache.get(CHANNEL_ID);
    if (!channel) return res.status(404).json({ error: 'channel not found' });

    const embed = new EmbedBuilder()
        .setTitle(title || 'Message du site')
        .setDescription(message)
        .setColor(color ? parseInt(color.replace('#', ''), 16) : 0x00FF00)
        .setTimestamp();

    channel.send({ embeds: [embed] });

    res.json({ status: 'ok' });
});

app.get('/ping', (req, res) => {
  console.log('🏓 Ping reçu ! La tortue est éveillée.');
  res.send('Pong 🐢');
});

// --- Lancer Express ---
const PORT = process.env.PORT || 10000;*/

// --- Démarrer le bot Discord ---
bot.login(DISCORD_TOKEN);
