const {flags} = require('@heroku-cli/command')
const path = require('path')
const {CommandBase} = require(path.resolve( __dirname, './command_base'))
var fs = require('fs'), ini = require('ini'), url = require("url")
var cli = require('cli-ux')
const dotenv = require('dotenv')
const gemfile = require('gemfile-parser')

var generator = require('generate-password');

var TemplateEngine = require('../utils/template_engine')
const HerokuTools = require('../utils/heroku_tools')

class DockerComposeCommand extends CommandBase {

  init () {
    this.heroku_tools = new HerokuTools(this.heroku)
  }

  makeDockerFiles(app_info_vars, force) {

    app_info_vars.services.forEach(service => {
      // TODO: pick the template based on buildpack!

      if (service.build) {
        var file_text = (new TemplateEngine).resolveTemplate('Dockerfile.rails', service)

        // TODO: if this is a Ruby app, read the Gemfile
        var gem_info = this.heroku_tools.readGemFile()

        this.writeOrReplaceFile(service.build.dockerfile, file_text, force)
      }
    })
  }

  writeEnvFile(envFileName, envVars) {
    var lines = Object.keys(envVars).map(k => {
      return `${k}=${envVars[k]}`
    })

    fs.writeFileSync(envFileName, lines.join("\n"))
  }

  makeDatabaseEnv(databaseEnvFileName, app_info_vars, add_on) {

    var databaseEnv

    if (fs.existsSync(databaseEnvFileName)) {
      databaseEnv = dotenv.parse(fs.readFileSync(databaseEnvFileName))
      console.info(`database environment file ${databaseEnvFileName} exists, re-using it so we don't lose the db password`)
    } else {
      databaseEnv = {
        POSTGRES_USER: `${app_info_vars.name}_user`,
        POSTGRES_PASSWORD: generator.generate({
          length: 10,
          numbers: true}),
        POSTGRES_DB: `${app_info_vars.name}_db`
      }
      this.writeEnvFile(databaseEnvFileName, databaseEnv)
  }

    return databaseEnv
  }

  makeDockerComposeFile(app_information_req, app_addon_information_req, force) {
    
    var app_info_vars = {
      name: app_information_req.body.name,
      // TODO: handle multiple buildpacks per app
      build_stack: app_information_req.body.build_stack.name
    }

    // analyze dependencies first
    var deps = this.heroku_tools.analyzeDependancies(app_addon_information_req.body)

    app_info_vars.services = this.heroku_tools.getServicesFromProcFile(app_info_vars, deps)
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

      // add_one.config_vars
    })

    // TODO: only add these if it's a RACK/RAILS app
    base_dot_env['RACK_ENV'] = 'production'
    base_dot_env['RAILS_ENV'] = 'production'
    // TODO: check to make sure secret key exists in .env

    // write docker.env file with modified variables
    this.writeEnvFile(this.heroku_tools.getBaseEnvFileName(app_info_vars), base_dot_env)

    // TODO: pick the template based on buildpack!
    var file_text = (new TemplateEngine).resolveTemplate('docker-compose.yml', app_info_vars)

    this.writeOrReplaceFile('docker-compose.yml', file_text, force)

    return app_info_vars
  }

  async run() {
    const {flags} = this.parse(DockerComposeCommand)
    const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')

    const app_information_req = await this.heroku_tools.getAppInformation(name)
    const app_addon_information_req = await this.heroku_tools.getAppAddonInformation(name)

    var app_info_vars = this.makeDockerComposeFile(app_information_req, app_addon_information_req, flags.force)
    this.makeDockerFiles(app_info_vars, flags.force)
  }
}

DockerComposeCommand.description = `create Dockerfile and docker-compose.yml from specififed project
...
Dueroku command uses templates/Dockerfile.rails.template and templates/docker-compose.yml.template to create files for use with Docker
`

DockerComposeCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'})
}

DockerComposeCommand.hidden = false

module.exports = DockerComposeCommand
