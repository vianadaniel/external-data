up:
	docker compose up
down:
	docker compose down
logs:
	docker compose logs app
test:
	docker compose run app npm run test