const {Command} = require('@heroku-cli/command')
var fs = require('fs')
var TemplateEngine = require('../utils/template_engine')

class CommandBase extends Command {
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
    async resolveAndWriteTemplate(template_name, vars, force) {
        var file_text = (new TemplateEngine).resolveTemplate(template_name, vars)
        this.writeOrReplaceFile(template_name, file_text, force)
    }
    
    async writeToJSONFile(file_name, o, force) {
        const file_text = JSON.stringify(o, null, 4)
        this.writeOrReplaceFile(file_name, file_text, force)
    }

    makeTemplateVars(app_config, env_doc) {
        var vars = {}
        // build_envs will be written into buildspec.yml with secret values removed so it can be checked into Github
        vars['build_envs'] = []
        // run_envs contain all the environment variables but are not written to file unless --debug is used
        vars['run_envs'] = []
        // secret_envs contain just the secret values and are not written to file unless --debug is used 
        vars['secret_envs'] = []

          // figure out which ones are secret or needed for build
        Object.keys(app_config).forEach(config => {
            const keyAndValue = {key: config, value: app_config[config], type: 'PLAINTEXT'}
            if (env_doc.envs[config]) {
                const is_secret = env_doc.envs[config].includes('secret')
                if (is_secret) {
                    // TODO: but secrets into Secrets Manager
                }
                if (env_doc.envs[config].includes('build')) {
                    if (is_secret) {
                        vars['build_envs'].push({key: config})  // push only the key here
                        vars['secret_envs'].push(keyAndValue)
                    }
                    else {
                        vars['build_envs'].push(keyAndValue)
                    }
                }
            }
            vars['run_envs'].push(keyAndValue)
        })
        return vars
    }
}

module.exports = {CommandBase}