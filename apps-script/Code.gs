/**
 * MMM Poster: starts the GitHub posting job on time.
 * GitHub's own schedule can run hours late, so the sheet triggers it instead:
 * every hour automatically, or at once from the "MMM" menu.
 * Setup: docs/reliable-schedule.md
 */
const REPO = 'mattersmzansi-design/social-poster';
const WORKFLOW = 'post.yml';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MMM')
    .addItem('Post approved now', 'postNow')
    .addItem('Turn on hourly posting', 'installHourlyTrigger')
    .addToUi();
}

function runPoster() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Add GITHUB_TOKEN under Project Settings > Script properties');
  const resp = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
      payload: JSON.stringify({ ref: 'main', inputs: { dry_run: 'false' } }),
      muteHttpExceptions: true,
    }
  );
  if (resp.getResponseCode() !== 204) {
    throw new Error('GitHub said ' + resp.getResponseCode() + ': ' + resp.getContentText());
  }
}

function postNow() {
  runPoster();
  SpreadsheetApp.getUi().alert('Started. Results appear in the result column in about a minute.');
}

function installHourlyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runPoster')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('runPoster').timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert('Hourly posting is on.');
}
