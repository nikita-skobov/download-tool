const prompts = require('prompts')

const { spawnSync } = require('child_process')

const has = Object.prototype.hasOwnProperty

const {
    getQuery,
    printTableData,
    pickFromTable,
    afterDownload,
    checkPath,
} = require('../terminal')

const {
    loadFromBody,
} = require('../parser')

const {
    downloadFile,
    get,
} = require('../requests')


function getTableData(doc) {
    const output = []
    doc('table#searchResult').find('tbody').find('tr').each((i, elm) => {
        const td = doc(elm).find('td')
        const title = td.eq(1).find('a.detLink').text()
        const seeders = td.eq(2).text()
        const leechers = td.eq(3).text()
        const author = td.eq(1).find('a.detDesc').text()
        const desc = td.eq(1).find('font.detDesc').text()
        const uploaded = desc.substr(0, desc.indexOf('Size'))
        let size = desc.substr(desc.indexOf('Size')).substr(5) // remove 'Size: '
        size = size.substr(0, size.indexOf(','))

        const magnet = td.eq(1).find('a[title="Download this torrent using magnet"]').attr('href')
        let torrentId = magnet.substr(magnet.indexOf(':') + 1)
        torrentId = torrentId.substr(torrentId.indexOf(':') + 1)
        torrentId = torrentId.substr(torrentId.indexOf(':') + 1)
        torrentId = torrentId.substr(0, torrentId.indexOf('&'))

        output.push({
            author,
            title,
            size,
            uploaded,
            magnet,
            torrentId,
            seeders,
            leechers,
            asRow: [
                output.length+1,
                `${title}\n${uploaded}\n${author}`,
                `${size}`,
                `${seeders}`,
                `${leechers}`,
            ],
        })
    })

    return output
}

function downloadMagnetAsTorrent(magnet, filename) {
    return new Promise((res, rej) => {
        spawnSync(`Magnet_to_torrent -m "${magnet}" -o ${filename}`, {
            stdio: 'inherit',
            shell: true,
        })
        res()
    })
}


function verifyDownload({ selected, data }) {
    return new Promise(async (res, rej) => {
        if (!selected) {
            // eg: table results empty:
            return res(data)
        }
    
        const defaultFileName = `${selected.torrentId}.torrent`
        const response = await prompts([
            {
                type: 'text',
                name: 'filename',
                message: 'Is this default file name ok?\n',
                initial: defaultFileName,
            }
        ])

        downloadMagnetAsTorrent(selected.magnet, response.filename)
            .then(() => res(data))
            .catch((err) => rej({ err, data}))
    })
}

function responseHandler(response, existingData, query, data) {
    return new Promise(async (res, rej) => {
        if (response.next === 'back') {
            existingData[query] = data
            await programLoop(query, existingData)
        } else if (response.next === 'new') {
            existingData[query] = data
            const newQuery = await getQuery()
            await programLoop(newQuery, existingData)
        } else if (response.next === 'change') {
            await checkPath()
            await afterDownload(data, query, existingData, responseHandler)
        }
        res()
    })
}

const defaultHeader = [
    { value: 'index', width: 10, headerAlign: 'left' },
    { value: 'Title\nDate\nBy', width: 45, headerAlign: 'left' },
    { value: 'Size', width: 20, headerAlign: 'left' },
    { value: 'Seeders', width: 20, headerAlign: 'left' },
    { value: 'Leechers', width: 20, headerAlign: 'left' },
]


async function programLoop(query, existingData) {
    return new Promise((res, rej) => {
        if (has.call(existingData, query)) {
            printTableData(existingData[query], defaultHeader)
                .then(pickFromTable)
                .then(obj => verifyDownload(obj))
                .then(data => afterDownload(data, query, existingData, responseHandler))
                .then(res)
                .catch(err => rej(err))
        } else {
            get(`https://thepiratebay.org/search/${query}/0/99/0`)
                .then(({ body }) => loadFromBody(body))
                .then(getTableData)
                .then(data => printTableData(data, defaultHeader))
                .then(pickFromTable)
                .then(obj => verifyDownload(obj))
                .then(data => afterDownload(data, query, existingData, responseHandler))
                .then(res)
                .catch(err => rej(err))
        }
    })
}

async function programMain() {
    const searchQuery = await getQuery()
    
    const actualQuery = searchQuery.split(' ').reduce((prev, current) => `${prev}+${current}`)
    programLoop(actualQuery, {})
}

module.exports = {
    programMain,
}
