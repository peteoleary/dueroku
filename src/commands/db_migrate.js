const {Command, flags} = require('@heroku-cli/command')
const HerokuTools = require('../utils/heroku_tools')
const dotenv = require('dotenv')
var fs = require('fs')
const massive = require('massive');

class DBMigrateCommand extends Command {

    init () {
        this.heroku_tools = new HerokuTools(this.heroku)
      }

    async doCopyTable(table_name, direction) {
      var base_dot_env = dotenv.parse(fs.readFileSync('./.env'))
      
      /*
      app_addon_information_req.body.forEach(add_on => {
        if (add_on.addon_service.name == 'heroku-postgresql') {
        }
      })
      */

    const local_db = await massive({
      host: base_dot_env.DATABASE_HOST,
      user: base_dot_env.DATABASE_USER,
      database: base_dot_env.DATABASE_NAME,
      port: 5432
    });

    const remote_db = await massive({
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

    let to_db = local_db
    let from_db = remote_db

    if (direction == 'up') {
      to_db = remote_db
      from_db = local_db
    }

    const rows = await from_db[table_name].find()

    const chunk_size = 500
    var i = 0

    while (i < rows.length) {
      console.log(`loading ${table_name}, i=${i}`)
      await to_db[table_name].insert(rows.slice(i, i + chunk_size))
      i+= chunk_size
    }

    // TODO: do this in chunks so we don't blow up pg-promise
    }

    fail(message) {
      throw message
    }

    async run() {
        const {flags} = this.parse(DBMigrateCommand)
        const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')
        this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/db_migrate.js`)

        // const app_information_req = await this.heroku_tools.getAppInformation(name)
        // const app_addon_information_req = await this.heroku_tools.getAppAddonInformation(name)

        // TODO: handle direction flag
        this.doCopyTable(flags.table, flags.direction)
      }
      
}

DBMigrateCommand.description = `copy data to and from local db table to Heroku hosted database
...
Bulk copy rows to or from cloud database. WARNING! This command has only been tested with Postgres databases and it can (obviously) mess up a database in a hurry. Use much caution.

Requires DATABASE_HOST, DATABASE_USER and DATABASE_NAME env set for local db
Requires HEROKU_DB_HOST, HEROKU_DB_USER, HEROKU_DB_NAME and HEROKU_DB_PASSWORD set for Heroku database
`

DBMigrateCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  table: flags.string({char: 't', description: 'table to operate on'}),
  direction: flags.string({char: 'd', description: 'direction: down or up'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

// TODO: this doesn't seem to work?
DBMigrateCommand.topic = 'dueroku'
DBMigrateCommand.command = 'dbmigrate'

DBMigrateCommand.hidden = false

module.exports = DBMigrateCommand
