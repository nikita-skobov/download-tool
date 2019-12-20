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
    const [program, altDomain] = process.argv.slice(2)

    const {
        programMain,
    } = require(`./${program}`)
    
    programMain(downloadPath, altDomain)
}

process.on('SIGINT', () => {
    console.log('CAUGHT SIGNAL')
    process.exit()
})


test()