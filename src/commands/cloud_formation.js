const {Command, flags} = require('@heroku-cli/command')
const {CommandBase} = require(require('path').resolve( __dirname, './command_base'))
const HerokuTools = require('../utils/heroku_tools')
var TemplateEngine = require('../utils/template_engine')

var AWS = require('aws-sdk');
const { boolean } = require('@oclif/command/lib/flags')

class CloudFormationCommand extends CommandBase {

    init () {
        this.heroku_tools = new HerokuTools(this.heroku)
        
        this.iam = new AWS.IAM({apiVersion: '2010-05-08'});
      }


    fail(message) {
      throw message
    }

    async doGenerateCloudFormationTemplate(name, app_config, env_doc, force) {
      const vars = await this.makeTemplateVars(name, app_config, env_doc)
      var file_text = (new TemplateEngine).resolveTemplate('cloudformation.json', vars)
      this.writeOrReplaceFile('cloudformation.json', file_text, force)
      
      try {
        require('jsonlint').parse(file_text)
      } catch (err) {
        console.log(err)
      }
      return JSON.parse(file_text)
    }

    async run() {
        const {flags} = this.parse(CloudFormationCommand)
        const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')

       // get production env
       var app_config = await this.heroku_tools.getAppConfig(name)
       var env_doc = this.heroku_tools.getEnvDoc()

        const cf_obj = await this.doGenerateCloudFormationTemplate(name, app_config, env_doc, flags.force)
        console.log(cf_obj)
      }
      
}

CloudFormationCommand.description = `create cloudformation.json file from given app
...
This dueroku command uses templates/cloudformation.json.template to generate cloudformation.json to build a stack at AWS using CloudFormation
`

CloudFormationCommand.hidden = false

CloudFormationCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

module.exports = CloudFormationCommand
