#!/bin/sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BETA_DIR="$SCRIPT_DIR/src/beta-app"
CONTAINER=compass-beta-web-1

if [ ! -d "$BETA_DIR" ]; then
    echo "Could not find beta project at $BETA_DIR"
    exit 1
fi

CONFIRMED=NO
CORE=NO
TARGET=test
ACCESSIBILITY=NO
E2E=NO

while [ "$#" -gt 0 ]
do
    case "$1" in
        --really-zap-my-database)
            CONFIRMED=YES
            shift
            ;;
        --core)
            CORE=YES
            shift
            ;;
        --coverage)
            CORE=YES
            TARGET=test:coverage
            shift
            ;;
        --accessibility)
            ACCESSIBILITY=YES
            shift
            ;;
        --e2e)
            E2E=YES
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./test-beta.sh [--really-zap-my-database] [--core] [--coverage] [--accessibility] [--e2e]"
            exit 1
            ;;
    esac
done

if [ $CONFIRMED = NO ]
then
    echo "This script will overwrite your database with standard test data in order to run the tests. If you're sure, please re-run it like so:"
    echo "$0 --really-zap-my-database"
    exit 1
fi


# Start containers
./run-beta.sh --background

# Ensure migrations have run (app container may still be starting up)
docker exec $CONTAINER npm run db:migrate

# Load fake data (OVERWRITES ANY EXISTING DATA IN DATABASE)
./load-fake-data.sh

# Track overall test result
FAILURES=""

# Run test suite, optionally in coverage mode?
if [ $CORE = YES ]
then
    if docker exec $CONTAINER npm run $TARGET
    then
        echo OK
    else
        echo FAILED core tests
        FAILURES="$FAILURES core"
    fi

    if [ $TARGET = test:coverage ]
    then
        # Rescue coverage report
        docker cp $CONTAINER:/compass/coverage src/beta-app
    fi
fi

# Do we need chrome installed?
if [ $ACCESSIBILITY = YES -o $E2E = YES ]
then
    # FIXME: Probably better to bake chromium into the container image than to do this every time, but it would be nice to NOT do that when we're not going to run tests - something to think about in future
    if docker exec $CONTAINER npx playwright install chromium --with-deps
    then
        # Run accessibility tests?
        if [ $ACCESSIBILITY = YES ]
        then
            if docker exec $CONTAINER npm run generate:sitemap
            then
                # FIXME: I don't like this hardcoded path to where playwright installed chromium, what's better?
                if docker exec -e PUPPETEER_EXECUTABLE_PATH=/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome $CONTAINER npm run test:a11y
                then
                    echo OK
                else
                    echo FAILED accessibility tests
                    FAILURES="$FAILURES accessibility"
                fi
                # Rescue accessibility report
                mkdir -p src/beta-app/reports
                docker cp $CONTAINER:/compass/reports/pa11y-results.json src/beta-app/reports/pa11y-results.json
            else
                echo FAILED to generate sitemap
                FAILURES="$FAILURES generate:sitemap"
            fi
        fi

        # Run e2e tests?
        if [ $E2E = YES ]
        then
            if docker exec $CONTAINER npm run test:e2e
            then
                echo OK
            else
                echo FAILED e2e tests
                FAILURES="$FAILURES e2e"
            fi
        fi
    else
        echo ERROR chromium didn't install, can't run accessibility or e2e tests
        FAILURES="$FAILURES chromium-install"
    fi
fi

# Shut down containers
(cd $BETA_DIR ; docker compose down)

# Return saved result code for success/failure
if [ x$FAILURES = "x" ]
then
    echo "OK: All tests passed"
else
    echo "FAIL: Some tests failed: $FAILURES"
    exit 1
fi
