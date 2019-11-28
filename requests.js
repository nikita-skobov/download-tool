const request = require('request')
const prompts = require('prompts')
const fs = require('fs')

function get(url) {
    return new Promise((res, rej) => {
        request(url, (err, response, body) => {
            if (err) return rej(err)

            return res({ response, body })
        })
    })
}

function downloadFile(uri, filename) {
    return new Promise((res, rej) => {
        const file = fs.createWriteStream(filename)
        request({
            uri,
        })
        .pipe(file)
        .on('finish', res)
        .on('error', rej)
    })
}


async function checkIP() {
    const { body } = await get('http://ifconfig.co/json')

    const jsonBody = JSON.parse(body)
    const { ip } = jsonBody

    const response = await prompts({
        type: 'select',
        name: 'continue',
        message: `Your current ip is: ${ip}\nContinue?`,
        choices: [
            { title: 'Yes', value: 1 },
            { title: 'No', value: 0 },
        ],
    })

    return response.continue
}

module.exports = {
    get,
    checkIP,
    downloadFile,
}