require('dotenv').config();
const fetch = require('node-fetch');
const SlackBot = require('slackbots');
const channel = 'general';
const teamID = 6; // BOSTON BRUINS
const previousGameURL = `https://statsapi.web.nhl.com/api/v1/teams/${teamID}?expand=team.schedule.previous`;
const teamStatsURL = `https://statsapi.web.nhl.com/api/v1/teams/${teamID}?expand=team.stats`;
const todaysDate = getDate();
const currentStandingsURL = `https://statsapi.web.nhl.com/api/v1/standings?date=${todaysDate}`;
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
const bot = new SlackBot({
  token: process.env.BOT_USER_TOKEN,
  name: 'bruins-bot',
});
const params = {
  icon_url: '/img/boston-bruins-4-logo.png',
  // TODO try adding block kit formatting to standings - see: slack-notes.txt
  // block: [{'type': 'section', 'text': {'type': 'plain_text', 'text': 'Hello world'}}],
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
// TODO: make this more robust
function handleMessage(message) {
  if (message.includes(' win') || message.includes(' score')) {
    previousGameData();
  } else if (message.includes(' standings') || message.includes(' place')) {
    divisionalStandingsData();
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
    // get game data
    const res01 = await fetch(previousGameURL);
    const data01 = await res01.json();
    const gameInfo = await data01.teams[0].previousGameSchedule.dates[0].games[0];
    // get team stats
    const res02 = await fetch(teamStatsURL);
    const data02 = await res02.json();
    const teamInfo = await data02.teams[0].teamStats[0].splits[0].stat;
    const result = formatGameResults(gameInfo, teamInfo);
    provideScore(result);
  } catch (err) {
    console.log('Seems there was an error fetching the game data...');
  }
}

// Get the last game score (array, Bruins score will be at index 0)
function gameScore(data) {
  return data.teams.home.team.id === 6 ? [bruinsScore, opponentScore] = [data.teams.home.score, data.teams.away.score] : [bruinsScore, opponentScore] = [data.teams.away.score, data.teams.home.score];
}

// Get last game date ('mm.dd.yy')
function gameDate(data) {
  const splitAt = data.gameDate.indexOf('T');
  const justDate = data.gameDate.substring(0, splitAt);
  const dateArr = justDate.split('-');
  return [dateArr[1], dateArr[2], dateArr[0]].join('.');
}

// Get last game opponent
function gameOpponent(data) {
  return data.teams.home.team.id === 6 ? opponentName = data.teams.away.team.name : opponentName = data.teams.home.team.name;
}

// get team record & total points (wins, losses. ot. points)
function teamStats(info) {
  return `${info.wins}-${info.losses}-${info.ot} | ${info.pts}pts`;
}

// Determine if B's won or lost and return a cooresponding message
function formatGameResults(data, info) {
  const result = gameScore(data);
  const date = gameDate(data);
  const opponent = gameOpponent(data);
  const record = teamStats(info);
  return result[0] > result[1] ? `✅ *Bruins Won*\nScore: *${result[0]} - ${result[1]}*\nAgainst: *${opponent}*\nDate: *${date}*\nRecord: *${record}*` : `❌ *Bruins Lost*\nScore: *${result[0]} - ${result[1]}*\nAgainst: *${opponent}*\nDate: *${date}*\nRecord: *${record}*`;
}

// Get standing // https://statsapi.web.nhl.com/api/v1/standings?date=2019-10-15
// Fetch data, format & return previous game results
async function divisionalStandingsData() {
  try {
    // get game data
    const res01 = await fetch(currentStandingsURL);
    const data01 = await res01.json();
    const rankingInfo = await data01.records[1].teamRecords;
    const result = formatStandings(rankingInfo);
    provideStandings(result);
  } catch (err) {
    console.log('Seems there was an error fetching the standings data...');
  }
}

function formatStandings(data) {
  const teamRankings = [];
  data.forEach(function(team) {
    teamRankings.push([team.team.name, team.points]);
  });
  return `*1)* ${teamRankings[0][0]}  -  ${teamRankings[0][1]} pts\n*2)* ${teamRankings[1][0]}  -  ${teamRankings[1][1]} pts\n*3)* ${teamRankings[2][0]}  -  ${teamRankings[2][1]} pts\n*4)* ${teamRankings[3][0]}  -  ${teamRankings[3][1]}pts`;
}
// BONUS: try integrating redis to cache data (instead of making api call if data < day old)
