.PHONY: test build

NODE_BIN := ./node_modules/.bin


clean:
	rm -rf build


build:
	$(NODE_BIN)/babel nuss --out-dir build/nuss --source-maps
	cp ./package.json build/nuss/


lint:
	$(NODE_BIN)/eslint nuss


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
		nuss/cli.js --config ./config/foo-config \
		--service examples/service:Foobar
dev:
	npm install

ci: cover