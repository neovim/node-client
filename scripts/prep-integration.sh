#!/bin/sh

(cd __tests__/integration/rplugin/node/test_2 && npm install && npm run build)
(cd __tests__/integration/rplugin/node/ts-decorator && npm install && npm run build && tsc)
