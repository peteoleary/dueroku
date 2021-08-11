const { Command, flags } = require('@heroku-cli/command')
const { CommandBase } = require(require('path').resolve(__dirname, './command_base'))
const HerokuTools = require('../utils/heroku_tools')
var TemplateEngine = require('../utils/template_engine')

var AWS = require('aws-sdk');
const { boolean } = require('@oclif/command/lib/flags')

class CodeBuildCommand extends CommandBase {

  init() {
    this.heroku_tools = new HerokuTools(this.heroku)
    this.codebuild = new AWS.CodeBuild({ apiVersion: '2016-10-06', region: 'us-east-2' });
    this.iam = new AWS.IAM({ apiVersion: '2010-05-08' });
  }

  async doMakeBuildSpecFile(name, app_config, env_doc, force) {

    const vars = await this.makeTemplateVars(name, app_config, env_doc)
    this.resolveAndWriteTemplate('buildspec.yml', vars, force)

    return [app_config]
  }

  async writeCurrentDebugArtifacts(project, force) {
    var { role_name, policy_name } = this.makeRoleAndPolicyNames(project.name)
    const role = await this.iam.getRole({ RoleName: role_name }).promise()
    const rolePolicies = await this.iam.listAttachedRolePolicies({ RoleName: role_name }).promise()

    // TODO check policy_name == rolePolicies.AttachedPolicies[0].PolicyName

    const rolePolicy = await this.iam.getRolePolicy({ RoleName: role_name, PolicyName: policy_name }).promise()

    this.writeToJSONFile(`${project.name}-codebuild-project-existing.json`, project, force)
    this.writeToJSONFile(`${project.name}-codebuild-role-existing.json`, role, force)
    this.writeToJSONFile(`${project.name}-codebuild-policies-existing.json`, rolePolicies, force)
  }

  async doCreateCodebuildProject(name, app_config, env_doc, force, debug) {

    var params = {
      names: [
        name
      ]
    };

    const existing_projects = await this.codebuild.batchGetProjects(params).promise()

    const project = existing_projects.projects.filter(p => p.name == name)

    if (project.length > 0) {
      this.log(`project ${name} exists`)
      if (debug) {
        this.log(`writing current debug artifacts`)
        await this.writeCurrentDebugArtifacts(project[0], force)
      }
      if (force) {
        // delete existing project, role and policies
      } else {
        this.log(`--force flag not set so nothing to do here`)
        return
      }
    }

    const vars = await this.makeTemplateVars(name, app_config, env_doc)

    var new_project_text = template_engine.resolveTemplate('create_codebuild_project.json', vars)

    try {
      const project_params = JSON.parse(new_project_text)

      const new_project = await this.codebuild.createProject(project_params).promise()
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
    const { flags } = this.parse(CodeBuildCommand)
    const name = flags.app || this.heroku_tools.getCurrentHerokuAppName() || this.fail('run command from inside Heroku app directory or provide -a app_name')

    // get production env
    var app_config = await this.heroku_tools.getAppConfig(name)
    var env_doc = this.heroku_tools.getEnvDoc()

    await this.doMakeBuildSpecFile(name, app_config, env_doc, flags.force)
    await this.doCreateCodebuildProject(name, app_config, env_doc, flags.force, flags.debug)
  }

}

CodeBuildCommand.description = `create files to set up AWS Codebuild
...
Uses templates/create_codebuild_project.json.template to create create_codebuild_project.json file to configure Codebuild for current project
`

CodeBuildCommand.hidden = false

CodeBuildCommand.flags = {
  app: flags.string({ char: 'a', description: 'app to operate on' }),
  force: flags.boolean({ char: 'f', description: 'force file overwrites' }),
  debug: flags.boolean({ char: 'd', description: 'write debug artifacts' })
}

module.exports = CodeBuildCommand
