
"use strict";

const config = require('../config');

const request = require('request');


class Commands {

  constructor(data, docs) {
    this.data = data;
    this.docs = docs;
  }

  init(message, owner, repo, branch, path) {
    const repoFullName = `${owner}/${repo}#${branch}`;

    this.data.channels[message.channel.id] = {
      repo: repoFullName,
      path: path
    };

    if (this.data.repos.hasOwnProperty(repoFullName)) return;

    this.docs.init(repoFullName);

    const webhookData = {
      name: 'web',
      config: {
        url: `${config.url}:${config.port}/hooks/github`,
        content_type: 'json',
        secret: config.github.secret
      }
    };

    request.post(`https://api.github.com/repos/${owner}/${repo}/hooks`, {json: webhookData}, (err, response, body) => {
      if (err) {
        console.log(err);

        delete data.channels[message.channel.id];
        delete data.repos[repoFullName];

        return message.channel.sendMessage("An error occurred while creating webhook.");
      }

      const data = JSON.parse(body);

      data.repos[repoFullName] = {
        id: data.id,
        active: true,
        fullName: repoFullName,
        owner: owner,
        repo: repo,
        branch: branch
      };

      return message.channel.sendMessage(`${config.emojis.success} Successfully initialized for repository **${repoFullName}** with path \`${path}\`.`);
    });
  }

  setActive(active, message, channelID) {
    const repo = this.data.repos[this.data.channels[channelID].repo];
    const hookID = repo.id;

    const webhookData = {
      active: active
    };

    request.patch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/hooks/${hookID}`, {json: webhookData}, (err) => {
      if (err) {
        console.log(err);

        return message.channel.sendMessage(`${config.emojis.warn} An error occurred while updating the webhook.`);
      }

      repo.active = active;

      return message.channel.sendMessage(`${config.emojis.success} Successfully set state to **${(active ? "active" : "inactive")}**.`);
    });
  }

  cease(message, channelID) {
    delete this.data.channels[channelID];

    return message.channel.sendMessage(`${config.emojis.success} Successfully **ceased** in **this channel**.`);
  }

  remove(message, channelID) {
    const repo = this.data.repos[this.data.channels[channelID].repo];
    const hookID = repo.id;

    request.delete(`https://api.github.com/repos/${repo.owner}/${repo.repo}/hooks/${hookID}`, (err) => {
      if (err) {
        console.log(err);

        return message.channel.sendMessage(`${config.emojis.warn} An error occurred while deleting the webhook.`);
      }

      delete this.data.channels[channelID];
      delete this.data.repos[repo.fullName];

      return message.channel.sendMessage(`${config.emojis.success} Successfully **deleted** hook.`);
    });
  }

}


module.exports = Commands;