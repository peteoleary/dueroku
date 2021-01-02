const {Command, flags} = require('@heroku-cli/command')
const path = require('path')
const {CommandBase} = require(path.resolve( __dirname, './command_base'))
const HerokuTools = require('../utils/heroku_tools')
const dotenv = require('dotenv')
var fs = require('fs')
var yaml = require('js-yaml')
var TemplateEngine = require('../utils/template_engine')

class CodeBuildCommand extends CommandBase {

    init () {
        this.heroku_tools = new HerokuTools(this.heroku)
      }

    async doMakeBuildSpecFile(name, force) {
        // get production env
        var app_config_response = await this.heroku_tools.getAppConfig(name)
        var app_config = app_config_response.body
        console.log(app_config)
        
        // look for env.yml
        var doc;
        try {
            doc = yaml.safeLoad(fs.readFileSync('./env.yml', 'utf8'));
            console.log('env.yml file found');
          } catch (e) {
            doc = {env: {}}
            console.log('env.yml file not found, no variables will be treated as build or secret');
          }
        var vars = {}
        vars['build_envs'] = []

          // figure out which ones are needed for build
        Object.keys(app_config).forEach(config => {
            if (doc.envs[config]) {
                if (doc.envs[config].includes('build')) {
                    if (doc.envs[config].includes('secret')) {
                        vars['build_envs'].push({key: config})
                    }
                    else {
                        vars['build_envs'].push({key: config, value: app_config[config]})
                    }
                }
            }
        })
        var file_text = (new TemplateEngine).resolveTemplate('buildspec.yml', vars)
        this.writeOrReplaceFile('buildspec.yml', file_text, force)
    }

    async doCreateCodebuildProject(name) {
        // create codebuild project on AWS
        // fill in secret env
    }

    async run() {
        const {flags} = this.parse(CodeBuildCommand)
        const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')
        this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/codebuild.js`)

        await this.doMakeBuildSpecFile(name, flags.force)
      }
      
}

CodeBuildCommand.description = `Describe the command here
...
Extra documentation goes here
`

CodeBuildCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

module.exports = CodeBuildCommand
