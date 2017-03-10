# Koa-browse

Koa middleware for retrieving metadata and interacting with static files

# Installation

```
npm install --save koa-browse
```

# Requirements

Koa v2 is required, as well as native async support

# Usage

```
const Koa = require('koa');
const { browse, dirList, sendFile, result } = require('koa-browse');

const app = new Koa();
app.use(browse({root: __dirname}))
  .use(dirList())
  .use(sendFile())
  .use(result());

```