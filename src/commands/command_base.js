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

    pushEnvVar(vars, env_key, key, value, type = 'PLAiNTEXT') {
        vars[env_key].push({
            key: key,
            value: value,
            type: type
        })
    }

    makeRoleAndPolicyNames(name) {
        let role_name = `codebuild-${name}-service-role`
        let policy_name = `codebuild-${name}-service-role-policy`
        return { role_name, policy_name }
    }

    async makeTemplateVars(name, app_config, env_doc) {
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
                        this.pushEnvVar(vars, 'build_envs', config, null, null) // push only the key here
                        vars['secret_envs'].push(keyAndValue)
                    }
                    else {
                        vars['build_envs'].push(keyAndValue)
                    }
                }
            }
            vars['run_envs'].push(keyAndValue)
        })

        // TODO: get actual values for all these
        const default_region = 'us-east-2'

        // add build envs...
        this.pushEnvVar(vars, 'build_envs', 'IMAGE_REPO_NAME', name)
        // override the region for now even though it's in the .env file
        this.pushEnvVar(vars, 'build_envs', 'AWS_DEFAULT_REGION', default_region)
        // IMAGE_TAG
        this.pushEnvVar(vars, 'build_envs', 'IMAGE_TAG', 'latest')

        var {role_name, policy_name} = this.makeRoleAndPolicyNames(name)

        const trustPolicy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                "Effect": "Allow",
                "Principal": {
                    "Service": "codebuild.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
                }
            ]
        }


        const template_engine = new TemplateEngine

        var service_role
          
        try {
            service_role = await this.iam.createRole({
                AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
                RoleName: role_name
              }).promise()

            // attach inline policy to role
            var new_policy_text = template_engine.resolveTemplate('create_codebuild_policy.json', vars)
            var params = {
                PolicyDocument: new_policy_text, 
                PolicyName: policy_name, 
                RoleName: role_name
            };

            var new_policy = await this.iam.putRolePolicy(params).promise()

        } catch (err) {
            if (err.code == 'EntityAlreadyExists') {
                this.log(`service role ${role_name} already exists`)
                service_role = await this.iam.getRole({
                    RoleName: role_name
                  }).promise()
            }
            else {
                this.log(`unknown error creating role ${err.message}`)
                return
            }
        }

        vars['project_name'] = name
        vars['service_role_arn'] = service_role.Role.Arn
        vars['git_repo_location'] = this.heroku_tools.getGitRemoteURL('origin')
        vars['default_region'] = default_region
        vars['aws_account_id'] = app_config['AWS_ACCOUNT_ID']
        vars['command_string'] = 'bundle exec puma -C config/puma.rb'

        return vars
    }
}

// hide the base class from Heroku CLI, NOTE you must explicitly override this attribute in all subclasses
CommandBase.hidden = true

module.exports = {CommandBase}