const {Command, flags} = require('@heroku-cli/command')
const path = require('path')
const {CommandBase} = require(path.resolve( __dirname, './command_base'))
const HerokuTools = require('../utils/heroku_tools')
const dotenv = require('dotenv')
var fs = require('fs')
var yaml = require('js-yaml')
var TemplateEngine = require('../utils/template_engine')

var AWS = require('aws-sdk');

class CodeBuildCommand extends CommandBase {

    init () {
        this.heroku_tools = new HerokuTools(this.heroku)
      }

    makeTemplateVars(app_config, env_doc) {
        var vars = {}
        vars['build_envs'] = []
        vars['run_envs'] = []
        vars['secret_envs'] = []

          // figure out which ones are secret or needed for build
        Object.keys(app_config).forEach(config => {
            const keyAndValue = {key: config, value: app_config[config]}
            if (env_doc.envs[config]) {
                if (env_doc.envs[config].includes('build')) {
                    if (env_doc.envs[config].includes('secret')) {
                        vars['build_envs'].push({key: config})
                        vars['secret_envs'].push({key: config})
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

    async doMakeBuildSpecFile(app_config, env_doc, force) {
        
        const vars = this.makeTemplateVars(app_config, env_doc)
        this.resolveAndWriteTemplate('buildspec.yml', vars, force)

        return [app_config]
    }

    makeRoleAndPolicyNames(name) {
        let role_name = `codebuild-${name}-service-role`
        let policy_name = `codebuild-${name}-service-role-policy` 
        return {role_name, policy_name}
    }

    async writeCurrentDebugArtifacts(project, force) {
        var {role_name, policy_name} = this.makeRoleAndPolicyNames(project.name)
        const role = await iam.getRole({RoleName: role_name}).promise()
        const rolePolicies = await iam.listAttachedRolePolicies({RoleName: role_name}).promise()

        // TODO check policy_name == rolePolicies.AttachedPolicies[0].PolicyName

        const rolePolicy = await iam.getRolePolicy({RoleName: role_name, PolicyName: policy_name}).promise()

        this.writeToJSONFile(`${project.name}-codebuild-project-existing.json`, project, force)
        this.writeToJSONFile(`${project.name}-codebuild-role-existing.json`, role, force)
        this.writeToJSONFile(`${project.name}-codebuild-policies-existing.json`, rolePolicies, force)
    }

    async doCreateCodebuildProject(name, app_config, env_doc, force, debug) {
        var codebuild = new AWS.CodeBuild({apiVersion: '2016-10-06', region: 'us-east-2'});
        var iam = new AWS.IAM({apiVersion: '2010-05-08'});

        var params = {
            names: [
              name
            ]
          };

          const existing_projects = await codebuild.batchGetProjects(params).promise()

          const project = existing_projects.projects.filter(p => p.name == name)

          if (project.length > 0) {
            this.log(`project ${name} exists`)
            if (debug) {
                this.log(`writing current debug artifacts`)
                this.writeCurrentDebugArtifacts(project, force)
            }
            if (force) {
                // delete existing project, role and policies
            } else {
                this.log(`--force flag not set so nothing to do here`)
                return
            }
          }

          const vars = this.makeTemplateVars(app_config, env_doc)
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
            service_role = await iam.createRole({
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

            var new_policy = await iam.putRolePolicy(params).promise()

        } catch (err) {
            if (err.code == 'EntityAlreadyExists') {
                this.log(`service role ${role_name} already exists`)
                service_role = await iam.getRole({
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

        const git_config = this.heroku_tools.gitConfig()

        const origin_url = git_config[`remote "origin"`].url

        vars['git_repo_location'] = origin_url

          var new_project_text = template_engine.resolveTemplate('create_codebuild_project.json', vars)

          try {
            const project_params = JSON.parse(new_project_text)

            const new_project = await codebuild.createProject(project_params).promise()
        } catch (err) {
            this.log(`error creating project ${err.message}`)
        }

          if (debug) {
            this.writeOrReplaceFile(`${name}-codebuild-project-new.json`, new_project_text, force)
          }
        // create codebuild project on AWS
        // fill in secret env
    }

    async run() {
        const {flags} = this.parse(CodeBuildCommand)
        const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')
        this.log(`hello ${name} from /Users/pete_o/Documents/Dev/dueroku/src/commands/codebuild.js`)

        // get production env
        var app_config_response = await this.heroku_tools.getAppConfig(name)
        var app_config = app_config_response.body
        
        // look for env.yml
        var env_doc;
        try {
            env_doc = yaml.safeLoad(fs.readFileSync('./env.yml', 'utf8'));
            console.log('env.yml file found');
          } catch (e) {
            env_doc = {env: {}}
            console.log('env.yml file not found, no variables will be treated as build or secret');
          }

        await this.doMakeBuildSpecFile(app_config, env_doc, flags.force)
        await this.doCreateCodebuildProject(name, app_config, env_doc, flags.force, flags.debug)
      }
      
}

CodeBuildCommand.description = `Describe the command here
...
Extra documentation goes here
`

CodeBuildCommand.flags = {
  app: flags.string({char: 'a', description: 'app to operate on'}),
  force: flags.boolean({char: 'f', description: 'force file overwrites'}),
  debug: flags.boolean({char: 'd', description: 'write debug artifacts'})
}

module.exports = CodeBuildCommand
