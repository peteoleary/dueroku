dueroku
=======

NOTE: this tool is a Work In Progress and has not been tested with very many Heroku configurations. Mainly it has been built and tested with Roby/Rails/Postgres as a focus although I intend to expand the number of supported configurations over time.

Dueroku is a set of tool intended to help with the transition from Heroku to other platforms, in particular AWS. It does this by inspecting a Heroku configuration and generating files/artifacts that can be used to configure other systems like Docker, Elastic Container Service, etc.

We are currently not following Heroku CLI plugin style guide https://devcenter.heroku.com/articles/cli-style-guide. Send me a PR!

# Usage

```
git clone https://github.com/peteoleary/dueroku.git
cd dueroku
heroku plugins:link
```

# Commands

Switch to Heroku app directory then:

```
heroku help cloud_formation

heroku help db_migrate

heroku help codebuild

heroku help docker_compose
```
