# Vue Project Template

This is a project boilerplate template designed for building SPAs that
will serve as front-ends to Girder 4-based servers. The following features
are included:

* `vuetify` installation and configuration
* `axios` installation and configuration
* `vue-router` installation and skeleton boilerplate
* Girder 4 OAuth client library installation and configuration
* A home page containing a working OAuth login / logout button
* Sentry integration (if no DSN is provided, this will be inactive)
* TypeScript
* Best-practice eslint configuration
* GitHub Actions CI that runs tests, lint, and build

## How to use this template

1. Click the button in GitHub that says `Use this template`.

> If you don't want to use GitHub, you can instead clone the repository,
  `rm -rf .git/` in it, and `git init` the copy.

2. After you have your copy, replace occurrences of `CHANGEME` in the
   codebase.

```bash
git grep CHANGEME
```

## Recommended IDE Setup

* [VSCode](https://code.visualstudio.com/)
* [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)

## Type Support For `.vue` Imports in TS

Since TypeScript cannot handle type information for `.vue` imports, they are
shimmed to be a generic Vue component type by default. In most cases this is
fine if you don't really care about component prop types outside of templates.
However, if you wish to get actual prop types in `.vue` imports (for example
to get props validation when using manual `h(...)` calls), you can enable
Volar's `.vue` type support plugin by running `Volar: Switch TS Plugin on/off`
from VSCode command palette.
