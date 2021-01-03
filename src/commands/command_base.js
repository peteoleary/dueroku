const {Command} = require('@heroku-cli/command')
var fs = require('fs')
var TemplateEngine = require('../utils/template_engine')

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
    async resolveAndWriteTemplate(template_name, vars, force) {
        var file_text = (new TemplateEngine).resolveTemplate(template_name, vars)
        this.writeOrReplaceFile(template_name, file_text, force)
    }
    
    async writeToJSONFile(file_name, o, force) {
        const file_text = JSON.stringify(o, null, 4)
        this.writeOrReplaceFile(file_name, file_text, force)
    }
}

module.exports = {CommandBase}