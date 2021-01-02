const {Command, flags} = require('@heroku-cli/command')
const HerokuTools = require('../utils/heroku_tools')
const dotenv = require('dotenv')
var fs = require('fs')

class BlankCommand extends Command {

    init () {
        this.heroku_tools = new HerokuTools(this.heroku)
      }


    fail(message) {
      throw message
    }

    async run() {
        const {flags} = this.parse(BlankCommand)
        const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')
        this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/blankcommand.js`)

        // TODO: implement command here
      }
      
}

BlankCommand.description = `Describe the command here
...
Extra documentation goes here
`

BlankCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

module.exports = BlankCommand
