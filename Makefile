loadsheets:
	docker-compose run loadsheets

generate-mapping:
	docker-compose run d2r ./generate-mapping -o /var/lib/d2rq/mapping.ttl jdbc:sqlite:/var/lib/d2rq/solar-system.db

deploy:
	docker tag solarsystem_d2r cloudfluff/private:solarsystem_d2r
	docker push cloudfluff/private:solarsystem_d2r
	docker-cloud stack stop ons
	scp data/mapping.ttl data/solar-system.db root@docker.floop.org.uk:/data/ons/solar-system/
	docker-cloud stack redeploy ons

