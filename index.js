const fs = require('mz/fs');
const { join, extname } = require('path');
const naturalCompare = require('string-natural-compare');

module.exports = function browse(options = {}) {
  const root = options.root;
  return async function browseAsync(ctx, next) {
    ctx.browse = {};
    const parts = ctx.request.path.split('/');
    if (options.blacklist) {
      const blacklisted = parts.some(part => options.blacklist.includes(part));
      if (blacklisted) {
        await next();
        return;
      }
    }
    ctx.browse.path = join(root, ctx.request.path);
    try {
      ctx.browse.stat = await fs.stat(ctx.browse.path);
    } catch (e) {
      ctx.browse.error = 'Could not read file';
    }
    await next();
  };
};

exports = module.exports;

exports.dirList = function dirList(options = {}) {
  const blacklist = options.blacklist && options.blacklist.map(filename => filename.toLowerCase());
  const extensionsWhitelist = options.extensionsWhitelist && options.extensionsWhitelist.map(ext => ext.replace(/^\./, '').toLowerCase());
  const extensionsBlacklist = options.extensionsBlacklist && options.extensionsBlacklist.map(ext => ext.replace(/^\./, '').toLowerCase());
  return async function dirListAsync(ctx, next) {
    if (
      !ctx.browse ||
      ctx.browse.error ||
      ctx.browse.result ||
      !ctx.browse.path ||
      !ctx.browse.stat ||
      !ctx.browse.stat.isDirectory()
    ) {
      await next();
      return;
    }
    const files = await fs.readdir(ctx.browse.path);
    ctx.browse.result = await Promise.all(
      files.map(
        async (filename) => {
          const stat = await fs.stat(join(ctx.browse.path, filename));
          return Object.assign({ directory: stat.isDirectory(), filename }, stat);
        },
      ),
    );
    if (options.hideDotFiles) {
      ctx.browse.result = ctx.browse.result.filter(file => !file.filename.match(/^\./));
    }
    if (blacklist) {
      ctx.browse.result = ctx.browse.result.filter(file =>
        !blacklist.includes(file.filename.toLowerCase()),
      );
    }
    if (extensionsWhitelist) {
      ctx.browse.result = ctx.browse.result.filter(file => file.directory || extensionsWhitelist.includes(extname(file.filename).replace(/^\./, '').toLowerCase()));
    }
    if (extensionsBlacklist) {
      ctx.browse.result = ctx.browse.result.filter(file => file.directory || !extensionsBlacklist.includes(extname(file.filename).replace(/^\./, '').toLowerCase()));
    }
    if (options.sort) {
      ctx.browse.result.sort((a, b) => {
        if (a.directory && !b.directory) {
          return -1;
        } else if (!a.directory && b.directory) {
          return 1;
        }
        return naturalCompare(a.filename.toLowerCase(), b.filename.toLowerCase());
      });
    }
    await next();
  };
};

exports.sendFile = function sendFile(options = {}) {
  const extensionsWhitelist = options.extensionsWhitelist && options.extensionsWhitelist.map(ext => ext.replace(/^\./, '').toLowerCase());
  const extensionsBlacklist = options.extensionsBlacklist && options.extensionsBlacklist.map(ext => ext.replace(/^\./, '').toLowerCase());
  return async function sendFileAsync(ctx, next) {
    if (
      !ctx.browse ||
      ctx.browse.error ||
      ctx.browse.result ||
      !ctx.browse.path ||
      !ctx.browse.stat ||
      !ctx.browse.stat.isFile()
    ) {
      await next();
      return;
    }
    if (extensionsWhitelist) {
      if (!extensionsWhitelist.includes(extname(ctx.browse.path).replace(/^\./, '').toLowerCase())) {
        await next();
        return;
      }
    }
    if (extensionsBlacklist) {
      if (extensionsBlacklist.includes(extname(ctx.browse.path).replace(/^\./, '').toLowerCase())) {
        await next();
        return;
      }
    }
    ctx.response.type = extname(ctx.browse.path);
    ctx.browse.result = fs.createReadStream(ctx.browse.path);
    await next();
  };
};

exports.download = function download() {
  return async function downloadAsync(ctx, next) {
    if (!ctx.browse || ctx.browse.error || !ctx.browse.result) {
      await next();
      return;
    }
    if (ctx.query.download === 'true') {
      ctx.response.attachment();
    }
    await next();
  };
};

exports.result = function result() {
  return async function resultAsync(ctx, next) {
    if (!ctx.browse) {
      await next();
      return;
    }
    if (ctx.browse.error) {
      ctx.response.body = { error: ctx.browse.error };
    } else if (ctx.browse.result) {
      ctx.response.body = ctx.browse.result;
    }
    await next();
  };
};

exports.browse = exports;
