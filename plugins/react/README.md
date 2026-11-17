# @fcalell/plugin-react

React framework plugin for the `@fcalell/stack` framework: React on Vite with the React Compiler, TanStack Router file-based routing with typed routes, the app bootstrap, the providers module, and the HTML shell with its `<head>` metadata. Design-system components live in a UI plugin.

**Stack:** React 19 + `@vitejs/plugin-react` + `babel-plugin-react-compiler` on `@rolldown/plugin-babel` + TanStack Router (`@tanstack/react-router`, `@tanstack/router-plugin`)

How it is built: [docs/architecture/plugins/react.md](../../docs/architecture/plugins/react.md).

## Install

```bash
stack add react
```

The consumer declares `react`, `react-dom`, `@types/react` and `@types/react-dom` (`stack init` writes them), `@tanstack/react-router` and `@tanstack/react-query` (the plugin's `dependencies`), and `@vitejs/plugin-react`, `@tanstack/router-plugin`, `@tanstack/router-generator` (an optional peer of the plugin, which `stack generate` writes the route tree with), `@rolldown/plugin-babel`, `@babel/core` and `babel-plugin-react-compiler` (its `devDependencies`), since the generated vite config imports them and the React Compiler preset resolves the compiler from the consumer.

## Guide

Building the web app lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`web-app.md`](./guide/web-app.md), the `react()` and `vite()` options, the dev server and its
API proxy, and the files the app owns; [`routes.md`](./guide/routes.md), the file-route
conventions and typed routes; and [`add-a-route.md`](./guide/add-a-route.md), the recipe.

## License

MIT
