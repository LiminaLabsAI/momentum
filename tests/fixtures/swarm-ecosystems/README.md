# Swarm ecosystem fixtures

Synthetic ecosystems used by `tests/swarm-e2e-scenarios.test.js`. The
test builds these in tmp dirs at run time; this README documents the
shapes for future contributors.

## Scenario A — linear (3 repos)

shared-types → backend → frontend

3 waves; one repo per wave.

## Scenario B — branched (4 repos)

         root
        /    \
     mid-a   mid-b
        \    /
         leaf

3 waves: root → {mid-a, mid-b} → leaf.

## Scenario C — wide fan-out (5 repos)

       root
   /  /  \  \
  l1  l2  l3  l4

2 waves: root → {l1, l2, l3, l4}.
