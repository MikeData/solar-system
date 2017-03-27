default:
	docker-compose run -p 3000:3000 vis

loadsheets:
	docker-compose run loadsheets python ./loadData.py oneshot

generate-mapping:
	docker-compose run d2r ./generate-mapping -o /var/lib/d2rq/mapping.ttl jdbc:sqlite:/var/lib/d2rq/solar-system.db

dump:
	docker-compose run d2r ./dump-rdf -b https://ons.floop.org.uk/data/ -o /var/lib/d2rq/data.nt /var/lib/d2rq/mapping.ttl

redeploy:
	docker-compose build
	docker tag solarsystem_vis onsopendata/solarsystem_vis
	docker push onsopendata/solarsystem_vis
	docker tag solarsystem_loadsheets onsopendata/solarsystem_loadsheets
	docker push onsopendata/solarsystem_loadsheets
	scp data/mapping.ttl data/solar-system.json root@docker.floop.org.uk:/data/ons/solar-system/
	docker-cloud service redeploy --sync loadsheets
	docker-cloud service redeploy --sync ons-vis
