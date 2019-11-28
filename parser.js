const cheerio = require('cheerio')

function loadFromBody(body) {
    const doc = cheerio.load(body)
    return doc
}

module.exports = {
    loadFromBody,
}

