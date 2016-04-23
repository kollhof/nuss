.PHONY: test build

NODE_BIN := ./node_modules/.bin


clean:
	rm -rf build


build:
	$(NODE_BIN)/babel nuss --out-dir build/nuss --source-maps
	cp ./package.json build/nuss/


lint:
	$(NODE_BIN)/eslint nuss examples tests


test-compiled:
	NODE_PATH=build $(NODE_BIN)/mocha --compilers js:babel-register


test:
	NODE_PATH=. $(NODE_BIN)/mocha --compilers js:babel-register


cover:
	NODE_PATH=. node -r babel-register \
		$(NODE_BIN)/babel-istanbul cover \
		$(NODE_BIN)/_mocha

cover-check: cover
	$(NODE_BIN)/babel-istanbul check-coverage

example:
	NODE_PATH=. node -r babel-register \
		nuss/cli.js \
			--config ./config/config.yaml \
			--service examples/service:Foobar

example-dbg:
	NODE_PATH=. node --debug-brk -r babel-register \
		nuss/cli.js --config ./config/config.yaml \
		--service examples/service:Foobar

example-config:
	NODE_PATH=. node -r babel-register \
		nuss/cli.js \
			--generate-config \
			--service examples/service:Foobar

docker-example: build
	$(NODE_BIN)/babel examples --out-dir build/examples --source-maps
	$(NODE_BIN)/babel config --out-dir build/examples --source-maps
	cp examples/Dockerfile build/examples/
	cp -r build/nuss build/examples/
	docker build -t nuss-example build/examples

dev:
	npm install

ci: lint test