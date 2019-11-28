const prompts = require('prompts')
const Table = require('tty-table')


async function getQuery() {
    const response = await prompts({
        type: 'text',
        name: 'searchQuery',
        message: 'What would you like to search for?\n',
    })

    const actualQuery = response.searchQuery.split(' ').reduce((prev, current) => `${prev}+${current}`)
    return actualQuery
}

const defaultHeader = [
    { value: 'index', width: 10, headerAlign: 'left' },
    { value: 'Author\nPublisher\nYear', width: 20, headerAlign: 'left' },
    { value: 'Description', width: 40, headerAlign: 'left' },
    { value: 'Size\nPages', width: 20, headerAlign: 'left' },
    { value: 'Language\nExtension', width: 20, headerAlign: 'left' },
]

function printTableData(data, header = defaultHeader) {
    return new Promise((res) => {
        const newList = []
        if (!data.length) {
            console.log('\nIt seems there were no results\n')
            return res(data)
        }

        data.forEach((obj, ind) => {
            const row = [
                ind+1,
                `${obj.author}\n${obj.publisher}\n${obj.year}`,
                `${obj.title}${obj.extraText}`,
                `${obj.size}\n${obj.pages}`,
                `${obj.language}\n${obj.extension}`,
            ]
            newList.push(row)
        })
        const t1 = Table(header, newList)
        console.log(t1.render())
        return res(data)
    })
}

async function pickFromTable(data) {
    if (!data.length) {
        return {
            selected: undefined,
            data,
        }
    }

    const response = await prompts([
        {
        type: 'select',
        name: 'entry',
        message: 'Pick entry',
        choices: data.map((obj, ind) => ({ title: `${ind+1}`, value: `${ind+1}` }))
        }
    ])


    console.log('\n')
    console.log(data[parseInt(response.entry, 10)-1])
    console.log('\n')
    const selected = data[parseInt(response.entry, 10)-1]
    return {
        selected,
        data,
    }
}


const defaultChoices = [
    { title: 'Exit', value: 'exit' },
    { title: 'Back to table', value: 'back' },
    { title: 'New search', value: 'new' },
]

async function afterDownload(
    data,
    query,
    existingData,
    responseHandler,
    choices = defaultChoices,
    message = 'What next?\n',
) {
    return new Promise(async (res) => {
        const response = await prompts([
            {
                type: 'select',
                name: 'next',
                message,
                choices,
            }
        ])

        await responseHandler(response, existingData, query, data)
        return res()
    })
}

module.exports = {
    getQuery,
    printTableData,
    pickFromTable,
    afterDownload,
}
