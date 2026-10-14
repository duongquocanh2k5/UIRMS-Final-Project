const fs = require('fs');
const path = require('path');

const profile = process.argv[2];
const allowedProfiles = ['home', 'school'];

if (!allowedProfiles.includes(profile)) {
    console.error(`Usage: npm run env:${allowedProfiles.join(' or env:')}`);
    process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const source = path.join(projectRoot, `.env.${profile}`);
const target = path.join(projectRoot, '.env.local');

if (!fs.existsSync(source)) {
    console.error(`Environment profile not found: ${source}`);
    process.exit(1);
}

fs.copyFileSync(source, target);
console.log(`Active environment switched to ${profile}: ${fs.readFileSync(target, 'utf8').trim()}`);
