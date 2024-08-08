service := relay-server
tag := latest
region := ap-south-1
namespace := tria-dev
account_id := $(shell aws sts get-caller-identity --output text --query 'Account' --region ${region})
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

deploy-k8s-dev:
	kubectl rollout restart deployment/${service} -n ${namespace}

reset:
	$(OSFLAG) docker rm -f $$($(OSFLAG) docker ps -a -q)
	$(OSFLAG) docker system prune -f