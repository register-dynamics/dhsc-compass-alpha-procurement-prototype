# DHSC Compass

## Alpha prototype

The alpha prototype code now belongs in `src/alpha-prototype`. Support scripts remain in the root of the repository for running the prototype locally.

### Running it Locally

#### Quickly getting it running: Mac

If you haven't already, install [Docker](https://www.docker.com/) on your computer.

If you don't have one already, sign up for a [GitHub account](https://github.com/) and ask Andy to add you to the [Register Dynamics organisation](https://github.com/register-dynamics).

If you haven't already, install [Github Desktop](https://desktop.github.com/download/), [Git Fork](https://git-fork.com/), or another git client and use it to clone [this repository](https://github.com/register-dynamics/dhsc-compass-alpha-procurement-prototype) - here is a guide for [how to do that in GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-a-repository-from-github-to-github-desktop). This creates a local copy of the app on your computer.

Open the Terminal app to get a shell prompt, and go to the directory where you checked out the git repo. If you are familiar with the shell, you can use the `cd` command to go there; if not, you can drag the folder from the Finder into the terminal window and it should go there fore you.

Then type this command into the terminal window:

```sh
./run-alpha.sh
```

This will build a docker container and run the app. Visit http://localhost:3000/ to see it. If it's not working, ask a somebody who's done this before and we'll figure it out and improve these instructions!

Press Ctrl+C in the shell to stop it.

The running container is given live access to the checked-out copy of the source code, so edits you make should be reflected immediately and not requiring rebuilding the thing.

For further information on GitHub Desktop (and how to use it to submit your changes back to the repository) can be found:

- [Getting Started with GitHub Desktop](https://docs.github.com/en/desktop/overview/getting-started-with-github-desktop)
- [Choose whichever YouTube tutorial matches your style](https://www.youtube.com/results?search_query=github+desktop+tutorial)

Please ensure to create a new branch for any work you do and push that to the repository - don't commit straight to the `main` branch, please!

#### Quickly getting it running: Linux (or Mac in a terminal)

Install [Docker](https://www.docker.com/) on your computer.

Running this command from a terminal:

```sh
./run-alpha.sh
```

...will build a docker container and run the app. Visit http://localhost:3000/ to see it.

Press Ctrl+C in the shell to stop it.

The running container is given live access to the checked-out copy of the source code, so edits you make should be reflected immediately and not requiring rebuilding the thing.

### The included fake test data

In the include fake test data, the "Heart Age Assessment Tool" has evidence cards linking to documents, so search for that if you want to see them.

### Advanced usage

If you'd like to run it on a different port, run:

```sh
./run-alpha.sh -p PORT_NUMBER
```

If you'd like to use your own database rather than having one build from fake test data, put that database in a sqlite3 file called `database.db` and run:

```sh
./run-alpha.sh --use-my-db
```

You can combine both options:

```sh
./run-alpha.sh -p PORT_NUMBER --use-my-db
```

### How the Site Works

It's an [NHS Prototype Kit](https://prototype-kit.service-manual.nhs.uk/) app so look at their docs for details.

The build.sh script just builds a container based on node 24; the run-alpha.sh script runs build.sh and then runs it with $PWD mounted over /compass. Read them and the Dockerfile, there's no surprises.

In future we might make build.sh build two container images: one for prod use (with the site files actually built in) and one for dev use (with the files omitted as we'll mount them in, and a local database, and any automated test tools we want integreated). Then run-alpha.sh can use the latter.

## Beta app

The beta app belongs in `src/beta-app`. It is a separate app from the alpha prototype, and will be built and deployed separately.

### Running it locally (non-Docker for now)

#### Pre-requisites

- Node.js 26 or later

#### Running the app

Within `src/beta-app`, run `npm install` to install dependencies, then run `npm run dev` to start the app. It will be available at http://localhost:3001/.

There is a test user seeded into the database for logging in to the beta app:

- Username: `test@example.com`
- Password: `northsouth`

If you want to add your own users, you can do so by adding them to the `users` table in the database. Passwords must be hashed using Argon2id, which can be done using the generate-password-hash script in `src/beta-app/scripts/generate-password-hash.ts`. For example, to generate a hash for the password `mypassword`, run:

```bash
node scripts/generate-password-hash.js mypassword
```

and then use that value in the `password_hash` column when adding a new user to the `users` table.

### Testing

Within `src/beta-app`, run the following commands to execute and watch tests or generate coverage:

- `npm run test` - run all tests once
- `npm run test:watch` - start Vitest in watch mode
- `npm run test:coverage` - run tests with coverage reporting

Test files should be colocated with implementation using the `.test.ts` suffix (e.g., `index.test.ts` for `index.ts`).

### Node scripts

This is an explainer of all the `npm run` scripts available for the beta app:

#### Local development

- `npm run dev:css` - start the CSS watcher for development
- `npm run dev:js` - start the JS watcher (frontend) for development
- `npm run dev:ts` - start the TypeScript watcher (backend) for development
- `npm run dev` - start the app in development mode with watch mode enabled for CSS, JS, and TypeScript changes


### Production build

- `npm run build:css` - build the CSS for production
- `npm run build:js` - build the JS (frontend) for production
- `npm run build` - build the app for production
- `npm run start` - start the built app in production mode


### Linting and Formatting

- `npm run type-check` - run TypeScript type checking
- `npm run lint` - run ESLint to check for code style and potential errors
- `npm run format:check` - run Prettier to format the code according to the project's style guide
- `npm run lint:fix` - run ESLint and automatically fix fixable issues
- `npm run format` - run Prettier and automatically fix fixable formatting issues


### Testing

- `npm run test` - run all tests once
- `npm run test:watch` - start Vitest in watch mode
- `npm run test:coverage` - run tests with coverage reporting
- `npm run test:pa11y` - run accessibility tests using Pa11y (assumes target test instance of app is running)
- `npm run test:a11y` - run accessibility tests using Pa11y (launches local test instance of app)
- `npm run generate:sitemap` - generate the sitemap for the app to be used with Pa11y
