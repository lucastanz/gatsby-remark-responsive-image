'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var select = require('unist-util-select');
var path = require('path');
var isRelativeUrl = require('is-relative-url');
var _ = require('lodash');

var _require = require('gatsby-plugin-sharp'),
    responsiveSizes = _require.responsiveSizes;

var Promise = require('bluebird');
var $ = require('cheerio');

// If the image is relative (not hosted elsewhere)
// 1. Find the image file
// 2. Find the image's size
// 3. Filter out any responsive image sizes that are greater than the image's width
// 4. Create the responsive images.
// 5. Set the html w/ aspect ratio helper.
module.exports = function (_ref, pluginOptions) {
  var files = _ref.files,
      markdownNode = _ref.markdownNode,
      markdownAST = _ref.markdownAST,
      pathPrefix = _ref.pathPrefix,
      getNode = _ref.getNode;

  var defaults = {
    maxWidth: 650,
    wrapperStyle: '',
    backgroundColor: 'white'
  };

  var options = _.defaults(pluginOptions, defaults);

  // This will only work for markdown syntax image tags
  var imageNodes = select(markdownAST, 'image');

  // This will also allow the use of html image tags
  var rawHtmlImageNodes = select(markdownAST, 'html').filter(function (node) {
    return node.value.startsWith('<img');
  });

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(rawHtmlImageNodes), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var node = _step.value;

      var formattedImgTag = (0, _assign2.default)(node, $.parseHTML(node.value)[0].attribs);
      formattedImgTag.url = formattedImgTag.src;
      formattedImgTag.type = 'image';
      formattedImgTag.position = node.position;

      imageNodes.push(formattedImgTag);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return Promise.all(imageNodes.map(function (node) {
    return new Promise(function (resolve, reject) {
      var fileType = node.url.slice(-3);

      // Ignore gifs as we can't process them,
      // svgs as they are already responsive by definition
      if (isRelativeUrl(node.url) && fileType !== 'gif' && fileType !== 'svg') {
        var imagePath = path.posix.join(getNode(markdownNode.parent).dir, node.url);
        var imageNode = _.find(files, function (file) {
          if (file && file.absolutePath) {
            return file.absolutePath === imagePath;
          }
          return null;
        });
        if (!imageNode || !imageNode.absolutePath) {
          return resolve();
        }

        responsiveSizes({
          file: imageNode,
          args: options
        }).then(function (responsiveSizesResult) {
          // console.log("responsiveSizesResult", responsiveSizesResult)
          // Calculate the paddingBottom %
          var ratio = 1 / responsiveSizesResult.aspectRatio * 100 + '%';

          var originalImg = responsiveSizesResult.originalImg;
          var fallbackSrc = responsiveSizesResult.src;
          var srcSet = responsiveSizesResult.srcSet;

          // TODO
          // add support for sub-plugins having a gatsby-node.js so can add a
          // bit of js/css to add blurry fade-in.
          // https://www.perpetual-beta.org/weblog/silky-smooth-image-loading.html
          //
          // TODO make linking to original image optional.

          // Construct new image node w/ aspect ratio placeholder
          var rawHTML = '\n          <a\n            class="gatsby-resp-image-link"\n            href="' + originalImg + '"\n            style="display: block"\n            target="_blank"\n            rel="noopener"\n          >\n            <span\n              class="gatsby-resp-image-wrapper"\n              style="position: relative; z-index: -1; display: block; ' + options.wrapperStyle + '"\n            >\n              <span\n                class="gatsby-resp-image-background-image"\n                style="padding-bottom: ' + ratio + ';position: relative; width: 100%; bottom: 0; left: 0; background-image: url(\'' + responsiveSizesResult.base64 + '\'); background-size: cover; display: block;"\n              >\n                <img\n                  class="gatsby-resp-image-image b-lazy"\n                  src='+responsiveSizesResult.base64+' data-src="'+originalImg+'" data-srcset="'+srcSet+'" style="width: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0; box-shadow: inset 0px 0px 0px 400px ' + options.backgroundColor + ';"\n                  alt="' + (node.alt ? node.alt : '') + '"\n                  title="' + (node.title ? node.title : node.alt) + '"\n                  \n                  sizes="' + responsiveSizesResult.sizes + '"\n                />\n              </span>\n            </span>\n          </a>\n          <small>' + (node.alt != null ? node.alt : '') + '</small>\n          ';

          //var rawHTML = '<div class=""><img style="position: relative; width: 100%; bottom: 0; left: 0;" class="b-lazy" src='+responsiveSizesResult.base64+' data-src="'+originalImg+'" data-srcset="'+srcSet+'" alt="'+(node.title ? node.title : '')+'" /></div>';

					    
          // Replace the image node with an inline HTML node.
          node.type = 'html';
          node.value = rawHTML;
          return resolve();
        });
      } else {
        // Image isn't relative so there's nothing for us to do.
        return resolve();
      }
    });
  }));
};
