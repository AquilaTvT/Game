#!/bin/sh
# Win rates of the practice bot across ranks and scripts.  sh tools/ladder.sh [runs]
N=${1:-60}
cd "$(dirname "$0")/.."
for stake in 0 1 2 3 4 5 6 7; do node tools/sim.js $N kai $stake mid | head -1; done
for deck in xing li cao zhuan shoujin weibei jiagu changjuan feibai; do node tools/sim.js $N $deck 0 mid | head -1; done
