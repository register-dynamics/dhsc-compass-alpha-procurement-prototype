# DHSC Compass

## Running it Locally

### Quickly getting it running: Mac

If you haven't already, install [Docker](https://www.docker.com/) on your computer.

If you don't have one already, sign up for a [GitHub account](https://github.com/) and ask Andy to add you to the [Register Dynamics organisation](https://github.com/register-dynamics).

If you haven't already, install [Github Desktop](https://desktop.github.com/download/) and use it to clone [this repository](https://github.com/register-dynamics/dhsc-compass-alpha-procurement-prototype) - a [guide for how to do that is here](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-a-repository-from-github-to-github-desktop). This creates a local copy of the app on your computer.

Find the directory where you've cloned it to and double click on `run.sh`. It should open in Terminal.app - if it doesn't you might need to ask the Finder explicitly to open it in Terminal.

This will build a docker container and run the app. Visit http://localhost:3000/ to see it. If it's not working, ask a somebody who's done this before and we'll figure it out and improve these instructions!

Press Ctrl+C in the shell to stop it.

The running container is given live access to the checked-out copy of the source code, so edits you make should be reflected immediately and not requiring rebuilding the thing.

For further information on GitHub desktop (and how to use it to submit your changes back to the repository) can be found:

 * [Getting Started with GitHub Desktop](https://docs.github.com/en/desktop/overview/getting-started-with-github-desktop)
 * [Choose whichever YouTube tutorial matches your style](https://www.youtube.com/results?search_query=github+desktop+tutorial)

Please ensure to create a new branch for any work you do and push that to the repository - don't commit straight to the `main` branch, please!

### Quickly getting it running: Linux (or Mac in a terminal)

Install [Docker](https://www.docker.com/) on your computer.

Running this command from a terminal:

```sh
./run.sh
```

...will build a docker container and run the app. Visit http://localhost:3000/ to see it.

Press Ctrl+C in the shell to stop it.

The running container is given live access to the checked-out copy of the source code, so edits you make should be reflected immediately and not requiring rebuilding the thing.

### Advanced usage

If you'd like to run it on a different port, run:

```sh
./run.sh -p PORT_NUMBER
```

## How the Site Works

It's an [NHS Prototype Kit](https://prototype-kit.service-manual.nhs.uk/) app so look at their docs for details.

The build.sh script just builds a container based on node 24; the run.sh script runs build.sh and then runs it with $PWD mounted over /compass. Read them and the Dockerfile, there's no surprises.

In future we might make build.sh build two container images: one for prod use (with the site files actually built in) and one for dev use (with the files omitted as we'll mount them in, and a local database, and any automated test tools we want integreated). Then run.sh can use the latter.
