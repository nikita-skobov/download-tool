const {
    checkIP
} = require('./requests')

const {
    checkPath
} = require('./terminal')

async function test() {
    const ok = await checkIP()
    if (!ok) {
        return null
    }
    const downloadPath = await checkPath()
    const program = process.argv.slice(2)[0]

    const {
        programMain,
    } = require(`./${program}`)
    
    programMain(downloadPath)
}

process.on('SIGINT', () => {
    console.log('CAUGHT SIGNAL')
    process.exit()
})


test()