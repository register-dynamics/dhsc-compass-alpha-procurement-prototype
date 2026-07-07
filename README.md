# DHSC Compass

## Quickly getting it running

Install [Docker](https://www.docker.com/) on your computer.

Running this command:

```sh
./run.sh
```

...will build a docker container and run the app. Visit http://localhost:3000/ to see it.

Press Ctrl+C in the shell to stop it.

The running container is given live access to the checked-out copy of the source code, so edits you make should be reflected immediately and not requiring rebuilding the thing.

## How the Site Works

It's an [NHS Prototype Kit](https://prototype-kit.service-manual.nhs.uk/) app so look at their docs for details.

The build.sh script just builds a container based on node 24; the run.sh script runs build.sh and then runs it with $PWD mounted over /compass. Read them and the Dockerfile, there's no surprises.

In future we might make build.sh build two container images: one for prod use (with the site files actually built in) and one for dev use (with the files omitted as we'll mount them in, and a local database, and any automated test tools we want integreated). Then run.sh can use the latter.

## Advanced usage

If you'd like to run it on a different port, run:

```sh
./run.sh -p PORT_NUMBER
```
