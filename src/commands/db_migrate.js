const {Command, flags} = require('@heroku-cli/command')

class DBMigrateCommand extends Command {
    async run() {
        const {flags} = this.parse(DBMigrateCommand)
        console.log(flags)
      }
      
}

DBMigrateCommand.description = `Describe the command here
...
Extra documentation goes here
`

DBMigrateCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

module.exports = DBMigrateCommand
