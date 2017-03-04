const koa = require('koa');

const app = koa();


const middleware = function (options) {
  const root = options.root;
  return async function (ctx, next) {
  };
};

app.use(middleware({root: __dirname}));

app.listen(3020);
