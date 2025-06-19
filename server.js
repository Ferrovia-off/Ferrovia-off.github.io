require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const Strategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const scopes = ['identify', 'guilds.join'];

passport.use(new Strategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.REDIRECT_URI,
  scope: scopes
}, (accessToken, refreshToken, profile, cb) => {
  profile.accessToken = accessToken;
  return cb(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.login(process.env.BOT_TOKEN);

app.use(session({
  secret: 'random_secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('home', { user: req.user });
});

app.get('/login', passport.authenticate('discord'));

app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), async (req, res) => {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  try {
    await guild.members.add(req.user.id, { accessToken: req.user.accessToken });
    const member = await guild.members.fetch(req.user.id);
    await member.roles.add(process.env.ROLE_ID);
    res.redirect('/success');
  } catch (e) {
    console.error(e);
    res.redirect('/error');
  }
});

app.get('/success', (req, res) => res.send('🎉 Rôle attribué avec succès ! Tu peux fermer cette page.'));
app.get('/error', (req, res) => res.send('❌ Une erreur est survenue lors de l’attribution du rôle.'));

app.listen(PORT, () => {
  console.log(`🌐 Serveur démarré sur http://localhost:${PORT}`);
});
