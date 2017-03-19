var webpack = require('webpack')
var webpackUglifyJsPlugin = require('webpack-uglify-js-plugin')
var SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin')
var pjson = require('./package.json')



var path = require('path')

var bower_dir = __dirname + '/bower_components'
var node_dir = __dirname + '/node_modules'

module.exports = {
    context: __dirname ,
    entry: './flow.js',
    output: {
        filename: 'bundle.js',
        path: __dirname,
    },
    resolve: {
        alias: {
            'jquery': node_dir + '/materialize-css/bin/jquery-2.1.1.min.js'
        }
    },
    plugins: [
        new webpackUglifyJsPlugin({
          cacheFolder: path.resolve(__dirname, 'public/cached_uglify/'),
          debug: true,
          minimize: true,
          sourceMap: false,
          output: {
            comments: false
          },
          compressor: {
            warnings: false
          }
        }),
        new SWPrecacheWebpackPlugin({
          cacheId: 'flow' + pjson.version,
          filename: 'sw.js',
          maximumFileSizeToCacheInBytes: 104194304,
          minify: false,
          staticFileGlobs: [
            'templates/**.*',
            'app.png',
            'favicon.ico',
            'index.html',
            'arrow.svg'
          ],
          skipWaiting: true, // if you don't set this to true, you won't see any webpack-emitted assets in your serviceworker config
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            'window.$': "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
        })
    ],
    module: {
      loaders: [{
          test: /\.css$/,
          loader: 'style-loader!css-loader'
      },{
          test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: "url-loader"
      }, {
          test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: "url-loader"
      }, {
          test: /[\/\\]node_modules[\/\\]some-module[\/\\]index\.js$/,
          loader: "imports-loader?this=>window"
      }, {
          test: /materialize-css\/bin\//,
          loader: 'imports-loader?jQuery=jquery,$=jquery,hammerjs'
      }]
    }

}
