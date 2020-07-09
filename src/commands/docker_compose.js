const {Command, flags} = require('@heroku-cli/command')

class DockerComposeCommand extends Command {
  async run() {
    const {flags} = this.parse(DockerComposeCommand)
    console.dir(flags)
    const name = flags.app || 'world' // TODO: get the current app here
    this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/docker_compose.js`)

    const response = await this.heroku.get(`/apps/${name}`)
    console.dir(response)
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
