# Contribution guidelines

We are tidying the repo up and moving towards more structured processes. This document explains how we'd like to do things going forward - but don't be surprised that the history of the repository might look rather different to this :-)

## Make an issue

To track what changes in the code relate to what high-level goal we're pursuing, we use [GitHub issues](https://github.com/register-dynamics/dhsc-compass-alpha-procurement-prototype/issues) to track our goals. Press the New Issue button to make one if there isn't one already there, pick the bug or planned-work template, and fill in the blanks.

## Talk to us

Discuss your new issue with the team in the Compass Technical Chat in Teams so we all know what's going on and anybody who knows something that might be helpful to you gets to contribute it.

Now is the time for anyone to give advice on HOW to do the task.

## Make a branch

Create a branch named after the issue. In most cases there will be a 1:1 relationship between branches and issues, so for an issue with number 67 titled "Add more buttons", I'd call a branch something like "67-more-buttons". In more complex cases we might address several issues in a single branch, or use several branches for different parts of a large issue, so this won't always hold.

Here's [a guide to using branches in GitHub Desktop](https://docs.github.com/en/desktop/making-changes-in-a-branch/managing-branches-in-github-desktop).

## Do your work

Do your work in commits on the branch. Because the branch itself only exists while the work is ongoing, don't rely on the fact that the branch name points to the issue - make every commit mention the issue by making your commit messages look like this:

```
Issue #67: Add the Help button

 - Added a handler for the Help button
 - Put the Help button in the admin, login, and edit pages
```

## Include comments and internal docs where applicable

If the meaning of the code you're changing might not be obvious to future you, or to a complete stranger looking at it, write some comments clarifying matters. Think about anything somebody changing this code might need to know - for instance if you're editing something that bundles some data into a hidden form field that another bit of code unpacks, put a comment saying where the code that reads it is to be found, as anybody changing one end of the pipe needs to update the other end!

Anything too complex to fit nicely in a comment in the code, or that involves multiple disparate bits of the code, should instead go in a markdown file in the top-level `docs` directory (which we'll create as soon as we need it).

## Push your branch to the repository

Push your branch, and create a pull request (here's a guide to doing that with [GitHub Desktop](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/creating-an-issue-or-pull-request-from-github-desktop#creating-a-pull-request)), and ask the people in the Compass Technical Chat channel to take a look.

## Code Review

When you see somebody submit a pull request in the channel that you think you might have an opinion on, take a look at the changes in the pull request.

Now is not the time to say the overall approach was wrong, after somebody has already worked hard on it - that should have happened when the issue was initial discussed. Useful types of responses to a pull request are:

"Uhoh, I've seen a possible bug or other error, here's what you need to do to fix it..."

"Cool, great work, thanks! I think we should merge it, unless anybody else has any feedback."

"Cool, great work, thanks! I'd have done it slightly differently but I missed it when it was being discussed so didn't get to contribute. For future reference, here's what I would have said..."
