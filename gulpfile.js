const { src, dest, parallel, series, watch } = require("gulp");
const sass = require("gulp-sass");
const notify = require("gulp-notify");
const autoPrefixer = require("gulp-autoprefixer");
const rename = require("gulp-rename");
const cleanCss = require("gulp-clean-css");
const sourcemaps = require("gulp-sourcemaps");
const browserSync = require("browser-sync").create();
const fileInclude = require("gulp-file-include");
const svgSprite = require("gulp-svg-sprite");
const ttf2woff = require("gulp-ttf2woff");
const ttf2woff2 = require("gulp-ttf2woff2");
const fs = require("fs");
const del = require("del");
const webpack = require("webpack");
const webpackStream = require("webpack-stream");
const uglify = require("gulp-uglify-es").default;
const imagemin = require("gulp-imagemin");
const gutil = require("gulp-util");
const ftp = require("vinyl-ftp");
const rev = require("gulp-rev");
const revRewrite = require("gulp-rev-rewrite");
const revdel = require("gulp-rev-delete-original");
const htmlmin = require("gulp-htmlmin");

// для шрифтов
const fonts = () => {
  src("./src/fonts/**.ttf").pipe(ttf2woff()).pipe(dest("./app/fonts"));
  return src("./src/fonts/**.ttf").pipe(ttf2woff2()).pipe(dest("./app/fonts"));
};

const cb = () => {};

let srcFonts = "./src/scss/_fonts.scss";
let appFonts = "./app/fonts/";

const fontsStyle = (done) => {
  let file_content = fs.readFileSync(srcFonts);
  fs.writeFile(srcFonts, "", cb);
  fs.readdir(appFonts, function (err, items) {
    if (items) {
      let c_fontname;
      for (var i = 0; i < items.length; i++) {
        let fontname = items[i].split(".");
        fontname = fontname[0];
        let font = fontname.split("-")[0];

        if (c_fontname != fontname) {
          fs.appendFile(
            srcFonts,
            '@include font-face("' +
              font +
              '", "' +
              fontname +
              '", ' +
              ");\r\n",
            cb
          );
        }
        c_fontname = fontname;
      }
    }
  });

  done();
};

// svg
const svgSprites = () => {
  return src("./src/img/svg/**.svg")
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: "../sprite.svg",
          },
        },
      })
    )
    .pipe(dest("./app/img"));
};

// преобразование стили
const styles = () => {
  return src("./src/scss/**/*.scss")
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        outputStyle: "expanded",
      }).on("error", notify.onError())
    )
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(
      autoPrefixer({
        cascade: false,
      })
    )
    .pipe(
      cleanCss({
        level: 2,
      })
    )
    .pipe(sourcemaps.write("."))
    .pipe(dest("./app/css/"))
    .pipe(browserSync.stream());
};

// html
const htmlInclude = () => {
  return src(["./src/*.html"])
    .pipe(
      fileInclude({
        prefix: "@",
        basepath: "@file",
      })
    )
    .pipe(dest("./app"))
    .pipe(browserSync.stream());
};

// images
const imgToApp = () => {
  return src([
    "./src/img/**.jpg",
    "./src/img/**.png",
    "./src/img/**.jpeg",
  ]).pipe(dest("./app/img"));
};

const resources = () => {
  return src("./src/resources/**").pipe(dest("./app"));
};

const clean = () => {
  return del(["app/*"]);
};

// script
const scripts = () => {
  return src("./src/js/main.js")
    .pipe(
      webpackStream({
        output: {
          filename: "main.js",
        },
        module: {
          rules: [
            {
              test: /\.m?js$/,
              exclude: /node_modules/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: ["@babel/preset-env"],
                },
              },
            },
          ],
        },
      })
    )
    .on("error", function (err) {
      console.error("WEBPACK ERROR", err);
      this.emit("end"); // Don't stop the rest of the task
    })

    .pipe(sourcemaps.init())
    .pipe(uglify().on("error", notify.onError()))
    .pipe(sourcemaps.write("."))
    .pipe(dest("./app/js"))
    .pipe(browserSync.stream());
};
// watching files
const watchFiles = () => {
  browserSync.init({
    server: {
      baseDir: "./app",
    },
  });

  watch("./src/scss/**/*.scss", styles);
  watch("./src/*.html", htmlInclude);
  watch("./src/img/**jpg", imgToApp);
  watch("./src/img/**png", imgToApp);
  watch("./src/img/**jpeg", imgToApp);
  watch("./src/img/**svg", svgSprites);
  watch("./src/resources/**", resources);
  watch("./src/fonts/**.ttf", fonts);
  watch("./src/fonts/**.ttf", fontsStyle);
  watch("./src/js/**/*.js", scripts);
};

exports.styles = styles;
exports.watchFiles = watchFiles;
exports.htmlInclude = htmlInclude;
exports.default = series(
  clean,
  parallel(htmlInclude, fonts, scripts, imgToApp, svgSprites, resources),
  fontsStyle,
  styles,
  watchFiles
);

// сжатия фотографии
const imagesCompress = () =>
  src(["./src/img/**.jpg", "./src/img/**.png", "./src/img/**.jpeg"])
    .pipe(
      imagemin({
        progressive: true,
      })
    )
    .pipe(dest("./app/img"));

// building scripts and styles
const stylesBuild = () => {
  return src("./src/scss/**/*.scss")
    .pipe(
      sass({
        outputStyle: "expanded",
      }).on("error", notify.onError())
    )
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(
      autoPrefixer({
        cascade: false,
      })
    )
    .pipe(
      cleanCss({
        level: 2,
      })
    )
    .pipe(dest("./app/css/"));
};

const scriptsBuild = () => {
  return src("./src/js/main.js")
    .pipe(
      webpackStream({
        output: {
          filename: "main.js",
        },
        module: {
          rules: [
            {
              test: /\.m?js$/,
              exclude: /node_modules/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: ["@babel/preset-env"],
                },
              },
            },
          ],
        },
      })
    )

    .pipe(uglify().on("error", notify.onError()))
    .pipe(dest("./app/js"));
};

// caching
const cache = () => {
  return src("app/**/*.{css,js,svg,png,jpg,jpeg,woff2,woff}", {
    base: "app",
  })
    .pipe(rev())
    .pipe(revdel())
    .pipe(dest("app"))
    .pipe(rev.manifest("rev.json"))
    .pipe(dest("app"));
};

// переименования файлы в форматы json
const rewrite = () => {
  const manifest = src("app/rev.json");
  return src("app/**/*.html").pipe(
    revRewrite({
      manifest,
    }).pipe(dest("app"))
  );
};

// Minifying html
const htmlMinify = () => {
  return src("app/**/*.html")
    .pipe(
      htmlmin({
        collapseWhitespace: true,
      })
    )
    .pipe(dest("app"));
};

exports.cache = series(cache, rewrite);
exports.build = series(
  clean,
  parallel(htmlInclude, fonts, scriptsBuild, imgToApp, svgSprites, resources),
  fontsStyle,
  stylesBuild,
  htmlMinify,
  imagesCompress
);

// DEPLOY
const deploy = () => {
  let conn = ftp.create({
    host: "",
    user: "",
    password: "",
    parallel: 10,
    log: gutil.log,
  });

  let globs = ["app/**"];

  return src(globs, { base: "./app", buffer: false })
    .pipe(conn.newer("")) // only upload newer files
    .pipe(conn.dest(""));
};

exports.deploy = deploy;
