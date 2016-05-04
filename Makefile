.PHONY: test build

NODE_BIN := ./node_modules/.bin


clean:
	rm -rf build

build: clean
	$(NODE_BIN)/babel nuss --out-dir build/nuss --source-maps
	$(NODE_BIN)/babel examples --out-dir build/examples --source-maps
	cp ./package.json build/nuss/
	cp ./README.md build/nuss/

publish: build
	npm publish build/nuss

lint:
	$(NODE_BIN)/eslint nuss examples tests

test:
	NODE_PATH=. $(NODE_BIN)/mocha --compilers js:babel-register

cover:
	NODE_PATH=. BABEL_ENV=istanbul node -r babel-register \
		$(NODE_BIN)/babel-istanbul cover \
		$(NODE_BIN)/_mocha

cover-check: cover
	$(NODE_BIN)/babel-istanbul check-coverage

example:
	NODE_PATH=. node -r babel-register \
		nuss/cli.js \
			--config ./config/config.yaml \
			--service examples/service:ExampleService

example-dbg:
	NODE_PATH=. node --debug-brk -r babel-register \
		nuss/cli.js --config ./config/config.yaml \
			--service examples/service:ExampleService

example-config:
	NODE_PATH=. node -r babel-register \
		nuss/cli.js \
			--generate-config \
			--service examples/service:ExampleService

dev:
	npm install

ci: lint cover-check

