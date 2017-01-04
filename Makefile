TESTS = test/*.js


test:
	./node_modules/typescript/bin/tsc
	./node_modules/mocha/bin/mocha


watch:
	@./node_modules/.bin/nodemon -e js --exec 'make test'


.PHONY: test watch
