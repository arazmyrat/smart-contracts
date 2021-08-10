const daysInSeconds = days => days * 60 * 60 * 24
const nowInSeconds = () => Math.floor(Date.now() / 1000)
const nowInUTCSeconds = () => new Date((new Date()).toUTCString()).getTime()

module.exports = {
  daysInSeconds,
  nowInSeconds,
  nowInUTCSeconds,
}
