#!/bin/sh

# Docker in the github runners moans with this error:

# validating /home/runner/work/dhsc-compass-alpha-procurement-prototype/dhsc-compass-alpha-procurement-prototype/src/beta-app/compose.yaml: services.web.develop.watch.0 additional properties 'initial_sync' not allowed

# ...even if I upgrade docker from v28 to v29.

# We don't need the watch functionality in CI, so this kinda works, but
# it's fragile; we'll need to fix the regexps if we fiddle with unrelated
# things in compose.yaml

sed -i '/develop:$/,/path: package-lock.json$/d' compose.yaml
