const {Command, flags} = require('@heroku-cli/command')
const HerokuTools = require('../utils/heroku_tools')
const dotenv = require('dotenv')
var fs = require('fs')
const massive = require('massive');

class DBMigrateCommand extends Command {

    init () {
        this.heroku_tools = new HerokuTools(this.heroku)
      }

    async doUpload(table_name) {
      var base_dot_env = dotenv.parse(fs.readFileSync('./.env'))
      
      /*
      app_addon_information_req.body.forEach(add_on => {
        if (add_on.addon_service.name == 'heroku-postgresql') {
        }
      })
      */

    const from_db = await massive({
      host: base_dot_env.DATABASE_HOST,
      user: base_dot_env.DATABASE_USER,
      database: base_dot_env.DATABASE_NAME,
      port: 5432
    });

    const to_db = await massive({
      host: base_dot_env.HEROKU_DB_HOST,
      user: base_dot_env.HEROKU_DB_USER,
      database: base_dot_env.HEROKU_DB_NAME,
      password: base_dot_env.HEROKU_DB_PASSWORD,
      ssl: {
        require: true,
        // Ref.: https://github.com/brianc/node-postgres/issues/2009
        rejectUnauthorized: false,
      },
      port: 5432
    });

    const rows = await from_db[table_name].find()

    await to_db[table_name].insert(rows)
    
    }

    async run() {
        const {flags} = this.parse(DBMigrateCommand)
        const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')
        this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/db_migrate.js`)

        // const app_information_req = await this.heroku_tools.getAppInformation(name)
        // const app_addon_information_req = await this.heroku_tools.getAppAddonInformation(name)

        // TODO: handle direction flag
        this.doUpload(flags.table)
      }
      
}

DBMigrateCommand.description = `Describe the command here
...
Extra documentation goes here
`

DBMigrateCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  table: flags.string({char: 't', description: 'table to operate on'}),
  direction: flags.string({char: 'd', description: 'direction: down or up'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

module.exports = DBMigrateCommand
