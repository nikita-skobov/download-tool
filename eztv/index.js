const prompts = require('prompts')

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
    doc('tr.forum_header_border[name="hover"]').each((i, elm) => {
        const td = doc(elm).find('td')
        const title = td.eq(1).text()
        const torrentUrl = td.eq(2).find('a.download_1').attr('href')
        const size = td.eq(3).text()
        const uploaded = td.eq(4).text()
        const seeders = td.eq(5).text()

        const magnet = td.eq(2).find('a.magnet').attr('href')
        let torrentId = magnet.substr(magnet.indexOf(':') + 1)
        torrentId = torrentId.substr(torrentId.indexOf(':') + 1)
        torrentId = torrentId.substr(torrentId.indexOf(':') + 1)
        torrentId = torrentId.substr(0, torrentId.indexOf('&'))


        output.push({
            title,
            size,
            uploaded,
            seeders,
            torrentUrl,
            torrentId,
            asRow: [
                output.length+1,
                `${title}\n${uploaded}`,
                `${size}`,
                `${seeders}`,
            ],
        })
    })

    return output
}


function verifyDownload({ selected, data }) {
    return new Promise(async (res, rej) => {
        if (!selected) {
            // eg: table results empty:
            return res(data)
        }

        const { torrentUrl, torrentId } = selected

        const defaultFileName = `${torrentId}.torrent`

        const response = await prompts([
            {
                type: 'text',
                name: 'filename',
                message: 'Is this default file name ok?\n',
                initial: defaultFileName,
            }
        ])
        downloadFile(torrentUrl, response.filename)
            .then(() => res(data))
            .catch((err) => rej({ err, data }))
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
    { value: 'Title\nDate', width: 45, headerAlign: 'left' },
    { value: 'Size', width: 20, headerAlign: 'left' },
    { value: 'Seeders', width: 20, headerAlign: 'left' },
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
            get(`https://eztv.io/search/${query}`)
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
