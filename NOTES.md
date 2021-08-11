Dueroku Notes
=======

<!-- toc -->
# TOC
This file contains random notes I made in the course of investigating Docker, Herokuish and other technologies

# Some Docker debugging stuff

docker exec -it {container} /bin/bash
echo $DATABASE_PASSWORD
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME
docker run --env-file {container}.env -it {container} /bin/bash

# Herokuish

RUN curl --location --silent https://github.com/gliderlabs/herokuish/releases/download/v0.5.18/herokuish_0.5.18_linux_x86_64.tgz | tar -xzC ./bin

# Heroku buildpacks

t2.medium
ubuntu 18.04

sudo apt install ncdu

git clone https://github.com/DroneBase/heroku-buildpack-exiftool
git clone https://github.com/heroku/heroku-buildpack-ruby
git clone https://github.com/heroku/stack-images

ssh-keygen -t rsa -b 4096 -C "pete@timelight.com"
cat .ssh/id_rsa.pub

sudo apt update
sudo apt-get install ruby-dev
sudo apt-get install -y libgmp-dev
sudo apt-get install -y libxml-dev
sudo apt-get install -y libpq-dev
sudo apt-get install libxml2-dev libxslt-dev

cd stack-images/heroku-18 
cp setup.sh /tmp/setup.sh
sudo /tmp/setup.sh

STACK=heroku-18 ./heroku-buildpack-ruby/bin/compile /home/ubuntu/ecommerce /home/ubuntu/ecommerce_cache /home/ubuntu/ecommerce_env
STACK=heroku-18 ./heroku-buildpack-exiftool/bin/compile /home/ubuntu/ecommerce /home/ubuntu/ecommerce_cache /home/ubuntu/ecommerce_env

export PWD=/home/ubuntu/ecommerce
export HOME=/home/ubuntu/ecommerce
export PATH="$HOME/bin:$APP_DIR/vendor/bundle/bin:$HOME/vendor/bundle/ruby/2.5.0/bin:$HOME/vendor/exiftool:$PATH"
export GEM_PATH=$HOME/vendor/bundle/ruby/2.5.0

set -a
source .env