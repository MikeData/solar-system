default:
	docker-compose run -p 3000:3000 vis

loadsheets:
	docker-compose run loadsheets

generate-mapping:
	docker-compose run d2r ./generate-mapping -o /var/lib/d2rq/mapping.ttl jdbc:sqlite:/var/lib/d2rq/solar-system.db

deploy-vis:
	docker-compose build
	docker tag solarsystem_vis cloudfluff/private:solarsystem_vis
	docker push cloudfluff/private:solarsystem_vis
	docker-cloud service redeploy ons-vis

deploy-d2r:
	docker tag solarsystem_d2r cloudfluff/private:solarsystem_d2r
	docker push cloudfluff/private:solarsystem_d2r
	docker-cloud service stop d2r
	scp data/mapping.ttl data/solar-system.db root@docker.floop.org.uk:/data/ons/solar-system/
	docker-cloud service redeploy d2r

deploy-data:
	docker-cloud service stop --sync d2r
	scp data/mapping.ttl data/solar-system.db root@docker.floop.org.uk:/data/ons/solar-system/
	docker-cloud service start d2r
