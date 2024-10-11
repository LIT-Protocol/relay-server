service := relay-server

# Default environment is dev
env := dev

# Define account_id based on environment
account_id := $(if $(filter $(env),prod),060795900752, \
              $(if $(filter $(env),preprod),060795900752, \
              $(if $(filter $(env),dev),535002881389, \
              008971671473)))
tag := $(if $(filter $(env),preprod),preprod,latest)


# Define variables based on environment
region := $(if $(filter $(env),prod),us-east-1,$(if $(filter $(env),preprod),us-east-1,ap-south-1))
namespace := $(if $(filter $(env),prod),tria-prod,$(if $(filter $(env),preprod),tria-preprod,tria-dev))

# Docker settings
OSFLAG := env DOCKER_DEFAULT_PLATFORM=linux/amd64 OSFLAG=linux/amd64

build:
	$(OSFLAG) docker build -t ${service}:${tag} .

release:
	aws --region ${region} ecr get-login-password | docker login -u AWS --password-stdin ${account_id}.dkr.ecr.${region}.amazonaws.com
	$(OSFLAG) docker tag ${service}:${tag} ${account_id}.dkr.ecr.${region}.amazonaws.com/${service}:${tag}
	$(OSFLAG) docker push ${account_id}.dkr.ecr.${region}.amazonaws.com/${service}:${tag}

	for digest in $$(aws ecr describe-images --repository-name ${service} --filter tagStatus=UNTAGGED --query 'imageDetails[*].imageDigest' --output text --region ${region}); \
	do \
		aws ecr batch-delete-image --repository-name ${service} --image-ids imageDigest=$${digest} --region ${region}; \
	done

deploy-k8s:
	kubectl rollout restart deployment/${service} -n ${namespace}

release-dev:
	$(MAKE) release env=dev

release-test:
	$(MAKE) release env=test

release-preprod:
	$(MAKE) build env=preprod
	$(MAKE) release env=preprod

release-prod:
	$(MAKE) release env=prod

deploy-k8s-dev:
	$(MAKE) deploy-k8s env=dev

deploy-k8s-test:
	$(MAKE) deploy-k8s env=test

deploy-k8s-preprod:
	$(MAKE) deploy-k8s env=preprod

deploy-k8s-prod:
	$(MAKE) deploy-k8s env=prod

reset:
	$(OSFLAG) docker rm -f $$($(OSFLAG) docker ps -a -q)
	$(OSFLAG) docker system prune -f

