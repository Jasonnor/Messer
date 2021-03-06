const log = require("./util/log")
const fbAssets = require("./fb-assets")
const helpers = require("./util/helpers.js")

/**
 * Returns the parsed attachment object as a String
 * @param {Object} attachment
 * @return {String}
 */
function parseAttachment(attachment) {
  const attachmentType = attachment.type.replace(/_/g, " ")

  let messageBody = ""

  switch (attachmentType) {
    case "sticker":
      try {
        messageBody = fbAssets.facebookStickers[attachment.packID][attachment.stickerID]
      } catch (e) {
        messageBody = "sent a sticker (only viewable in browser)"
      }
      break
    case "file":
      messageBody = `${attachment.name}: ${attachment.url}`
      break
    case "photo":
      messageBody = `${attachment.filename}: ${attachment.facebookUrl}`
      break
    case "share":
      messageBody = `${attachment.facebookUrl}`
      break
    case "video":
      messageBody = `${attachment.filename}: ${attachment.url}`
      break
    default:
      messageBody = `sent [${attachmentType}] - only viewable in browser`
      break
  }

  return `[${attachmentType}] ${messageBody}`
}

/**
 * See the facebook-chat-api for detailed description of these events
 * https://github.com/Schmavery/facebook-chat-api/blob/master/DOCS.md#apilistencallback
 */
const eventHandlers = {
  /**
   * Handles the "message" event type
   * @param {Object} message - message to handle
   */
  message(message) {
    this.getThreadById(message.threadID)
      .then((thread) => {
        if (message.senderID === this.user.userID && message.threadID !== this.user.userID) return

        let sender = thread.name
        let messageBody = message.body

        if (message.attachments.length > 0) {
          messageBody = message.attachments.reduce((prev, curr) => `${prev} ${parseAttachment(curr)};`, "")
        }

        if (message.isGroup) {
          this.getThreadById(message.senderID, true).then((threadSender) => {
            sender = `(${thread.name}) ${threadSender.name}` // Get true sender name from list
            log(`${this.lastThread !== message.threadID ? "\n" : ""}${sender} - ${messageBody}`, thread.color)
          }).catch(function () {
            sender = `(${thread.name}) ${sender.name}` // Sender not in list, keep origin
            log(`${this.lastThread !== message.threadID ? "\n" : ""}${sender} - ${messageBody}`, thread.color)
          })
        } else {
          log(`${this.lastThread !== message.threadID ? "\n" : ""}${sender} - ${messageBody}`, thread.color)
        }

        this.unreadMessagesCount += 1

        helpers.notifyTerminal(this.unreadMessagesCount) // Terminal notification in title

        process.stderr.write("\x07") // Terminal notification
        this.lastThread = message.threadID
      })
      .catch(err => log(err))
  },
  /**
   * Handles the "event" event type
   * @param {Object} ev - event to handle
   */
  event(ev) {
    this.getThreadById(ev.threadID)
      .then((thread) => {
        let logMessage = "An event happened!"

        switch (ev.logMessageType) {
          case "log:thread-color":
            Object.assign(thread, { color: `#${ev.logMessageData.theme_color.slice(2)}` })
            logMessage = ev.logMessageBody
            break
          default:
            break
        }

        log(logMessage)
      })
  },
  typ() {

  },
  read_receipt() {

  },
  message_reaction() {

  },
}

module.exports = eventHandlers
