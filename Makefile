loadsheets:
	docker-compose run loadsheets

generate-mapping:
	docker-compose run d2r ./generate-mapping -o /var/lib/d2rq/mapping.ttl jdbc:sqlite:/var/lib/d2rq/solar-system.db
