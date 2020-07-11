const {Command, flags} = require('@heroku-cli/command')
var fs = require('fs'), ini = require('ini'), url = require("url")
var cli = require('cli-ux')

var TemplateEngine = require('../utils/template_engine')

class DockerComposeCommand extends Command {

  gitConfig() {
    return ini.parse(fs.readFileSync('./.git/config', 'utf-8'))
  }

  getCurrentHerokuAppName() {
    var config = this.gitConfig()

    if ("remote \"heroku\"" in config) {
      var url_parts = url.parse(config["remote \"heroku\""].url)

      // TODO: this is fragile
      return url_parts.pathname.split('.')[0].replace("\/", "")
    } else {
      return null
    }
  }

  fail(message) {
    throw message
  }

  async writeOrReplaceFile(relativeFilePath, file_text) {

    var do_write = true

    if (fs.existsSync(relativeFilePath)) {
      do_write = await cli.cli.confirm(`File ${relativeFilePath} exists, replace (Y/n)`)
    }
    if (do_write) {
      fs.writeFileSync(relativeFilePath, file_text)
    }
  }

  makeDockerFile(app_information) {
    var build_stack = app_information.body.build_stack.name

    // TODO: pick the template based on buildpack! 
    var file_text = (new TemplateEngine).resolveTemplate('Dockerfile.rails', app_information.body)

    this.writeOrReplaceFile('Dockerfile', file_text)
  }

  makeDockerComposeFile(app_information, app_addon_information) {
    // console.dir(`makeDockerComposeFile: ${app_addon_information.body}`)
  }

  async run() {
    const {flags} = this.parse(DockerComposeCommand)
    const name = flags.app || this.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')
    this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/docker_compose.js`)

    const app_information = await this.heroku.get(`/apps/${name}`)
    const app_addon_information = await this.heroku.get(`/apps/${name}/addons`)

    this.makeDockerFile(app_information)
    this.makeDockerComposeFile(app_information.body, app_addon_information)
  }
}

DockerComposeCommand.description = `Describe the command here
...
Extra documentation goes here
`

DockerComposeCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
}

module.exports = DockerComposeCommand
