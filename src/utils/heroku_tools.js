const {Command, flags} = require('@heroku-cli/command')
var fs = require('fs'), ini = require('ini'), url = require("url")
const dotenv = require('dotenv')
const gemfile = require('gemfile-parser')

class HerokuTools {

    constructor(heroku) {
        this.heroku = heroku
    }

    async getAppInformation(name) {
        return this.heroku.get(`/apps/${name}`)
    }

    async getAppAddonInformation(name) {
        return this.heroku.get(`/apps/${name}/addons`)
    }

    readGemFile() {
        var gemFileContents = fs.readFileSync('./Gemfile')
        return gemfile.parseGemfile(gemFileContents.toString())
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
    
      getServicesFromProcFile(app_info_vars, deps) {
    
        var commands = this.readProcfile()
    
        var services = []
    
        for (var command in commands) {
    
          var ports = null
          if (command == 'web') {
            ports = '3000:3000'
          }
    
          var service_name = `${app_info_vars.name}_${command}`
    
          services.push(
            {
              name: service_name,
              // TODO: get correct versions
              ruby_version: '2.6.3',
              bundler_version: '2.1.4',
              build: {context: '.',
                dockerfile: `Dockerfile.${service_name}` },
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
    
        return services
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
}

module.exports = HerokuTools