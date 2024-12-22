#!/bin/sh

mkdir -p dest
python3 -m zipapp src -o dest/script.pyz
