#!/bin/bash -xe
exec > >(tee /var/log/user-data.log | logger -t user-data) 2>&1

sudo apt-get update -y

export docker_user_name=$(aws ssm get-parameter --region ${AWS::Region} --name docker_user_name --query Parameter.Value)
export docker_password=$(aws ssm get-parameter --region ${AWS::Region} --name docker_password --query Parameter.Value --with-decryption)
export ecommerce_repo_deploy_key=$(aws ssm get-parameter --region ${AWS::Region} --name export ecommerce_repo_deploy_key --query Parameter.Value --with-decryption)
export aws_access_key_id=$(aws ssm get-parameter --region ${AWS::Region} --name access_key_id --query Parameter.Value)
export aws_secret_access_key=$(aws ssm get-parameter --region ${AWS::Region} --name secret_access_key --query Parameter.Value --with-decryption)
export aws_region=${AWS::Region}

sudo apt-get install -y awscli
(curl -sSL "https://github.com/buildpacks/pack/releases/download/v0.13.1/pack-v0.13.1-linux.tgz" | sudo tar -C /usr/local/bin/ --no-same-owner -xzv pack)
(curl -fsSL https://get.docker.com  | sudo sh)

