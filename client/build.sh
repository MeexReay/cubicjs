#!/bin/sh

tsc
cat dest/main.js > dest/script.js
cat dest/block.js >> dest/script.js
cat dest/network.js >> dest/script.js
cat dest/player.js >> dest/script.js
cat dest/core.js >> dest/script.js
terser dest/script.js -o dest/script.min.js --compress --mangle