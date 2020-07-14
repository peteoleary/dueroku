const {Command, flags} = require('@heroku-cli/command')
var fs = require('fs'), ini = require('ini'), url = require("url")
var cli = require('cli-ux')
const dotenv = require('dotenv')

var generator = require('generate-password');

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

  async writeOrReplaceFile(relativeFilePath, file_text, force) {
    var do_write = true
    if (fs.existsSync(relativeFilePath) && !force) {
      do_write = await cli.cli.confirm(`File ${relativeFilePath} exists, replace (Y/n)`)
    }
    if (do_write) {
      fs.writeFileSync(relativeFilePath, file_text)
    }
  }

  makeAppInformationVars(app_information) {
    return {
      name: app_information.name
    }
  }

  makeDockerFile(app_information_req, force) {
    var build_stack = app_information_req.body.build_stack.name

    // TODO: pick the template based on buildpack!
    var file_text = (new TemplateEngine).resolveTemplate('Dockerfile.rails', this.makeAppInformationVars(app_information_req.body))

    this.writeOrReplaceFile('Dockerfile', file_text, force)
  }

  isADatabase(add_on) {
    return add_on.addon_service.name == 'heroku-postgresql' || add_on.addon_service.name == 'heroku-redis'
  }

  analyzeDependancies(app_addon_information) {
    var database_add_ons = []
    app_addon_information.forEach(add_on => {
      if (this.isADatabase(add_on)) {
        database_add_ons.push({
          name: add_on.name,
          service_name: add_on.addon_service.name,
          config: add_on.config_vars
        })
      }
    })
    return database_add_ons
  }

  readProcfile() {
    var procfile_contents = fs.readFileSync('Procfile')
    if (!procfile_contents) {
      return {
        web: "bundle exec puma -C config/puma.rb"
      }
    } else {
      var lines = procfile_contents.toString().split("\n")
      var commands = {}
      lines.forEach(line => {
        var parts = line.split(':')
        commands[parts[0]] = parts[1].trim()
      })
      return commands 
    }
  }

  getBaseEnvFileName(app_info_vars) {
    return `${app_info_vars.name}.env`
  }

  addServicesFromProcFile(app_info_vars, deps) {

    var commands = this.readProcfile()

    for (var command in commands) {

      var ports = null
      if (command == 'web') {
        ports = '3000:3000'
      }

      app_info_vars.services.push(
        {
          name: `${app_info_vars.name}_${command}`,
          build: '.',
          ports: ports,
          command: commands[command],
          env_file: this.getBaseEnvFileName(app_info_vars),
          networks: [
            'frontend', 'backend'
          ],
          volumes: [
            `.:/${app_info_vars.name}`
          ],
          depends_on: 
            deps.map(d => {
              return d.name
            })
      })
    }
  }

  writeEnvFile(envFileName, envVars) {
    var lines = Object.keys(envVars).map(k => {
      return `${k}=${envVars[k]}`
    })

    fs.writeFileSync(envFileName, lines.join("\n"))
  }

  makeDatabaseEnv(databaseEnvFileName, app_info_vars, add_on) {
    var databaseEnv = {
      POSTGRES_USER: `${app_info_vars.name}_user`,
      POSTGRES_PASSWORD: generator.generate({
        length: 10,
        numbers: true}),
      POSTGRES_DB: `${app_info_vars.name}_db`
    }

    this.writeEnvFile(databaseEnvFileName, databaseEnv)

    return databaseEnv
  }

  makeDockerComposeFile(app_information_req, app_addon_information_req, force) {
    
    var app_info_vars = this.makeAppInformationVars(app_information_req.body)

    // analyze dependencies first
    var deps = this.analyzeDependancies(app_addon_information_req.body)

    app_info_vars.services = []
    this.addServicesFromProcFile(app_info_vars, deps)
    app_info_vars.volumes = []

    var base_dot_env = dotenv.parse(fs.readFileSync('./.env'))

    // default to a network for frontend components
    app_info_vars.networks = ['frontend']

    // if there are backend components, add a network
    if (deps.length > 0) {
      app_info_vars.networks.push('backend')
    }

    app_addon_information_req.body.forEach(add_on => {

      const volume_name = `${add_on.name}-data`

      if (add_on.addon_service.name == 'heroku-postgresql') {

        app_info_vars.volumes.push(volume_name)

        var databaseEnvFileName = `${add_on.name}.env`
        var databseEnv = this.makeDatabaseEnv(databaseEnvFileName, app_info_vars, add_on)

        app_info_vars.services.push({
          name: add_on.name,
          env_file: databaseEnvFileName,
          image: 'postgres:12.2',
          volumes: [
            `${volume_name}:/var/lib/postgresql/data`
          ],
          networks: [
            'backend'
          ]
        })

        base_dot_env['DATABASE_NAME'] = databseEnv['POSTGRES_DB']
        base_dot_env['DATABASE_USER'] = databseEnv['POSTGRES_USER']
        base_dot_env['DATABASE_PASSWORD'] = databseEnv['POSTGRES_PASSWORD']
        base_dot_env['DATABASE_HOST'] = add_on.name

      } else if (add_on.addon_service.name == 'heroku-redis') {
        app_info_vars.volumes.push(volume_name)

        app_info_vars.services.push({
          name: add_on.name,
          image: 'redis:5.0.8',
          command: 'redis-server',
          volumes: [
            `${volume_name}:/data`
          ],
          networks: [
            'backend'
          ]
        })

        base_dot_env['REDIS_URL'] = `redis://${add_on.name}`
      }

      // write docker.env file with modified variables
      this.writeEnvFile(this.getBaseEnvFileName(app_info_vars), base_dot_env)

      // add_one.config_vars
    })

    // TODO: pick the template based on buildpack!
    var file_text = (new TemplateEngine).resolveTemplate('docker-compose.yml', app_info_vars)

    this.writeOrReplaceFile('docker-compose.yml', file_text, force)
  }

  async run() {
    const {flags} = this.parse(DockerComposeCommand)
    const name = flags.app || this.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')
    this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/docker_compose.js`)

    const app_information_req = await this.heroku.get(`/apps/${name}`)
    const app_addon_information_req = await this.heroku.get(`/apps/${name}/addons`)

    this.makeDockerFile(app_information_req, flags.force)
    this.makeDockerComposeFile(app_information_req, app_addon_information_req, flags.force)
  }
}

DockerComposeCommand.description = `Describe the command here
...
Extra documentation goes here
`

DockerComposeCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

module.exports = DockerComposeCommand
