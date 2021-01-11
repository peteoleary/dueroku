const {Command, flags} = require('@heroku-cli/command')
const {CommandBase} = require(require('path').resolve( __dirname, './command_base'))
const HerokuTools = require('../utils/heroku_tools')
var TemplateEngine = require('../utils/template_engine')

var AWS = require('aws-sdk');
const { boolean } = require('@oclif/command/lib/flags')

class ECSCommand extends CommandBase {

    init () {
        this.heroku_tools = new HerokuTools(this.heroku)
        this.ecr = new AWS.ECR({apiVersion: '2015-09-21', region: 'us-east-2'});
        this.iam = new AWS.IAM({apiVersion: '2010-05-08'});
      }


    fail(message) {
      throw message
    }

    async doCreateRepo(name, force) {
      var params = {
        repositoryName: name
       };

       // TODO: check to see if repo already exists and force if needed

       return await this.ecr.createRepository(params).promise()
    }

    async doCreateCluster() {
      // create autoScaling group
      // create capacityProvider
    }


    async doCreateTasks(name, config, force) {

      var tasks = await ecs.createTaskSet(params).promise()
    }

    async run() {
        const {flags} = this.parse(ECSCommand)
        const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')
        this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/blankcommand.js`)

        await this.doCreateRepo(name, flags.force)

        // create/use keyPair
        // create cluster
        // create task definitions
        
      }
      
}

ECSCommand.description = `Describe the command here
...
Extra documentation goes here
`

ECSCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

module.exports = ECSCommand
