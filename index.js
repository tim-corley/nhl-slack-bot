require('dotenv').config();
const fetch = require('node-fetch');
const SlackBot = require('slackbots');
const channel = 'general';
const teamID = 6; // BOSTON BRUINS
const previousGameURL = `https://statsapi.web.nhl.com/api/v1/teams/${teamID}?expand=team.schedule.previous`;
const todaysDate = getDate();
const currentStandings = `https://statsapi.web.nhl.com/api/v1/standings?date=${todaysDate}`;
// format date: yyyy-mm-dd, to pass into current standings call
function getDate() {
  const today = new Date();

  let dd = today.getDate();
  let mm = today.getMonth() + 1;
  const year = today.getFullYear();

  dd = dd < 10 ? '0' + dd : dd;
  mm = mm < 10 ? '0' + mm : mm;

  return [year, mm, dd].join('-');
}

// Initialize Bot
// TODO: see if you can use image instead of emoji (https://api.slack.com/methods/chat.postMessage)
const bot = new SlackBot({
  token: process.env.BOT_USER_TOKEN,
  name: 'bruins-bot',
});
const params = {
  icon_emoji: 'bear',
};

// Start Handler
bot.on('start', function() {
  bot.postMessageToChannel(channel, 'Get Bruins Score & Standings', params);
  console.log('bruins-bot is alive');
});

// Error Handler
bot.on('error', (err) => console.error(err));

// Message Handler
bot.on('message', function(data) {
  // ignore non-text messages
  if (data.type !== 'message') {
    return;
  }
  console.log(data);
  handleMessage(data.text);
});

// Respond to specific messages
function handleMessage(message) {
  if (message.includes(' win') || message.includes(' score')) {
    previousGameData();
  } else if (message.includes(' standings') || message.includes(' place')) {
    provideStandings();
  }
}

// Send score msg to channel
function provideScore(scoreData) {
  bot.postMessageToChannel(channel, scoreData, params);
}

// Send standings msg to channel
function provideStandings(standingsData) {
  bot.postMessageToChannel(channel, standingsData, params);
}

// Fetch data, format & return previous game results
async function previousGameData() {
  try {
    const res = await fetch(previousGameURL);
    const data = await res.json();
    const gameInfo = await data.teams[0].previousGameSchedule.dates[0].games[0].teams;
    const result = formatGameResults(gameInfo);
    provideScore(result);
  } catch (err) {
    console.log('Seems there was an error fetching the game data...');
  }
}

// Get the game score (array, Bruins score will be at index 0)
function gameScore(data) {
  return data.home.team.id === 6 ? [bruinsScore, opponentScore] = [data.home.score, data.away.score] : [bruinsScore, opponentScore] = [data.away.score, data.home.score];
}

// Determine if B's won or lost and return a cooresponding message
// TODO grab B's record and insert into the message ('(5-1) Bruins Won 4 - 2' | '(7 - 3) Bruins Lost 3 - 4')
function formatGameResults(data) {
  const result = gameScore(data);
  return result[0] > result[1] ? `Bruins Won 😃 ${result[0]} - ${result[1]}` : `Bruins Lost 😞 ${result[0]} - ${result[1]}`;
}

// Get standing // https://statsapi.web.nhl.com/api/v1/standings?date=2019-10-15


// BONUS: try integrating redis to cache data (instead of making api call if data < day old)
