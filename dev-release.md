# Deploy Relay Server

This document show an end to end pipeline on how we can build, release & deploy an `relay-server` into AWS Dev env

## Prerequisite
- Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Install [Kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-macos/)
- Run `xcode-select --install` to install latest command line tools in your MacOS
- Install [Docker Desktop](https://docs.docker.com/desktop/install/mac-install/). After installation, you should set resources limit to `8 CPU` & `12GB` memory
- You should be granted `Administrator` access into [tria-dev aws account](https://d-9067e355bc.awsapps.com/start/#/?tab=accounts). If not, ask Steven or Avi

## Setup
- Open a new shell console terminal, cd to this `current directoty` & paste your AWS credentials. Then, run below command
```
# build sample service docker image
make build

# push docker image into AWS dev ecr
make release

# deploy sample service into DEV env
make deploy-k8s-dev
```

```
# TEST env
# build sample service docker image
make build

# push docker image into AWS dev ecr
make release-test

# deploy sample service into DEV env
make deploy-k8s-test
```

