const {Command} = require('@heroku-cli/command')
var fs = require('fs')

class CommandBase extends Command {
    fail(message) {
        throw message
      }
    
    async writeOrReplaceFile(relativeFilePath, file_text, force) {
        var do_write = true
        if (fs.existsSync(relativeFilePath) && !force) {
            do_write = await cli.cli.confirm(`File ${relativeFilePath} exists, replace (Y/n)`)
        }
        if (do_write) {
            fs.writeFileSync(relativeFilePath, file_text)
        }
    }
}

module.exports = {CommandBase}