const prompts = require('prompts')

const has = Object.prototype.hasOwnProperty

const {
    getQuery,
    printTableData,
    pickFromTable,
    afterDownload,
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
    doc('table.c').find('tbody').find('tr').each((i, elm) => {
        if (i) {
            const td = doc(elm).find('td')
            const author = td.eq(1).text()
            const extraElms = td.eq(2).find('i')
            let extraText = ''
            extraElms.each((i, elm3) => {
                extraText = `${extraText} ${doc(elm3).text()}`
            })
            let title = td.eq(2).find('a[title=""]')
                .children().remove().end().text()
            while (title.charAt(title.length - 1) === ' ') {
                title = title.substr(0, title.length - 1)
            }
            const publisher = td.eq(3).text()
            const year = td.eq(4).text()
            const pages = td.eq(5).text()
            const language = td.eq(6).text()
            const size = td.eq(7).text()
            const extension = td.eq(8).text()
            const mirrors = [
                td.eq(9).find('a').attr('href')
            ]

            if (extraText) {
                extraText = `\n\n${extraText}`
            }

            output.push({
                author,
                extraText,
                title,
                publisher,
                year,
                size,
                pages,
                language,
                extension,
                mirrors,
            })
        }
    })

    return output
}

function getFile(mirror, ip, filename) {
    return new Promise((res, rej) => {
        get(mirror)
            .then(({ body }) => loadFromBody(body))
            .then(async (doc) => {
                const downloadPath = doc('h2').find('a').attr('href')
                return `http://${ip}${downloadPath}`
            })
            .then((url) => downloadFile(url, filename))
            .then(res)
            .catch(err => rej(err))
    })
}

function verifyDownload({ selected, data }) {
    return new Promise(async (res, rej) => {
        if (!selected) {
            // eg: table results empty:
            return res(data)
        }

        const [mirror] = selected.mirrors
        const ip = mirror.substr(7, mirror.substr(7).indexOf('/'))
    
        let defaultFileName = `${selected.author.toLowerCase().replace(/\ /g, '_')}_${selected.title.toLowerCase().replace(/\ /g, '_')}.${selected.extension}`
        
        const response = await prompts([
            {
                type: 'text',
                name: 'filename',
                message: 'Is this default file name ok?\n',
                initial: defaultFileName,
            }
        ])
        getFile(mirror, ip, response.filename)
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
        }
        res()
    })
}


async function programLoop(query, existingData) {
    return new Promise((res, rej) => {
        if (has.call(existingData, query)) {
            printTableData(existingData[query])
                .then(pickFromTable)
                .then(verifyDownload)
                .then(data => afterDownload(data, query, existingData, responseHandler))
                .then(res)
                .catch(err => rej(err))
        } else {
            get(`http://gen.lib.rus.ec/search.php?req=${query}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`)
                .then(({ body }) => loadFromBody(body))
                .then(getTableData)
                .then(printTableData)
                .then(pickFromTable)
                .then(verifyDownload)
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
