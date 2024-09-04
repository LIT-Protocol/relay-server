service := relay-server
tag := latest
region := ap-south-1
region_prod := us-east-1
namespace := tria-dev
namespace_prod := tria-prod
account_id := $(shell aws sts get-caller-identity --output text --query 'Account' --region ${region})
account_id_prod := $(shell aws sts get-caller-identity --output text --query 'Account' --region ${region_prod})
OSFLAG := env DOCKER_DEFAULT_PLATFORM=linux/amd64 OSFLAG=linux/amd64

build:
	$(OSFLAG) docker build -t ${service}:${tag} .

release:
	aws --region ${region} ecr get-login-password | docker login -u AWS --password-stdin ${account_id}.dkr.ecr.${region}.amazonaws.com
	$(OSFLAG) docker tag ${service}:${tag} ${account_id}.dkr.ecr.${region}.amazonaws.com/${service}:${tag}
	$(OSFLAG) docker push ${account_id}.dkr.ecr.${region}.amazonaws.com/${service}:${tag}

	for digest in $$(aws ecr describe-images --repository-name ${service} --filter tagStatus=UNTAGGED --query 'imageDetails[*].imageDigest'  --output text --region ${region}); \
	do \
		aws ecr batch-delete-image --repository-name ${service} --image-ids imageDigest=$${digest} --region ${region}; \
	done

release-prod:
	aws --region ${region_prod} ecr get-login-password | docker login -u AWS --password-stdin ${account_id_prod}.dkr.ecr.${region_prod}.amazonaws.com
	$(OSFLAG) docker tag ${service}:${tag} ${account_id_prod}.dkr.ecr.${region_prod}.amazonaws.com/${service}:${tag}
	$(OSFLAG) docker push ${account_id_prod}.dkr.ecr.${region_prod}.amazonaws.com/${service}:${tag}

	for digest in $$(aws ecr describe-images --repository-name ${service} --filter tagStatus=UNTAGGED --query 'imageDetails[*].imageDigest'  --output text --region ${region_prod}); \
	do \
		aws ecr batch-delete-image --repository-name ${service} --image-ids imageDigest=$${digest} --region ${region_prod}; \
	done

deploy-k8s-dev:
	kubectl rollout restart deployment/${service} -n ${namespace}

deploy-k8s-prod:
	kubectl rollout restart deployment/${service} -n ${namespace_prod}

reset:
	$(OSFLAG) docker rm -f $$($(OSFLAG) docker ps -a -q)
	$(OSFLAG) docker system prune -f