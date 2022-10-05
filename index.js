const express = require("express");
const axios = require("axios");
const redis = require("redis");
const PORT = 5000;
const REDIS_PORT = 6379;

const client = redis.createClient(REDIS_PORT);
client.connect();
const app = express();

function setResponse(username, repos) {
  return `<h1>${username} has ${repos}</h1>`;
}

async function getRepos(req, res, next) {
  try {
    const { username } = req.params;
    console.log("Fetching");

    const response = await axios.get(
      `https://api.github.com/users/${username}`
    );
    const data = response.data;
    const repos = data.public_repos;
    await client.setEx(username, 3600, JSON.stringify(repos));

    res.send(setResponse(username, repos));
  } catch (err) {
    console.log("error getting repos", err);
    res.status(500).send("Unable to retrieve repositories");
  }
}

async function cache(req, res, next) {
  const { username } = req.params;
  const cacheData = await client.get(username);
  console.log("CACHE", cacheData);
  try {
    if (cacheData !== null) {
      res.send(setResponse(username, cacheData));
    } else {
      next();
    }
  } catch (err) {
    throw err;
  }
}

app.get("/repos/:username", cache, getRepos);

app.listen(PORT, () => {
  console.log("listing on port " + PORT);
});
