#!/bin/sh

tsc
cat dest/main.js > dest/script.js
cat dest/block.js >> dest/script.js
cat dest/network.js >> dest/script.js
cat dest/player.js >> dest/script.js
cat dest/core.js >> dest/script.js
terser dest/script.js -o dest/script.min.js --compress --mangle
rm dest/script.js
rm dest/main.js
rm dest/block.js
rm dest/network.js
rm dest/player.js
rm dest/core.js