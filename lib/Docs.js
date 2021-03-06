
"use strict";

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const parse = require('jsdoc-parse');
const Documentation = require("../docs");


class Docs {

  constructor(data) {
    this.data = data;
    this.docs = {};

    console.log("Caching docs...");

    for (let repo in data.repos) {
      console.log("Caching docs for " + repo);

      this.cacheDocs(repo);
    }

    console.log("Finished caching docs.");

    if (!fs.existsSync('./repos')) {
      console.log("No repos directory found; creating...");
      fs.mkdirSync('./repos');
    }
  }

  init(repo) {
    const repoData = this.data.repos[repo];

    return new Promise((resolve, reject) => {
      if (fs.existsSync(`./repos/${repoData.fullName}`)) return resolve();

      console.log(`Cloning repo ${repo}...`);

      try {
        const cloneCmd = `git clone -b ${repoData.branch} --single-branch https://github.com/${repoData.owner}/${repoData.repo}.git ${repoData.fullName}`;

        console.log(`Running ${cloneCmd}`);
        child_process.execSync(cloneCmd, {
          cwd: path.resolve(__dirname, '../repos')
        });
      }
      catch (err) {
        return reject(err);
      }

      console.log(`Cloned successfully.`);

      this.cacheDocs(repo)
      .then(resolve)
      .catch(reject);
    });
  }

  update(repo) {
    const repoData = this.data.repos[repo];

    console.log(`Pulling repo ${repo}...`);

    child_process.execSync(`git pull`, {
      cwd: path.resolve(__dirname, '../repos', repoData.fullName)
    });

    console.log(`Pulled successfully.`);

    this.cacheDocs(repo);
  }

  cacheDocs(repo) {
    const repoData = this.data.repos[repo];
    const sourcePath = path.resolve(__dirname, '../repos', repoData.fullName, repoData.path, '**');

    console.log("Caching docs at path: " + sourcePath);

    let data = "";

    return new Promise((resolve, reject) => {
      let stream = parse({ src: sourcePath });

      stream.on("data", chunk => data += chunk);

      stream.on("error", (err) => {
        console.log("Error while parsing docs: " + err);
        reject(err);
      });

      stream.on("end", () => {
        console.log("Finished caching docs for " + repo);

        data = JSON.parse(data);

        try {
          this.docs[repo] = new Documentation(data, {});
          resolve();
        }
        catch (err) {
          console.warn(err.stack);
          reject(err);
        }
      });
    });
  }

}


module.exports = Docs;
