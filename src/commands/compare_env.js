const {Command, flags} = require('@heroku-cli/command')
const HerokuTools = require('../utils/heroku_tools')
const dotenv = require('dotenv')
const fs = require('fs')
const sets = require('set-operations')

class CompareEnvCommand extends Command {

    init () {
        this.heroku_tools = new HerokuTools(this.heroku)
      }


    fail(message) {
      throw message
    }

    async print_intersect(intersect, a, b) {
      for (let i = 0; i < intersect.length; i++) {
        const key = intersect[i]
        if (a[key] != b[key]) console.log (`${key}\t${a[key]}\t${b[key]}`)
      }
    }

    async print_difference(difference, a, b) {
      for (let i = 0; i < difference.length; i++) {
        const key = difference[i]
        console.log (`${key}\t${a[key]}`)
      }
    }

    async doCompareEnv(a, b) {
        const config_a = await this.heroku_tools.getAppConfig(a)  
        const config_b = await this.heroku_tools.getAppConfig(b) 
        console.log(`--- INTERSECTION ---`)
        console.log(`key\t${a}\t${b}`)
        await this.print_intersect(Array.from(sets.intersection(Object.keys(config_a), Object.keys(config_b))), config_a, config_b)
        
        console.log(`--- DIFFERENCE ---`)
        console.log(`key\t${a}`)
        await this.print_difference(Array.from(sets.difference(Object.keys(config_a), Object.keys(config_b))), config_a, config_b)

        console.log(`--- DIFFERENCE ---`)
        console.log(`key\t${b}`)
        await this.print_difference(Array.from(sets.difference(Object.keys(config_b), Object.keys(config_a))), config_b, config_a)
    }

    async run() {
        const {flags} = this.parse(CompareEnvCommand)
        const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')

        // const app_information_req = await this.heroku_tools.getAppInformation(name)
        // const app_addon_information_req = await this.heroku_tools.getAppAddonInformation(name)

        // TODO: get the apps from flags if there
        await this.doCompareEnv(name[0], name[1])
      }
      
}

CompareEnvCommand.description = `compare env between two Heroku apps
Compare ENV variables between two Heroku apps
`

CompareEnvCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  bpp: flags.string({char: 'b', description: 'second app to operate on'})
}

// TODO: this doesn't seem to work?
CompareEnvCommand.topic = 'dueroku'
CompareEnvCommand.command = 'compare_env'

CompareEnvCommand.hidden = false

module.exports = CompareEnvCommand
