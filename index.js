const {
    checkIP
} = require('./requests')

async function test() {
    const ok = await checkIP()
    if (!ok) {
        return null
    }
    const program = process.argv.slice(2)[0]

    const {
        programMain,
    } = require(`./${program}`)
    
    programMain()
}

process.on('SIGINT', () => {
    console.log('CAUGHT SIGNAL')
    process.exit()
})


test()